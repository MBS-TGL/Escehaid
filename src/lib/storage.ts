import { supabase } from "./supabase";
import type { S3Client as R2Client } from "@aws-sdk/client-s3";

/**
 * Storage adapter — satu antarmuka 5 operasi dengan dua driver:
 *
 *   - `supabase` (default) → Supabase Storage seperti saat ini.
 *   - `r2`                 → Cloudflare R2 (S3-compatible, egress gratis).
 *
 * Saklar: env `STORAGE_DRIVER=r2` (default `supabase`). Cutover/rollback
 * cukup dengan mengganti satu env var — kode pemakai tidak berubah.
 *
 * Bentuk return dijiplak ke kontrak supabase-js (`data` / `error`) supaya
 * refactor call site seminimal mungkin.
 */

export type StorageBucket = "images" | "documents" | "spmb-documents";

export type StorageError = {
  message: string;
  /** HTTP status mentah (4xx/5xx) — dipakai decoder retry media.ts. */
  status?: number;
  /** Memudahkan kompatibilitas dengan kode yang membaca `error.statusCode` — sekarang juga dgn R2. */
  statusCode?: string;
};

/** Satu anak folder/file hasil list() — mirror FileObject Supabase. */
export type StorageEntry = {
  id: string | null;
  name: string;
  metadata: { size: number; mimetype: string } | null;
  created_at: string | null;
};

export type StorageUploadOptions = {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
};

export type StorageApi = {
  upload(
    path: string,
    fileBody: File | Buffer | ArrayBuffer | Uint8Array | Blob,
    options?: StorageUploadOptions
  ): Promise<{ data: { path: string } | null; error: StorageError | null }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
  remove(paths: string[]): Promise<{ data: { name: string }[] | null; error: StorageError | null }>;
  list(
    prefix?: string,
    options?: { limit?: number; sortBy?: { column: string; order: "asc" | "desc" } }
  ): Promise<{ data: StorageEntry[] | null; error: StorageError | null }>;
  createSignedUrl(
    path: string,
    expiresIn: number
  ): Promise<{ data: { signedUrl: string } | null; error: StorageError | null }>;
};

// ============ SUPABASE DRIVER ============

export type StorageClient = {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: unknown,
        options?: Record<string, unknown>
      ): Promise<{ data: { path: string } | null; error: { message: string; status?: number; statusCode?: string } | null }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
      remove(paths: string[]): Promise<{ data: { name: string }[] | null; error: { message: string; status?: number } | null }>;
      list(
        prefix?: string,
        options?: { limit?: number; sortBy?: { column: string; order: "asc" | "desc" } }
      ): Promise<{
        data:
          | {
              id: string | null;
              name: string;
              metadata: { size: number; mimetype: string } | null;
              created_at: string | null;
            }[]
        | null;
        error: { message: string; status?: number; statusCode?: string } | null;
      }>;
      createSignedUrl(
        path: string,
        expiresIn: number
      ): Promise<{ data: { signedUrl: string } | null; error: { message: string; status?: number } | null }>;
    };
  };
};

function toStorageError(e: { message?: string; status?: number; statusCode?: string } | null | undefined): StorageError | null {
  if (!e) return null;
  return { message: e.message || "Gagal mengakses storage.", status: e.status, statusCode: e.statusCode };
}

function createSupabaseDriver(client: StorageClient, bucket: string): StorageApi {
  const backend = client.storage.from(bucket);
  return {
    upload: async (path, fileBody, options) => {
      const { data, error } = await backend.upload(path, fileBody, options ?? {});
      return { data, error: toStorageError(error) };
    },
    getPublicUrl: (path) => ({ data: { publicUrl: backend.getPublicUrl(path).data.publicUrl } }),
    remove: async (paths) => {
      const { data, error } = await backend.remove(paths as string[]);
      return { data, error: toStorageError(error) };
    },
    list: async (prefix, options) => {
      const { data, error } = await backend.list(prefix ?? "", options);
      return { data, error: toStorageError(error) };
    },
    createSignedUrl: async (path, expiresIn) => {
      const { data, error } = await backend.createSignedUrl(path, expiresIn);
      return { data, error: toStorageError(error) };
    },
  };
}

