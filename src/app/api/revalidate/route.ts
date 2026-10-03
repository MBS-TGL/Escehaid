import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ALLOWED_PATHS = new Set(["/", "/news"]);
function isAllowedPath(p: unknown): boolean {
  if (typeof p !== "string") return false;
  if (!p.startsWith("/")) return false;
  if (ALLOWED_PATHS.has(p)) return true;
  if (p.startsWith("/news/") && p.length > 6) return true;
  return false;
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Buat client Supabase tanpa cookies (pakai token langsung)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cek role admin di user_profiles
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active || !["developer", "admin", "publisher"].includes(profile.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
