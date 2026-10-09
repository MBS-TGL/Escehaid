import { cache } from "react";
import { supabase } from "../supabase";
import type { Achievement } from "../supabase";
import { tryCompressImage } from "../compress-image";
import { deleteStorageFileByUrl, sanitizeSearchTerm, storagePathFromUrl } from "./shared";

/**
 * Daftar prestasi (semua baris tayang — tidak ada kolom is_published).
 * `search` (opsional) menyaring judul ATAU deskripsi — dipakai pencarian
 * menyeluruh di /search.
 */
export async function getAchievementList(search?: string): Promise<Achievement[]> {
  const term = sanitizeSearchTerm(search ?? "");
  let query = supabase
    .from("achievements")
    .select("*")
    .order("sort_order", { ascending: true });

  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching achievements:", error);
    return [];
  }
  return data || [];
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
}): Promise<{ data: Achievement | null; error?: string }> {
  const { data, error } = await supabase
    .from("achievements")
    .insert(achievement)
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
  }
): Promise<{ data: Achievement | null; error?: string }> {
  // Ambil URL gambar lama supaya file lama bisa dibersihkan bila berganti
  let oldImageUrl: string | null = null;
  if (typeof achievement.image_url === "string") {
    const { data: current } = await supabase.from("achievements").select("image_url").eq("id", id).single();
    oldImageUrl = current?.image_url || null;
  }

  const { data, error } = await supabase
    .from("achievements")
    .update(achievement)
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

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    console.error("Error uploading achievement image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}
