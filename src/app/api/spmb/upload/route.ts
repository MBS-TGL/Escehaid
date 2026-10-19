import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { storageFrom } from "@/lib/storage";

/**
 * Endpoint upload dokumen SPMB untuk pendaftar publik. Pengganti akses
 * storage langsung dari browser (SPMBForm) — file dikirim ke server, server
 * yang memanggil Supabase Storage supaya kredensial tidak menyentuh browser.
 *
 * Autentikasi: TANPA sesi — dipakai pengunjung baru. Keamanan mengandalkan:
 * 1. RLS bucket `spmb-documents` di Supabase (anon hanya boleh insert ke
 *    folder SPMB).
 * 2. Validasi ketat path & tipe file di bawah (path harus mengikuti pola
 *    `spmb-<tahun>/<nisn>/<organ>.<ext>`; tidak ada traversal).
 * 3. Rate limit per-IP sederhana (in-memory).
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** MIME yang diizinkan — sejalan dengan teks bantu di form. */
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);

/** Nama organ dokumen final — kalau form menambah slot dokumen, tambah di sini. */
const ALLOWED_ORGS = new Set(["kk", "akta", "surat", "ktp", "transfer"]);

const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

/** Pola path: spmb-<tahun4>/<nisn|timestamp>/<organ>.<ext> — tanpa traversal. */
const PATH_RE = /^spmb-\d{4}\/[A-Za-z0-9._-]{4,64}\/(kk|akta|surat|ktp|transfer)\.(pdf|jpg|jpeg|png|webp)$/;

/** Rate limit in-memory per IP (proses Node tunggal; cukup untuk spam biasa). */
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 10 * 60 * 1000;

interface RateEntry {
  ip: string;
  count: number;
  resetAt: number;
}
const RATE_ENTRIES: RateEntry[] = [];

function rateCheck(ip: string): boolean {
  const now = Date.now();
  let found = RATE_ENTRIES.find((e) => e.ip === ip && e.resetAt > now);
  if (!found) {
    found = { ip, count: 0, resetAt: now + RATE_WINDOW_MS };
    RATE_ENTRIES.push(found);
  }
  found.count += 1;
  return found.count <= RATE_LIMIT;
}

/** Klien anon di sisi server — mirip kebiasaan proxy.ts (no session). */
function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!rateCheck(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan upload. Coba lagi beberapa saat." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Pengiriman tidak valid." }, { status: 400 });
  }

  const file = form.get("file");
  const path = String(form.get("path") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }

  if (!PATH_RE.test(path) || path.includes("..")) {
    return NextResponse.json({ error: "Path upload tidak valid." }, { status: 400 });
  }

  const org = path.split("/").pop()!.split(".")[0];
  const ext = path.split(".").pop()!.toLowerCase();
  if (!ALLOWED_ORGS.has(org) || !ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "Jenis/sekor file tidak dikenal." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File "${file.name}" terlalu besar. Maksimal 10 MB.` },
      { status: 413 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: `Format file "${file.name}" tidak didukung. Gunakan PDF, JPG, atau PNG.` },
      { status: 415 }
    );
  }

  const supabase = storageClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Konfigurasi storage belum diset di server." },
      { status: 500 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { data, error } = await storageFrom("spmb-documents", supabase).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) {
    if (error.message?.includes("size")) {
      return NextResponse.json(
        { error: `File "${file.name}" terlalu besar. Maksimal 10 MB.` },
        { status: 413 }
      );
    }
    if (error.message?.includes("mime") || error.message?.includes("tipe")) {
      return NextResponse.json(
        { error: `Format file "${file.name}" tidak didukung. Gunakan PDF, JPG, atau PNG.` },
        { status: 415 }
      );
    }
    console.error("spmb upload gagal:", error.message);
    return NextResponse.json(
      { error: `Gagal upload "${file.name}". Coba lagi.` },
      { status: 502 }
    );
  }

  return NextResponse.json({ path: data?.path ?? null });
}
