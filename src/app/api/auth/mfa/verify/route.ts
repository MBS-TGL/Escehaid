import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * POST /api/auth/mfa/verify — langkah ke-2 login saat pengguna punya 2FA.
 * Body: { code: "123456" } — challengeAndVerify terhadap faktor TOTP
 * terverifikasi pertama. Sesi AAL1 (dari /api/auth/login) dinaikkan ke AAL2
 * pada cookie yang sama.
 */

export const runtime = "nodejs";

// Kode 6 digit — anti brute force: 10 percobaan / 10 menit per IP
// (setara rate limit login).
const rateLimit = createRateLimiter(10, 10 * 60 * 1000);

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.replace(/\D/g, "") || "";
  if (code.length !== 6) {
    return NextResponse.json({ error: "Masukkan 6 digit kode." }, { status: 400 });
  }

  const supabase = await createClient();
  // Hanya sesi yang sudah melewati email+password (AAL1) yang boleh di sini.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: "Sesi tidak ditemukan — login ulang." }, { status: 401 });
  }

  // Faktor TOTP terverifikasi pertama.
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  const factor = (factors?.totp ?? []).find((f) => f.status === "verified");
  if (factorsError || !factor) {
    return NextResponse.json({ error: "Faktor 2FA tidak ditemukan." }, { status: 400 });
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });
  if (error) {
    return NextResponse.json({ error: "Kode salah atau kedaluwarsa." }, { status: 401 });
  }

  // Konfirmasi: AAL benar-benar sudah naik sebelum dianggap masuk.
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal.data?.currentLevel !== "aal2") {
    return NextResponse.json({ error: "Verifikasi belum selesai — coba lagi." }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
