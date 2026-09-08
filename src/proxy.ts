import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Allow login page
    if (request.nextUrl.pathname === "/admin/login") {
      if (user) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return supabaseResponse;
    }

    // Redirect to login if not authenticated
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Fetch profile for role check
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_active, role")
      .eq("id", user.id)
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|api).*)",
  ],
};