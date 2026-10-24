import { supabase } from "../supabase";
import type { Achievement } from "../supabase";
import { tryCompressImage } from "../compress-image";
import { buildSearchOr, deleteStorageFileByUrl, fetchTrgmIds, resolveSearchMode, storagePathFromUrl, tableHasColumn, tokenizeSearch } from "./shared";
import { uploadFileViaRoute } from "../storage-remote";

/** Probe kolom `video_url` (migrasi supabase/content_video.sql) — memoized. */
export function achievementsHasVideoColumn(): Promise<boolean> {
  return tableHasColumn("achievements", "video_url");
}

/**
 * Daftar prestasi (semua baris tayang — tidak ada kolom is_published).
 * `search` (opsional) menyaring judul ATAU deskripsi — dipakai pencarian
 * menyeluruh di /search.
 * `opts` (opsional):
 *  - `featuredFirst`: urutkan unggulan dulu, lalu tahun terbaru (sama persis
 *    dengan urutan yang dipakai beranda) — bukan `sort_order`;
 *  - `limit`: batasi jumlah baris (hemat transfer; dipakai beranda).
 */
export async function getAchievementList(
  search?: string,
  opts?: { featuredFirst?: boolean; limit?: number }
): Promise<Achievement[]> {
  // Multi-token; pg_trgm aktif → kandidat via RPC search_achievements_ids.
  const tokens = tokenizeSearch(search ?? "");
  let simIds: string[] | null = null;
  if (tokens.length && (await resolveSearchMode("achievements", tokens)) === "similarity") {
    simIds = await fetchTrgmIds("search_achievements_ids", tokens);
  }
  const hasVideo = await achievementsHasVideoColumn();
  const columns =
    "id, title, description, category, year, image_url, sort_order, created_at, rank_label, level, participants, organizer, is_featured, image_alt" +
    (hasVideo ? ", video_url" : "");
  let query = supabase.from("achievements").select(columns);

  if (opts?.featuredFirst) {
    query = query
      .order("is_featured", { ascending: false })
      .order("year", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("sort_order", { ascending: true });
  }

  if (tokens.length && simIds) {
    if (!simIds.length) return []; // semua similarity < 0.25
    query = query.in("id", simIds);
  } else if (tokens.length) {
    const orFilter = buildSearchOr(tokens, ["title", "description"]);
    if (orFilter) query = query.or(orFilter);
  }
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching achievements:", error);
    return [];
  }
  return (data || []) as unknown as Achievement[];
}

/** Varian panel admin: lempar saat query gagal agar panel bisa
    membedakan "kosong" vs "gagal memuat" (tampilkan tombol Coba lagi).
    Versi publik (getAchievementList) tetap tangguh demi halaman publik. */
export async function getAchievementListAdmin(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching achievements (admin):", error);
    throw new Error(error.message);
  }
  return data || [];
}

/** Probe kolom `ekskul_id` (tautan prestasi ↔ ekskul — supabase/ekskul.sql). */
export function achievementsHasEkskulColumn(): Promise<boolean> {
  return tableHasColumn("achievements", "ekskul_id");
}

/**
 * Prestasi yang terhubung ke ekskul tertentu — dipakai halaman detail
 * `/ekskul/[slug]`. Urut tahun terbaru, gagal → [] (bagian prestasi
 * otomatis disembunyikan).
 */
export async function getAchievementsByEkskul(
  ekskulId: string,
  limit = 12
): Promise<Achievement[]> {
  // Migrasi supabase/ekskul.sql belum jalan → kolom filter tak ada; jangan
  // query (42703) dan jangan spam console error — bagian prestasi disembunyikan.
  const hasEkskulCol = await achievementsHasEkskulColumn();
  if (!hasEkskulCol) return [];
  const hasVideo = await achievementsHasVideoColumn();
  const columns =
    "id, title, description, category, year, image_url, sort_order, created_at, rank_label, level, participants, organizer, is_featured, image_alt" +
    (hasVideo ? ", video_url" : "");
  const { data, error } = await supabase
    .from("achievements")
    .select(columns)
    .eq("ekskul_id", ekskulId)
    .order("year", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(
      "Error fetching achievements by ekskul:",
      JSON.stringify(error, ["message", "code", "details", "hint"])
    );
    return [];
  }
  return (data || []) as unknown as Achievement[];
}

