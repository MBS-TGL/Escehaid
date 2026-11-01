import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";
import { validateContactPayload } from "@/lib/contact-validate";

/**
 * Endpoint kirim pesan kontak publik — pengganti insert langsung dari browser
 * (ContactForm). Alasan dipindah ke server:
 * 1. Rate-limit per IP & per email (anti-spam banjir) — in-memory ter-prune.
 * 2. Validasi panjang/format + honeypot + jeda minimum di satu tempat.
 * 3. RLS INSERT publik tetap dipertahankan sebagai jaring pengaman kedua.
 *
 * Bot yang terdeteksi (honeypot/jeda) mendapat sukses PALSU tanpa insert —
 * bot tidak belajar bahwa ia diblokir.
 */

export const runtime = "nodejs";

/** 5 kirim / 10 menit per IP — cukup untuk keluarga yang bertanya berulang. */
const ipLimiter = createRateLimiter(5, 10 * 60 * 1000);
/** 3 kirim / 1 jam per email — menahan satu alamat dipakai spam massal. */
const emailLimiter = createRateLimiter(3, 60 * 60 * 1000);

/** Klien anon di sisi server (tanpa sesi) — RLS publik yang menilai insert. */
function anonClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  const ip = clientIpFrom(req);
  const ipCheck = ipLimiter.check(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak pesan dalam waktu singkat. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const payload = {
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    subject: String(body.subject ?? ""),
    message: String(body.message ?? ""),
    website: String(body.website ?? ""),
    filledAt: typeof body.filledAt === "number" ? body.filledAt : undefined,
  };

  const validation = validateContactPayload(payload);
  // Bot → sukses palsu (tanpa insert, tanpa notifikasi admin).
  if (validation.ok && validation.bot) {
    return NextResponse.json({ success: true });
  }
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const emailKey = payload.email.trim().toLowerCase();
  const emailCheck = emailLimiter.check(emailKey);
  if (!emailCheck.allowed) {
    return NextResponse.json(
      { error: "Alamat email ini sudah mengirim beberapa pesan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(emailCheck.retryAfterSec) } }
    );
  }

  const db = anonClient();
  if (!db) {
    return NextResponse.json({ error: "Layanan belum siap. Coba lagi nanti." }, { status: 503 });
  }

  // Cast terikat agar tidak memakai `any` (aturan ESLint).
  type Inserter = {
    insert: (data: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
  const inserter = db.from("contact_messages") as unknown as Inserter;
  const { error } = await inserter.insert({
    name: payload.name.trim(),
    email: emailKey,
    phone: payload.phone.trim(),
    subject: payload.subject.trim(),
    message: payload.message.trim(),
    is_read: false,
  });

  if (error) {
    console.error("/api/contact gagal insert:", error.message);
    return NextResponse.json({ error: "Gagal mengirim pesan." }, { status: 500 });
  }

  // Notifikasi admin — non-fatal (kegagalan RPC tak boleh menggagalkan kirim).
  try {
    type Notifier = {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
    await (db as unknown as Notifier).rpc("notify_admins", {
      p_title: "Pesan Baru dari Website",
      p_message: `${payload.name.trim()} mengirim pesan: "${payload.subject.trim() || payload.message.trim().slice(0, 50)}..."`,
      p_type: "info",
      p_link: "/admin/contact",
    });
  } catch (e) {
    console.warn("/api/contact notify gagal (non-fatal):", e);
  }

  return NextResponse.json({ success: true });
}
