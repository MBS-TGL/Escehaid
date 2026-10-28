import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Tukar kredensial dari tautan Auth menjadi sesi cookie httpOnly.
 *
 * Bentuk yang didukung:
 *  - `token_hash` + `type` — tautan buatan panel admin
 *    (`generateLink.hashed_token`), baik `recovery` (reset password) maupun
 *    `invite` (undangan akun baru). Diverifikasi server-side lewat
 *    `verifyOtp`, jadi TIDAK bergantung pada redirect allowlist/Site URL
 *    Supabase maupun pengiriman email.
 *  - `access_token`+`refresh_token` — implicit flow tautan email Supabase
 *    (selalu diperlakukan sebagai `recovery`).
 *
 * Hasil selalu mengarahkan ke `/admin/change-password`: user baru wajib
 * menetapkan kata sandi sebelum bisa memakai panel.
 * Token TIDAK pernah dicatat/di-log; respons selalu no-store.
 */
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Tipe OTP yang boleh diminta klien lewat jalur token_hash. */
const ALLOWED_TYPES = new Set(["recovery", "invite", "magiclink"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string; token_hash?: string; type?: string }
    | null;

  const tokenHash = body?.token_hash?.trim();
  const accessToken = body?.access_token?.trim();
  const refreshToken = body?.refresh_token?.trim();
  const requestedType = body?.type ?? "recovery";

  if (!tokenHash && !(accessToken && refreshToken)) {
    return NextResponse.json(
      { error: "Tautan tidak lengkap. Minta tautan baru ke admin." },
      { status: 400, headers: NO_STORE }
    );
  }
  if (tokenHash && !ALLOWED_TYPES.has(requestedType)) {
    return NextResponse.json(
      { error: "Jenis tautan tidak dikenal." },
      { status: 400, headers: NO_STORE }
    );
  }

  const supabase = await createClient();

  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        type: requestedType as "recovery" | "invite" | "magiclink",
        token_hash: tokenHash,
      })
    : await supabase.auth.setSession({
        access_token: accessToken!,
        refresh_token: refreshToken!,
      });

  if (error) {
    return NextResponse.json(
      { error: "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru ke admin." },
      { status: 400, headers: NO_STORE }
    );
  }

  // Pastikan sesi benar-benar terbentuk sebelum mengarahkan ke halaman ganti.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json(
      { error: "Sesi gagal dibuat. Minta tautan baru ke admin." },
      { status: 400, headers: NO_STORE }
    );
  }

  return NextResponse.json({ success: true }, { headers: NO_STORE });
}
