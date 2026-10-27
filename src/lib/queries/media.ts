import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { removeViaRoute, listViaRoute, signedUrlViaRoute } from "../storage-remote";
import { storageFrom } from "../storage";

/**
 * Media library — inventarisasi & pengelolaan file Storage.
 *
 * Jalur upload yang ada di aplikasi (inventaris P2.7):
 * - bucket `images`    : uploadNewsImage, uploadActivityImage, uploadArticleImage,
 *                        uploadAchievementImage, uploadGalleryImage,
 *                        uploadFacilityImage, uploadTeacherPhoto
 * - bucket `documents` : uploadNewsAttachment (lampiran berita)
 * - bucket `spmb-documents` : SPMBForm.tsx (berkas pendaftar; bucket PRIVAT —
 *                        diakses via createSignedUrl)
 */

export type MediaBucket = "images" | "documents" | "spmb-documents";

export const MEDIA_BUCKETS: { id: MediaBucket; label: string; hint: string }[] = [
  {
    id: "images",
    label: "Gambar",
    hint: "Foto berita, artikel, kegiatan, galeri, guru, fasilitas & prestasi",
  },
  {
    id: "documents",
    label: "Dokumen",
    hint: "Lampiran berita (PDF/dokumen publik)",
  },
  {
    id: "spmb-documents",
    label: "Dokumen SPMB",
    hint: "Berkas pendaftar — bucket privat, dibuka dengan URL bertanda tangan",
  },
];

export interface MediaFile {
  bucket: MediaBucket;
  /** Path lengkap di dalam bucket. */
  path: string;
  /** Nama file saja. */
  name: string;
  /** Folder induk ("" = root bucket). */
  folder: string;
  size: number | null;
  mimetype: string | null;
  createdAt: string | null;
  isImage: boolean;
}

export interface MediaReferenceScan {
  /** true hanya bila SEMUA tabel berhasil dipindai — hapus diizinkan hanya saat ini. */
  complete: boolean;
  failedTables: string[];
  /** Semua string yang ditemukan di kolom semua tabel (URL storage & path mentah). */
  refs: Set<string>;
}

/** Tabel aplikasi yang bisa menyimpan referensi file storage (dari grep seluruh `.from(...)`). */
const REFERENCE_TABLES = [
  "news",
  "articles",
  "activities",
  "achievements",
  "gallery",
  "facilities",
  "teachers",
  "announcements",
  "agenda_events",
  "portal_apps",
  "school_profile",
  "spmb_registrations",
  "spmb_waves",
  "contact_messages",
  "notifications",
  "user_profiles",
  "downloads",
  "ekskuls",
  "site_settings",
] as const;

const STORAGE_BUCKETS = ["images", "documents", "spmb-documents"] as const;

const MAX_FOLDER_DEPTH = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Perkiraan Content-Type dari ekstensi — dipakai mengisi `mimetype` bila
 * driver list tidak menyediakannya (ListObjectsV2 S3 tidak mengirim
 * Content-Type per objek). Satu sumber untuk walker & route admin storage.
 */
