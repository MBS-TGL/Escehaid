import { NextResponse } from "next/server";
import { getAuthContext, subjectFromContext } from "@/lib/rbac/server";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * GET /api/admin/badges — angka notifikasi sidebar/bottom-nav.
 *
 * Hanya menghitung entitas yang izinnya dimiliki pengguna; tidak membocorkan
 * jumlah modul yang tidak boleh dibuka. Head-count dipakai supaya payload
 * minimal.
 */
export async function GET() {
  const ctx = await getAuthContext();
  const subject = subjectFromContext(ctx);
  if (!ctx || !subject) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const supabase = await createClient();
  const badges: Record<string, number> = {};

  const queries: Promise<void>[] = [];

  if (can(subject, "kontak:read")) {
    queries.push(
      (async () => {
        const { count } = await supabase
          .from("contact_messages")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false);
        if (count) badges["/admin/contact"] = count;
      })()
    );
  }

  if (can(subject, "spmb:read")) {
    queries.push(
      (async () => {
        const { count } = await supabase
          .from("spmb_registrations")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        if (count) badges["/admin/admission"] = count;
      })()
    );
  }

  if (can(subject, "berita:read")) {
    queries.push(
      (async () => {
        const { count } = await supabase
          .from("news")
          .select("id", { count: "exact", head: true })
          .eq("is_published", false);
        if (count) badges["/admin/news"] = count;
      })()
    );
  }

  await Promise.all(queries);

  return NextResponse.json({ badges }, { headers: { "Cache-Control": "no-store" } });
}
