import { tryCompressImage } from "../compress-image";
import { storagePathFromUrl } from "./shared";
import {
  uploadFileViaRoute,
  listViaRoute,
  removeViaRoute,
} from "../storage-remote";

export async function uploadNewsImage(
  file: File,
  newsId: string
): Promise<{ url: string | null; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `news/${newsId}/${Date.now()}-${rand}.${ext}`;

  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };

  const uploaded = await uploadFileViaRoute("images", path, compressed, {
    upsert: false,
    cacheControl: "31536000",
  });

  if (uploaded.error) {
    console.error("Error uploading image:", uploaded.error);
    return { url: null, error: `Gagal mengunggah gambar: ${uploaded.error}` };
  }

  return { url: `${uploaded.url}?v=${Date.now()}` };
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
    const { data: files, error: listError } = await listViaRoute("images", prefix);

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

    const { data, error: removeError } = await removeViaRoute("images", toDelete);

    if (removeError) {
      console.warn("[cleanupNewsImageFolder] remove failed:", removeError.message);
    } else if (!data || data.length === 0) {
      console.warn(
        `[cleanupNewsImageFolder] remove returned empty data untuk ${toDelete.length} file di ${prefix}/`
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

export { attachmentKind } from "../helpers";

export async function uploadNewsAttachment(
  file: File,
  newsId: string
): Promise<{ url: string | null; error?: string }> {
  const invalid = checkAttachment(file);
  if (invalid) return { url: null, error: invalid };

  const folder = `news/${newsId}`;

  // Nama file aman untuk URL (tanpa spasi/karakter aneh); nama asli tetap disimpan
  // di attachment_name untuk ditampilkan.
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100);
  const path = `${folder}/${safeName}`;

  const uploaded = await uploadFileViaRoute("documents", path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "31536000",
  });

  if (uploaded.error) {
    console.error("Error uploading attachment:", uploaded.error);
    return { url: null, error: uploaded.error };
  }

  // Satu berita = satu file → buang file lama SETELAH upload sukses
  // (kalau gagal, lampiran lama tetap utuh).
  try {
    const { data: listing } = await listViaRoute("documents", folder);
    const stale = (listing || [])
      .map((f) => `${folder}/${f.name}`)
      .filter((p) => p !== path);
    if (stale.length > 0) await removeViaRoute("documents", stale);
  } catch {
    /* best-effort */
  }

  return { url: `${uploaded.url}?v=${Date.now()}` };
}

/** Hapus semua lampiran milik sebuah berita (dipanggil saat berita dihapus). */
export async function cleanupNewsAttachments(newsId: string) {
  try {
    const { data } = await listViaRoute("documents", `news/${newsId}`);
    if (data && data.length > 0) {
      await removeViaRoute("documents", data.map((f) => `news/${newsId}/${f.name}`));
    }
  } catch {
    /* best-effort */
  }
}

// ============ GALLERY ============
