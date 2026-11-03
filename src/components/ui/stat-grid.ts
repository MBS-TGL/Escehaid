/**
 * Kelas grid kartu statistik untuk `count` kartu.
 *
 * Modul ini SENGAJA tanpa `"use client"` agar bisa dipakai langsung dari
 * Server Component (mis. skeleton Suspense di dashboard admin). Fungsi murni
 * string — tanpa hook, tanpa state — sehingga aman di kedua sisi.
 *
 * Diekspor karena skeleton Suspense WAJIB memakai kelas yang sama — kalau
 * skeleton memakai kolom berbeda, grid melompat saat konten asli selesai
 * dimuat (CLS). Dua bentuk yang benar-benar terjadi di dashboard:
 *   4 kartu (publisher)         → 1 baris 4 kolom, tanpa sel kosong
 *   6 kartu (admin/developer)   → 2 baris × 3 kolom, kartu cukup lebar
 *                                 agar rincian status terbaca (di 6 kolom
 *                                 kartu hanya ±171px dan teksnya ter-truncate)
 * Mobile selalu 2 kolom: 3 kolom menyisakan ±104px per kartu di layar 360px.
 */
export function statGridClass(count: number): string {
  const lg = count === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return `grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${lg}`;
}
