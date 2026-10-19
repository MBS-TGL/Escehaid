/**
 * Tema warna merek: preset siap pakai + validasi pasangan warna.
 * Terpisah dari registry karena bersifat *cross-field* (dua kunci saling
 * berkaitan) dan butuh perhitungan kontras dari contrast.ts.
 */
import { AA_NORMAL_TEXT, AA_UI_COMPONENT, contrastRatio, normalizeHex } from "./contrast";

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  primary: string;
  accent: string;
}

/**
 * Preset dipilih agar teks putih di atas warna utama & aksen selalu lolos
 * WCAG AA (dicek oleh unit test Phase D dan `validateThemePair`).
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "navy",
    label: "Navy Tanggul",
    description: "Kombinasi bawaan situs saat ini — biru navy dengan aksen biru terang.",
    primary: "#082b59",
    accent: "#1767b1",
  },
  {
    id: "hijau",
    label: "Hijau Da'i",
    description: "Hijau tua dengan aksen hijau daun — nuansa religius.",
    primary: "#14532d",
    accent: "#15803d",
  },
  {
    id: "marun",
    label: "Marun Akademik",
    description: "Merah marun dengan aksen merah bata — kesan akademik dan tegas.",
    primary: "#7f1d1d",
    accent: "#b91c1c",
  },
  {
    id: "ungu",
    label: "Ungu Kreatif",
    description: "Ungu tua dengan aksen ungu terang — modern dan menonjol.",
    primary: "#4c1d95",
    accent: "#6d28d9",
  },
  {
    id: "teal",
    label: "Teal Tenang",
    description: "Hijau kebiruan gelap dengan aksen teal — bersih dan menenangkan.",
    primary: "#134e4a",
    accent: "#0f766e",
  },
  {
    id: "slate",
    label: "Abu Profesional",
    description: "Abu-abu gelap dengan aksen biru dingin — netral dan profesional.",
    primary: "#1e293b",
    accent: "#334155",
  },
];

/** Kuning sembat — dekorasi highlight publik; tidak ikut dalam preset warna. */
export const DEFAULT_HIGHLIGHT = "#f4d21f";

export const DEFAULT_THEME = {
  primary: THEME_PRESETS[0].primary,
  accent: THEME_PRESETS[0].accent,
  highlight: DEFAULT_HIGHLIGHT,
};

/** Cari preset yang persis cocok dengan pasangan warna terpilih (null bila custom). */
export function findThemePreset(primary: string, accent: string): ThemePreset | null {
  const p = normalizeHex(primary);
  const a = normalizeHex(accent);
  if (!p || !a) return null;
  return (
    THEME_PRESETS.find((preset) => preset.primary === p && preset.accent === a) ?? null
  );
}

export interface ThemeValidation {
  /** true bila warna layak disimpan (tidak ada pelanggaran AA). */
  ok: boolean;
  /** Alasan penolakan; kosong bila lolos. */
  errors: string[];
  /** Rasio kontras teks putih di atas warna utama (null bila hex invalid). */
  primaryOnWhite: number | null;
  accentOnWhite: number | null;
}

/**
 * Validasi pasangan warna tema.
 *  - Teks putih di atas warna UTAMA dipakai pada tombol & header → wajib AA (4.5:1).
 *  - Teks putih di atas AKSEN dipakai pada chip/ikon → wajib AA UI (3:1).
 */
export function validateThemePair(primaryInput: string, accentInput: string): ThemeValidation {
  const errors: string[] = [];
  const primary = normalizeHex(primaryInput);
  const accent = normalizeHex(accentInput);

  if (!primary) errors.push("Warna utama bukan heksadesimal yang valid.");
  if (!accent) errors.push("Warna aksen bukan heksadesimal yang valid.");

  if (primary && accent && primary === accent) {
    errors.push("Warna utama dan aksen tidak boleh sama.");
  }

  const primaryOnWhite = primary ? contrastRatio(primary, "#ffffff") : null;
  const accentOnWhite = accent ? contrastRatio(accent, "#ffffff") : null;

  if (primaryOnWhite !== null && primaryOnWhite < AA_NORMAL_TEXT) {
    errors.push(
      `Kontras warna utama dengan teks putih hanya ${primaryOnWhite.toFixed(2)}:1 (min. ${AA_NORMAL_TEXT}:1). Pilih warna yang lebih gelap.`
    );
  }
  if (accentOnWhite !== null && accentOnWhite < AA_UI_COMPONENT) {
    errors.push(
      `Kontras warna aksen dengan putih hanya ${accentOnWhite.toFixed(2)}:1 (min. ${AA_UI_COMPONENT}:1). Pilih warna yang lebih gelap.`
    );
  }

  return { ok: errors.length === 0, errors, primaryOnWhite, accentOnWhite };
}
