import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { forbiddenResponseIfLacks } from "@/lib/rbac/server";

/**
 * Signed URL dokumen SPMB dikelola admin (pratinjau di pendaftar)
 * — diprajalankan server, bukan createSignedUrl dari browser (Fase 3).
 */
export const runtime = "nodejs";

const RE = /^spmb-\d{4}\/[\w.-]{1,80}\/[\w.-]{1,80}$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { path?: string } | null;
  const path = body?.path || "";
  if (!RE.test(path)) {
    return NextResponse.json({ error: "Path dokumen tidak valid." }, { status: 400 });
  }

  const denied = await forbiddenResponseIfLacks("spmb:read");
  if (denied) return NextResponse.json(denied.body, { status: denied.status });

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("spmb-documents")
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Gagal membuat tautan dokumen." },
      { status: 502 }
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
