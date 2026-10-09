import { supabase } from "../supabase";
import type { Activity } from "../supabase";
import { tryCompressImage } from "../compress-image";
import { cleanupOldFiles, deleteStorageFileByUrl, sanitizeSearchTerm } from "./shared";

export interface ActivityListOptions {
  /** Filter tipe kegiatan (key ACTIVITY_TYPES, mis. "lomba"). */
  type?: string;
  /** Offset baris untuk pagination — hanya dipakai bersama `pageSize`. */
  offset?: number;
  /** Jumlah baris per halaman; menimpa `limit` bila keduanya diberikan. */
  pageSize?: number;
}

// Kolom daftar + kolom opsional Fase 5/6 (activity_time, live_url, end_date,
// registration_url, contact_person, is_featured). Bila migrasi belum dijalankan,
// PostgREST membalas 42703 → query otomatis diulang TANPA kolom baru
// (degrade gracefully; halaman & simpan data tak pernah rusak).
const LIST_COLUMNS_BASE =
  "id, title, slug, description, activity_type, activity_date, location, image_url, is_published, created_at";
const LIST_COLUMNS_ALL = `${LIST_COLUMNS_BASE}, activity_time, live_url, end_date, registration_url, contact_person, is_featured`;

/** Semua kolom opsional Fase 5/6 — dilepas dari payload bila belum ada di DB. */
const OPTIONAL_FIELDS = [
  "activity_time",
  "live_url",
  "end_date",
  "registration_url",
  "contact_person",
  "is_featured",
] as const;

/** True bila error = kolom opsional belum ada di tabel (migrasi belum jalan). */
function isMissingOptionalColumn(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  return OPTIONAL_FIELDS.some((f) => new RegExp(f, "i").test(error.message || ""));
}

/** Salin payload TANPA kolom opsional (untuk retry saat migrasi belum jalan). */
function stripOptionalFields(payload: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...payload };
  for (const field of OPTIONAL_FIELDS) delete rest[field];
  return rest;
}

/**
 * Normalisasi kolom opsional sebelum insert/update:
 * - teks (activity_time, contact_person) kosong → null
 * - URL (live_url, registration_url) trim + tambah https:// bila tanpa skema
 * - end_date "" → null
 */
function normalizeOptionalFields(payload: Record<string, unknown>): Record<string, unknown> {
  for (const key of ["activity_time", "contact_person"] as const) {
    const value = payload[key];
    if (typeof value === "string") payload[key] = value.trim() || null;
  }
  for (const key of ["live_url", "registration_url"] as const) {
    const value = payload[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      payload[key] = !trimmed ? null : /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    }
  }
  const end = payload.end_date;
  if (typeof end === "string" && !end.trim()) payload.end_date = null;
  return payload;
}

/**
 * Daftar kegiatan yang tayang (is_published = true).
 * - `search` (opsional) menyaring judul ATAU deskripsi — dipakai /search.
 * - `opts` (opsional) menambah filter tipe & pagination (offset/pageSize)
 *   tanpa merusak pemanggil lama: beranda `getActivityList(4)`,
 *   /search `getActivityList(n, q)`, list & generateStaticParams tanpa argumen.
 * - `location` ikut di-select karena kartu list publik menampilkan lokasi.
 */
export async function getActivityList(
  limit?: number,
  search?: string,
  opts?: ActivityListOptions
): Promise<Activity[]> {
  const term = sanitizeSearchTerm(search ?? "");
  const run = async (select: string) => {
    let query = supabase
      .from("activities")
      .select(select)
      .eq("is_published", true)
      .order("activity_date", { ascending: false });

    if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    if (opts?.type) query = query.eq("activity_type", opts.type);
    if (opts?.pageSize) {
      const from = Math.max(0, opts.offset ?? 0);
      query = query.range(from, from + opts.pageSize - 1);
    } else if (limit) {
      query = query.limit(limit);
    }
    return await query;
  };

  let result = await run(LIST_COLUMNS_ALL);
  if (result.error && isMissingOptionalColumn(result.error)) {
    // Migrasi kolom opsional (Fase 5/6) belum dijalankan → ulang tanpa kolom baru.
    result = await run(LIST_COLUMNS_BASE);
  }
  const { data, error } = result;

  if (error) {
    console.error("Error fetching activities:", JSON.stringify(error), error.message, error.code, error.details, error.hint);
    return [];
  }
  // select string runtime → PostgREST tak bisa infer kolom (GenericStringError) → cast via unknown.
  return (data || []) as unknown as Activity[];
}

/**
 * Kegiatan PUBLIK per slug — hanya is_published = true sehingga draft tidak
 * bisa diakses lewat URL (generateMetadata & halaman detail memakai ini).
 * maybeSingle() → null tanpa error saat slug tidak ada / masih draft.
 * Admin memakai getActivityListAll() (tanpa filter publish).
 */
export async function getActivityBySlug(slug: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching activity by slug:", error);
    return null;
  }
  return data;
}

