/**
 * Klien sisi browser untuk operasi storage yang WAJIB berjalan di server —
 * kredensial R2 (S3) tidak boleh pernah ada di bundel klien.
 *
 * Semua fungsi membungkus `/api/admin/storage` (auth sesi admin + RBAC):
 *
 *   uploadFileViaRoute(bucket, path, file, opts) → { path, url, error }
 *   listViaRoute(bucket, prefix)               → { data: StorageEntry[], error }   (bentuk meniru adapter)
 *   removeViaRoute(bucket, paths)              → { data, error }
 *   signedUrlViaRoute(path)                    → signedUrl | null                  (bucket spmb-documents)
 */

export type UploadRouteResult = { path: string | null; url: string | null; error: string | null };

export async function uploadFileViaRoute(
  bucket: "images" | "documents" | "spmb-documents",
  path: string,
  file: File,
  options?: { upsert?: boolean; cacheControl?: string; contentType?: string }
): Promise<UploadRouteResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("bucket", bucket);
  form.append("path", path);
  if (options?.upsert) form.append("upsert", "true");
  if (options?.cacheControl) form.append("cacheControl", options.cacheControl);
  const ext = (path.split(".").pop() || file.name.split(".").pop() || "").toLowerCase();
  if (ext) form.append("ext", ext);

  try {
    const res = await fetch("/api/admin/storage", { method: "POST", body: form });
    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; path?: string; url?: string | null; error?: string }
      | null;
    if (!res.ok || !json?.success) {
      return { path: null, url: null, error: json?.error || `Gagal mengunggah (HTTP ${res.status}).` };
    }
    return { path: json.path ?? path, url: json.url ?? null, error: null };
  } catch (e) {
    return { path: null, url: null, error: e instanceof Error ? e.message : "Jaringan gagal." };
  }
}

/** Bentuk entri mengikuti adapter storage (folder: id & metadata null). */
export interface RemoteStorageEntry {
  id: string | null;
  name: string;
  metadata: { size?: number; mimetype?: string | null } | null;
  created_at: string | null;
}

export type ListRouteResult = {
  data: RemoteStorageEntry[] | null;
  error: { message: string; status?: number } | null;
};

export async function listViaRoute(
  bucket: "images" | "documents" | "spmb-documents",
  prefix: string
): Promise<ListRouteResult> {
  try {
    const res = await fetch(
      `/api/admin/storage?bucket=${encodeURIComponent(bucket)}&prefix=${encodeURIComponent(prefix)}`,
      { cache: "no-store" }
    );
    const json = (await res.json().catch(() => null)) as ListRouteResult | null;
    if (json) return json;
    return { data: null, error: { message: `HTTP ${res.status}`, status: res.status } };
  } catch (e) {
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : "Jaringan gagal.", status: 0 },
    };
  }
}

export type RemoveRouteResult = {
  data: { name: string }[] | null;
  error: { message: string; status?: number } | null;
};

export async function removeViaRoute(
  bucket: "images" | "documents" | "spmb-documents",
  paths: string[]
): Promise<RemoveRouteResult> {
  try {
    const res = await fetch("/api/admin/storage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, paths }),
    });
    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; error?: string }
      | null;
    if (!res.ok || !json?.success) {
      return {
        data: null,
        error: { message: json?.error || `Gagal menghapus (HTTP ${res.status}).`, status: res.status },
      };
    }
    return { data: paths.map((p) => ({ name: p.split("/").pop() || p })), error: null };
  } catch (e) {
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : "Jaringan gagal.", status: 0 },
    };
  }
}

/** URL bertanda tangan (1 jam) untuk bucket privat SPMB. */
export async function signedUrlViaRoute(path: string): Promise<string | null> {
  try {
    const res = await fetch("/api/admin/storage/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const json = (await res.json().catch(() => null)) as
      | { signedUrl?: string; error?: string }
      | null;
    if (!res.ok || !json?.signedUrl) {
      console.error("signed-url gagal:", json?.error || `HTTP ${res.status}`);
      return null;
    }
    return json.signedUrl;
  } catch (e) {
    console.error("signed-url error:", e);
    return null;
  }
}
