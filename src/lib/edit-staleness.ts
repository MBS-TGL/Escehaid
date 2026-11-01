/**
 * Penjaga tabrakan edit (collision guard) ringan — tanpa Realtime.
 *
 * Saat form edit dibuka, catat `updated_at` baris; sebelum menyimpan,
 * baca ulang baris dan bandingkan. Bila berubah, admin lain menyimpan
 * di tengah jalan → minta konfirmasi agar tidak menimpa diam-diam.
 */

/** true bila baris berubah sejak form dibuka (keduanya harus valid). */
export function isEditStale(
  openedUpdatedAt: string | null | undefined,
  latestUpdatedAt: string | null | undefined
): boolean {
  if (!openedUpdatedAt || !latestUpdatedAt) return false;
  const a = new Date(openedUpdatedAt).getTime();
  const b = new Date(latestUpdatedAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b > a;
}
