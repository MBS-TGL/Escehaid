import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
      // If already logged in, redirect to admin dashboard
      if (user) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return supabaseResponse;
    }

    // Redirect to login if not authenticated
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Check if user is active
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_active, role")
      .eq("id", user.id)
      .single();

    // Redirect if profile not found or inactive
    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/admin/login?error=inactive", request.url));
    }

    // Developer-only routes
    const devOnlyRoutes = ["/admin/users"];
    if (devOnlyRoutes.some((r) => request.nextUrl.pathname.startsWith(r))) {
      if (profile.role !== "developer") {
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
