import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * Reset password admin: kirim email tautan reset dari server —
 * menggantikan resetPasswordForEmail langsung dari browser (Fase 2).
 * `redirectTo` didapat dari request agar origin preview/prod tetap benar;
 * Supabase hanya mengikuti domain yang di-allowlist di Auth config.
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

  const body = (await req.json().catch(() => null)) as
    | { email?: string; redirectTo?: string }
    | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }

  const emailDecision = rateByEmail.check(email);
  if (!emailDecision.allowed) return limited(emailDecision.retryAfterSec);

  // Origin yang diizinkan: hanya scheme+origin, tanpa path aneh.
  let redirectTo = `${body?.redirectTo ?? ""}/admin/login`;
  try {
    const u = new URL(redirectTo);
    redirectTo = `${u.origin}/admin/login`;
  } catch {
    redirectTo = "/admin/login";
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return NextResponse.json(
      { error: "Gagal mengirim email reset password." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
