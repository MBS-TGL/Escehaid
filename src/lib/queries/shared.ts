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

/**
 * Tokenisasi multi-token: istilah dipecah per kata (maks 4 token) agar query
 * "ustadzah tahfidz" menangkap item yang memuat SALAH SATU kata — bukan hanya
 * kombinasi persisnya. Tiap token ≤ 40 karakter dan sudah lolos
 * `sanitizeSearchTerm` (aman untuk sintaks `.or()` PostgREST). Idempoten.
 */
export function tokenizeSearch(raw: string): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const word of sanitizeSearchTerm(raw).split(" ")) {
    const token = word.slice(0, 40);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
    if (tokens.length >= 4) break;
  }
  return tokens;
}

/**
 * Sintaks `.or()` gabungan token × kolom: item dianggap cocok bila SALAH SATU
 * token mengenai SALAH SATU kolom. String kosong bila tak ada token/kolom —
 * pemanggil dilarang mengirim `.or("")`. Aman karena token deniedinasi lewat
 * `sanitizeSearchTerm`.
 */
export function buildSearchOr(tokens: string[], columns: string[]): string {
  return tokens
    .flatMap((token) => columns.map((column) => `${column}.ilike.%${token}%`))
    .join(",");
}

// ============ PROBE pg_trgm (toleransi typo DB-level, memoized) ============
/**
 * Deteksi ketersediaan pg_trgm — TANPA query pg_catalog (schema itu tidak
 * terekspose ke anon via PostgREST; uji manual menolak filter
 * `similarity(...)` dengan PGRST100). Penanda bersih: fungsi SQL
 * `search_trgm_enabled()` (lihat sql/pg-trgm.sql, dijalankan manual via
 * Supabase SQL Editor) — bila belum ada → false → semua pencarian tetap
 * memakai fallback ilike B1. Memoized sekali per proses (nama fungsi &
 * jawabannya tidak berubah selama proses hidup).
 */
let trgmProbePromise: Promise<boolean> | null = null;

export function trgmSearchReady(): Promise<boolean> {
  if (!trgmProbePromise) {
    trgmProbePromise = Promise.resolve(supabase.rpc("search_trgm_enabled")).then(
      ({ data, error }) => !error && data === true,
      () => false
    );
  }
  return trgmProbePromise;
}

/** Mode filter pencarian sebuah modul konten. */
export type SearchMode = "similarity" | "ilike";

/**
 * Pilih jalur filter utk modul + token: pg_trgm aktif → "similarity"
 * (kandidat diambil lewat RPC `search_<tabel>_ids`), selain itu "ilike"
 * (substring `.or()` B1). Token kosong → "ilike" (tanpa filter).
 */
export async function resolveSearchMode(
  table: "news" | "articles" | "activities" | "achievements" | "ekskuls",
  tokens: string[]
): Promise<SearchMode> {
  if (!tokens.length) return "ilike";
  return (await trgmSearchReady()) ? "similarity" : "ilike";
}

/**
 * Kandidat id lewat RPC pg_trgm (dibuat di sql/pg-trgm.sql): item masuk bila
 * SALAH SATU token berada di atas ambang similarity (0.25) di kolom
 * pencarian modul. null → RPC tak ada/gagal → pemanggil wajib fallback
 * ke jalur ilike (nol crash).
 */
export async function fetchTrgmIds(rpcName: string, tokens: string[], maxRows = 60): Promise<string[] | null> {
  try {
    const { data, error } = await supabase.rpc(rpcName, { tokens, max_rows: maxRows });
    if (error || !Array.isArray(data)) return null;
    return data.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return null;
  }
}
