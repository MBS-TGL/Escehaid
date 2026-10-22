/**
 * Utilitas ekstrakurikuler — SATU sumber untuk:
 * - Label nama hari (schedule_day 0=Minggu .. 6=Sabtu)
 * - Pemetaan slug legacy → kunci ikon (dipakai EkskulGlyph juga untuk kartu)
 * - Formatter teks jadwal tampilan ("Sabtu, 08:00" / catatan bebas)
 * - Slug otomatis di form admin
 *
 * Sumber data ekstrakurikuler kini tabel `public.ekskuls` (supabase/ekskul.sql)
 * yang dikelola lewat /admin/ekskul — file ini TIDAK lagi berisi daftar statis
 * ekskul (tanpa fallback runtime, sesuai keputusan).
 * Komponen ikon: lihat `@/components/EkskulIcon` (EkskulGlyph). Picker form
 * admin memakai registry penuh ikon portal (PORTAL_ICONS, @/lib/portal-theme)
 * ditambah opsi "" "Otomatis (dari slug)".
 */

/** Nama hari sesuai indeks kolom `schedule_day` (0-6). */
export const EKSKUL_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

/**
 * Pemetaan slug legacy → kunci ikon, dipakai bila kolom `icon` kosong
 * (termasuk baris seed yang belum dikustom di admin).
 */
export const EKSKUL_SLUG_ICONS: Record<string, string> = {
  "sepak-bola": "soccer",
  futsal: "soccer",
  "bulu-tangkis": "pingpong",
  "hizbul-wathan": "tent",
  panahan: "target",
  qiroah: "microphone",
};

/**
 * Teks jadwal tampilan dari kolom terstruktur:
 * - day + time → "Sabtu, 08:00"
 * - hanya day  → "Sabtu"
 * - hanya note → note (tanpa prefix)
 * - semuanya kosong → "" (kartu menyembunyikan baris jadwal)
 * Nilai `time` dari Postgres berformat "08:00:00" — detik dipangkas.
 */
export function formatEkskulSchedule(
  day: number | null | undefined,
  time: string | null | undefined,
  note?: string | null
): string {
  const parts: string[] = [];
  if (typeof day === "number" && day >= 0 && day <= 6 && EKSKUL_DAYS[day]) {
    parts.push(EKSKUL_DAYS[day]);
  }
  const match = typeof time === "string" ? time.trim().match(/^(\d{1,2}:\d{2})/) : null;
  if (match) parts.push(match[1].padStart(5, "0"));
  const schedule = parts.join(", ");
  const trimmedNote = (note || "").trim();
  if (trimmedNote) return schedule ? `${schedule} · ${trimmedNote}` : trimmedNote;
  return schedule;
}

/** Slug otomatis di form admin: huruf kecil, non-alfanumerik → "-", trim. */
export function slugifyEkskul(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
