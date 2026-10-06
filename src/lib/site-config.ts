/**
 * Konstanta konten situs — sumber tunggal untuk teks & tautan yang TIDAK
 * datang dari database (tagline, media sosial, info SPMB, daftar kategori
 * & tingkat prestasi).
 * Ubah nilai hanya di sini; komponen cukup mengimpor SITE.
 */
import { Trophy, Medal, Mosque, GraduationCap, MedalMilitary, Palette } from "@/components/Icons";

export const SITE = {
  tagline: "School of Talents",
  social: {
    instagram: "https://www.instagram.com/mbstanggul",
    youtube: "https://www.youtube.com/@mbstanggul",
    facebook: "https://www.facebook.com/mbstanggul",
  },
  spmb: {
    academicYear: "2027/2028",
    submitLocation: "Kantor MBS Tanggul",
  },
} as const;

/**
 * Normalisasi nomor untuk tautan wa.me: buang semua karakter non-digit,
 * lalu ganti awalan "0" dengan "62".
 * "0858-0673-8160" → "6285806738160". Nomor yang sudah diawali "62"/"628"
 * dikembalikan apa adanya.
 */
export function waLink(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

/* ══════════════════════════════════════════════════════════════
   PRESTASI — sumber tunggal kategori & tingkat (konstanta aplikasi,
   bukan data database). Dipakai form admin, filter tabel admin,
   dan halaman publik /achievements. Kategori di data yang tidak ada
   di daftar ini tetap tampil (label capitalize + ikon default).
   ══════════════════════════════════════════════════════════════ */
export const ACHIEVEMENT_CATEGORIES = [
  { key: "akademik", label: "Akademik", color: "bg-blue-50 text-blue-700", icon: Trophy },
  { key: "non-akademik", label: "Non-Akademik", color: "bg-purple-50 text-purple-700", icon: Medal },
  { key: "keagamaan", label: "Keagamaan", color: "bg-amber-50 text-amber-700", icon: Mosque },
  { key: "sekolah", label: "Sekolah", color: "bg-sky-50 text-sky-700", icon: GraduationCap },
  { key: "olahraga", label: "Olahraga", color: "bg-emerald-50 text-emerald-700", icon: MedalMilitary },
  { key: "seni", label: "Seni", color: "bg-pink-50 text-pink-700", icon: Palette },
];

export type AchievementCategoryMeta = (typeof ACHIEVEMENT_CATEGORIES)[number];

/** Cari metadata kategori; undefined = kategori tak dikenal (tampil apa adanya). */
export function achievementCategoryMeta(key?: string | null): AchievementCategoryMeta | undefined {
  return ACHIEVEMENT_CATEGORIES.find((c) => c.key === key);
}

/** Daftar tingkat prestasi — sekali definisi, dipakai form admin & halaman publik. */
export const ACHIEVEMENT_LEVELS = [
  "Sekolah",
  "Kecamatan",
  "Kabupaten",
  "Provinsi",
  "Nasional",
  "Internasional",
];

/**
 * Label tingkat dari nilai di data (cocok tanpa peduli huruf besar/kecil).
 * Nilai di luar daftar (data lama) → undefined, pemanggil memakai capitalize.
 */
export function achievementLevelLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  const needle = value.trim().toLowerCase();
  return ACHIEVEMENT_LEVELS.find((l) => l.toLowerCase() === needle);
}

/** "non-akademik" → "Non-Akademik" — label fallback untuk kategori tak dikenal. */
export function capitalizeCategory(cat: string): string {
  return cat
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}
