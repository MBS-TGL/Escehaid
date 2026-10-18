/**
 * Progress bar baca untuk halaman detail — CSS scroll-driven (`animation-timeline:
 * scroll(root)`), tanpa JS dan tanpa listener scroll.
 *
 * - Browser yang mendukung: garis aksen tumbuh mengikuti posisi baca.
 * - Browser lama: `@supports` gagal → elemen tetap tersembunyi (scaleX 0),
 *   jadi tidak ada bar nyangkut di layar.
 * - Menghormati preferensi "kurangi gerakan" (bar statis, tak dianggap gerak UI).
 */
export default function ReadingProgress() {
  return <div className="reading-progress" aria-hidden="true" />;
}
