/**
 * Sumber tunggal TIPES KEGIATAN (key, label, warna badge) + util tanggal.
 * Dipakai oleh: list publik /activities, detail /activities/[slug],
 * dan admin (activityTypeConfig). Jangan definisikan ulang di halaman lain.
 *
 * ⚠ CATATAN MIGRASI (jalankan manual di SQL Editor Supabase — jangan otomatis):
 * kolom activities.activity_type punya CHECK constraint (database.sql) yang
 * hanya mengizinkan 6 nilai lama. Tanpa ALTER berikut, simpan tipe "penampilan"
 * akan DITOLAK database:
 *
 *   ALTER TABLE public.activities
 *     DROP CONSTRAINT activities_activity_type_check,
 *     ADD CONSTRAINT activities_activity_type_check CHECK (
 *       activity_type = ANY (ARRAY[
 *         'kajian', 'peringatan', 'lomba', 'upacara', 'ekskul', 'umum', 'penampilan'
 *       ])
 *     );
 */

export interface ActivityTypeConfig {
  key: string;
  label: string;
  /** Kelas Tailwind badge (border/bg/text) untuk admin & kartu. */
  badge: string;
}

export const ACTIVITY_TYPES: Record<string, ActivityTypeConfig> = {
  kajian: { key: "kajian", label: "Kajian", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  peringatan: { key: "peringatan", label: "Peringatan", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  lomba: { key: "lomba", label: "Lomba", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  upacara: { key: "upacara", label: "Upacara", badge: "bg-red-50 text-red-700 border-red-200" },
  ekskul: { key: "ekskul", label: "Ekstrakurikuler", badge: "bg-green-50 text-green-700 border-green-200" },
  umum: { key: "umum", label: "Umum", badge: "bg-slate-50 text-slate-700 border-slate-200" },
  penampilan: { key: "penampilan", label: "Penampilan", badge: "bg-pink-50 text-pink-700 border-pink-200" },
};

/** Label tipe untuk tampilan; fallback ke key mentah bila tak dikenal. */
export function activityTypeLabel(key?: string | null): string {
  if (key && ACTIVITY_TYPES[key]) return ACTIVITY_TYPES[key].label;
  return key || ACTIVITY_TYPES.umum.label;
}

/** Kelas badge tipe; fallback netral bila tak dikenal. */
export function activityTypeBadge(key?: string | null): string {
  if (key && ACTIVITY_TYPES[key]) return ACTIVITY_TYPES[key].badge;
  return "bg-slate-100 text-slate-600 border-slate-200";
}

// ============ TANGGAL (Asia/Jakarta — bukan zona browser/server) ============
// Kolom activity_date bertipe timestamptz dan selalu tersimpan sebagai midnight
// UTC (input type="date") → efektif date-only. Semua formatting HARUS memakai
// zona Asia/Jakarta agar tanggal kalender identik di server (UTC) & browser (WIB).

/** Zona waktu situs (WIB). */
export const SITE_TZ = "Asia/Jakarta";

/** "YYYY-MM-DD" hari ini menurut Asia/Jakarta (bukan UTC). */
export function todayInJakarta(now: Date = new Date()): string {
  // en-CA menghasilkan format ISO YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TZ }).format(now);
}

/** "YYYY-MM-DD" sebuah tanggal menurut zona Asia/Jakarta; null bila tak valid. */
export function toJakartaDateKey(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TZ }).format(d);
}

/**
 * Format tanggal kegiatan untuk tampilan (id-ID).
 * Selalu timeZone Asia/Jakarta → aman dari selisih UTC vs WIB.
 */
export function formatActivityDate(
  value: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }
): string {
  const key = toJakartaDateKey(value);
  if (!key) return "";
  const d = new Date(`${key}T00:00:00+07:00`);
  return new Intl.DateTimeFormat("id-ID", { timeZone: SITE_TZ, ...opts }).format(d);
}

export type ActivityStatus = "upcoming" | "today" | "ongoing" | "past";

