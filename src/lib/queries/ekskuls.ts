import { supabase } from "../supabase";
import type { Ekskul } from "../supabase";
import { tryCompressImage } from "../compress-image";
import { buildSearchOr, deleteStorageFileByUrl, fetchTrgmIds, resolveSearchMode, storagePathFromUrl, tableHasColumn, tokenizeSearch } from "./shared";
import { removeViaRoute, listViaRoute, uploadFileViaRoute } from "../storage-remote";

/**
 * Data ekstrakurikuler dari tabel `public.ekskuls` (skema: supabase/ekskul.sql).
 * Pola identik dengan `facilities.ts`: CRUD tulis langsung dari browser via
 * anon key + RLS ("Admins can manage ekskul"), gambar ke bucket `images`,
 * penyimpanan dibersihkan SETELAH operasi DB itu berhasil.
 */

/** Pesan ramah bila tabel/RLS belum disiapkan dan kesalahan umum lainnya. */
function friendlyError(error: { message?: string; code?: string } | null | undefined): string {
  const msg = error?.message || "";
  const missingTable =
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /Could not find the table|schema cache|does not exist/i.test(msg);
  if (missingTable) {
    return "Tabel ekskuls belum tersedia — jalankan supabase/ekskul.sql di Supabase SQL Editor.";
  }
  return msg || "Terjadi kesalahan tidak terduga.";
}

/**
 * Ekskul aktif, urut `sort_order`. `limit` (opsional) membatasi baris —
 * dipakai beranda/profil. `search` (opsional) menyaring nama ATAU deskripsi —
 * dipakai pencarian menyeluruh di /search. Gagal → [] (section ekskul
 * otomatis tidak dirender).
 */
export async function getEkskulList(limit?: number, search?: string): Promise<Ekskul[]> {
  let query = supabase
    .from("ekskuls")
    .select(
      "id, slug, name, description, icon, schedule_day, schedule_time, schedule_note, coach, image_url, image_alt, sort_order"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Pencarian menyeluruh (?q=): nama ATAU deskripsi — multi-token;
  // pg_trgm aktif → kandidat via RPC search_ekskuls_ids (toleransi typo).
  const tokens = tokenizeSearch(search ?? "");
  let simIds: string[] | null = null;
  if (tokens.length && (await resolveSearchMode("ekskuls", tokens)) === "similarity") {
    simIds = await fetchTrgmIds("search_ekskuls_ids", tokens);
  }
  if (tokens.length && simIds) {
    if (!simIds.length) return [];
    query = query.in("id", simIds);
  } else if (tokens.length) {
    const orFilter = buildSearchOr(tokens, ["name", "description"]);
    if (orFilter) query = query.or(orFilter);
  }

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching ekskul:", error);
    return [];
  }
  return (data || []) as Ekskul[];
}

/** Seluruh baris (termasuk nonaktif) untuk panel admin. */
export async function getEkskulListAll(): Promise<Ekskul[]> {
  const { data, error } = await supabase
    .from("ekskuls")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching all ekskul:", error);
    throw new Error(friendlyError(error));
  }
  return data || [];
}

/**
 * Satu ekskul aktif berdasarkan slug — dipakai halaman detail
 * `/ekskul/[slug]` (termasuk kolom `history`). Baris nonaktif/tak ada → null.
 */
export async function getEkskulBySlug(slug: string): Promise<Ekskul | null> {
  const { data, error } = await supabase
    .from("ekskuls")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    console.error("Error fetching ekskul by slug:", error);
    return null;
  }
  return (data as Ekskul) || null;
}

export type EkskulInput = Partial<
  Pick<
    Ekskul,
    | "name"
    | "slug"
    | "description"
    | "history"
    | "icon"
    | "schedule_day"
    | "schedule_time"
    | "schedule_note"
    | "coach"
    | "image_url"
    | "image_alt"
    | "sort_order"
    | "is_active"
  >
>;

export async function createEkskul(
  input: EkskulInput
): Promise<{ data: Ekskul | null; error?: string }> {
  const payload = await normalizeInput(input);
  const { data, error } = await supabase
    .from("ekskuls")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("Error creating ekskul:", error);
    return { data: null, error: friendlyError(error) };
  }
  return { data };
}

/** Timpa memoized: apakah kolom `history` sudah ada di tabel ekskuls? */
let historyColPromise: Promise<boolean> | null = null;
function ekskulHasHistoryColumn(): Promise<boolean> {
  if (!historyColPromise) {
    historyColPromise = tableHasColumn("ekskuls", "history");
  }
  return historyColPromise;
}

/**
 * Hilangkan `history` dari payload bila kolomnya belum ada (migrasi
 * supabase/ekskul.sql belum dijalankan) — simpan tetap berjalan, kolom
 * sejarah diabaikan sampai migrasi jalan.
 */
async function normalizeInput(input: EkskulInput): Promise<EkskulInput & Record<string, unknown>> {
  if (typeof input.history !== "undefined" && !(await ekskulHasHistoryColumn())) {
    const rest: EkskulInput = { ...input };
    delete rest.history;
    return { ...rest } as EkskulInput & Record<string, unknown>;
  }
  return { ...input } as EkskulInput & Record<string, unknown>;
}