export const MEDIA_EXT_MIME: Record<string, string> = {
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

function extOf(name: string): string {
  return (name.split(".").pop() || "").toLowerCase();
}

/**
 * Gangguan SEMENTARA yang layak dicoba ulang — Supabase Storage kadang
 * melempar 503 "Service Unavailable" sesaat (instance sibuk/muat ulang),
 * terutama saat walk memanggil banyak folder, dan koneksi bisa gagal total.
 */
function isTransientStorageError(
  error: { status?: number; statusCode?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  const status = error.status ?? Number(error.statusCode ?? 0);
  if (status === 429 || (status >= 500 && status < 600)) return true;
  return /fetch failed|network|timeout|ECONNRESET|Service Unavailable/i.test(
    error.message ?? ""
  );
}

/** Satu anak folder/file yang dibaca walker (bentuk longgar lintas driver/route). */
export interface StorageWalkEntry {
  id: string | null;
  name: string;
  metadata: { size?: number | null; mimetype?: string | null } | null;
  created_at?: string | null;
}

export type StorageWalkListFn = (
  prefix: string
) => Promise<{
  data: StorageWalkEntry[] | null;
  error: { message?: string; status?: number; statusCode?: string } | null;
}>;

/**
 * `list()` satu folder — SELALU lewat penyedia `listFn` (route HTTP dari
 * browser, atau driver storage langsung dari server action). Dengan retry:
 * maks. 3 percobaan, jeda 400ms × nomor percobaan. Error permanen (403 RBAC,
 * 404, dst.) langsung dikembalikan; exception `listFn` diperlakukan sebagai
 * error jaringan (bisa transient).
 */
async function listWithRetry(listFn: StorageWalkListFn, prefix: string, attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    const { data, error } = await listFn(prefix).catch((e: unknown) => ({
      data: null,
      error: {
        message: e instanceof Error ? e.message : String(e),
        status: 0,
      },
    }));
    if (!error || attempt >= attempts || !isTransientStorageError(error)) {
      return { data, error };
    }
    console.warn(
      `Retry list ${prefix} setelah "${error.message}" (percobaan ${attempt}/${attempts - 1} ulang)`
    );
    await sleep(400 * attempt);
  }
}

/**
 * Walker rekursif semua file di sebuah bucket (dipakai jalur browser via
 * `getMediaFiles` dan server action `listMediaFiles`). Membuang error per-folder
 * (folder dilewati + dicatat), tetapi error di root DILEMPAR agar UI
 * menampilkan kegagalan, bukan daftar kosong palsu.
 */
export async function walkStorageFiles(
  bucket: MediaBucket,
  listFn: StorageWalkListFn
): Promise<MediaFile[]> {
  const files: MediaFile[] = [];

  const walk = async (prefix: string, depth: number, isRoot: boolean): Promise<void> => {
    const { data, error } = await listWithRetry(listFn, prefix);
    if (error) {
      console.error(`Error listing ${bucket}/${prefix}:`, JSON.stringify(error), error.message);
      if (isRoot) {
        throw new Error(
          isTransientStorageError(error)
            ? "Storage sedang sibuk/tidak tersedia — coba muat ulang halaman."
            : error.message || "Gagal memuat daftar file"
        );
      }
      return; // folder bawah: lewati, jangan gagalkan seluruh halaman
    }
    if (depth >= MAX_FOLDER_DEPTH) return;

    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const meta = entry.metadata;
      // Folder: id & metadata null (konvensi list adapter Storage).
      const isFolder = entry.id === null && meta === null;
      if (isFolder) {
        await walk(path, depth + 1, false);
      } else {
        const mimetype =
          ((meta?.mimetype ?? "") as string) || MEDIA_EXT_MIME[extOf(entry.name)] || null;
        files.push({
          bucket,
          path,
          name: entry.name,
          folder: prefix,
          size: typeof meta?.size === "number" ? meta.size : null,
          mimetype,
          createdAt: entry.created_at ?? null,
          isImage: (mimetype ?? "").startsWith("image/"),
        });
      }
    }
  };

  await walk("", 0, true);
  return files;
}

/**
 * Daftar semua file di sebuah bucket dari browser (walk rekursif per folder
 * lewat route `/api/admin/storage`). Untuk pemakaai ringan (MediaPicker,
 * panel admin); jalur utama /admin/media memakai server action
 * `listMediaFiles` di `src/app/admin/media/actions.ts`.
 */
export async function getMediaFiles(bucket: MediaBucket): Promise<MediaFile[]> {
  return walkStorageFiles(bucket, (prefix) => listViaRoute(bucket, prefix));
}

/**
 * Tambah satu string referensi + varian ternormalisasi URL storage (lintas-origin tetap cocok).
 * Mendukung Supabase Storage, Cloudflare R2 / Custom CDN, cache-buster ?v=..., dan URL di dalam HTML/Markdown.
 */
export function addRef(value: string, refs: Set<string>): void {
  if (!value || typeof value !== "string") return;

  // 1. Tambah string mentah apa adanya
  refs.add(value);

  // 2. Tambah varian tanpa query parameter & hash (mis. ?v=17927... atau ?token=...)
  const clean = value.split("?")[0].split("#")[0].trim();
  if (clean && clean !== value) {
    refs.add(clean);
  }

  // 3. Tangani format Cloudflare R2 / Custom CDN / path absolut / relatif / teks HTML / Markdown.
  //    Mencocokkan pola <bucket>/<path> untuk images, documents, atau spmb-documents.
  for (const bucket of STORAGE_BUCKETS) {
    const regex = new RegExp(`(?:^|[/"'\\s])(${bucket})\\/([^\\s"'<>?#]+)`, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value)) !== null) {
      const b = match[1];
      const p = match[2].replace(/\/+$/, "");
      if (p) {
        refs.add(p);
        refs.add(`${b}/${p}`);
        try {
          const decodedP = decodeURIComponent(p);
          refs.add(decodedP);
          refs.add(`${b}/${decodedP}`);
        } catch {
          // ignore
        }
      }
    }
  }
}

