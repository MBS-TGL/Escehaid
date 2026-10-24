import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createRateLimiter, clientIpFrom } from "@/lib/rate-limit";

/**
 * POST /api/auth/mfa/unenroll — nonaktifkan faktor TOTP milik sesi.
 * Body: { factorId }.
 */

export const runtime = "nodejs";

const rateLimit = createRateLimiter(10, 60 * 1000);

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu sering. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as { factorId?: string } | null;
  const factorId = body?.factorId || "";
  if (!factorId) {
    return NextResponse.json({ error: "factorId wajib." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // unenroll ter-scope ke user sesi; faktor belum-terverifikasi tidak tampil
  // di listFactors sehingga validasi kepemilikan tidak bisa via list.
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
