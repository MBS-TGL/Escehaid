import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { setDefaultResultOrder } from "node:dns";
import { can } from "@/lib/rbac";
import { unstable_cache } from "next/cache";

// Sebaris pengaman yang sama dengan next.config.ts: bila proses proxy berjalan
// terpisah, query user_profiles tetap memakai IPv4 lebih dulu (hindari
// ECONNRESET yang membuat user dilempar balik ke halaman login).
setDefaultResultOrder("ipv4first");

/**
 * Cache maintenance_mode flag di proxy (tanpa DB hit per request).
 * TTL 30 detik — cukup cepat untuk admin toggle, cukup hemat untuk traffic.
 */
const getMaintenanceMode = unstable_cache(
  async function getMaintenanceMode(): Promise<boolean> {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_ANON_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled, start_at, end_at")
      .eq("key", "maintenance_mode")
      .single();
    if (!data) return false;
    const now = new Date();
    if (data.start_at && now < new Date(data.start_at)) return false;
    if (data.end_at && now > new Date(data.end_at)) return false;
    return data.enabled === true;
  },
  ["proxy-maintenance-mode"],
  { revalidate: 30, tags: ["feature-flags"] }
);

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
  ["/admin/diagnostics", "diagnostik:read"],
  ["/admin/trash", "sampah:read"],
  ["/admin/sql", "users:manage"],
];

/** Rute yang diizinkan tanpa cek izin (masih butuh login + aktif). */
const EXEMPT_PREFIXES = ["/admin/403", "/admin/change-password"];

/**
 * Redirect yang ikut menyalin SEMUA cookie dari `supabaseResponse` — wajib
 * untuk redirect yang didahului `auth.signOut()`. Cookie penghapus sesi hanya
 * ditulis ke `supabaseResponse` (lewat `setAll`); tanpa disalin ke response
 * redirect, browser tetap menyimpan sesi lama dan /admin ⇄ /admin/login
 * saling me-redirect tanpa henti (ERR_TOO_MANY_REDIRECTS).
 */
function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of supabaseResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

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

  // ── Maintenance mode short-circuit (PUBLIK saja) ─────────────────────────
  // Cek sebelum segala sesi agar halaman maintenance dilayankan secepat
  // mungkin tanpa query user_profiles/dll. Admin (/admin) DIKECUALIKAN.
  // Rewritten ke /maintenance.html — path ini juga dijaga di sini agar
  // tidak terjadi loop bila matcher berubah.
  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname.startsWith("/admin");
  if (!isAdminPath && pathname !== "/maintenance.html") {
    const maintenance = await getMaintenanceMode();
    if (maintenance) {
      return NextResponse.rewrite(new URL("/maintenance.html", request.url), {
        status: 503,
        headers: {
          "Retry-After": "60",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
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

    // Allow login page. Bila ada `?error=…` (hasil guard no_profile/inactive
    // di bawah), tampilkan halaman login apa adanya agar pesan error terbaca —
    // jangan redirect balik ke /admin walau cookie lama masih ada, itu pemicu
    // loop. Redirect ke /admin hanya untuk sesi yang valid.
    if (path === "/admin/login") {
      if (userId && !request.nextUrl.searchParams.has("error")) {
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
      return redirectWithCookies(
        new URL("/admin/login?error=no_profile", request.url),
        supabaseResponse
      );
    }

    // Redirect if inactive
    if (!profile.is_active) {
      await supabase.auth.signOut();
      return redirectWithCookies(
        new URL("/admin/login?error=inactive", request.url),
        supabaseResponse
      );
    }

    // 2FA (Supabase MFA): pengguna yang mendaftarkan faktor TOTP wajib
    // menyelesaikan challenge (AAL2) sebelum halaman admin mana pun. Sesi
    // AAL1 hasil login email+password diarahkan ke step verifikasi.
    if (path !== "/admin/login") {
      try {
        const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal.data?.nextLevel === "aal2" && aal.data.currentLevel !== "aal2") {
          return redirectWithCookies(
            new URL("/admin/login?mfa=required", request.url),
            supabaseResponse
          );
        }
      } catch {
        // MFA tidak tersedia / error — jangan blokir login.
      }
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

// Proxy harus berjalan di SEMUA halaman (publik + admin) supaya short-circuit
// maintenance mode dieksekusi. Kecualikan aset statis & file metadata — mereka
// tidak butuh sesi/maintenance gate, dan membatasi matcher ke sini membuat
// CSS/JS/gambar tetap termuat saat situs dalam pemeliharaan.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|html|json|js|css|woff2?|ttf)$).*)",
  ],
};