/**
 * Buang query string cache-buster (`?v=…`) agar file yang sama tidak
 * salah dianggap berbeda saat perbandingan URL lama vs baru.
 */
function withoutQuery(u?: string | null): string {
  return u ? u.split("?")[0] : "";
}

export async function updateEkskul(
  id: string,
  input: EkskulInput
): Promise<{ data: Ekskul | null; error?: string }> {
  // `typeof image_url === "string"` = yang dipanggil memang menyentuh kolom
  // gambar. Toggle status / reorder hanya mengirim is_active/sort_order →
  // jangan pernah menganggap gambar berganti (storage ikut terhapus, fatal).
  const touchesImage = typeof input.image_url === "string";
  let oldImageUrl: string | null = null;
  if (touchesImage) {
    const { data: current } = await supabase.from("ekskuls").select("image_url").eq("id", id).single();
    oldImageUrl = current?.image_url || null;
  }

  const { data, error } = await supabase
    .from("ekskuls")
    .update({ ...(await normalizeInput(input)), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating ekskul:", error);
    return { data: null, error: friendlyError(error) };
  }

  if (touchesImage) {
    const next = input.image_url || null;
    if (oldImageUrl && withoutQuery(oldImageUrl) !== withoutQuery(next)) {
      deleteStorageFileByUrl(oldImageUrl).catch(() => {});
    }
    cleanupEkskulImageFolder(id, next).catch(() => {});
  }
  return { data };
}

export async function deleteEkskul(id: string): Promise<{ error?: string }> {
  const { data: row } = await supabase.from("ekskuls").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("ekskuls").delete().eq("id", id);
  if (error) {
    console.error("Error deleting ekskul:", error);
    return { error: friendlyError(error) };
  }
  cleanupEkskulImageFolder(id).catch(() => {});
  if (row?.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  return {};
}

export async function deleteEkskulBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("ekskuls").select("image_url").in("id", ids);
  const { error } = await supabase.from("ekskuls").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting ekskul:", error);
    return { error: friendlyError(error) };
  }
  for (const id of ids) cleanupEkskulImageFolder(id).catch(() => {});
  for (const row of rows || []) {
    if (row.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  }
  return {};
}

/**
 * Ubah status aktif/nonaktif beberapa ekskul sekaligus dalam SATU query
 * batch (pola `deleteEkskulBulk`). Tidak ada pembersihan storage — data
 * baris tetap ada.
 */
export async function updateEkskulBulk(
  ids: string[],
  patch: { is_active: boolean }
): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const { error } = await supabase
    .from("ekskuls")
    .update({ is_active: patch.is_active, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) {
    console.error("Error bulk updating ekskul:", error);
    return { error: friendlyError(error) };
  }
  return {};
}

/**
 * Simpan urutan hasil geser panah di panel: update per baris, laporkan
 * error pertama yang gagal.
 */
export async function reorderEkskuls(
  items: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  const results = await Promise.all(
    items.map((item) =>
      supabase
        .from("ekskuls")
        .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
        .eq("id", item.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: friendlyError(failed.error) };
  return {};
}

/**
 * Unggah gambar ekskul ke bucket `images`: `ekskuls/<id>/<timestamp>-<rand>.<ext>`
 * dengan path unik per unggah (bukan menimpa). File lama dibersihkan SETELAH
 * DB sukses di-update (lihat `updateEkskul`) — pola `facilities`.
 */
export async function uploadEkskulImage(
  file: File,
  ekskulId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `ekskuls/${ekskulId}/${Date.now()}-${rand}.${ext}`;

  const uploaded = await uploadFileViaRoute("images", path, compressed, {
    upsert: false,
    cacheControl: "31536000",
    contentType: compressed.type ? undefined : "image/jpeg",
  });
  if (uploaded.error) {
    console.error("Error uploading ekskul image:", uploaded.error);
    return { url: null, error: `Gagal mengunggah gambar: ${uploaded.error}` };
  }
  return { url: `${uploaded.url}?v=${Date.now()}` };
}

/**
 * Buang semua file di folder `ekskuls/<id>/` kecuali `keepUrl`. Dipanggil
 * SETELAH operasi DB berhasil — pembersihan bersifat best-effort.
 */
export async function cleanupEkskulImageFolder(
  ekskulId: string,
  keepUrl?: string | null
): Promise<void> {
  try {
    const prefix = `ekskuls/${ekskulId}`;
    const { data: files, error: listError } = await listViaRoute("images", prefix);
    if (listError) {
      console.warn("[cleanupEkskulImageFolder] list failed:", listError.message);
      return;
    }
    if (!files || files.length === 0) return;

    const keepName = keepUrl ? storagePathFromUrl(keepUrl)?.split("/").pop() : null;
    const toDelete = files
      .filter((f) => f.name !== keepName)
      .map((f) => `${prefix}/${f.name}`);
    if (toDelete.length === 0) return;

    const { error: removeError } = await removeViaRoute("images", toDelete);
    if (removeError) {
      console.warn("[cleanupEkskulImageFolder] remove failed:", removeError.message);
    }
  } catch (e) {
    console.warn("[cleanupEkskulImageFolder] error:", e);
  }
}
