/**
 * Riwayat pencarian publik — disimpan di localStorage (`search-recent`),
 * maks 5 entri, terbaru dulu, tanpa duplikat. Dipakai overlay pencarian
 * untuk menampilkan "Pencarian Terakhir" saat input masih kosong.
 *
 * Aman dipanggil di server/non-browser: membaca → [], menyimpan → dibiarkan
 * senyap (tidak melempar). Quota penuh juga ditelan — riwayat adalah
 * kenyamanan, bukan data penting.
 */

export const RECENT_STORAGE_KEY = "search-recent";
export const RECENT_MAX = 5;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

/** Entri tersimpan (terbaru dulu) — [] di server / data rusak. */
export function readRecentSearches(): string[] {
  if (!isBrowser()) return [];
  try {
    return parseList(window.localStorage.getItem(RECENT_STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Tambah entri (dedupe, cap 5, terbaru dulu) → daftar baru setelahnya. */
export function saveRecentSearch(term: string): string[] {
  const trimmed = term.trim().slice(0, 80);
  const before = readRecentSearches();
  const next = (
    trimmed ? [trimmed, ...before.filter((entry) => entry !== trimmed)] : before
  ).slice(0, RECENT_MAX);
  if (!isBrowser()) return next;
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota penuh / mode privat — riwayat cukup hilang, jangan gagalkan UX.
  }
  return next;
}

/** Hapus satu entri → daftar baru setelahnya. */
export function removeRecentSearch(term: string): string[] {
  const before = readRecentSearches();
  const next = before.filter((entry) => entry !== term);
  if (!isBrowser()) return next;
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // dibiarkan — lihat catatan di saveRecentSearch.
  }
  return next;
}

/** Kosongkan seluruh riwayat → []. */
export function clearRecentSearches(): string[] {
  if (!isBrowser()) return [];
  try {
    window.localStorage.removeItem(RECENT_STORAGE_KEY);
  } catch {
    // dibiarkan — lihat catatan di saveRecentSearch.
  }
  return [];
}
