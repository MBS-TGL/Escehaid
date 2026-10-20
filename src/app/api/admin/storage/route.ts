import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { forbiddenResponseIfLacks } from "@/lib/rbac/server";
import { storageFrom, type StorageBucket } from "@/lib/storage";
import { clientIpFrom, createRateLimiter } from "@/lib/rate-limit";

/**
 * Storage admin sisi server — menggantikan akses storage langsung dari
 * browser pada panel admin (refactor Fase 3).
 *
 *   POST   → upload berkas (multipart: file, bucket, path)
 *   DELETE → hapus berkas (JSON: bucket, paths)
 *
 * Otorisasi per-bucket:
 *   images / documents  → media:upload (upload), media:delete (hapus)
 *   spmb-documents      → spmb:update
 */
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const BUCKETS = new Set(["images", "documents", "spmb-documents"]);

/** Per-bucket izin list (GET) — Media Library boleh melihat isi ketiganya. */
const LIST_PERM: Record<string, string> = {
  images: "media:read",
  documents: "media:read",
  "spmb-documents": "spmb:read",
};

const MIME: Record<string, Set<string>> = {
  images: new Set(["image/jpeg", "image/png", "image/webp"]),
  // documents menerima universe sama dengan checkDownloadFile + lampiran berita
  // (office/arsip/teks/gambar) — klien yang memvalidasi akhirnya juga.
  documents: new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/x-rar-compressed",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/octet-stream",
  ]),
  "spmb-documents": new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
};

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const PDF_EXT = new Set(["pdf"]);
/** Universe ekstensi bucket documents (lampiran berita + berkas downloads). */
const DOC_EXT = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "zip", "rar", "txt", "jpg", "jpeg", "png", "webp",
]);

const PATH_RE = /^[\w][\w./ -]{0,238}$/;

/** Rate limit per IP untuk POST & DELETE: 60 aksi / 10 menit (GET tidak dibatasi). */
const rateLimit = createRateLimiter(60, 10 * 60 * 1000);

function pathValid(path: string): boolean {
  if (!PATH_RE.test(path) || path.includes("..") || path.startsWith("/")) return false;
  return true;
}

const sizeError = (name: string) =>
  NextResponse.json({ error: `File "${name}" terlalu besar. Maksimal 10 MB.` }, { status: 413 });

/** Perkiraan Content-Type dari ekstensi — dipakai bila klien tak mengirim type. */
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  txt: "text/plain",
};