/** Kumpulkan semua string rekursif (object/array JSON termasuk). */
function collectStrings(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    addRef(value, out);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

/** Batas keras baris per tabel — cegah pindai tak berujung bila tabel membengkak.
 *  Dipakai lewat server action scanMediaReferences (src/app/admin/media/actions.ts). */
export const MEDIA_SCAN_ROW_CAP = 5000;

/**
 * Pindai seluruh tabel aplikasi untuk membangun set referensi file.
 * Gagal pada satu tabel TIDAK membuang hasil — dicatat di `failedTables`
 * dan `complete` jadi false supaya UI menonaktifkan hapus (aman: file yang
 * masih dipakai tidak boleh terhapus). Tiap tabel dibatasi MEDIA_SCAN_ROW_CAP
 * baris; tanda `>cap` di failedTables berarti batas tersentuh (komplit=false).
 */
export async function collectMediaReferences(client?: SupabaseClient): Promise<MediaReferenceScan> {
  const refs = new Set<string>();
  const failedTables: string[] = [];
  const db = client ?? supabase;

  await Promise.all(
    REFERENCE_TABLES.map(async (table) => {
      const { data, error } = await db
        .from(table)
        .select("*")
        .limit(MEDIA_SCAN_ROW_CAP);
      if (error) {
        // Jika tabel belum ada di database (kode 42P01 / relation does not exist), lewati diam-diam
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          return;
        }
        failedTables.push(table);
        console.error(`Error scanning refs ${table}:`, JSON.stringify(error), error.message);
        return;
      }
      const rows = data ?? [];
      if (rows.length >= MEDIA_SCAN_ROW_CAP) {
        failedTables.push(`${table} (>=${MEDIA_SCAN_ROW_CAP} baris)`);
        console.warn(`collectMediaReferences: tabel ${table} mencapai batas pindai (${MEDIA_SCAN_ROW_CAP} baris)`);
        return;
      }
      for (const row of rows) collectStrings(row, refs);
    })
  );

  return { complete: failedTables.length === 0, failedTables, refs };
}

/** Apakah file ini dirujuk oleh konten mana pun? Aman-arah: bila ragu → dianggap terpakai. */
export function isMediaReferenced(file: MediaFile, refs: Set<string>): boolean {
  if (refs.has(file.path)) return true;
  if (refs.has(`${file.bucket}/${file.path}`)) return true;

  // Variasi dengan decodeURIComponent bila nama/path di Storage memiliki spasi atau karakter khusus
  try {
    const decoded = decodeURIComponent(file.path);
    if (refs.has(decoded) || refs.has(`${file.bucket}/${decoded}`)) return true;
  } catch {
    // ignore
  }

  const url = mediaPublicUrl(file);
  if (url) {
    if (refs.has(url)) return true;
    const cleanUrl = url.split("?")[0].split("#")[0];
    if (refs.has(cleanUrl)) return true;
  }

  return false;
}

/** URL publik file (null untuk bucket privat `spmb-documents`). */
export function mediaPublicUrl(file: MediaFile): string | null {
  if (file.bucket === "spmb-documents") return null;
  return storageFrom(file.bucket).getPublicUrl(file.path).data.publicUrl;
}

/** URL bertanda tangan (1 jam) untuk bucket privat — lewat route server. */
export async function mediaSignedUrl(file: MediaFile): Promise<string | null> {
  const url = await signedUrlViaRoute(file.path);
  if (!url) console.error("Error creating signed URL:", file.path);
  return url;
}

/**
 * Hapus file — lewat route server (auth + RBAC). Kesalahan dikembalikan
 * apa adanya ke UI — jangan pernah senyap.
 */
export async function deleteMediaFile(
  file: MediaFile
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await removeViaRoute(file.bucket, [file.path]);
  if (error) {
    console.error("Error deleting media file:", JSON.stringify(error), error.message);
    return { ok: false, error: error.message || "Gagal menghapus file" };
  }
  return { ok: true, error: null };
}
