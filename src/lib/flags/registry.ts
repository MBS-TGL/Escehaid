/**
 * REGISTRI FEATURE FLAGS — sumber tunggal definisi flag.
 *
 * Karena ada di kode, flag bekerja (dengan default) walau migrasi belum dijalankan.
 * Tabel `feature_flags` hanya menyimpan override admin.
 */
export interface FeatureFlagDef {
  /** Kunci snake_case — primary key di tabel feature_flags. */
  key: string;
  /** Nama tampil di UI admin. */
  name: string;
  /** Deskripsi singkat untuk admin. */
  description: string;
  /** Nilai default bila tidak ada override di database. */
  defaultEnabled: boolean;
  /** Dampak tinggi = butuh konfirmasi extra di UI. */
  highImpact?: boolean;
  /** Kategori untuk pengelompokan di UI (opsional). */
  category?: string;
}

export const FEATURE_FLAGS: readonly FeatureFlagDef[] = [
  {
    key: "maintenance_mode",
    name: "Mode Pemeliharaan",
    description:
      "Sembunyikan seluruh situs publik, tampilkan halaman maintenance. Panel admin (/admin) TIDAK terkena — admin tetap bisa mengelola situs.",
    defaultEnabled: false,
    highImpact: true,
    category: "Sistem",
  },
  {
    key: "spmb_registration_open",
    name: "Pendaftaran SPMB Dibuka",
    description:
      "Izinkan pendaftaran SPMB dari halaman publik (/admission). Ditutup = tombol daftar disembunyikan & submit form ditolak.",
    defaultEnabled: true,
    highImpact: true,
    category: "Admisi",
  },
  {
    key: "announcement_banner",
    name: "Banner Pengumuman",
    description:
      "Tampilkan banner pengumuman di bagian atas halaman publik. Konten banner diatur terpisah (bisa lewat Pengaturan Situs / CMS).",
    defaultEnabled: false,
    highImpact: false,
    category: "Konten",
  },
  {
    key: "module_beta",
    name: "Modul Beta",
    description:
      "Aktifkan fitur eksperimental/beta (placeholder untuk pengembangan mendatang).",
    defaultEnabled: false,
    highImpact: false,
    category: "Eksperimental",
  },
  {
    key: "admin_analytics",
    name: "Analitik Admin",
    description:
      "Kumpulan trafik publik tanpa cookie (beacon internal) + halaman /admin/analytics. Matikan = beacon berhenti & halaman kosong; data lama dihapus lewat purge 90 hari.",
    defaultEnabled: true,
    highImpact: false,
    category: "Sistem",
  },
  {
    key: "content_approval",
    name: "Alur Review Konten",
    description:
      "Saat aktif, pengguna tanpa izin review (mis. operator konten) harus mengajukan review sebelum konten terbit. Admin dengan berita:review tetap bisa terbit langsung.",
    defaultEnabled: false,
    highImpact: true,
    category: "Konten",
  },
  {
    key: "admin_alerts",
    name: "Alert Otomatis",
    description:
      "Evaluasi aturan alert terjadwal + pengiriman webhook/WhatsApp (Fonnte). Aturan dibuat di /admin/automation; nonaktif = tidak ada pesan keluar.",
    defaultEnabled: false,
    highImpact: true,
    category: "Sistem",
  },
  {
    key: "spmb_pipeline",
    name: "Pipeline SPMB",
    description:
      "Tampilan kanban tahap pendaftar + wawancara + broadcast WA di /admin/admission.",
    defaultEnabled: false,
    highImpact: false,
    category: "Admisi",
  },
  {
    key: "admin_push",
    name: "Web Push Notifikasi",
    description:
      "Notifikasi browser (Web Push) ke admin untuk review/alert/notifikasi penting. Butuh env VAPID.",
    defaultEnabled: false,
    highImpact: false,
    category: "Sistem",
  },
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number]["key"];

export const FEATURE_FLAG_MAP: Record<FeatureFlagKey, FeatureFlagDef> = Object.fromEntries(
  FEATURE_FLAGS.map((f) => [f.key, f])
);

export function getFlagDef(key: FeatureFlagKey): FeatureFlagDef | undefined {
  return FEATURE_FLAG_MAP[key];
}

export function getDefaultEnabled(key: FeatureFlagKey): boolean {
  return FEATURE_FLAG_MAP[key]?.defaultEnabled ?? false;
}

export function isHighImpact(key: FeatureFlagKey): boolean {
  return FEATURE_FLAG_MAP[key]?.highImpact ?? false;
}

export function getFlagsByCategory(category?: string): FeatureFlagDef[] {
  if (!category) return [...FEATURE_FLAGS];
  return FEATURE_FLAGS.filter((f) => f.category === category);
}

export const FLAG_CATEGORIES = Array.from(
  new Set(FEATURE_FLAGS.map((f) => f.category).filter(Boolean))
) as string[];

// Re-export tipe evaluasi dari evaluate.ts agar client tidak perlu import ganda.
export type { FlagEvaluation } from "./evaluate";
export type { FeatureFlagsSnapshot } from "./index";