/**
 * GET: daftar entri bucket untuk Media Library. Bentuk respons meniru hasil
 * adapter `list()` ({ data: StorageEntry[] , error }) agar logika walk sisi
 * klien tidak berubah. Metadata mimetype diisi dari ekstensi (ListObjectsV2
 * tidak menyediakan Content-Type per objek).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket") || "";
  const prefix = url.searchParams.get("prefix") || "";

  if (!BUCKETS.has(bucket)) {
    return NextResponse.json({ data: null, error: { message: "Bucket tidak valid.", status: 400 } });
  }
  const denied = await forbiddenResponseIfLacks(LIST_PERM[bucket]);
  if (denied) {
    return NextResponse.json({ data: null, error: { message: denied.body?.error ?? "Akses ditolak.", status: denied.status } });
  }

  const { data, error } = await storageFrom(bucket as StorageBucket).list(prefix, { limit: 1000 });

  if (error) {
    return NextResponse.json({ data: null, error });
  }

  // Lengkapi mimetype tiap entri file dari ekstensinya.
  const entries = (data ?? []).map((entry) => {
    if (entry.id === null || entry.metadata === null) return entry; // folder
    const ext = (entry.name.split(".").pop() || "").toLowerCase();
    const mimetype = EXT_MIME[ext] ?? "";
    return { ...entry, metadata: { ...entry.metadata, mimetype } };
  });

  return NextResponse.json({ data: entries, error: null });
}

export async function POST(req: Request) {
  // Cek rate limit SEBELUM menelan body (formData hingga 10 MB).
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak aksi storage. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Body harus multipart/form-data." }, { status: 400 });
  }

  const bucket = String(form.get("bucket") || "");
  const path = String(form.get("path") || "");
  const file = form.get("file");

  if (!BUCKETS.has(bucket) || !pathValid(path) || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Parameter bucket/path/file tidak valid." },
      { status: 400 }
    );
  }

  // Otorisasi sesuai bucket.
  const perm = bucket === "spmb-documents" ? "spmb:update" : "media:upload";
  const denied = await forbiddenResponseIfLacks(perm);
  if (denied) return NextResponse.json(denied.body, { status: denied.status });

  if (file.size > MAX_BYTES) {
    return sizeError(file.name || path);
  }

  const ext = String(form.get("ext") || (file.name.split(".").pop() || "")).toLowerCase();
  const contentType = (file.type || EXT_MIME[ext] || "").toLowerCase();
  const upsert = (form.get("upsert") || "") === "true";
  const cacheControl = String(form.get("cacheControl") || "") || undefined;
  const bought = bucket === "images";

  // Verifikasi sederhana: bucket images trafik dari input <input type="file"
  // accept="image/*">.
  const extOk = bought
    ? IMAGE_EXT.has(ext)
    : bucket === "documents"
      ? DOC_EXT.has(ext)
      : PDF_EXT.has(ext) || IMAGE_EXT.has(ext);
  // octet-stream: nilai aman bila peramban tak mengirim tipe (mis. .rar).
  const safeType = contentType || "application/octet-stream";
  const mimeOk = MIME[bucket].has(safeType);
  if (!mimeOk || !extOk) {
    return NextResponse.json(
      {
        error:
          `Format "${safeType || ext}" tidak didukung untuk bucket "${bucket}". ` +
          "Gunakan PDF, JPG, PNG, atau WEBP.",
      },
      { status: 415 }
    );
  }

  const supabase = await createClient();
  const { error } = await storageFrom(bucket as StorageBucket, supabase).upload(path, file, {
    contentType: contentType || undefined,
    cacheControl,
    upsert,
  });
  if (error) {
    const msg = error.message || "";
    if (msg.includes("file_size")) return sizeError(file.name || path);
    if (msg.includes("mime")) {
      return NextResponse.json(
        {
          error: `Format "${contentType}" tidak didukung. Gunakan PDF, JPG, PNG, atau WEBP.`,
        },
        { status: 415 }
      );
    }
    return NextResponse.json(
      { error: `Gagal upload "${file.name || path}". ${msg}` },
      { status: 502 }
    );
  }

  // URL publik dihitung di server (driver apa pun) supaya klien tak perlu
  // mengubah path → URL sendiri.
  const { data: pub } = storageFrom(bucket as StorageBucket).getPublicUrl(path);
  return NextResponse.json({ success: true, path, url: pub?.publicUrl ?? null, upsert });
}

export async function DELETE(req: Request) {
  const { allowed, retryAfterSec } = rateLimit.check(clientIpFrom(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak aksi storage. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { bucket?: string; paths?: string[] }
    | null;
  const bucket = body?.bucket || "";
  const paths = (body?.paths || []).filter(
    (p): p is string => typeof p === "string" && pathValid(p)
  );
  if (!BUCKETS.has(bucket) || paths.length === 0) {
    return NextResponse.json({ error: "Parameter bucket/paths tidak valid." }, { status: 400 });
  }

  const perm = bucket === "spmb-documents" ? "spmb:update" : "media:delete";
  const denied = await forbiddenResponseIfLacks(perm);
  if (denied) return NextResponse.json(denied.body, { status: denied.status });

  const supabase = await createClient();
  const { error } = await storageFrom(bucket as StorageBucket, supabase).remove(paths);

  if (error) {
    return NextResponse.json(
      { error: `Gagal menghapus ${paths.length} berkas. ${error.message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
