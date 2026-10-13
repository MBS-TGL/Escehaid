import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { setDefaultResultOrder } from "node:dns";

// Sebaris pengaman yang sama dengan next.config.ts: bila proses proxy berjalan
// terpisah, query user_profiles tetap memakai IPv4 lebih dulu (hindari
// ECONNRESET yang membuat user dilempar balik ke halaman login).
setDefaultResultOrder("ipv4first");

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
    // Allow login page
    if (request.nextUrl.pathname === "/admin/login") {
      if (userId) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return supabaseResponse;
    }

    // Redirect to login if not authenticated
    if (!userId) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Fetch profile for role check
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_active, role")
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

    const role = profile.role;

    // Admin-only routes
    const adminOnlyRoutes = ["/admin/users"];
    if (adminOnlyRoutes.some((r) => request.nextUrl.pathname.startsWith(r))) {
      if (!["developer", "admin"].includes(role)) {
        return NextResponse.redirect(new URL("/admin", request.url));
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