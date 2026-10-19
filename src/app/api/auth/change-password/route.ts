import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Ganti password admin — dijalankan server dengan sesi milik cookies
 * httpOnly (menggantikan auth.updateUser dari browser, Fase 2).
 * Flag must_change_password ikut dibersihkan bila memungkinkan.
 */
export const runtime = "nodejs";

const MIN_LEN = 8;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password || "";
  if (password.length < MIN_LEN) {
    return NextResponse.json(
      { error: `Password minimal ${MIN_LEN} karakter.` },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json(
      { error: error.message || "Gagal mengganti password." },
      { status: 500 }
    );
  }

  // Bersihkan flag must_change_password (best-effort; policy belum ada → biarkan,
  // proxy tetap akan melempar lagi, tapi user sudah bisa login).
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (userId) {
    await supabase
      .from("user_profiles")
      .update({ must_change_password: false })
      .eq("id", userId);
  }

  return NextResponse.json({ success: true });
}
