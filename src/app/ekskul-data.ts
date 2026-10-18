/**
 * Daftar ekstrakurikuler — SATU sumber kebenaran untuk:
 * - section "Ekstrakurikuler" di beranda (page.tsx)
 * - section "Ekstrakurikuler" di halaman Profil (profile/page.tsx)
 *
 * Nama & jadwal berasal dari keterangan pihak sekolah. "Catur" ditiadakan dan
 * "Panahan" ditambahkan; FAQ beranda (faq-data.ts) disamakan agar tidak ada
 * daftar ganda yang berbeda.
 *
 * TODO: lengkapi description/imageUrl bila sudah ada (nama & jadwal sudah final).
 */
export type Ekskul = {
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  schedule?: string;
};

export const ekskul: Ekskul[] = [
  { slug: "hizbul-wathan", name: "Hizbul Wathan", schedule: "Sabtu, 08:00" },
  { slug: "bulu-tangkis", name: "Bulu Tangkis", schedule: "Sabtu, 09:30" },
  { slug: "sepak-bola", name: "Sepak Bola", schedule: "Sabtu, 09:30" },
  { slug: "panahan", name: "Panahan", schedule: "Sabtu, 12:30" },
  { slug: "futsal", name: "Futsal", schedule: "Minggu, 09:00" },
  { slug: "qiroah", name: "Qiroah", schedule: "Rabu, 20:00" },
];