// ============ R2 DRIVER (Cloudflare, S3-compatible) ============

/**
 * Mapping env R2:
 *   R2_ACCOUNT_ID       — id akun Cloudflare (endpoint: https://<id>.r2.cloudflarestorage.com)
 *   R2_ACCESS_KEY_ID    — S3 credentials dari Cloudflare dashboard
 *   R2_SECRET_ACCESS_KEY — (pasangan di atas)
 *   R2_PUBLIC_BASE_URL  — custom domain publik bucket, mis. https://cdn.domain.sch.id
 *   R2_BUCKET           — bucket PUBLIK: images + documents (default "esceha-cdn")
 *   R2_PRIVATE_BUCKET   — bucket PRIVAT: spmb-documents (default "esceha-private"),
 *                         diakses hanya via presigned URL — tidak di-bind domain publik
 *
 * Objek dilayani sebagai `<R2_PUBLIC_BASE_URL>/<bucketSupabase>/<path>` — custom
 * domain R2 memetakan URL path langsung ke key, jadi key fisik di dalam bucket
 * adalah `<bucketSupabase>/<path>` TANPA prefix nama bucket R2. Pemisahan
 * publik/privat lewat bucket berbeda (spmb-documents tidak pernah bocor ke CDN).
 *
 * Kredensial (ACCOUNT_ID/KEY) hanya dipakai di server. Var non-rahasia
 * (STORAGE_DRIVER, R2_PUBLIC_BASE_URL, R2_BUCKET, R2_PRIVATE_BUCKET) di-inline
 * lewat next.config.ts `env` agar kode klien (getPublicUrl) mengenalinya;
 * operasi S3 (upload/list/remove/sign) SELALU lewat route API server.
 */

type R2Module = typeof import("@aws-sdk/client-s3");

const R2_BUCKETS = {
  "images": () => process.env.R2_BUCKET || "esceha-cdn",
  "documents": () => process.env.R2_BUCKET || "esceha-cdn",
  "spmb-documents": () => process.env.R2_PRIVATE_BUCKET || process.env.R2_BUCKET || "esceha-private",
} as const;

/** Bucket R2 tujuan untuk sebuah bucket Supabase (publik vs privat). */
function r2BucketFor(bucket: StorageBucket): string {
  return (R2_BUCKETS[bucket] ?? R2_BUCKETS.images)();
}

/** Env R2 wajib lengkap; lempar error jelas bila belum diset. */
function requireR2Env(): { accountId: string; accessKeyId: string; secretAccessKey: string; publicBase: string } {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !publicBase) {
    throw new Error(
      "STORAGE_DRIVER=r2 tetapi env R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_PUBLIC_BASE_URL belum lengkap."
    );
  }
  return { accountId, accessKeyId, secretAccessKey, publicBase };
}

/** Kanonikalisasi badan unggah → Uint8Array (isian aman PutObjectCommand). */
async function toUploadBody(
  body: File | Buffer | ArrayBuffer | Uint8Array | Blob
): Promise<Uint8Array> {
  // ArrayBuffer.isView() memeriksa brand internal (aman lintas realm) —
  // penting di env test jsdom di mana instanceof Uint8Array bisa salah tem.
  if (ArrayBuffer.isView(body)) {
    const view = body as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  if (Object.prototype.toString.call(body) === "[object ArrayBuffer]") {
    return new Uint8Array(body as ArrayBuffer);
  }
  // Blob/File tersisa
  return new Uint8Array(await (body as Blob).arrayBuffer());
}

let r2LibPromise: Promise<{ client: R2Client; R2Module: R2Module }> | null = null;

function getR2(): Promise<{ client: R2Client; R2Module: R2Module }> {
  if (!r2LibPromise) {
    const env = requireR2Env();
    r2LibPromise = import("@aws-sdk/client-s3").then(
      ({ S3Client, ...commands }): { client: R2Client; R2Module: R2Module } => {
        const client = new S3Client({
          region: "auto",
          endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.accessKeyId,
            secretAccessKey: env.secretAccessKey,
          },
          requestChecksumCalculation: "WHEN_REQUIRED",
        });
        return { client, R2Module: commands as unknown as R2Module };
      }
    );
  }
  return r2LibPromise;
}