export async function createAchievement(achievement: {
  title: string;
  description?: string;
  category?: string;
  year?: number;
  image_url?: string;
  sort_order?: number;
  /** Kolom Tahap 1 (null = kosongkan) */
  rank_label?: string | null;
  level?: string | null;
  participants?: string | null;
  organizer?: string | null;
  is_featured?: boolean;
  image_alt?: string | null;
  /** Tautan video eksternal (opsional; probe video_url — content_video.sql). */
  video_url?: string | null;
  /** Ekskul terkait (uuid ekskuls — supabase/ekskul.sql). Dikosongkan bila tak terhubung. */
  ekskul_id?: string | null;
}): Promise<{ data: Achievement | null; error?: string }> {
  // Tautan video hanya dikirim bila kolomnya sudah ada (migrasi belum jalan → lewati diam-diam).
  const hasVideoCol = achievement.video_url ? await achievementsHasVideoColumn() : false;
  // Sama untuk tautan ekskul: bila migrasi ekskul belum jalan, simpan prestasi
  // tetap berjalan — nilai tautan diabaikan (penyimpanan selanjutnya diulang).
  const hasEkskulCol = achievement.ekskul_id ? await achievementsHasEkskulColumn() : false;
  const payload: Record<string, unknown> = { ...achievement };
  if (!hasVideoCol) delete payload.video_url;
  if (!achievement.ekskul_id || !hasEkskulCol) delete payload.ekskul_id;
  const { data, error } = await supabase
    .from("achievements")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error creating achievement:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

/**
 * Hapus file gambar prestasi BILA file itu tidak lagi dipakai baris mana pun.
 * Tombol Duplikat menyalin `image_url` apa adanya, sehingga beberapa baris bisa
 * berbagi SATU file — file hanya boleh dihapus setelah baris terakhir pemakainya
 * hilang. Perbandingan memakai path (tanpa `?v=`) agar URL beda query cache
 * dianggap file yang sama; sekaligus melindungi file yang baru saja diunggah
 * (path-nya masih dirujuk baris ini).
 */
async function pruneAchievementImageFiles(urls: (string | null | undefined)[]): Promise<void> {
  const targets = [...new Set(urls.filter((u): u is string => !!u))];
  if (targets.length === 0) return;
  const { data: rows, error } = await supabase.from("achievements").select("image_url");
  if (error) {
    // Gagal memastikan → jangan hapus apa pun (file sisa lebih baik daripada gambar rusak).
    console.warn("[pruneAchievementImageFiles] cek referensi gagal, file tidak dihapus:", error.message);
    return;
  }
  const usedPaths = new Set(
    (rows || []).map((r) => storagePathFromUrl(r.image_url || "")).filter((p): p is string => !!p)
  );
  for (const url of targets) {
    const path = storagePathFromUrl(url);
    if (path && !usedPaths.has(path)) deleteStorageFileByUrl(url).catch(() => {});
  }
}

export async function updateAchievement(
  id: string,
  achievement: {
    title?: string;
    description?: string;
    category?: string;
    year?: number;
    image_url?: string;
    sort_order?: number;
  /** Kolom Tahap 1 (null = kosongkan) */
  rank_label?: string | null;
  level?: string | null;
  participants?: string | null;
  organizer?: string | null;
  is_featured?: boolean;
  image_alt?: string | null;
  /** Tautan video eksternal (opsional; probe video_url — content_video.sql). */
  video_url?: string | null;
  /** Ekskul terkait (uuid ekskuls — supabase/ekskul.sql; null/"" = lepas tautan). */
  ekskul_id?: string | null;
}): Promise<{ data: Achievement | null; error?: string }> {
  // Ambil URL gambar lama supaya file lama bisa dibersihkan bila berganti
  let oldImageUrl: string | null = null;
  if (typeof achievement.image_url === "string") {
    const { data: current } = await supabase.from("achievements").select("image_url").eq("id", id).single();
    oldImageUrl = current?.image_url || null;
  }
  // Tautan video hanya dikirim bila kolomnya sudah ada (migrasi belum jalan → lewati diam-diam).
  const hasVideoCol = achievement.video_url ? await achievementsHasVideoColumn() : false;
  // Ekskul: kirim bila kolom ada; null/"" berarti lepas tautan (hanya bisa
  // dikirim bila kolom ekskul memang sudah tersedia).
  const hasEkskulCol = await achievementsHasEkskulColumn();
  const payload: Record<string, unknown> = { ...achievement };
  if (!hasVideoCol) delete payload.video_url;
  if (!hasEkskulCol) delete payload.ekskul_id;

  const { data, error } = await supabase
    .from("achievements")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating achievement:", error);
    return { data: null, error: error.message };
  }
  // Bersihkan file lama hanya bila URL benar-benar berubah dan tidak masih
  // dipakai baris lain (best-effort; bandingkan path, bukan URL ?v=).
  if (oldImageUrl && oldImageUrl !== achievement.image_url) {
    await pruneAchievementImageFiles([oldImageUrl]);
  }
  return { data };
}

export async function deleteAchievement(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus; file baru dihapus bila baris lain
  // (mis. hasil Duplikat) tidak lagi memakainya.
  const { data: row } = await supabase.from("achievements").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("achievements").delete().eq("id", id);
  if (error) {
    console.error("Error deleting achievement:", error);
    return { error: error.message };
  }
  if (row?.image_url) await pruneAchievementImageFiles([row.image_url]);
  return {};
}

export async function deleteAchievementBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("achievements").select("image_url").in("id", ids);
  const { error } = await supabase.from("achievements").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting achievements:", error);
    return { error: error.message };
  }
  await pruneAchievementImageFiles((rows || []).map((r) => r.image_url));
  return {};
}

export async function uploadAchievementImage(
  file: File,
  achievementId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };
  // Nama file unik tiap unggahan: baris hasil Duplikat berbagi SATU file,
  // jadi file tidak boleh ditimpa/dibersihkan di sini — pembersihan file lama
  // dilakukan oleh update/delete dengan guard referensi (lihat di bawah).
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `achievements/${achievementId}-${Date.now()}-${rand}.jpg`;

  const uploaded = await uploadFileViaRoute("images", path, compressed, {
    upsert: true,
    cacheControl: "31536000",
    contentType: "image/jpeg",
  });
  if (uploaded.error) {
    console.error("Error uploading achievement image:", uploaded.error);
    return { url: null, error: uploaded.error };
  }
  return { url: `${uploaded.url}?v=${Date.now()}` };
}
