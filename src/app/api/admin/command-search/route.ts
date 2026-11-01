import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { executeGlobalSearch } from "@/lib/admin/command-providers";
import { getAuthContext, subjectFromContext } from "@/lib/rbac/server";
import { resolvePermissions } from "@/lib/rbac";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

// Batas 60 query/menit per IP untuk search command palette admin
const rateLimit = createRateLimiter(60, 60_000);

export async function GET(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return NextResponse.json({ error: "Sesi tidak sah" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 60);

  if (!q) {
    return NextResponse.json({ groups: [], totalCount: 0 });
  }

  // Izin efektif dari RBAC (system_role + role_permissions, fallback legacy)
  // — bukan daftar hardcoded per legacy role, supaya menu/aksi baru yang
  // ditambahkan ke STATIC_ACTIONS otomatis terlihat pemegang izinnya.
  const ctx = await getAuthContext();
  const subject = subjectFromContext(ctx);
  if (!ctx || !subject) {
    return NextResponse.json({ error: "Akun nonaktif" }, { status: 403 });
  }
  const perms = resolvePermissions(subject);

  const results = await executeGlobalSearch(supabase, q, perms);
  return NextResponse.json(results);
}