/**
 * Status kegiatan terhadap hari ini (zona Asia/Jakarta):
 * "upcoming" = akan datang, "today" = mulai hari ini, "ongoing" = sedang
 * berlangsung (rentang end_date melewati hari ini), "past" = sudah selesai.
 * `endDate` opsional (kolom end_date) — tanpa end → dianggap sehari.
 * Tanpa tanggal valid dianggap "past" (konsisten dengan JSON-LD).
 */
export function activityStatus(
  activityDate: string | null | undefined,
  endDate: string | null | undefined = null,
  now: Date = new Date()
): ActivityStatus {
  const start = toJakartaDateKey(activityDate);
  if (!start) return "past";
  const end = toJakartaDateKey(endDate) || start;
  const today = todayInJakarta(now);
  if (today < start) return "upcoming";
  if (today === start) return "today";
  return today <= end ? "ongoing" : "past";
}

/**
 * Selisih hari (Asia/Jakarta) dari hari ini menuju tanggal MULAI:
 * > 0 = "n hari lagi", 0 = hari ini, < 0 = sudah lewat; null bila tak valid.
 */
export function daysUntilActivity(
  activityDate: string | null | undefined,
  now: Date = new Date()
): number | null {
  const start = toJakartaDateKey(activityDate);
  if (!start) return null;
  const diff =
    Date.parse(`${start}T00:00:00Z`) - Date.parse(`${todayInJakarta(now)}T00:00:00Z`);
  return Math.round(diff / 86_400_000);
}

/**
 * Format tanggal tunggal ATAU rentang mulai–selesai untuk tampilan:
 * - short (default): "9 Okt 2026" · se-bulan "9–12 Okt 2026" ·
 *   lintas bulan "9 Okt – 12 Nov 2026"
 * - long: "Jumat, 9 Oktober 2026" /
 *   "Jumat, 9 Oktober 2026 – Senin, 12 Oktober 2026"
 * Tanpa end / end tidak valid (<= mulai) → tampil sebagai tanggal tunggal.
 */
export function formatActivityDateRange(
  activityDate: string | null | undefined,
  endDate: string | null | undefined,
  opts: { long?: boolean } = {}
): string {
  const start = toJakartaDateKey(activityDate);
  if (!start) return "";
  const rawEnd = toJakartaDateKey(endDate);
  const end = rawEnd && rawEnd > start ? rawEnd : start;
  const single = end === start;
  if (opts.long) {
    const one = (k: string) =>
      formatActivityDate(k, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return single ? one(start) : `${one(start)} – ${one(end)}`;
  }
  if (single) return formatActivityDate(start, { day: "numeric", month: "short", year: "numeric" });
  if (start.slice(0, 7) === end.slice(0, 7)) {
    const month = formatActivityDate(start, { month: "short" });
    return `${Number(start.slice(8, 10))}–${Number(end.slice(8, 10))} ${month} ${start.slice(0, 4)}`;
  }
  return `${formatActivityDate(start, { day: "numeric", month: "short", year: "numeric" })} – ${formatActivityDate(end, { day: "numeric", month: "short", year: "numeric" })}`;
}

/**
 * Fase 5/6 — badge/tombol LIVE aktif bila `live_url` terisi DAN hari ini
 * berada di rentang [mulai − 1 hari, selesai] (Asia/Jakarta): menyala sehari
 * sebelum mulai, tetap menyala selama kegiatan berlangsung, dan mati setelah
 * selesai. Tanpa tanggal valid → tidak live.
 */
export function isActivityLiveActive(
  liveUrl: string | null | undefined,
  activityDate: string | null | undefined,
  endDate: string | null | undefined = null
): boolean {
  if (!liveUrl) return false;
  const start = toJakartaDateKey(activityDate);
  if (!start) return false;
  const end = toJakartaDateKey(endDate) || start;
  const yesterday = todayInJakarta(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const tomorrow = todayInJakarta(new Date(Date.now() + 24 * 60 * 60 * 1000));
  return end >= yesterday && start <= tomorrow;
}
