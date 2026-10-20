/**
 * Helper tampilan murni untuk dashboard admin (tanpa efek samping, tanpa
 * akses database — mudah diuji unit test).
 */

/**
 * Normalisasi nama ke Title Case untuk TAMPILAN SAJA (data di database
 * tidak diubah). "siti azizah" → "Siti Azizah", "MUHAMMAD RIZKI" →
 * "Muhammad Rizki".
 */
export function toTitleCase(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Waktu relatif Bahasa Indonesia: "baru saja", "5 menit lalu", "3 jam
 * lalu", "2 hari lalu"; >30 hari → tanggal WIB biasa (dd MMM yyyy).
 *
 * Selisih memakai epoch mentah (timezone-agnostic — value dari DB dan
 * now sama-sama UTC epoch, jadi hasil selalu konsisten di mesin mana pun).
 * Param `now` disediakan supaya mudah diuji (pure function).
 */
export function formatRelativeTime(value: string, now: Date = new Date()): string {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "";

  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days <= 30) return `${days} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(then);
}

/** Berapa hari penuh sejak `value` — untuk penekanan SPMB pending > 3 hari. */
export function daysSince(value: string, now: Date = new Date()): number {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}
