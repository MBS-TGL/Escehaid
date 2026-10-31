import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { executeGlobalSearch } from "@/lib/admin/command-providers";
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

  // Ambil role pengguna aktif untuk menyaring izin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", userId)
    .single();

  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Akun nonaktif" }, { status: 403 });
  }

  // Jika developer/admin, beri izin penuh di command palette
  const perms = profile.role === "developer"
    ? ["*"]
    : profile.role === "admin"
      ? ["berita:read", "artikel:read", "spmb:read", "kontak:read", "analitik:read", "backup:read", "logs:read"]
      : ["berita:read", "artikel:read"];

  const results = await executeGlobalSearch(supabase, q, perms);
  return NextResponse.json(results);
}
