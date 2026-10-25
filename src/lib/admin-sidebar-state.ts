/**
 * Status lipat sidebar admin DESKTOP (src/app/admin/Sidebar.tsx).
 *
 * Disimpan di localStorage `admin-sidebar-collapsed` sebagai "1"/"0".
 * Per-browser & per-perangkat — sengaja tidak masuk `site_settings`: pilihan
 * lebar menu adalah preferensi tampilan pribadi, bukan kebijakan situs, dan
 * nilainya tidak layak menambah round-trip DB di setiap render layout.
 *
 * Aman di server / non-browser: baca → false (kembali ke lebar penuh),
 * simpan → tidak melakukan apa-apa.
 */

export const ADMIN_SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * true = sidebar dalam mode rail (hanya ikon).
 * Nilai apa pun selain "1" (termasuk key kosong/data rusak) → false, supaya
 * menu selalu tampil lengkap bila penyimpanan bermasalah.
 */
export function readSidebarCollapsed(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    // Mode privat / akses ditolak — anggap belum pernah dilipat.
    return false;
  }
}

/** Simpan pilihan; gagal tulis (quota/mode privat) diabaikan tanpa melempar. */
export function saveSidebarCollapsed(collapsed: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Preferensi tampilan boleh hilang — jangan sampai menghalangi toggle.
  }
}
