import { supabase } from "../supabase";
import type { Download } from "../supabase";
import { storageFrom } from "../storage";

// ============================================================================
// UNDUHAN (Area Download publik)
// Berkas tersimpan di bucket "documents" (publik) folder downloads/ — bucket
// yang sama dengan lampiran berita. Barisnya memakai tabel `downloads`
// (lihat supabase/downloads.sql): publik hanya membaca baris aktif.
// ============================================================================

/** Batas ukuran berkas unduhan: 10 MB. */
export const DOWNLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** Ekstensi berkas yang diizinkan untuk diunggah sebagai unduhan. */
const DOWNLOAD_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "zip", "rar", "txt", "jpg", "jpeg", "png", "webp",
]);

/** Label jenis berkas dari ekstensi, mis. "PDF", "DOCX" (fallback "FILE"). */
export function downloadKind(name?: string | null): string {
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";
  const upper = ext.toUpperCase();
  return upper.length <= 5 && upper ? upper : "FILE";
}

/** Format ukuran byte → "1,2 MB" / "340 KB" (indonesia, 1 desimal). */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB`;
}

/** null bila berkas layak diunggah; string pesan Indonesia bila ditolak. */
export function checkDownloadFile(file: File): string | null {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!DOWNLOAD_EXTENSIONS.has(ext)) {
    return "Format berkas tidak didukung. Gunakan PDF, Word, Excel, PowerPoint, ZIP, gambar, atau TXT.";
  }
  if (file.size > DOWNLOAD_MAX_BYTES) {
    return `Ukuran berkas maksimal ${Math.round(DOWNLOAD_MAX_BYTES / 1048576)} MB.`;
  }
  return null;
}

/** Daftar publik — hanya baris aktif, urut sesuai urutan admin. */
export async function getDownloadList(): Promise<Download[]> {
  const { data, error } = await supabase
    .from("downloads")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching downloads:", error);
    return [];
  }
  return data || [];
}

/**
 * Ringkas error Supabase menjadi teks satu baris (kode + pesan). Dipakai
 * untuk console.error — objek PostgrestError/Error terkadang tampil "{}"
 * di overlay dev, menyembunyikan penyebab (mis. 42501 permission denied).
 */
function describeDbError(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string; details?: string; hint?: string };
    if (e.message) {
      return [e.code, e.message, e.hint].filter(Boolean).join(" · ");
    }
  }
  try {
    return JSON.stringify(error) || String(error);
  } catch {
    return String(error);
  }
}

/** Pesan ramah untuk kegagalan yang lazim di tabel baru (GRANT/RLS/tabel). */
export function friendlyDownloadError(error: string): string {
  if (/permission denied|42501/i.test(error)) {
    return "Database menolak akses (GRANT tabel downloads belum ada) — jalankan bagian GRANT di supabase/downloads.sql di Supabase SQL Editor.";
  }
  if (/row-level security/i.test(error)) {
    return "Database menolak akses (policy RLS unduhan belum aktif) — jalankan supabase/downloads.sql di Supabase SQL Editor.";
  }
  if (/does not exist|42P01|schema cache/i.test(error)) {
    return "Tabel downloads belum ada — jalankan supabase/downloads.sql di Supabase SQL Editor.";
  }
  return error;
}

/** Daftar untuk panel admin — termasuk baris nonaktif. */
export async function getDownloadListAll(): Promise<Download[]> {
  const { data, error } = await supabase
    .from("downloads")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching downloads (all):", describeDbError(error));
    throw new Error(friendlyDownloadError(error.message || describeDbError(error)));
  }
  return data || [];
}

export async function createDownload(input: {
  title: string;
  description?: string | null;
  category?: string;
  file_url: string;
  file_name?: string | null;
  file_size?: number | null;
  sort_order?: number;
}): Promise<{ error?: string }> {
  const { error } = await supabase.from("downloads").insert({
    title: input.title,
    description: input.description ?? null,
    category: input.category?.trim() || "Umum",
    file_url: input.file_url,
    file_name: input.file_name ?? null,
    file_size: input.file_size ?? null,
    sort_order: input.sort_order ?? 0,
  });
  if (error) {
    console.error("Error creating download:", error);
    return { error: error.message };
  }
  return {};
}

export async function updateDownload(
  id: string,
  data: Partial<
    Pick<
      Download,
      "title" | "description" | "category" | "file_url" | "file_name" | "file_size" | "is_active" | "sort_order"
    >
  >
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("downloads")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Error updating download:", error);
    return { error: error.message };
  }
  return {};
}

/** Path berkas "documents" dari URL publiknya; null bila bukan URL storage itu. */
function documentsPathFromUrl(url: string): string | null {
  const match = url.split("?")[0].match(/\/storage\/v1\/object\/public\/documents\/(.+)$/);
  return match ? match[1] : null;
}

/** Hapus berkas di bucket documents (best-effort — tidak menggagalkan delete baris). */
async function removeDownloadFile(url?: string | null): Promise<void> {
  const path = url ? documentsPathFromUrl(url) : null;
  if (!path) return;
  try {
    const { error } = await storageFrom("documents").remove([path]);
    if (error) console.warn("[removeDownloadFile] remove failed:", error.message);
  } catch (e) {
    console.warn("[removeDownloadFile] error:", e);
  }
}

export async function deleteDownload(id: string): Promise<{ error?: string }> {
  // Ambil URL berkas SEBELUM baris dihapus agar berkas tidak jadi orphan.
  const { data: row } = await supabase
    .from("downloads")
    .select("file_url")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("downloads").delete().eq("id", id);
  if (error) {
    console.error("Error deleting download:", error);
    return { error: error.message };
  }
  removeDownloadFile(row?.file_url).catch(() => {});
  return {};
}

export async function deleteDownloadBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase
    .from("downloads")
    .select("file_url")
    .in("id", ids);
  const { error } = await supabase.from("downloads").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting downloads:", error);
    return { error: error.message };
  }
  for (const row of rows || []) {
    removeDownloadFile(row.file_url).catch(() => {});
  }
  return {};
}

/**
 * Unggah berkas unduhan ke bucket "documents" folder downloads/.
 * Nama path diberi awalan timestamp agar tidak menimpa berkas lain dengan
 * nama sama; nama asli tetap disimpan di kolom file_name.
 */
export async function uploadDownloadFile(
  file: File
): Promise<{ url: string | null; name: string | null; size: number | null; error?: string }> {
  const invalid = checkDownloadFile(file);
  if (invalid) return { url: null, name: null, size: null, error: invalid };

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100);
  const path = `downloads/${Date.now()}-${safeName}`;
  const storage = storageFrom("documents");

  const { error: uploadError } = await storage.upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
    cacheControl: "31536000",
  });
  if (uploadError) {
    console.error("Error uploading download file:", uploadError);
    return { url: null, name: null, size: null, error: uploadError.message };
  }

  const { data } = storage.getPublicUrl(path);
  return { url: data.publicUrl, name: file.name, size: file.size };
}
