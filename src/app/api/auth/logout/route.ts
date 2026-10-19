import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/** Logout admin di server — menghapus cookies sesi (menggantikan
 * auth.signOut dari browser, Fase 2). */
export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
