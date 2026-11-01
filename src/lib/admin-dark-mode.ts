/**
 * Mode gelap admin (beta, opt-in) — preferensi tampilan pribadi per-browser,
 * pola yang sama dengan `admin-sidebar-state.ts` dan `recent-menus.ts`.
 *
 * Penerapan lewat atribut `data-admin-dark="true"` di <html>; CSS-nya di
 * `globals.css`, di-scope `:has(#admin-sidebar)` supaya tidak bocor ke
 * halaman publik. Aman di server / non-browser.
 */

export const ADMIN_DARK_MODE_KEY = "admin-dark-mode";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** true bila admin memilih mode gelap (default: terang). */
export function readAdminDarkMode(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(ADMIN_DARK_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Simpan pilihan; gagal tulis (quota/mode privat) diabaikan. */
export function saveAdminDarkMode(on: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ADMIN_DARK_MODE_KEY, on ? "1" : "0");
  } catch {
    // Preferensi tampilan boleh hilang — jangan menghalangi toggle.
  }
}

/** Pasang/lepas atribut di <html>; no-op di server. */
export function applyAdminDarkMode(on: boolean): void {
  if (typeof document === "undefined") return;
  if (on) {
    document.documentElement.dataset.adminDark = "true";
  } else {
    delete document.documentElement.dataset.adminDark;
  }
}
