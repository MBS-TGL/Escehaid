import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * Login admin: email + password diverifikasi di server; hasilnya disimpan
 * ke cookie httpOnly oleh klien @supabase/ssr — menggantikan
 * signInWithPassword langsung dari browser (Fase 2 refactor).
 */
export const runtime = "nodejs";

/** Rate limit login per-IP: 10 percobaan / 10 menit, entri di-prune otomatis. */
const rateLimit = createRateLimiter(10, 10 * 60 * 1000);

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan login. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const password = body?.password || "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  // 2FA (Supabase MFA): bila pengguna punya faktor terverifikasi, sesi AAL1
  // yang baru terbentuk belum boleh dianggap "masuk" — klien wajib
  // menyelesaikan challenge TOTP via /api/auth/mfa/verify (AAL2).
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal.data?.nextLevel === "aal2" && aal.data.currentLevel !== "aal2") {
    return NextResponse.json({ status: "mfa_required" });
  }

  return NextResponse.json({ success: true });
}
