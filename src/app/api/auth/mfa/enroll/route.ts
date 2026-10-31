import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * POST /api/auth/mfa/enroll — mulai pendaftaran faktor TOTP (self-service,
 * cukup sesi login; faktor selalu milik akun sesi).
 * Respons: { factorId, otpauthUri, qr, secret } — klien merender QR;
 * verifikasi kode lewat /api/auth/mfa/enroll/verify.
 */

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  // getUser() memvalidasi JWT ke server Auth; getSession() hanya membaca
  // cookie mentah dan tidak boleh dipakai sebagai gate otentikasi.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    // Nama unik — faktor belum-terverifikasi tidak bisa ditimpa nama sama.
    friendlyName: `Admin ${Date.now()}`,
  });
  if (error || !data || data.type !== "totp") {
    return NextResponse.json(
      { error: error?.message || "Gagal memulai pendaftaran 2FA." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    factorId: data.id,
    otpauthUri: data.totp.uri,
    qr: data.totp.qr_code,
    secret: data.totp.secret,
  });
}
