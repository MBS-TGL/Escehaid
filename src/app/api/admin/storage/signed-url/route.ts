import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { forbiddenResponseIfLacks } from "@/lib/rbac/server";
import { storageFrom } from "@/lib/storage";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * Signed URL dokumen SPMB dikelola admin (pratinjau di pendaftar)
 * — dieksekusi di server, bukan createSignedUrl dari browser (Fase 3).
 */
export const runtime = "nodejs";

/** Rate limit per IP: 60 permintaan signed-url / 10 menit. */
const rateLimit = createRateLimiter(60, 10 * 60 * 1000);

// Path berkas SPMB di bucket privat: awalan "spmb-..." — Media Library juga
// memakai ini untuk pratinjau dokumen pendaftar (path bisa lebih dalam dari
// struktur <spmb-<reg>/<folder>/<file>), jadi langkah dibebaskan.
const RE = /^spmb-[\w./-]{1,240}$/;

export async function POST(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan tautan dokumen. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as { path?: string } | null;
  const path = body?.path || "";
  if (!RE.test(path)) {
    return NextResponse.json({ error: "Path dokumen tidak valid." }, { status: 400 });
  }

  const denied = await forbiddenResponseIfLacks("spmb:read");
  if (denied) return NextResponse.json(denied.body, { status: denied.status });

  const supabase = await createClient();
  const { data, error } = await storageFrom("spmb-documents", supabase).createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Gagal membuat tautan dokumen." },
      { status: 502 }
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
