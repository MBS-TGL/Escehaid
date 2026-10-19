import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { PermissionSubject } from "@/lib/rbac";

/**
 * Sesi admin saat ini: userId + profil + daftar izin. Satu-satunya sumber
 * profil/permission untuk semua halaman admin — menggantikan query
 * user_profiles/role_permissions langsung dari browser (Fase 2 refactor).
 */
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return NextResponse.json({ session: null }, { status: 200 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, role, system_role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    // Profil tidak ada / nonaktif — anggap sesi kosong (layout melempar ke login).
    return NextResponse.json({ session: null }, { status: 200 });
  }

  let permissions: string[] = [];
  if (profile.system_role) {
    const { data: rows } = await supabase
      .from("role_permissions")
      .select("permission")
      .eq("role_key", profile.system_role);
    permissions = (rows ?? []).map((r) => r.permission as string);
  }

  const subject: PermissionSubject = {
    system_role: profile.system_role,
    role: profile.role,
    is_active: profile.is_active,
    permissions,
  };

  return NextResponse.json({
    session: {
      userId: user.id,
      email: user.email ?? "",
      profile: {
        full_name: profile.full_name,
        role: profile.role,
        system_role: profile.system_role,
        is_active: profile.is_active,
      },
      subject,
    },
  });
}
