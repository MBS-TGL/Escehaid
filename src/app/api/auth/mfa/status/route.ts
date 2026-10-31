import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * GET /api/auth/mfa/status — status 2FA akun yang sedang login:
 * daftar faktor TOTP + level AAL. Bila MFA dimatikan di Supabase,
 * mfaEnabled: false (UI menampilkan petunjuk, bukan error).
 */

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  // getUser() memvalidasi JWT ke server Auth; getSession() hanya membaca
  // cookie mentah dan tidak boleh dipakai sebagai gate otentikasi.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const factorsRes = await supabase.auth.mfa.listFactors();
  if (factorsRes.error) {
    return NextResponse.json({ mfaEnabled: false, factors: [], aal: null });
  }
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  return NextResponse.json({
    mfaEnabled: true,
    factors: (factorsRes.data.totp ?? []).map((f) => ({
      id: f.id,
      friendlyName: f.friendly_name,
    })),
    aal: { current: aal.data?.currentLevel ?? null, next: aal.data?.nextLevel ?? null },
  });
}
