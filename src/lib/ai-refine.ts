/**
 * Helper murni endpoint /api/ai/refine — pemetaan target ➜ modul RBAC, izin,
 * dan normalisasi hasil AI per modul. Tanpa I/O supaya mudah dites unit.
 */
import {
  ACTIVITY_TYPE_KEYS,
  NEWS_CATEGORIES,
  type ImportTarget,
  type RefinedContent,
} from "./gemini";

/** Daftar target yang sah untuk body request. */
const VALID_TARGETS: readonly ImportTarget[] = [
  "news",
  "articles",
  "activities",
  "announcements",
];

/** True bila `value` adalah target AI yang valid. */
export function isImportTarget(value: unknown): value is ImportTarget {
  return typeof value === "string" && (VALID_TARGETS as readonly string[]).includes(value);
}

/** Modul RBAC tiap target — key sesuai MODULE_REGISTRY. */
export const IMPORT_TARGET_MODULE: Record<ImportTarget, string> = {
  news: "berita",
  articles: "artikel",
  activities: "kegiatan",
  announcements: "pengumuman",
};

/** Key modul RBAC untuk target AI tertentu. */
export function permissionModuleForTarget(target: ImportTarget): string {
  return IMPORT_TARGET_MODULE[target];
}

/**
 * Izin minimal memakai AI: bisa membuat ATAU menyunting konten modul —
 * dipakai seragam oleh route (server) dan AiFillPanel (klien).
 */
export function aiPermissionsFor(target: ImportTarget): string[] {
  const mod = permissionModuleForTarget(target);
  return [`${mod}:create`, `${mod}:update`];
}

/** Trim string hasil AI; undefined/null → "". */
function clean(value: string | undefined | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalisasi hasil Gemini sebelum dikirim ke klien — hanya field yang
 * relevan dengan target, ter-sanitasi & tervalidasi:
 * - `content` disanitasi (HTML aman).
 * - `category` news divalidasi ke NEWS_CATEGORIES (fallback "berita").
 * - `activity_type` divalidasi ke key ACTIVITY_TYPES (fallback "umum").
 * - `activity_date` wajib pola YYYY-MM-DD (fallback "").
 */
export function normalizeRefinedFor(
  target: ImportTarget,
  data: RefinedContent
): Partial<RefinedContent> {
  if (target === "announcements") {
    return { announcement: clean(data.announcement) };
  }
  if (target === "activities") {
    const date = clean(data.activity_date);
    const type = clean(data.activity_type);
    return {
      title: clean(data.title),
      summary: clean(data.summary),
      content: clean(data.content),
      activity_type: (ACTIVITY_TYPE_KEYS as string[]).includes(type) ? type : "umum",
      location: clean(data.location),
      activity_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    };
  }
  const category = clean(data.category);
  if (target === "news") {
    return {
      title: clean(data.title),
      summary: clean(data.summary),
      content: clean(data.content),
      category: (NEWS_CATEGORIES as readonly string[]).includes(category) ? category : "berita",
    };
  }
  // articles — kategori bebas (koma/catatan panjang dibuang).
  return {
    title: clean(data.title),
    summary: clean(data.summary),
    content: clean(data.content),
    category: category.split(",")[0].trim(),
  };
}
