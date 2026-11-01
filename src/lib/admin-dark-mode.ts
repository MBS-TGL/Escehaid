/**
 * Mode gelap admin (beta, opt-in) — preferensi tampilan pribadi per-browser,
 * pola yang sama dengan `admin-sidebar-state.ts` dan `recent-menus.ts`.
 *
 * Penerapan lewat atribut `data-admin-dark="true"` di <html>; CSS-nya di
 * `globals.css`, di-scope `:has(#admin-sidebar)` supaya tidak bocor ke
 * halaman publik. Aman di server / non-browser.
 *
 * Anti-kedip: `ADMIN_DARK_INIT_SCRIPT` disuntik sebagai <script> blokir di
 * <head> root layout, sehingga atribut terpasang SEBELUM paint pertama.
 * Default tetap terang — tidak mengikuti prefers-color-scheme otomatis agar
 * tidak mengejutkan admin yang belum pernah opt-in.
 */

export const ADMIN_DARK_MODE_KEY = "admin-dark-mode";

/** Nilai mentah storage → boolean; dipakai read + event antar-tab. */
export function parseAdminDarkModeValue(raw: string | null): boolean {
  return raw === "1";
}

/**
 * Skrip anti-FOUC untuk <head> (lihat komentar atas). Sengaja tanpa
 * `document.` guard berlebih: dibungkus try/catch, no-op bila storage
 * diblokir (mode privat). Dibangun dari ADMIN_DARK_MODE_KEY supaya satu
 * sumber kebenaran dengan pembaca/penulis di bawah. Hanya untuk path
 * /admin* — halaman publik tidak pernah diberi atribut (CSS-nya pun
 * di-scope, jadi ini sabuk ganda). Navigasi klien publik → admin tetap
 * ditangani effect Topbar (lazy init + apply).
 */
export const ADMIN_DARK_INIT_SCRIPT = `try{if(location.pathname.indexOf("/admin")===0){var v=null;try{v=localStorage.getItem(${JSON.stringify(
  ADMIN_DARK_MODE_KEY
)})}catch(e){}if(v==="1"){document.documentElement.setAttribute("data-admin-dark","true")}}}catch(e){}`;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** true bila admin memilih mode gelap (default: terang). */
export function readAdminDarkMode(): boolean {
  if (!isBrowser()) return false;
  try {
    return parseAdminDarkModeValue(window.localStorage.getItem(ADMIN_DARK_MODE_KEY));
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
