export interface CompressOptions {
  /** Lebar maksimal hasil (rasio asli dijaga). Default 1920. */
  maxWidth?: number;
  /** Tinggi maksimal hasil. Default 1080. */
  maxHeight?: number;
  /** Kualitas JPEG 0..1. Default 0.82. */
  quality?: number;
  /** Lewati kompresi kalau file sudah lebih kecil dari ini. Default 300.000. */
  minBytes?: number;
  /** Target ukuran file — kualitas/dimensi diturunkan sampai muat. */
  targetBytes?: number;
}

const DEFAULTS: Required<Omit<CompressOptions, "targetBytes">> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.82,
  minBytes: 300_000,
};

/**
 * Preset untuk foto profil guru/kepala sekolah:
 * lebar maks 600px, target ≤ 200 KB — cukup untuk kartu berukuran ~240px
 * (bahkan untuk layar retina) tanpa membebani egress Supabase.
 */
export const TEACHER_PHOTO: CompressOptions = {
  maxWidth: 600,
  maxHeight: 900,
  quality: 0.78,
  minBytes: 0,
  targetBytes: 200_000,
};

async function drawAndEncode(
  bitmap: ImageBitmap,
  w: number,
  h: number,
  quality: number
): Promise<Blob> {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.convertToBlob({ type: "image/jpeg", quality });
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const { maxWidth, maxHeight, quality, minBytes, targetBytes } = {
    ...DEFAULTS,
    ...options,
  };
  const limit = targetBytes ?? minBytes;

  const bitmap = await createImageBitmap(file);
  let w = bitmap.width;
  let h = bitmap.height;

  const scale = Math.min(1, maxWidth / w, maxHeight / h);
  const needsResize = scale < 1;
  if (needsResize) {
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }

  // Sudah sesuai dimensi & ukuran → tidak usah di-encode ulang.
  if (!needsResize && file.size <= limit) return file;

  // 1) Encode dengan kualitas awal, lalu turunkan sampai muat target.
  let q = quality;
  let blob = await drawAndEncode(bitmap, w, h, q);
  while (blob.size > limit && q > 0.45) {
    q = Math.max(0.45, q - 0.12);
    const next = await drawAndEncode(bitmap, w, h, q);
    if (next.size >= blob.size) break; // sudah mentok
    blob = next;
  }

  // 2) Masih kebesaran → perkecil dimensi (maks 2 putaran).
  let pass = 0;
  while (blob.size > limit && pass < 2 && Math.min(w, h) > 480) {
    w = Math.round(w * 0.75);
    h = Math.round(h * 0.75);
    pass += 1;
    const next = await drawAndEncode(bitmap, w, h, q);
    if (next.size >= blob.size) break;
    blob = next;
  }

  // Tanpa target eksplisit: kalau hasilnya malah lebih besar, pakai file asli.
  if (!targetBytes && blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
