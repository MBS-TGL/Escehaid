/**
 * Helper tampilan murni untuk dashboard admin (tanpa efek samping, tanpa
 * akses database — mudah diuji unit test).
 */

import { normalizeName } from "./format-name";

/** Ambang penekanan SPMB pending — dipakai dashboard DAN daftar pendaftar. */
export const PENDING_SLA_DAYS = 3;

/**
 * Normalisasi nama ke Title Case untuk TAMPILAN SAJA (data di database
 * tidak diubah). Delegasi ke helper bersama format-name.ts — normalisasi
 * saat simpan memakai fungsi yang sama, jadi tampilan dan data konsisten.
 */
export function toTitleCase(input: string): string {
  return normalizeName(input);
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

/** Berapa hari penuh sejak `value`, dihitung dengan batas hari zona Asia/Jakarta. */
export function daysSince(value: string, now: Date = new Date()): number {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.round((jakartaDayEpoch(now) - jakartaDayEpoch(then)) / 86_400_000);
}

/**
 * Epoch "tengah malam" dari tanggal yang sama di zona Asia/Jakarta — untuk
 * perhitungan selisih hari berbasis kalender (bukan blok 24 jam mentah),
 * sesuai zona waktu panitia.
 */
function jakartaDayEpoch(date: Date): number {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
