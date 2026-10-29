import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * GET  /api/auth/profile — nama tampilan + email akun sendiri (untuk
 *       seksi Profil di Pengaturan Akun).
 * POST /api/auth/profile — { fullName } → RPC `update_own_full_name`
 *       (SECURITY DEFINER, hanya kolom full_name — lihat supabase/profile-name.sql).
 *
 * Email sengaja read-only: mengganti email menyentuh alur login Supabase
 * (konfirmasi email dsb.) — bukan self-service.
 */

export const runtime = "nodejs";

const rateLimit = createRateLimiter(10, 60 * 1000);

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ fullName: profile?.full_name ?? "", email: user.email ?? "" });
}

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu sering. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as { fullName?: string } | null;
  const fullName = body?.fullName?.trim() || "";
  if (fullName.length < 2 || fullName.length > 100) {
    return NextResponse.json({ error: "Nama tampilan harus 2-100 karakter." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const userId = userData.user.id;
  const { error } = await supabase.rpc("update_own_full_name", { p_full_name: fullName });
  if (error) {
    // 42883 = function tidak ada → migrasi belum dijalankan.
    if (error.code === "42883" || /does not exist|update_own_full_name/i.test(error.message || "")) {
      return NextResponse.json(
        { error: "Fitur belum aktif: jalankan supabase/profile-name.sql di Supabase SQL Editor." },
        { status: 501 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .rpc("log_activity", {
      p_action: "update",
      p_entity_type: "user_profiles",
      p_entity_id: userId,
      p_detail: { module: "security", full_name_changed: true },
    })
    .then(() => undefined, () => undefined);

  return NextResponse.json({ success: true });
}
