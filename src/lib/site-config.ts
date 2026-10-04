/**
 * Konstanta konten situs — sumber tunggal untuk teks & tautan yang TIDAK
 * datang dari database (tagline, media sosial, info SPMB).
 * Ubah nilai hanya di sini; komponen cukup mengimpor SITE.
 */
export const SITE = {
  tagline: "School of Talents",
  social: {
    instagram: "https://www.instagram.com/mbstanggul",
    youtube: "https://www.youtube.com/@mbstanggul",
    facebook: "https://www.facebook.com/mbstanggul",
  },
  spmb: {
    academicYear: "2027/2028",
    contactLabel: "Ketua SPMB",
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
