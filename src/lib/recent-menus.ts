/**
 * "Baru dibuka" utk command palette admin (src/app/admin/Topbar.tsx).
 * localStorage `admin-recent-menus`, maks 4 href, terbaru dulu, tanpa duplikat.
 * Aman di server/non-browser: baca → [], simpan → tetap tenyap.
 */

export const RECENT_MENUS_KEY = "admin-recent-menus";
export const RECENT_MENUS_MAX = 4;

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
      .filter(Boolean)
      .slice(0, RECENT_MENUS_MAX);
  } catch {
    return [];
  }
}

/** href menu terbuka terpilih (terbaru dulu) — [] di server / data rusak. */
export function readRecentMenus(): string[] {
  if (!isBrowser()) return [];
  try {
    return parseList(window.localStorage.getItem(RECENT_MENUS_KEY));
  } catch {
    return [];
  }
}

/** Catat href menu + promosikan ke depan → daftar baru setelahnya. */
export function saveRecentMenu(href: string): string[] {
  const clean = href.trim();
  const before = readRecentMenus();
  const next = (clean ? [clean, ...before.filter((x) => x !== clean)] : before).slice(
    0,
    RECENT_MENUS_MAX
  );
  if (!isBrowser()) return next;
  try {
    window.localStorage.setItem(RECENT_MENUS_KEY, JSON.stringify(next));
  } catch {
    // Quota penuh / mode privat — menu "Baru dibuka" boleh hilang.
  }
  return next;
}
