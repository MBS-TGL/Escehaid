import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canAccessAdminPanel } from "@/lib/auth";

const ALLOWED_PATHS = new Set(["/", "/news", "/admission"]);
function isAllowedPath(p: unknown): boolean {
  if (typeof p !== "string") return false;
  if (!p.startsWith("/")) return false;
  if (ALLOWED_PATHS.has(p)) return true;
  if (p.startsWith("/news/") && p.length > 6) return true;
  return false;
}

/** Respons error singkat tanpa membocorkan data. */
function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST /api/revalidate
 * Header: Authorization: Bearer <supabase-access-token>
 * Body:   { paths: string[] }
 */
export async function POST(req: NextRequest) {
  // ── 1. Auth via bearer token ──────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return errorResponse("unauthenticated", 401);
  }

  // Client tanpa cookie, SEMUA request membawa token milik pengguna
  // (Authorization: Bearer <token>) sehingga query ke PostgREST ikut
  // terautentikasi sebagai pemilik token → RLS "Users read own profile"
  // (id = auth.uid()) terpenuhi dan baris profilnya terbaca.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return errorResponse("unauthenticated", 401);
  }

  // ── Cek role memakai helper bersama (satu daftar role untuk semua) ──
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    // Jangan bocorkan pesan error internal Supabase
    return errorResponse("profile_lookup_failed", 500);
  }
  if (!profile) {
    return errorResponse("profile_not_found", 403);
  }
  if (!canAccessAdminPanel(profile)) {
    return errorResponse(profile.is_active ? "role_not_allowed" : "inactive", 403);
  }

  // ── 2. Validasi body ──────────────────────────────────────
  let body: { paths?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body?.paths)) {
    return NextResponse.json({ error: "paths must be an array" }, { status: 400 });
  }
  if (body.paths.length > 50) {
    return NextResponse.json({ error: "Too many paths (max 50)" }, { status: 400 });
  }

  const invalid = body.paths.find((p) => !isAllowedPath(p));
  if (invalid !== undefined) {
    return NextResponse.json({ error: `Invalid path: ${invalid}` }, { status: 400 });
  }

  const paths = body.paths as string[];
  if (paths.length === 0) {
    return NextResponse.json({ revalidated: [] });
  }

  // ── 3. Revalidate ─────────────────────────────────────────
  for (const p of paths) {
    revalidatePath(p);
  }

  return NextResponse.json({ revalidated: paths });
}
