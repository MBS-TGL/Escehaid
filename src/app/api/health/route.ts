import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * GET /api/health — health check PUBLIK untuk uptime monitor (UptimeRobot
 * dsb.) dan pengecekan cepat "sehat tidak?" tanpa login.
 *
 * Ringan: 1 query kecil ke Supabase diukur latensinya. Tidak mengekspos
 * data apa pun — hanya status, latensi, uptime proses, dan versi deploy
 * (VERCEL_GIT_COMMIT_SHA di-inject otomatis oleh Vercel saat runtime).
 *
 * 200 = DB sehat · 503 = DB gagal (monitor mendeteksi mati sungguhan).
 */

export const runtime = "nodejs";

// Monitor uptime 1x/5menit per layanan — 30/menit per IP cukup lega namun
// menahan abuse. Pola sama dengan /api/search.
const rateLimit = createRateLimiter(30, 60_000);

export async function GET(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { status: "rate_limited", error: "Terlalu sering." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const t0 = Date.now();
  let dbOk = false;
  try {
    const { error } = await supabase.from("site_settings").select("key").limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }
  const dbLatencyMs = Date.now() - t0;

  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      db: { ok: dbOk, latencyMs: dbLatencyMs },
      uptimeSec: Math.round(process.uptime()),
      commit,
      checkedAt: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 }
  );
}
