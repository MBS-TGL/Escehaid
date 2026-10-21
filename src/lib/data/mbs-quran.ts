/**
 * Konten section "Pembelajaran Al-Qur'an Metode Wafa" — data statis bertipe
 * (resep migrasi ke DB nanti: tabel `program_pillars` atau serupa).
 *
 * SEMUA pilar berflag needsReview: true (laporkan di ringkasan akhir; TIDAK
 * ditampilkan sebagai penanda di UI). Field `target` (pengganti "TARGET")
 * dikosongkan — hanya ikut dirender bila terisi.
 */

export const QURAN_SECTION_META = {
  eyebrow: "PROGRAM AL-QUR'AN",
  heading: "Pembelajaran Al-Qur'an dengan Metode Wafa",
  subheading:
    "SMP Muhammadiyah 4 Tanggul bekerja sama dengan Wafa Indonesia dalam pembelajaran Al-Qur'an. Wafa adalah metode belajar Al-Qur'an otak kanan yang menyenangkan dan menyeluruh.",
} as const;

export interface QuranPillar {
  /** Nomor urut dua digit ("01"). */
  number: string;
  title: string;
  description: string;
  /** Label waktu (menggantikan "TARGET"). */
  time: string;
  /** Kosong = tidak dirender. */
  target?: string;
  needsReview: boolean;
}

export const QURAN_PILLARS: QuranPillar[] = [
  {
    number: "01",
    title: "Wafa – BTA",
    description:
      "Belajar baca tulis Al-Qur'an (BTA) dengan Metode Wafa, metode belajar Al-Qur'an otak kanan, setiap hari sekolah sebelum KBM.",
    time: "Senin–Jumat · 07.30–08.10 WIB",
    needsReview: true,
  },
  {
    number: "02",
    title: "Ngaji Harian",
    description: "Mengaji bersama setelah shalat Subuh, Dzuhur, dan Ashar.",
    time: "Setiap hari",
    needsReview: true,
  },
  {
    number: "03",
    title: "Tahfidz Siang",
    description:
      "Menghafal dan menguatkan hafalan Al-Qur'an di sela jam sekolah, sebelum shalat Ashar.",
    time: "Senin–Jumat · 14.05–14.45 WIB",
    needsReview: true,
  },
  {
    number: "04",
    title: "Tahfidz & Mufrodat Malam",
    description:
      "Menjaga hafalan dan menambah kosakata bahasa Arab (mufrodat) setelah shalat Isya'.",
    time: "19.00–21.00 WIB",
    needsReview: true,
  },
  {
    number: "05",
    title: "Kajian & Pendalaman",
    description:
      "Kajian sore menjelang Maghrib: Hadis Arba'in, Al-Kahfi pada hari Jumat, dan Ngaji Juz 30 pada hari Ahad.",
    time: "16.45–19.00 WIB",
    needsReview: true,
  },
];

export const AGENDA_SECTION_META = {
  eyebrow: "KEHIDUPAN SANTRI",
  heading: "Agenda Harian Santri: Ibadah, Belajar & Kemandirian",
  subheading:
    "Satu hari santri MBS dibagi menjadi empat blok waktu — dari dini hari hingga istirahat malam — dengan ibadah, belajar, kegiatan ekstra, dan kemandirian yang berjalan setiap hari.",
} as const;
