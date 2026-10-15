/**
 * Utilitas kontras WCAG 2.1 — murni (tanpa React/DOM), dipakai:
 *  - validasi warna tema di server (actions) & klien (pratinjau langsung)
 *  - unit test Phase D
 *
 * Rumus WCAG: rasio = (L terang + 0.05) / (L gelap + 0.05), dengan L dihitung
 * dari luminance relatif ruang warna sRGB.
 */

/** Normalisasi "#082b59", "082B59", "#abc" → "#rrggbb". null bila bukan hex valid. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

/** "#rrggbb" → [r, g, b]. null bila bukan hex valid. */
export function hexToRgb(input: string): [number, number, number] | null {
  const hex = normalizeHex(input);
  if (!hex) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminance relatif WCAG (0 = hitam, 1 = putih). */
export function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(channelLuminance) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Rasio kontras dua warna (1 = identik, 21 = hitam vs putih).
 * null bila salah satu warna bukan hex valid.
 */
export function contrastRatio(a: string, b: string): number | null {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return null;
  const la = relativeLuminance(rgbA);
  const lb = relativeLuminance(rgbB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Ambang WCAG AA. */
export const AA_NORMAL_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;
export const AA_UI_COMPONENT = 3;

export interface ContrastVerdict {
  ratio: number;
  /** true bila lolos ambang AA untuk teks normal (4.5:1). */
  pass: boolean;
}

/** Cek pasangan teks-di-atas-warna; dipakai validasi sebelum simpan tema. */
export function checkContrast(foreground: string, background: string): ContrastVerdict | null {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) return null;
  return { ratio, pass: ratio >= AA_NORMAL_TEXT };
}