/** Error S3/R2 → StorageError (bawa status HTTP dari $metadata). */
function toR2Error(e: unknown): StorageError {
  const err = e as {
    message?: string;
    $metadata?: { httpStatusCode?: number };
    Code?: string;
    $serverError?: { code?: string };
  };
  const status = err?.$metadata?.httpStatusCode;
  return { message: err?.message || "Gagal mengakses R2.", status, statusCode: err?.$serverError?.code };
}

function createR2Driver(supabaseBucket: string): StorageApi {
  const r2Bucket = r2BucketFor(supabaseBucket as StorageBucket);
  // Custom domain R2: URL path === key. Nama bucket R2 TIDAK ikut ke key.
  const keyOf = (path: string) => `${supabaseBucket}/${path.replace(/^\/+/, "")}`;

  return {
    async upload(path, fileBody, options) {
      try {
        // Validasi env R2 lebih awal (coin up-front) biar error kredensial jelas.
        requireR2Env();
        const { client, R2Module } = await getR2();

        // Semantik upsert:false ala Supabase: 409 bila objek sudah ada.
        if (!options?.upsert) {
          try {
            await client.send(new R2Module.HeadObjectCommand({ Bucket: r2Bucket, Key: keyOf(path) }));
            return {
              data: null,
              error: {
                message: `Objek ${path} sudah ada di bucket "${supabaseBucket}".`,
                status: 409,
                statusCode: "Duplicate",
              },
            };
          } catch (headError) {
            const headStatus = (headError as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
            if (headStatus !== 404 && headStatus !== 410) throw headError;
          }
        }

        await client.send(
          new R2Module.PutObjectCommand({
            Bucket: r2Bucket,
            Key: keyOf(path),
            Body: await toUploadBody(fileBody),
            ContentType: options?.contentType,
            CacheControl: options?.cacheControl,
          })
        );
        return { data: { path }, error: null };
      } catch (e) {
        return { data: null, error: toR2Error(e) };
      }
    },
    getPublicUrl(path) {
      // URL publik TIDAK butuh kredensial — hanya base publik (non-rahasia,
      // di-inline ke bundel klien lewat next.config.ts `env`). Import helper
      // ini pun boleh dipanggil dari browser (media library admin).
      const publicBase = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";
      const cleanPath = path.replace(/^\/+/, "");
      return {
        data: { publicUrl: publicBase ? `${publicBase}/${supabaseBucket}/${cleanPath}` : "" },
      };
    },
    async remove(paths) {
      if (paths.length === 0) return { data: [], error: null };
      const { client, R2Module } = await getR2();
      const deleted: { name: string }[] = [];
      const errors: string[] = [];
      // DeleteObjects dibatasi 1.000 key per permintaan.
      for (let i = 0; i < paths.length; i += 1000) {
        const chunk = paths.slice(i, i + 1000);
        try {
          const res = await client.send(
            new R2Module.DeleteObjectsCommand({
              Bucket: r2Bucket,
              Delete: {
                Objects: chunk.map((p) => ({ Key: `${supabaseBucket}/${p.replace(/^\/+/, "")}` })),
                Quiet: true,
              },
            })
          );
          for (const d of res.Deleted ?? []) {
            deleted.push({ name: (d.Key || "").split("/").pop() || (d.Key as string) });
          }
          for (const e of res.Errors ?? []) {
            errors.push(`${e.Key}: ${e.Message}`);
          }
        } catch (e) {
          errors.push(toR2Error(e).message);
        }
      }
      if (errors.length === 0) {
        // Supabase mengembalikan [] saat policy DELETE menolak — di R2 error dikumpulkan di atas.
        return { data: deleted, error: null };
      }
      return {
        data: deleted.length > 0 ? deleted : null,
        error: { message: errors.join("; "), status: errors.length === paths.length ? 500 : 207 },
      };
    },
    async list(prefix, options) {
      try {
        // Validasi env sebelum walk — kredensial penuh (coin) tidak bermakna di list, list tidak membutuhkannya.
        requireR2Env();
        const { client, R2Module } = await getR2();
        const cleanPrefix = (prefix || "").replace(/^\/+/, "");
        const delimiter = "/";

        const entries: StorageEntry[] = [];

        // Walk terbatas sesuai limit (default 1000, sama seperti pola pemanggil).
        const limit = options?.limit ?? 1000;
        let walked = 0;
        let token: string | undefined;
        do {
          const res = await client.send(
            new R2Module.ListObjectsV2Command({
              Bucket: r2Bucket,
              Prefix: `${supabaseBucket}/${cleanPrefix}${cleanPrefix ? "/" : ""}`,
              Delimiter: delimiter,
              MaxKeys: Math.min(1000, limit - walked),
              ContinuationToken: token,
            })
          );
          for (const common of res.CommonPrefixes ?? []) {
            entries.push({
              id: null,
              name: (common.Prefix || "").replace(/\/+$/, "").split("/").pop() || (common.Prefix as string),
              metadata: null,
              created_at: null,
            });
            walked += 1;
          }
          for (const obj of res.Contents ?? []) {
            const key = obj.Key || "";
            if (key.replace(/\/+$/, "").endsWith("/")) continue; // marker folder kosong
            const size = obj.Size ?? 0;
            // Metadata Content-Type tidak disediakan oleh ListObjectsV2 —
            // dianggap non-thumbnail; (inline) HeadObject per objek biar mengingat tipenya.
            entries.push({
              id: key,
              name: key.split("/").pop() || key,
              metadata: { size, mimetype: "" },
              created_at: obj.LastModified ? obj.LastModified.toISOString() : null,
            });
            walked += 1;
          }
          token = res.NextContinuationToken;
        } while (token && walked < limit);

        if (options?.sortBy?.column === "created_at") {
          const dir = options.sortBy.order === "desc" ? -1 : 1;
          entries.sort((a, b) => dir * ((a.created_at || "").localeCompare(b.created_at || "")));
        }
        return { data: entries, error: null };
      } catch (e) {
        return { data: null, error: toR2Error(e) };
      }
    },
    async createSignedUrl(path, expiresIn) {
      try {
        const { client, R2Module } = await getR2();
        const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
        const signedUrl = await getSignedUrl(
          client,
          new R2Module.GetObjectCommand({ Bucket: r2Bucket, Key: keyOf(path) }),
          { expiresIn }
        );
        return { data: { signedUrl }, error: null };
      } catch (e) {
        return { data: null, error: toR2Error(e) };
      }
    },
  };
}

// ============ SAKLAR DRIVER ============

/** Driver aktif: `STORAGE_DRIVER=r2` → Cloudflare R2, selain itu Supabase (default). */
export function activeStorageDriver(): "supabase" | "r2" {
  return process.env.STORAGE_DRIVER === "r2" ? "r2" : "supabase";
}

/**
 * Antarmuka bucket aktif. `client` opsional untuk driver supabase agar
 * route dengan sesi autentikasi (mis. /api/admin/storage) tetap memakai
 * klien server-nya sendiri — perilaku persis seperti sebelum adapter.
 */
export function storageFrom(bucket: StorageBucket, client?: StorageClient): StorageApi {
  if (activeStorageDriver() === "r2") return createR2Driver(bucket);
  return createSupabaseDriver(client ?? (supabase as unknown as StorageClient), bucket);
}
