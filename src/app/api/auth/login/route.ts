import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Login admin: email + password diverifikasi di server; hasilnya disimpan
 * ke cookie httpOnly oleh klien @supabase/ssr — menggantikan
 * signInWithPassword langsung dari browser (Fase 2 refactor).
 */
export const runtime = "nodejs";

/** Rate limit login per-IP (in-memory; node server tunggal). */
const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;
const ENTRIES: { ip: string; count: number; resetAt: number }[] = [];

function rateCheck(ip: string): boolean {
  const now = Date.now();
  let found = ENTRIES.find((e) => e.ip === ip && e.resetAt > now);
  if (!found) {
    found = { ip, count: 0, resetAt: now + WINDOW_MS };
    ENTRIES.push(found);
  }
  found.count += 1;
  return found.count <= LIMIT;
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: Request) {
  if (!rateCheck(clientIp(req))) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan login. Coba lagi beberapa saat." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const password = body?.password || "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
