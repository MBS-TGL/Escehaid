import { supabase } from "../supabase";
import type { Facility } from "../supabase";
import { tryCompressImage } from "../compress-image";
import { deleteStorageFileByUrl, storagePathFromUrl } from "./shared";
import { removeViaRoute, listViaRoute, uploadFileViaRoute } from "../storage-remote";

/**
 * Daftar fasilitas aktif (urut `sort_order`).
 * `limit` (opsional) membatasi jumlah baris — dipakai beranda (hanya memakai
 * 3 fasilitas pertama) supaya tidak mengambil seluruh tabel.
 */
export async function getFacilityList(limit?: number): Promise<Facility[]> {
  let query = supabase
    .from("facilities")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching facilities:", error);
    return [];
  }
  return data || [];
}

export async function getFacilityListAll(): Promise<Facility[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching all facilities:", error);
    // Melempar error agar panel admin bisa membedakan "kosong" vs "gagal
    // memuat" — pemanggil (panel fasilitas, satu-satunya) menampilkan retry.
    throw new Error(error.message);
  }
  return data || [];
}

export async function createFacility(facility: {
  name: string;
  description?: string;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{ data: Facility | null; error?: string }> {
  const { data, error } = await supabase
    .from("facilities")
    .insert(facility)
    .select()
    .single();

  if (error) {
    console.error("Error creating facility:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

/**
 * Buang query string dari URL. Setiap URL gambar selalu membawa `?v=<ts>`
 * cache-buster, sehingga perbandingan string mentah bisa salah menganggap
 * file yang sama sebagai "berbeda" (→ file aktif ikut terhapus).
 */
function withoutQuery(u?: string | null): string {
  return u ? u.split("?")[0] : "";
}

export async function updateFacility(
  id: string,
  facility: {
    name?: string;
    description?: string;
    image_url?: string | null;
    sort_order?: number;
    is_active?: boolean;
  }
): Promise<{ data: Facility | null; error?: string }> {
  // `typeof image_url === "string"` = pemanggil ikut menyentuh kolom gambar.
  // Toggle status hanya mengirim `is_active` → tidak boleh membersihkan storage.
  const touchesImage = typeof facility.image_url === "string";
  let oldImageUrl: string | null = null;
  if (touchesImage) {
    const { data: current } = await supabase.from("facilities").select("image_url").eq("id", id).single();
    oldImageUrl = current?.image_url || null;
  }

  const { data, error } = await supabase
    .from("facilities")
    .update(facility)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating facility:", error);
    return { data: null, error: error.message };
  }

  // ── Baru SEKARANG storage dibersihkan: row sudah pasti berhasil ──
  if (touchesImage) {
    const next = facility.image_url || null;
    if (oldImageUrl && withoutQuery(oldImageUrl) !== withoutQuery(next)) {
      deleteStorageFileByUrl(oldImageUrl).catch(() => {});
    }
    // Sisa folder (file versi lama/sampah) dibuang, kecuali yang sedang dipakai
    cleanupFacilityImageFolder(id, next).catch(() => {});
  }
  return { data };
}

export async function deleteFacility(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("facilities").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("facilities").delete().eq("id", id);
  if (error) {
    console.error("Error deleting facility:", error);
    return { error: error.message };
  }
  // Setelah row hilang: buang seluruh folder + file yang menempel di row
  // (file lama `facilities/<id>.jpg` dan row buatan yang path-nya memakai
  // tempId saat unggah tidak berada di folder <id>, jadi keduanya dibersihkan).
  cleanupFacilityImageFolder(id).catch(() => {});
  if (row?.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  return {};
}

export async function deleteFacilityBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("facilities").select("image_url").in("id", ids);
  const { error } = await supabase.from("facilities").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting facilities:", error);
    return { error: error.message };
  }
  for (const id of ids) cleanupFacilityImageFolder(id).catch(() => {});
  for (const row of rows || []) {
    if (row.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  }
  return {};
}

/**
 * Simpan urutan fasilitas hasil drag-and-drop. Pola sama dengan
 * `reorderPortalApps`: update per baris, kembalikan error pertama yang gagal.
 */
export async function reorderFacilities(
  items: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  const results = await Promise.all(
    items.map((item) =>
      supabase.from("facilities").update({ sort_order: item.sort_order }).eq("id", item.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };
  return {};
}

/**
 * Unggah gambar fasilitas ke bucket "images".
 *
 * Path dibuat UNIK per unggah — bukan `facilities/<id>.jpg` yang ditimpa
 * (`upsert: true`) seperti sebelumnya. Konsekuensi bug lamanya: pembersihan
 * file dijalankan SEBELUM upload, jadi bila unggah gagal setelahnya, row di DB
 * tetap menunjuk file yang sudah terhapus → gambar rusak permanen.
 *
 * Kini: unggah ke `facilities/<id>/<timestamp>-<random>.<ext>` dengan
 * `upsert: false`, dan file lama dibersihkan SETELAH DB sukses
 * (lihat `updateFacility`).
 */
export async function uploadFacilityImage(
  file: File,
  facilityId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `facilities/${facilityId}/${Date.now()}-${rand}.${ext}`;

  const uploaded = await uploadFileViaRoute("images", path, compressed, {
    upsert: false,
    cacheControl: "31536000",
    contentType: compressed.type ? undefined : "image/jpeg",
  });
  if (uploaded.error) {
    console.error("Error uploading facility image:", uploaded.error);
    return { url: null, error: `Gagal mengunggah gambar: ${uploaded.error}` };
  }
  return { url: `${uploaded.url}?v=${Date.now()}` };
}

/**
 * Hapus semua file di folder `facilities/<facilityId>/`, kecuali file yang
 * URL-nya == keepUrl. Dipanggil SETELAH row berhasil di-update (supaya
 * kegagalan unggah/DB tidak pernah menghapus gambar yang sedang dipakai).
 * Kegagalan list/remove hanya `console.warn` — pembersihan bersifat best-effort.
 */
export async function cleanupFacilityImageFolder(
  facilityId: string,
  keepUrl?: string | null
): Promise<void> {
  try {
    const prefix = `facilities/${facilityId}`;
    const { data: files, error: listError } = await listViaRoute("images", prefix);

    if (listError) {
      console.warn("[cleanupFacilityImageFolder] list failed:", listError.message);
      return;
    }
    if (!files || files.length === 0) return;

    // `storagePathFromUrl` membuang `?v=…` sehingga nama file tidak salah cocok
    const keepName = keepUrl ? storagePathFromUrl(keepUrl)?.split("/").pop() : null;
    const toDelete = files
      .filter((f) => f.name !== keepName)
      .map((f) => `${prefix}/${f.name}`);

    if (toDelete.length === 0) return;

    const { data, error: removeError } = await removeViaRoute("images", toDelete);

    if (removeError) {
      console.warn("[cleanupFacilityImageFolder] remove failed:", removeError.message);
    } else if (!data || data.length === 0) {
      console.warn(
        `[cleanupFacilityImageFolder] remove returned empty data untuk ${toDelete.length} file di ${prefix}/`
      );
    }
  } catch (e) {
    console.warn("[cleanupFacilityImageFolder] error:", e);
  }
}

// ============ ARTICLES ============
/**
 * Kolom list publik (tanpa content) — dipakai dua kali: dengan `author_name`
 * (kolom hasil ALTER TABLE) dan tanpanya bila kolom belum ada.
 */
