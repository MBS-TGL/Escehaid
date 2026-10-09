import { supabase } from "../supabase";

export async function cleanupOldFiles(folder: string, id: string) {
  const { data } = await supabase.storage.from("images").list(folder);
  if (data) {
    const oldFiles = data
      .filter((f) => f.name.startsWith(id + "."))
      .map((f) => `${folder}/${f.name}`);
    if (oldFiles.length > 0) {
      await supabase.storage.from("images").remove(oldFiles);
    }
  }
}

// ============ SCHOOL PROFILE ============
/**
 * Ambil profil sekolah (satu baris). Dibungkus `cache` dari React agar
 * layout, footer, dan halaman yang dirender pada request yang sama
 * berbagi SATU query. (Pada client build, `cache` hanya pembungkus
 * passthrough — aman dipanggil dari komponen client.)
 */

export function storagePathFromUrl(url: string): string | null {
  // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const match = url.split("?")[0].match(/\/storage\/v1\/object\/public\/images\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Hapus file dari bucket "images" berdasarkan publicUrl.
 * Abaikan URL yang bukan dari bucket ini.
 */
export async function deleteStorageFileByUrl(url: string): Promise<void> {
  try {
    const filePath = storagePathFromUrl(url);
    if (!filePath) return;
    const { data, error } = await supabase.storage.from("images").remove([filePath]);
    if (error) {
      console.warn("[deleteStorageFileByUrl] remove failed:", error.message);
    } else if (!data || data.length === 0) {
      console.warn("[deleteStorageFileByUrl] remove returned empty data for", filePath,
        "— kemungkinan policy DELETE belum dikonfigurasi di bucket 'images'.");
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
