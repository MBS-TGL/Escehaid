import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { PermissionSubject } from "@/lib/rbac";
import { clientIpFrom } from "@/lib/rate-limit";

/**
 * Sesi admin saat ini: userId + profil + daftar izin. Satu-satunya sumber
 * profil/permission untuk semua halaman admin — menggantikan query
 * user_profiles/role_permissions langsung dari browser (Fase 2 refactor).
 *
 * Sampingan: upsert baris di tabel `sessions` (daftar perangkat aktif untuk
 * /admin/security) — best-effort, kegagalan tidak memengaruhi respons utama.
 */
export const runtime = "nodejs";

/** Device singkat dari user-agent (tanpa dep). */
function parseDevice(ua: string): string {
  if (!ua) return "Perangkat tidak dikenal";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iPhone/iPad"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return [browser, os].filter(Boolean).join(" · ");
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return NextResponse.json({ session: null }, { status: 200 });
  }

  // ── Upsert sesi aktif (best-effort) ──────────────────────────────
  try {
    const { data: claims } = await supabase.auth.getClaims();
    const sessionId = (claims?.claims as { session_id?: string } | null)?.session_id;
    if (sessionId) {
      const ua = req.headers.get("user-agent") ?? "";
      const ip = clientIpFrom(req);
      await supabase
        .from("sessions")
        .upsert(
          {
            user_id: user.id,
            session_id: sessionId,
            user_agent: parseDevice(ua),
            ip,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "session_id" }
        );
      // Bersihkan baris lama (>60 hari tidak terlihat) — murah, sekali load.
      await supabase
        .from("sessions")
        .delete()
        .eq("user_id", user.id)
        .lt("last_seen_at", new Date(Date.now() - 60 * 86400_000).toISOString());
    }
  } catch {
    // Pencatatan sesi gagal (mis. tabel belum dimigrasi) — abaikan.
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
