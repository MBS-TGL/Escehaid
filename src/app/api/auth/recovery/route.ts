import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Tukar kredensial recovery menjadi sesi cookie httpOnly.
 *
 * Dua bentuk (lihat `parseRecoveryHash`):
 *  - `token_hash` — tautan buatan panel admin (`generateLink.hashed_token`).
 *    Diverifikasi server-side dengan `verifyOtp`, jadi TIDAK bergantung pada
 *    redirect allowlist/Site URL Supabase maupun pengiriman email.
 *  - `access_token`+`refresh_token` — implicit flow tautan email Supabase.
 *
 * Setelah sesi terpasang, user diarahkan ke `/admin/change-password`.
 * Token TIDAK pernah dicatat/di-log; respons selalu no-store.
 */
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string; token_hash?: string }
    | null;

  const tokenHash = body?.token_hash?.trim();
  const accessToken = body?.access_token?.trim();
  const refreshToken = body?.refresh_token?.trim();

  if (!tokenHash && !(accessToken && refreshToken)) {
    return NextResponse.json(
      { error: "Tautan reset tidak lengkap. Minta tautan baru ke admin." },
      { status: 400, headers: NO_STORE }
    );
  }

  const supabase = await createClient();

  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })
    : await supabase.auth.setSession({
        access_token: accessToken!,
        refresh_token: refreshToken!,
      });

  if (error) {
    return NextResponse.json(
      { error: "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru ke admin." },
      { status: 400, headers: NO_STORE }
    );
  }

  // Pastikan sesi benar-benar terbentuk sebelum mengarahkan ke halaman ganti.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json(
      { error: "Sesi pemulihan gagal dibuat. Minta tautan baru ke admin." },
      { status: 400, headers: NO_STORE }
    );
  }

  return NextResponse.json({ success: true }, { headers: NO_STORE });
}
