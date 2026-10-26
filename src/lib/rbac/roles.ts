/**
 * Definisi peran bawaan (default) + pemetaan peran legacy.
 *
 * Peran halus disimpan di tabel `roles` / `role_permissions` (lihat migrasi
 * `supabase/rbac_foundation.sql`). Registry kode ini dipakai untuk:
 *  - seed awal (idempoten) di migrasi SQL,
 *  - tombol "Kembalikan ke default" di UI matriks izin,
 *  - fallback saat kolom `system_role` masih NULL (mis. sebelum migrasi
 *    dijalankan, atau pemetaan legacy role enum),
 *  - test unit.
 *
 * Keputusan penting (dicatat sebagai asumsi, lihat ringkasan akhir):
 *  - Kolom `role` enum legacy TIDAK dihapus/diubah — policy RLS lama yang
 *    tidak ada di repo bergantung padanya. Peran halus memakai kolom baru
 *    `system_role`.
 *  - `system_role = 'SUPER_ADMIN'` bersifat wildcard: `can()` selalu true.
 *    Izinnya tidak bisa dikurangi (guard di server action + UI terkunci).
 */

import { ALL_PERMISSIONS } from "./permissions";

/** Kunci peran bawaan. */
export const ROLE_KEYS = [
  "SUPER_ADMIN",
  "ADMIN_SEKOLAH",
  "OPERATOR_KONTEN",
  "PANITIA_SPMB",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

/** Tipe kolom `role` enum legacy di `user_profiles` (jangan diubah). */
export type LegacyRole = "developer" | "admin" | "publisher" | "teacher" | "student";

export interface RoleDefinition {
  readonly key: RoleKey;
  readonly label: string;
  readonly description: string;
  /** Izin default penuh untuk peran ini (SUPER_ADMIN dihitung otomatis = semua). */
  readonly permissions: readonly string[];
}

/** Semua izin konten + modul operasional (tanpa modul sistem). */
const CONTENT_PERMISSIONS: readonly string[] = [
  "berita:read",
  "berita:create",
  "berita:update",
  "berita:delete",
  "berita:publish",
  "artikel:read",
  "artikel:create",
  "artikel:update",
  "artikel:delete",
  "artikel:publish",
  "pengumuman:read",
  "pengumuman:create",
  "pengumuman:update",
  "pengumuman:delete",
  "pengumuman:publish",
  "kegiatan:read",
  "kegiatan:create",
  "kegiatan:update",
  "kegiatan:delete",
  "kegiatan:publish",
  "agenda:read",
  "agenda:create",
  "agenda:update",
  "agenda:delete",
  "faq:read",
  "faq:create",
  "faq:update",
  "faq:delete",
  "galeri:read",
  "galeri:create",
  "galeri:update",
  "galeri:delete",
  "unduhan:read",
  "unduhan:create",
  "unduhan:update",
  "unduhan:delete",
  "media:read",
  "media:upload",
  "media:delete",
  "prestasi:read",
  "prestasi:create",
  "prestasi:update",
  "prestasi:delete",
  "prestasi:publish",
  "guru:read",
  "guru:create",
  "guru:update",
  "guru:delete",
  "guru:publish",
  "fasilitas:read",
  "fasilitas:create",
  "fasilitas:update",
  "fasilitas:delete",
  "fasilitas:publish",
  "ekskul:read",
  "ekskul:create",
  "ekskul:update",
  "ekskul:delete",
  "portal:read",
  "portal:create",
  "portal:update",
  "portal:delete",
  "program:read",
  "program:update",
  // Recycle bin: operator konten boleh melihat & memulihkan item yang ia
  // hapus, tetapi TIDAK boleh purge permanen (`sampah:delete`).
  "sampah:read",
  "sampah:update",
];

const SPMB_PERMISSIONS: readonly string[] = [
  "spmb:read",
  "spmb:create",
  "spmb:update",
  "spmb:verify",
  "spmb:import",
  "spmb:export",
  "spmb:delete",
  "spmb:view_sensitive",
];

/**
 * Daftar seluruh izin (untuk SUPER_ADMIN).
 *
 * DITURUNKAN dari `MODULE_REGISTRY`, bukan ditulis tangan. Versi lama
 * memelihara daftar manual yang menyimpang dari registry: `backup:*`,
 * `diagnostik:read`, `sampah:*`, dan `faq:*` tidak ikut, sehingga peran
 * legacy (system_role NULL) yang di-resolve lewat `defaultPermissionsForRole`
 * gagal `can("sampah:read")` dan tidak bisa membuka /admin/trash.
 *
 * `permissions.ts` tidak mengimpor apa pun, jadi tidak ada siklus modul.
 */
const ALL_PERMISSIONS_STATIC: readonly string[] = ALL_PERMISSIONS;

/**
 * Definisi peran bawaan.
 *
 * SUPER_ADMIN.permissions sengaja diisi seluruh izin (bukan wildcard literal)
 * agar seed DB & UI matriks tetap menampilkan daftar lengkap; namun `can()`
 * tetap memperlakukan SUPER_ADMIN sebagai wildcard tak-terbatas.
 */
export const DEFAULT_ROLES: readonly RoleDefinition[] = [
  {
    key: "SUPER_ADMIN",
    label: "Super Admin",
    description:
      "Akses penuh ke seluruh modul, termasuk Pengguna, Pengaturan, Feature Flags, dan Log.",
    permissions: ALL_PERMISSIONS_STATIC,
  },
  {
    key: "ADMIN_SEKOLAH",
    label: "Admin Sekolah",
    description:
      "Semua modul konten dan SPMB (termasuk data sensitif), serta pesan masuk. Tanpa pengelolaan pengguna/peran.",
    permissions: [
      ...CONTENT_PERMISSIONS,
      ...SPMB_PERMISSIONS,
      "kontak:read",
      "kontak:update",
      "kontak:delete",
      // Purge permanen dari Sampah — hanya admin sekolah & super admin.
      "sampah:delete",
    ],
  },
  {
    key: "OPERATOR_KONTEN",
    label: "Operator Konten",
    description:
      "Modul konten utama (berita, artikel, pengumuman, dst.), galeri, media, dan prestasi. Tanpa SPMB, pengguna, atau pengaturan.",
    permissions: CONTENT_PERMISSIONS,
  },
  {
    key: "PANITIA_SPMB",
    label: "Panitia SPMB",
    description:
      "Khusus SPMB (pendaftar, verifikasi, impor/ekspor, data sensitif) serta pesan masuk.",
    permissions: [...SPMB_PERMISSIONS, "kontak:read", "kontak:update"],
  },
] as const;

const ROLE_BY_KEY: ReadonlyMap<string, RoleDefinition> = new Map(
  DEFAULT_ROLES.map((r) => [r.key, r])
);

/** Lookup definisi peran bawaan berdasarkan kunci. */
export function getDefaultRole(key: string): RoleDefinition | undefined {
  return ROLE_BY_KEY.get(key);
}

/** Izin default untuk sebuah peran (SUPER_ADMIN → seluruh izin). */
export function defaultPermissionsForRole(key: string): readonly string[] {
  if (key === "SUPER_ADMIN") return ALL_PERMISSIONS_STATIC;
  return ROLE_BY_KEY.get(key)?.permissions ?? [];
}

/**
 * Peta peran legacy (enum `role`) → peran halus bawaan.
 *
 * Dipakai sebagai fallback ketika `system_role` masih NULL (mis. sebelum
 * migrasi dijalankan), agar tidak ada admin legacy yang terkunci. Pemetaan ini
 * SENADA dengan backfill migrasi (`developer/admin/publisher` → SUPER_ADMIN)
 * supaya tidak ada jendela perilaku berbeda sebelum & sesudah SQL dijalankan.
 *
 * Kebijakan:
 *  - developer/admin/publisher → SUPER_ADMIN (panel admin legacy = akses penuh;
 *    admin bisa menurunkannya manual lewat UI bila dikehendaki)
 *  - teacher/student           → tanpa peran panel (null)
 */
export const LEGACY_ROLE_TO_SYSTEM_ROLE: Readonly<Record<LegacyRole, RoleKey | null>> =
  Object.freeze({
    developer: "SUPER_ADMIN",
    admin: "SUPER_ADMIN",
    publisher: "SUPER_ADMIN",
    teacher: null,
    student: null,
  });

/**
 * Peran legacy enum yang masih diizinkan masuk panel admin (untuk guard
 * backward-compatible). Sumbernya sama dengan ADMIN_PANEL_ROLES lama.
 */
export const ADMIN_PANEL_LEGACY_ROLES: readonly LegacyRole[] = [
  "developer",
  "admin",
  "publisher",
];

/**
 * Peran legacy enum yang disetel saat membuat/mengundang pengguna baru, agar
 * kebijakan RLS lama (yang membaca `role`) tetap lolos. Nilai ini bersifat
 * teknis/kompatibel — otorisasi halus dibaca dari `system_role`.
 *
 * SUPER_ADMIN → developer; ADMIN_SEKOLAH → admin; lainnya → publisher.
 */
export function legacyRoleShimFor(systemRole: string): LegacyRole {
  switch (systemRole) {
    case "SUPER_ADMIN":
      return "developer";
    case "ADMIN_SEKOLAH":
      return "admin";
    case "PANITIA_SPMB":
      return "admin";
    case "OPERATOR_KONTEN":
      return "publisher";
    default:
      return "publisher";
  }
}