/**
 * Slug unik: kalau sudah dipakai kegiatan LAIN → akhiran -2, -3, dst.
 * `excludeId` = id kegiatan yang sedang diedit (slug sendiri boleh dipakai).
 */
async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "kegiatan";
  let candidate = slug;
  for (let suffix = 2; suffix <= 50; suffix++) {
    const { data } = await supabase
      .from("activities")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === excludeId) return candidate;
    candidate = `${slug}-${suffix}`;
  }
  // Jaring pengaman (tak akan terjadi pada pemakaian normal).
  return `${slug}-${Date.now()}`;
}

export async function getActivityListAll(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all activities:", error);
    return [];
  }
  return data || [];
}

export async function createActivity(activity: {
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  activity_date?: string;
  end_date?: string | null;
  activity_type?: string;
  location?: string;
  image_url?: string;
  is_published?: boolean;
  activity_time?: string | null;
  live_url?: string | null;
  registration_url?: string | null;
  contact_person?: string | null;
  is_featured?: boolean | null;
}): Promise<{ data: Activity | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  // Slug unik: derive dari judul bila tak diisi; bila sudah dipakai → -2, -3, dst.
  activity.slug = await ensureUniqueSlug(activity.slug || activity.title);
  const payload = normalizeOptionalFields({ ...activity, author_id: user?.id });
  let result = await supabase.from("activities").insert(payload).select().single();
  if (result.error && isMissingOptionalColumn(result.error)) {
    // Migrasi kolom opsional (Fase 5/6) belum jalan → simpan tanpa kolom baru.
    result = await supabase.from("activities").insert(stripOptionalFields(payload)).select().single();
  }
  const { data, error } = result;

  if (error) {
    console.error("Error creating activity:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function updateActivity(
  id: string,
  activity: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    activity_date?: string;
    end_date?: string | null;
    activity_type?: string;
    location?: string;
    image_url?: string;
    is_published?: boolean;
    activity_time?: string | null;
    live_url?: string | null;
    registration_url?: string | null;
    contact_person?: string | null;
    is_featured?: boolean | null;
  }
): Promise<{ data: Activity | null; error?: string }> {
  // Ambil data row saat ini: URL gambar lama (cleanup bila berganti) + slug lama.
  const { data: current } = await supabase
    .from("activities")
    .select("image_url, slug")
    .eq("id", id)
    .maybeSingle();
  const oldImageUrl =
    typeof activity.image_url === "string" ? current?.image_url || null : null;
  // Slug HANYA berubah bila diperintah eksplisit:
  // - slug terisi   → pakai (bila sudah dipakai kegiatan lain → -2, -3, dst.)
  // - slug ""       → judul diubah DAN slug dikosongkan → derive dari judul
  // - slug tidak dikirim → pertahankan slug lama meski judul berubah (URL stabil)
  if (activity.slug !== undefined) {
    const explicit = activity.slug.trim();
    const base = explicit === "" ? (activity.title?.trim() || "kegiatan") : explicit;
    activity.slug = await ensureUniqueSlug(base, id);
  }
  const payload = normalizeOptionalFields(activity);
  let result = await supabase
    .from("activities")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (result.error && isMissingOptionalColumn(result.error)) {
    // Migrasi kolom opsional (Fase 5/6) belum jalan → update tanpa kolom baru.
    result = await supabase
      .from("activities")
      .update(stripOptionalFields(payload))
      .eq("id", id)
      .select()
      .single();
  }
  const { data, error } = result;

  if (error) {
    console.error("Error updating activity:", error);
    return { data: null, error: error.message };
  }
  // Bersihkan file lama hanya bila URL benar-benar berubah (best-effort)
  if (oldImageUrl && oldImageUrl !== activity.image_url) {
    deleteStorageFileByUrl(oldImageUrl).catch(() => {});
  }
  return { data };
}

export async function deleteActivity(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("activities").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) {
    console.error("Error deleting activity:", error);
    return { error: error.message };
  }
  if (row?.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  return {};
}

export async function deleteActivityBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("activities").select("image_url").in("id", ids);
  const { error } = await supabase.from("activities").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting activities:", error);
    return { error: error.message };
  }
  for (const row of rows || []) {
    if (row.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  }
  return {};
}

export async function togglePublishActivity(
  id: string,
  is_published: boolean
): Promise<{ error?: string }> {
  const { error } = await supabase.from("activities").update({ is_published }).eq("id", id);
  if (error) {
    console.error("Error toggling activity publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function togglePublishActivityBulk(
  ids: string[],
  is_published: boolean
): Promise<{ error?: string }> {
  const { error } = await supabase.from("activities").update({ is_published }).in("id", ids);
  if (error) {
    console.error("Error bulk toggling activity publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function uploadActivityImage(
  file: File,
  activityId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };
  const path = `activities/${activityId}.jpg`;

  await cleanupOldFiles("activities", activityId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    console.error("Error uploading activity image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

// ============ GALLERY CRUD ============
