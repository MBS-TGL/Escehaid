/**
 * Registry izin (permission) — SATU-SATUNYA sumber kebenaran format
 * `modul:aksi`. Dipakai oleh backend (requirePermission/can), UI (tombol &
 * sidebar), seed database, dan test.
 *
 * Format string: `${module}:${action}`. Contoh: `pengumuman:publish`,
 * `spmb:view_sensitive`.
 *
 * Desain:
 * - Tidak ada library tambahan; registry murni data + turunan tipenya.
 * - Kolom `roles` (enum legacy) TIDAK dipakai di sini — kolom itu sudah
 *   dikunci policy RLS lama yang tidak ada di repo. Peran halus (fine-grained)
 *   disimpan terpisah di tabel `roles` / `role_permissions` (lihat migrasi SQL).
 */

/** Setiap aksi punya label Indonesia untuk UI matriks izin. */
export interface PermissionAction {
  readonly key: string;
  readonly label: string;
}

export interface PermissionModule {
  readonly key: string;
  readonly label: string;
  readonly description?: string;
  readonly actions: readonly PermissionAction[];
}

/**
 * Daftar seluruh modul panel admin + aksi yang mungkin.
 *
 * Kunci modul disamakan dengan makna domain (bukan path) agar tetap stabil
 * walau route berubah. Aksi `read` hampir selalu ada; aksi lain mengikuti
 * kebutuhan modul.
 */
export const MODULE_REGISTRY: readonly PermissionModule[] = [
  {
    key: "berita",
    label: "Berita",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
      { key: "publish", label: "Mempublikasikan" },
    ],
  },
  {
    key: "artikel",
    label: "Artikel",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
      { key: "publish", label: "Mempublikasikan" },
    ],
  },
  {
    key: "pengumuman",
    label: "Pengumuman",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
      { key: "publish", label: "Mempublikasikan" },
    ],
  },
  {
    key: "kegiatan",
    label: "Kegiatan",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
      { key: "publish", label: "Mempublikasikan" },
    ],
  },
  {
    key: "agenda",
    label: "Agenda",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
    ],
  },
  {
    key: "faq",
    label: "FAQ",
    description: "FAQ beranda & halaman SPMB (tabel faqs)",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
    ],
  },
  {
    key: "galeri",
    label: "Galeri",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
    ],
  },
  {
    key: "unduhan",
    label: "Unduhan",
    description: "Area unduhan publik (brosur, formulir, juklak)",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
    ],
  },
  {
    key: "media",
    label: "Media",
    description: "Pustaka berkas media",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "upload", label: "Mengunggah" },
      { key: "delete", label: "Menghapus" },
    ],
  },
  {
    key: "prestasi",
    label: "Prestasi",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
      { key: "publish", label: "Mempublikasikan" },
    ],
  },
  {
    key: "guru",
    label: "Guru",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
      { key: "publish", label: "Mempublikasikan" },
    ],
  },
  {
    key: "fasilitas",
    label: "Fasilitas",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
      { key: "publish", label: "Mempublikasikan" },
    ],
  },
  {
    key: "ekskul",
    label: "Ekstrakurikuler",
    description: "Ekskul (beranda & profil)",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
    ],
  },
  {
    key: "portal",
    label: "Portal",
    description: "Aplikasi portal sekolah",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah" },
      { key: "update", label: "Mengubah" },
      { key: "delete", label: "Menghapus" },
    ],
  },
  {
    key: "kontak",
    label: "Pesan Masuk",
    description: "Pesan dari formulir kontak publik",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "update", label: "Menandai" },
      { key: "delete", label: "Menghapus" },
    ],
  },
  {
    key: "spmb",
    label: "SPMB",
    description: "Penerimaan murid baru",
    actions: [
      { key: "read", label: "Melihat" },
      { key: "create", label: "Menambah pendaftar" },
      { key: "update", label: "Mengubah" },
      { key: "verify", label: "Memverifikasi" },
      { key: "import", label: "Mengimpor" },
      { key: "export", label: "Mengekspor" },
      { key: "delete", label: "Menghapus" },
      { key: "view_sensitive", label: "Melihat data sensitif" },
    ],
  },
  {
    key: "users",
    label: "Pengguna & Peran",
    actions: [{ key: "manage", label: "Mengelola" }],
  },
  {
    key: "settings",
    label: "Pengaturan Situs",
    actions: [{ key: "manage", label: "Mengelola" }],
  },
  {
    key: "flags",
    label: "Feature Flags",
    actions: [{ key: "manage", label: "Mengelola" }],
  },
  {
    key: "logs",
    label: "Log Aktivitas",
    actions: [{ key: "read", label: "Melihat" }],
  },
] as const;

/** Kunci modul yang dikenal. */
export type ModuleKey = (typeof MODULE_REGISTRY)[number]["key"];

/** Format izin `modul:aksi` yang divalidasi registry. */
export type Permission = `${ModuleKey}:${string}`;

/** Map modul → label, untuk keperluan UI. */
export const MODULE_LABELS: Record<string, string> = Object.freeze(
  Object.fromEntries(MODULE_REGISTRY.map((m) => [m.key, m.label]))
);

/** Seluruh izin valid, dihitung dari registry (dipakai validasi & seed). */
export const ALL_PERMISSIONS: readonly string[] = Object.freeze(
  MODULE_REGISTRY.flatMap((m) => m.actions.map((a) => `${m.key}:${a.key}`))
);

const ALL_PERMISSION_SET: ReadonlySet<string> = new Set(ALL_PERMISSIONS);

/** Benar bila string adalah izin valid menurut registry. */
export function isPermission(value: string): value is Permission {
  return ALL_PERMISSION_SET.has(value);
}

/** Seluruh izin milik sebuah modul (mis. semua aksi `spmb:*`). */
export function permissionsForModule(moduleKey: string): readonly string[] {
  const mod = MODULE_REGISTRY.find((m) => m.key === moduleKey);
  if (!mod) return [];
  return mod.actions.map((a) => `${mod.key}:${a.key}`);
}

/**
 * Kelompokkan daftar izin per modul — dipakai UI matriks izin (tab "Peran")
 * agar checkbox dikelompokkan rapi per modul.
 */
export function groupPermissions(permissions: readonly string[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const mod of MODULE_REGISTRY) {
    const own = permissions.filter((p) => p.startsWith(`${mod.key}:`));
    map.set(mod.key, new Set(own));
  }
  return map;
}
