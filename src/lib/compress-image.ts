const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 300_000) return file;

  const bitmap = await createImageBitmap(file);
  let w = bitmap.width;
  let h = bitmap.height;

  if (w > MAX_WIDTH || h > MAX_HEIGHT) {
    const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });

  if (blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
