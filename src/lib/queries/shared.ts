import { supabase } from "../supabase";
import { removeViaRoute, listViaRoute } from "../storage-remote";

// ============ PROBE KOLOM OPSIONAL (memoized per proses) ============
/**
 * Probe sekali per proses: apakah kolom sudah ada di tabel? Dipakai untuk
 * kolom migrasi opsional (mis. `video_url` — supabase/content_video.sql):
 * false → insert/update disusun tanpa kolom itu (aman sebelum SQL dijalankan).
 */
const columnProbes = new Map<string, Promise<boolean>>();

export function tableHasColumn(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  let probe = columnProbes.get(key);
  if (!probe) {
    probe = Promise.resolve(
      supabase.from(table).select(column).limit(0)
    ).then(
      ({ error }) => !error || !/does not exist|42703/.test(error.message || ""),
      () => false
    );
    columnProbes.set(key, probe);
  }
  return probe;
}

export async function cleanupOldFiles(folder: string, id: string) {
  // Operasi S3 (list/remove) harus lewat route server — kredensial R2 tidak
  // pernah ada di bundel klien.
  const { data, error } = await listViaRoute("images", folder);
  if (error || !data) return;
  const oldFiles = data
    .filter((f) => f.id !== null && f.name.startsWith(id + "."))
    .map((f) => `${folder}/${f.name}`);
  if (oldFiles.length > 0) {
    await removeViaRoute("images", oldFiles);
  }
}

// ============ SCHOOL PROFILE ============
/**
 * Ambil profil sekolah (satu baris). Dibungkus `cache` dari React agar
 * layout, footer, dan halaman yang dirender pada request yang sama
 * berbagi SATU query. (Pada client build, `cache` hanya pembungkus
 * passthrough — aman dipanggil dari komponen client.)
 */

export function storagePathFromUrl(url: string, bucket = "images"): string | null {
  // Dua format yang sah:
  //   Supabase : https://<project>.supabase.co/storage/v1/object/public/<b>/<path>
  //   R2 (CDN) : https://cdn.<domain>/<targetBucket>/<b>/<path>  → bucket R2 diabaikan
  const supabase = url
    .split("?")[0]
    .match(new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`));
  if (supabase) return supabase[1];
  // URL absolut CDN: host harus sama dengan R2_PUBLIC_BASE_URL (in-line build).
  if (/^https:\/\//.test(url)) {
    try {
      const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
      if (base) {
        const u = new URL(url);
        if (u.origin === new URL(base).origin) {
          const m = u.pathname.match(new RegExp(`/${bucket}/(.+)$`));
          if (m) return m[1];
        }
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Hapus file dari bucket "images" berdasarkan publicUrl.
 * Abaikan URL yang bukan dari bucket ini. Selalu lewat route server
 * (.deleteStorageFileByUrl dipanggil dari kode klien admin).
 */
export async function deleteStorageFileByUrl(url: string): Promise<void> {
  try {
    const filePath = storagePathFromUrl(url);
    if (!filePath) return;
    const { data, error } = await removeViaRoute("images", [filePath]);
    if (error) {
      console.warn("[deleteStorageFileByUrl] remove failed:", error.message);
    } else if (!data || data.length === 0) {
      console.warn("[deleteStorageFileByUrl] remove returned empty data for", filePath);
    }
  } catch (e) {
    console.warn("[deleteStorageFileByUrl] error:", e);
  }
}

/**
 * Hapus semua file di folder `news/<newsId>/`, kecuali file yang URL-nya == keepUrl.
 * Dipakai saat: (1) sampul diganti — hapus versi lama, (2) berita dihapus — bersihkan semua.
 */

export function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug.slice(0, 70).replace(/-+$/, "");
}

/**
 * Cari slug yang belum dipakai: bila `base` sudah ada, tambah sufiks
 * -2, -3, dst. `excludeId` = id artikel sendiri (agar slug yang tidak
 * berubah tidak ikut dianggap "duplikat" saat edit).
 */
export async function generateUniqueArticleSlug(base: string, excludeId?: string): Promise<string> {
  const { data } = await supabase
    .from("articles")
    .select("id, slug")
    .like("slug", `${base}%`);
  const rows = data || [];
  const own = excludeId ? rows.find((r) => r.id === excludeId) : undefined;
  if (own && own.slug === base) return base;
  const used = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!used.has(base)) return base;
  const root = base.slice(0, 66).replace(/-+$/, "") || base;
  let suffix = 2;
  while (used.has(`${root}-${suffix}`)) suffix++;
  return `${root}-${suffix}`;
}

/**
 * Versi berita dari generateUniqueArticleSlug: sufiks -2, -3, dst.
 * `excludeId` = id berita sendiri agar slug yang tidak berubah tidak
 * dianggap duplikat saat edit. Dipakai createNews/updateNews.
 */
export async function generateUniqueNewsSlug(base: string, excludeId?: string): Promise<string> {
  const { data } = await supabase
    .from("news")
    .select("id, slug")
    .like("slug", `${base}%`);
  const rows = data || [];
  const own = excludeId ? rows.find((r) => r.id === excludeId) : undefined;
  if (own && own.slug === base) return base;
  const used = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!used.has(base)) return base;
  const root = base.slice(0, 66).replace(/-+$/, "") || base;
  let suffix = 2;
  while (used.has(`${root}-${suffix}`)) suffix++;
  return `${root}-${suffix}`;
}

/**
 * Normalisasi istilah pencarian supaya aman disisipkan ke sintaks filter
 * PostgREST (`.or()` + ilike): koma/kurung menggagalkan parser logic-tree
 * (400 PGRST100), `%` dan `_` adalah wildcard bawaan LIKE. Karakter berbahaya
 * diganti spasi, hasil dirapikan dan dibatasi 80 karakter. Idempoten.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[%,_()"'\[\]\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
