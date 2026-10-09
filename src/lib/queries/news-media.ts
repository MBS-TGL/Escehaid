import { supabase } from "../supabase";
import { tryCompressImage } from "../compress-image";
import { storagePathFromUrl } from "./shared";

export async function uploadNewsImage(
  file: File,
  newsId: string
): Promise<{ url: string | null; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `news/${newsId}/${Date.now()}-${rand}.${ext}`;

  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: false, cacheControl: "31536000" });

  if (uploadError) {
    console.error("Error uploading image:", uploadError);
    return { url: null, error: `Gagal mengunggah gambar: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  return { url };
}

/**
 * Ekstrak path di dalam bucket dari publicUrl Supabase Storage.
 * Menangani trailing-slash inconsistency pada getPublicUrl("").
 */

export async function cleanupNewsImageFolder(
  newsId: string,
  keepUrl?: string | null
): Promise<void> {
  try {
    const prefix = `news/${newsId}`;
    const { data: files, error: listError } = await supabase.storage
      .from("images")
      .list(prefix);

    if (listError) {
      console.warn("[cleanupNewsImageFolder] list failed:", listError.message);
      return;
    }
    if (!files || files.length === 0) return;

    // Nama file yang harus dipertahankan
    const keepName = keepUrl ? storagePathFromUrl(keepUrl)?.split("/").pop() : null;

    const toDelete = files
      .filter((f) => f.name !== keepName)
      .map((f) => `${prefix}/${f.name}`);

    if (toDelete.length === 0) return;

    const { data, error: removeError } = await supabase.storage
      .from("images")
      .remove(toDelete);

    if (removeError) {
      console.warn("[cleanupNewsImageFolder] remove failed:", removeError.message);
    } else if (!data || data.length === 0) {
      console.warn(
        `[cleanupNewsImageFolder] remove returned empty data untuk ${toDelete.length} file di ${prefix}/`,
        "— kemungkinan policy DELETE belum dikonfigurasi di bucket 'images'.",
        "Tambahkan SQL policy berikut di Supabase Dashboard → Storage → Policies:",
        `CREATE POLICY \"Allow authenticated delete\" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images');`
      );
    }
  } catch (e) {
    console.warn("[cleanupNewsImageFolder] error:", e);
  }
}

/**
 * Kirim daftar path ke POST /api/revalidate, lalu catat status HTTP +
 * pesan error dari server bila gagal (untuk debugging admin/developer).
 * `type` opsional ("page" | "layout") diteruskan ke revalidatePath di server.
 */

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ATTACHMENT_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.oasis.opendocument.text": "ODT",
  "text/plain": "TXT",
  "application/zip": "ZIP",
};

/** null = file boleh diunggah, string = pesan penolakan. */
export function checkAttachment(file: File): string | null {
  if (!ATTACHMENT_TYPES[file.type]) {
    return "Format file tidak didukung. Gunakan PDF, Word, Excel, TXT, atau ZIP.";
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return `Ukuran file maksimal ${Math.round(ATTACHMENT_MAX_BYTES / 1048576)} MB.`;
  }
  return null;
}

/** Label jenis lampiran dari ekstensi, mis. "PDF", "DOCX". */
export function attachmentKind(name?: string | null): string {
  const ext = (name || "").split(".").pop()?.toUpperCase() || "FILE";
  return ext.length <= 5 ? ext : "FILE";
}

export async function uploadNewsAttachment(
  file: File,
  newsId: string
): Promise<{ url: string | null; error?: string }> {
  const invalid = checkAttachment(file);
  if (invalid) return { url: null, error: invalid };

  const folder = `news/${newsId}`;
  const storage = supabase.storage.from("documents");

  // Nama file aman untuk URL (tanpa spasi/karakter aneh); nama asli tetap disimpan
  // di attachment_name untuk ditampilkan.
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100);
  const path = `${folder}/${safeName}`;

  const { error: uploadError } = await storage.upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "31536000",
  });

  if (uploadError) {
    console.error("Error uploading attachment:", uploadError);
    return { url: null, error: uploadError.message };
  }

  const { data } = storage.getPublicUrl(path);
  const publicUrl = data.publicUrl;

  // Satu berita = satu file → buang file lama SETELAH upload sukses
  // (kalau gagal, lampiran lama tetap utuh).
  try {
    const { data: listing } = await storage.list(folder);
    const stale = (listing || [])
      .map((f) => `${folder}/${f.name}`)
      .filter((p) => p !== path);
    if (stale.length > 0) await storage.remove(stale);
  } catch {
    /* best-effort */
  }

  return { url: `${publicUrl}?v=${Date.now()}` };
}

/** Hapus semua lampiran milik sebuah berita (dipanggil saat berita dihapus). */
export async function cleanupNewsAttachments(newsId: string) {
  try {
    const storage = supabase.storage.from("documents");
    const { data } = await storage.list(`news/${newsId}`);
    if (data && data.length > 0) {
      await storage.remove(data.map((f) => `news/${newsId}/${f.name}`));
    }
  } catch {
    /* best-effort */
  }
}

// ============ GALLERY ============
