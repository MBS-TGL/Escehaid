import { supabase } from "../supabase";

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
] as const;

const MAX_FOLDER_DEPTH = 4;

/**
 * Daftar semua file di sebuah bucket (rekursif per folder).
 * Membuang error per-folder (folder dilewati + dicatat), tetapi error di root
 * dilempar agar UI menampilkan kegagalan, bukan daftar kosong palsu.
 */
export async function getMediaFiles(bucket: MediaBucket): Promise<MediaFile[]> {
  const files: MediaFile[] = [];

  const walk = async (prefix: string, depth: number, isRoot: boolean): Promise<void> => {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      console.error(`Error listing ${bucket}/${prefix}:`, JSON.stringify(error), error.message);
      if (isRoot) throw new Error(error.message || "Gagal memuat daftar file");
      return; // folder bawah: lewati, jangan gagalkan seluruh halaman
    }
    if (depth >= MAX_FOLDER_DEPTH) return;

    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const meta = entry.metadata as { size?: number; mimetype?: string } | null;
      // Folder: id & metadata null (konvensi list Storage Supabase).
      const isFolder = entry.id === null && meta === null;
      if (isFolder) {
        await walk(path, depth + 1, false);
      } else {
        files.push({
          bucket,
          path,
          name: entry.name,
          folder: prefix,
          size: typeof meta?.size === "number" ? meta.size : null,
          mimetype: meta?.mimetype ?? null,
          createdAt: entry.created_at ?? null,
          isImage: (meta?.mimetype ?? "").startsWith("image/"),
        });
      }
    }
  };

  await walk("", 0, true);
  return files;
}

/** Tambah satu string referensi + varian ternormalisasi URL storage (lintas-origin tetap cocok). */
function addRef(value: string, refs: Set<string>): void {
  if (!value) return;
  refs.add(value);
  const marker = "/storage/v1/object/";
  const idx = value.indexOf(marker);
  if (idx === -1) return;
  const rest = value.slice(idx + marker.length);
  if (!rest.startsWith("public/")) return;
  const bucketPath = rest.slice(7).split("?")[0]; // "<bucket>/<path>"
  refs.add(bucketPath);
  const slash = bucketPath.indexOf("/");
  if (slash !== -1) refs.add(bucketPath.slice(slash + 1)); // "<path>"
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

/**
 * Pindai seluruh tabel aplikasi untuk membangun set referensi file.
 * Gagal pada satu tabel TIDAK membuang hasil — dicatat di `failedTables`
 * dan `complete` jadi false supaya UI menonaktifkan hapus (aman: file yang
 * masih dipakai tidak boleh terhapus).
 */
export async function collectMediaReferences(): Promise<MediaReferenceScan> {
  const refs = new Set<string>();
  const failedTables: string[] = [];

  await Promise.all(
    REFERENCE_TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        failedTables.push(table);
        console.error(`Error scanning refs ${table}:`, JSON.stringify(error), error.message);
        return;
      }
      for (const row of data ?? []) collectStrings(row, refs);
    })
  );

  return { complete: failedTables.length === 0, failedTables, refs };
}

/** Apakah file ini dirujuk oleh konten mana pun? Aman-arah: bila ragu → dianggap terpakai. */
export function isMediaReferenced(file: MediaFile, refs: Set<string>): boolean {
  if (refs.has(file.path)) return true;
  if (refs.has(`${file.bucket}/${file.path}`)) return true;
  const url = mediaPublicUrl(file);
  if (url && refs.has(url)) return true;
  return false;
}

/** URL publik file (null untuk bucket privat `spmb-documents`). */
export function mediaPublicUrl(file: MediaFile): string | null {
  if (file.bucket === "spmb-documents") return null;
  return supabase.storage.from(file.bucket).getPublicUrl(file.path).data.publicUrl;
}

/** URL bertanda tangan (1 jam) untuk bucket privat — untuk pratinjau/buka SPMB. */
export async function mediaSignedUrl(file: MediaFile): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.path, 3600);
  if (error) {
    console.error("Error creating signed URL:", JSON.stringify(error), error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Hapus file. Kesalahan (mis. RLS storage belum mengizinkan DELETE) dikembalikan
 * apa adanya ke UI — jangan pernah senyap.
 */
export async function deleteMediaFile(
  file: MediaFile
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.storage.from(file.bucket).remove([file.path]);
  if (error) {
    console.error("Error deleting media file:", JSON.stringify(error), error.message);
    return { ok: false, error: error.message || "Gagal menghapus file" };
  }
  return { ok: true, error: null };
}
