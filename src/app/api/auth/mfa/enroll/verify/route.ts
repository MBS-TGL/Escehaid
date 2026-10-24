import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createRateLimiter, clientIpFrom } from "@/lib/rate-limit";

/**
 * POST /api/auth/mfa/enroll/verify — verifikasi kode TOTP untuk menyelesaikan
 * pendaftaran (challenge + verify pada faktor milik sesi). Sukses = faktor
 * terverifikasi & AAL2.
 */

export const runtime = "nodejs";

// Anti brute-force kode 6 digit saat enroll: 10 / 10 menit / IP.
const rateLimit = createRateLimiter(10, 10 * 60 * 1000);

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { factorId?: string; code?: string }
    | null;
  const factorId = body?.factorId || "";
  const code = body?.code?.replace(/\D/g, "") || "";
  if (!factorId || code.length !== 6) {
    return NextResponse.json({ error: "factorId & kode 6 digit wajib." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // Catatan: faktor BELUM terverifikasi tidak muncul di listFactors (user
  // object hanya memuat faktor verified) — kepemilikan dijamin oleh
  // challengeAndVerify yang ter-scope ke user sesi.
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    return NextResponse.json({ error: "Kode salah atau kedaluwarsa." }, { status: 401 });
  }

  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return NextResponse.json({ success: true, aal: aal.data?.currentLevel ?? null });
}
