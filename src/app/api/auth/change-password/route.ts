import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * Ganti password admin — dijalankan server dengan sesi milik cookies
 * httpOnly (menggantikan auth.updateUser dari browser, Fase 2).
 * Flag must_change_password ikut dibersihkan bila memungkinkan.
 *
 * Dua mode:
 *  - PAKSA (must_change_password = true, halaman /admin/change-password):
 *    cukup `password` baru — user baru saja login dengan password lama.
 *  - SELF-SERVICE (dari Pengaturan Akun): `current` wajib dan diverifikasi
 *    via signInWithPassword — menutup celah sesi terbengkalai dipakai
 *    mengganti password tanpa mengetahui password lama.
 */
export const runtime = "nodejs";

const MIN_LEN = 8;

// Anti brute-force password lama saat self-service: 5x / 10 menit / IP.
const rateLimit = createRateLimiter(5, 10 * 60 * 1000);

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { password?: string; current?: string }
    | null;
  const password = body?.password || "";
  const current = body?.current || "";
  if (password.length < MIN_LEN) {
    return NextResponse.json(
      { error: `Password minimal ${MIN_LEN} karakter.` },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // Mode ditentukan flag paksa; self-service wajib membawa password lama.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("must_change_password")
    .eq("id", user.id)
    .single();
  const forced = profile?.must_change_password === true;

  if (!forced) {
    if (!current) {
      return NextResponse.json(
        { error: "Password saat ini wajib diisi." },
        { status: 400 }
      );
    }
    const check = await supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: current,
    });
    if (check.error) {
      return NextResponse.json(
        { error: "Password saat ini salah." },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json(
      { error: error.message || "Gagal mengganti password." },
      { status: 500 }
    );
  }

  // Bersihkan flag must_change_password (best-effort; policy belum ada → biarkan,
  // proxy tetap akan melempar lagi, tapi user sudah bisa login).
  if (user.id) {
    await supabase
      .from("user_profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);
  }

  // Jejak keamanan — password berubah (nilai password tidak pernah dicatat).
  await supabase
    .rpc("log_activity", {
      p_action: "update",
      p_entity_type: "user_profiles",
      p_entity_id: user.id,
      p_detail: { module: "security", password_changed: true, forced },
    })
    .then(() => undefined, () => undefined);

  return NextResponse.json({ success: true });
}
