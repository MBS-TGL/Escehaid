import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { setDefaultResultOrder } from "node:dns";
import { can } from "@/lib/rbac";

// Sebaris pengaman yang sama dengan next.config.ts: bila proses proxy berjalan
// terpisah, query user_profiles tetap memakai IPv4 lebih dulu (hindari
// ECONNRESET yang membuat user dilempar balik ke halaman login).
setDefaultResultOrder("ipv4first");

/**
 * Peta rute admin → izin yang dibutuhkan. Hanya rute SISTEM yang digate di
 * sini; modul legacy tetap mengandalkan RLS + guard aplikasi (lihat ringkasan
 * akhir — jalur tulis legacy langsung dari browser ke PostgREST).
 *
 * `/admin/403` dan `/admin/change-password` sengaja tidak digate agar halaman
 * tujuan bisa dimuat (masih butuh login).
 */
const ROUTE_PERMISSIONS: ReadonlyArray<[prefix: string, perm: string]> = [
  ["/admin/users", "users:manage"],
  ["/admin/logs", "logs:read"],
  ["/admin/settings", "settings:manage"],
  ["/admin/flags", "flags:manage"],
];

/** Rute yang diizinkan tanpa cek izin (masih butuh login + aktif). */
const EXEMPT_PREFIXES = ["/admin/403", "/admin/change-password"];

function requiredPermissionFor(pathname: string): string | null {
  for (const prefix of EXEMPT_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return null;
  }
  for (const [prefix, perm] of ROUTE_PERMISSIONS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return perm;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() memverifikasi JWT secara LOKAL (tanpa round-trip ke server Auth
  // Supabase) bila project memakai JWT signing keys asimetris; bila tidak, ia
  // otomatis jatuh ke pemeriksaan jaringan seperti getUser(). Tanpa ini, setiap
  // pindah halaman admin menambah satu panggilan jaringan berurutan.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const path = request.nextUrl.pathname;

    // Allow login page
    if (path === "/admin/login") {
      if (userId) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return supabaseResponse;
    }

    // Redirect to login if not authenticated
    if (!userId) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Fetch profile for role + RBAC check
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_active, role, system_role, must_change_password")
      .eq("id", userId)
      .single();

    // Redirect if profile not found (user needs to be set up)
    if (!profile) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/admin/login?error=no_profile", request.url));
    }

    // Redirect if inactive
    if (!profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/admin/login?error=inactive", request.url));
    }

    // Paksa ganti password (reset oleh admin) — lempar ke halaman ganti password
    // kecuali user sudah berada di sana.
    if (
      profile.must_change_password === true &&
      !path.startsWith("/admin/change-password")
    ) {
      return NextResponse.redirect(new URL("/admin/change-password", request.url));
    }

    // Gate izin untuk rute SISTEM → halaman 403 ramah bila tidak punya izin.
    const needed = requiredPermissionFor(path);
    if (needed) {
      // Resolve izin (role_permissions) hanya untuk rute tergated (hemat query).
      let permissions: string[] = [];
      if (profile.system_role) {
        const { data: rows } = await supabase
          .from("role_permissions")
          .select("permission")
          .eq("role_key", profile.system_role);
        permissions = (rows ?? []).map((r) => r.permission as string);
      }
      const subject = {
        system_role: profile.system_role,
        role: profile.role,
        is_active: profile.is_active,
        permissions,
      };
      if (!can(subject, needed)) {
        return NextResponse.redirect(
          new URL(`/admin/403?perlu=${encodeURIComponent(needed)}`, request.url)
        );
      }
    }
  }

  return supabaseResponse;
}

// Hanya rute admin yang butuh pengecekan sesi. Matcher lama menjalankan proxy
// di SEMUA halaman publik juga (berita, kegiatan, dst.), padahal tidak ada
// logika yang dipakai di sana.
export const config = {
  matcher: ["/admin/:path*"],
};
