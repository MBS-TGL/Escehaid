import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Reset password admin: kirim email tautan reset dari server —
 * menggantikan resetPasswordForEmail langsung dari browser (Fase 2).
 * `redirectTo` didapat dari request agar origin preview/prod tetap benar;
 * Supabase hanya mengikuti domain yang di-allowlist di Auth config.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; redirectTo?: string }
    | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }

  // Origin yang diizinkan: hanya scheme+origin, tanpa path aneh.
  let redirectTo = `${body?.redirectTo ?? ""}/admin/login`;
  try {
    const u = new URL(redirectTo);
    redirectTo = `${u.origin}/admin/login`;
  } catch {
    redirectTo = "/admin/login";
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return NextResponse.json(
      { error: "Gagal mengirim email reset password." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
