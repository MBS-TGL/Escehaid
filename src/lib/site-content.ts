/**
 * Konten bawaan (fallback) profil & sambutan kepala sekolah.
 *
 * Dipisah ke modul murni tanpa dependensi Supabase/React supaya bisa dipakai
 * dua sisi sekaligus:
 *   • registry pengaturan (dibundel ke klien lewat SettingsForm)
 *   • halaman publik (server)
 *
 * Semua nilai di sini adalah jaring pengaman terakhir: override admin →
 * school_profile → default.
 */

export const DEFAULT_PRINCIPAL_NAME = "Khoirul Anwar, S.Pd";

/** Fallback foto kepala sekolah (objek R2, bukan file repo). */
export const PRINCIPAL_PHOTO_FALLBACK =
  "https://cdn.smpmuh4tanggul.sch.id/images/Kepala-Sekolah.jpg";

export const PRINCIPAL_QUOTE_FALLBACK =
  "Setiap anak datang dengan bakat dan caranya sendiri. Tugas kami di SMP Muhammadiyah 4 Tanggul adalah menuntunnya tumbuh berilmu, berakhlak, dan berkemajuan - menjadi pribadi yang bermanfaat bagi keluarga, masyarakat, dan umat.";

/** Fallback visi bila kolom kosong/null (selaras dengan profil sekolah). */
export const VISION_FALLBACK =
  "Menjadi lembaga pencetak kader da'i dan ulama hafidz yang menguasai ilmu pengetahuan dan teknologi berwawasan global serta peduli dan berbudaya lingkungan.";

/** Pecah teks misi menjadi butir; menerima JSON array, teks bernomor, atau baris. */
export function missionToItems(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {}
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  return value
    .split(/\d+\.\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Kolom `mission` → teks satu butir per baris (nilai tampilan form admin). */
export function missionToLines(value: string | null | undefined): string {
  return missionToItems(value).join("\n");
}

/** Fallback butir misi bila kolom kosong/null. */
export const MISSION_FALLBACK: string[] = [
  "Menanamkan kepribadian Islam dan kepedulian terhadap lingkungan",
  "Menanamkan karakter unggul: lurus aqidah, bagus ibadah, mulia akhlak",
  "Melaksanakan pembelajaran aktif, inovatif, kreatif, dan menyenangkan",
  "Menumbuhkan potensi keberbakatan dalam setiap siswa",
  "Berbasis Boarding School dan Full Day School dengan kurikulum Nasional & Muhammadiyah",
  "Mewujudkan generasi emas 2045: One Home One Hafidz",
];
