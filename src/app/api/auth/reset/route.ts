import { NextResponse } from "next/server";
import { createImplicitAnonClient } from "@/lib/supabase-implicit";
import { authOrigin, originFromHeaders } from "@/lib/site-url";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * Reset password SELF-SERVICE dari halaman login (user meminta sendiri).
 *
 * Memakai implicit flow agar tautan bisa dibuka di perangkat/browser mana
 * pun, lalu mendarat di `/auth/recovery` (fragment token ditukar menjadi
 * sesi cookie). `redirectTo` selalu URL absolut dari `SITE_URL`/origin —
 * `SITE_URL` kosong dulu menghasilkan path relatif yang ditolak Supabase.
 *
 * Rate limit ganda: per-IP (5/10 mnt) mencegah email-bombing massal,
 * per-email (3 jendela 10 mnt) mencegah spam ke satu alamat tertentu dari IP
 * berbeda. Tanpa limit, Supabase mengirim email sungguhan untuk tiap request.
 */
export const runtime = "nodejs";

const rateByIp = createRateLimiter(5, 10 * 60 * 1000);
const rateByEmail = createRateLimiter(3, 10 * 60 * 1000);

function limited(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: "Terlalu sering meminta reset password. Coba lagi beberapa saat." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export async function POST(req: Request) {
  const ipDecision = rateByIp.check(clientIpFrom(req));
  if (!ipDecision.allowed) return limited(ipDecision.retryAfterSec);

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }

  const emailDecision = rateByEmail.check(email);
  if (!emailDecision.allowed) return limited(emailDecision.retryAfterSec);

  const requestOrigin = originFromHeaders((name) => req.headers.get(name));
  const redirectTo = `${authOrigin(requestOrigin)}/auth/recovery`;

  const supabase = createImplicitAnonClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Konfigurasi Supabase di server belum lengkap." },
      { status: 500 }
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    // Pesan asli lebih berguna: mis. "Email address not authorized" berarti
    // SMTP default Supabase hanya mengizinkan anggota tim project.
    return NextResponse.json(
      { error: `Gagal mengirim email reset password: ${error.message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
