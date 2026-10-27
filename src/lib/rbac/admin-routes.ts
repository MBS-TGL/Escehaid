/**
 * Peta rute admin → izin minimum. SATU sumber kebenaran untuk proxy.
 *
 * Sebelumnya peta ini hidup di dalam `proxy.ts` sebagai daftar 7 rute dan
 * bersifat DEFAULT-ALLOW: rute `/admin/*` yang tidak terdaftar sama sekali
 * tidak dicek izinnya (hanya "sudah login + aktif"). Akibatnya
 * `/admin/admission` (PII pendaftar) dan `/admin/backup` (nama/ukuran berkas
 * cadangan) terbuka untuk semua user aktif.
 *
 * Sekarang DEFAULT-DENY: rute `/admin/*` yang tidak ada di peta dan tidak
 * masuk daftar pengecualian akan ditolak. Menambah halaman admin baru WAJIB
 * disertai entri di sini — ada test yang memastikan itu
 * (`admin-routes.test.ts`), supaya penambahan halaman tidak diam-diam
 * menutup akses orang lain atau justru membuka lubang baru.
 */

/** Rute → izin `read` modulnya (atau izin `manage` untuk modul sistem). */
export const ADMIN_ROUTE_PERMISSIONS: ReadonlyArray<readonly [prefix: string, perm: string]> = [
  ["/admin/achievements", "prestasi:read"],
  ["/admin/activities", "kegiatan:read"],
  ["/admin/admission", "spmb:read"],
  ["/admin/agenda", "agenda:read"],
  ["/admin/announcements", "pengumuman:read"],
  ["/admin/articles", "artikel:read"],
  ["/admin/backup", "backup:read"],
  ["/admin/contact", "kontak:read"],
  ["/admin/diagnostics", "diagnostik:read"],
  ["/admin/downloads", "unduhan:read"],
  ["/admin/ekskul", "ekskul:read"],
  ["/admin/facilities", "fasilitas:read"],
  ["/admin/faq", "faq:read"],
  ["/admin/flags", "flags:manage"],
  ["/admin/gallery", "galeri:read"],
  ["/admin/logs", "logs:read"],
  ["/admin/media", "media:read"],
  ["/admin/news", "berita:read"],
  ["/admin/portal", "portal:read"],
  ["/admin/program", "program:read"],
  ["/admin/settings", "settings:manage"],
  ["/admin/sql", "sql:manage"],
  ["/admin/teachers", "guru:read"],
  ["/admin/trash", "sampah:read"],
  ["/admin/users", "users:manage"],
] as const;

/**
 * Rute yang sengaja tidak butuh izin modul — masih butuh login + akun aktif.
 *
 * - `/admin` (dasbor): isinya sudah difilter per izin di server component.
 * - `/admin/login`, `/admin/403`, `/admin/change-password`: halaman tujuan
 *   redirect, wajib bisa dimuat walau tanpa izin apa pun.
 * - `/admin/security`: pengaturan akun PRIBADI (nama, sandi, 2FA, sesi) —
 *   bukan data milik modul, jadi tidak boleh bergantung pada izin modul.
 */
export const ADMIN_EXEMPT_EXACT: readonly string[] = [
  "/admin",
  "/admin/login",
  "/admin/403",
  "/admin/change-password",
  "/admin/security",
] as const;

/**
 * Prefix halaman yang lebih dalam dari entri peta tapi bukan modul sendiri.
 * Didaftarkan eksplisit supaya test kelengkapan rute tahu ini disengaja.
 */
export const ADMIN_NESTED_PREFIXES: readonly string[] = [] as const;

export type AdminRouteDecision =
  | { kind: "exempt" }
  | { kind: "required"; perm: string }
  | { kind: "unmapped" };

function normalize(pathname: string): string {
  // Buang trailing slash (kecuali root) supaya "/admin/news/" == "/admin/news".
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * Tentukan izin yang dibutuhkan sebuah path admin.
 *
 * Pencocokan memakai **prefix terpanjang**, bukan first-match: urutan array
 * tidak boleh menentukan hasil. Contoh bila kelak ada `/admin/news/arsip`
 * dengan izin berbeda, entri terpanjang yang menang.
 *
 * `/admin` hanya cocok EXACT — kalau dicocokkan sebagai prefix, ia akan
 * membuka seluruh `/admin/*`.
 */
export function requiredPermissionFor(pathname: string): AdminRouteDecision {
  const path = normalize(pathname);

  if (ADMIN_EXEMPT_EXACT.includes(path)) return { kind: "exempt" };

  let best: { prefix: string; perm: string } | null = null;
  for (const [prefix, perm] of ADMIN_ROUTE_PERMISSIONS) {
    const matches = path === prefix || path.startsWith(`${prefix}/`);
    if (!matches) continue;
    if (!best || prefix.length > best.prefix.length) best = { prefix, perm };
  }

  if (best) return { kind: "required", perm: best.perm };
  return { kind: "unmapped" };
}

/** Semua prefix yang dikenal (peta + pengecualian) — dipakai test. */
export function knownAdminPaths(): string[] {
  return [...ADMIN_EXEMPT_EXACT, ...ADMIN_ROUTE_PERMISSIONS.map(([p]) => p)];
}
