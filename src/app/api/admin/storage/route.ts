import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { forbiddenResponseIfLacks } from "@/lib/rbac/server";
import { storageFrom, type StorageBucket } from "@/lib/storage";

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

const MIME: Record<string, Set<string>> = {
  images: new Set(["image/jpeg", "image/png", "image/webp"]),
  documents: new Set(["application/pdf"]),
  "spmb-documents": new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
};

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const PDF_EXT = new Set(["pdf"]);

const PATH_RE = /^[\w][\w./ -]{0,238}$/;

function pathValid(path: string): boolean {
  if (!PATH_RE.test(path) || path.includes("..") || path.startsWith("/")) return false;
  return true;
}

const sizeError = (name: string) =>
  NextResponse.json({ error: `File "${name}" terlalu besar. Maksimal 10 MB.` }, { status: 413 });

export async function POST(req: Request) {
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
  const contentType = (file.type || "").toLowerCase();
  const bought = bucket === "images";

  // Verifikasi sederhana: bucket images trafik dari input <input type="file"
  // accept="image/*">.
  const extOk = bought
    ? IMAGE_EXT.has(ext)
    : bucket === "documents"
      ? PDF_EXT.has(ext)
      : PDF_EXT.has(ext) || IMAGE_EXT.has(ext);
  const mimeOk = contentType ? MIME[bucket].has(contentType) : false;
  if (!mimeOk || !extOk) {
    return NextResponse.json(
      {
        error:
          `Format "${contentType || ext}" tidak didukung untuk bucket "${bucket}". ` +
          "Gunakan PDF, JPG, PNG, atau WEBP.",
      },
      { status: 415 }
    );
  }

  const supabase = await createClient();
  const { error } = await storageFrom(bucket as StorageBucket, supabase).upload(path, file, {
    contentType,
    upsert: false,
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

  return NextResponse.json({ success: true, path });
}

export async function DELETE(req: Request) {
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
