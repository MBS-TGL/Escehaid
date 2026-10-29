/**
 * Registry migrasi berurutan di `supabase/migrations/`.
 *
 * Dipisah dari `queries/sql-status.ts` supaya bisa diuji tanpa menyentuh
 * Supabase: test membaca isi folder asli dan memastikan daftar ini tidak
 * tertinggal saat ada berkas migrasi baru.
 *
 * Status "sudah/belum" tetap berasal dari ledger `schema_migrations`
 * (ditulis `npm run db:migrate`), bukan dari daftar ini.
 */
export interface LedgerMigration {
  /**
   * Path relatif terhadap root repo (untuk ditampilkan di halaman).
   *
   * PENTING: `schema_migrations.filename` menyimpan **basename** saja
   * (`0001_....sql`), bukan path ini. Selalu cocokkan lewat
   * `ledgerKey()` — jangan `ledger.has(m.file)` langsung.
   */
  file: string;
  description: string;
}

/**
 * Kunci pencocokan dengan `schema_migrations.filename`.
 *
 * Runner menulis nama berkas tanpa folder (`path.basename`), sedangkan
 * registry di sini menyimpan path repo. Helper ini menyamakan keduanya dan
 * aman untuk pemisah `/` maupun `\`.
 */
export function ledgerKey(file: string): string {
  return file.split(/[\\/]/).pop() ?? file;
}

export const LEDGER_MIGRATIONS: readonly LedgerMigration[] = [
  {
    file: "supabase/migrations/0001_backfill_system_role.sql",
    description: "Backfill system_role untuk admin legacy (prasyarat pengetatan RBAC)",
  },
  {
    file: "supabase/migrations/0002_has_permission_hardening.sql",
    description: "Tutup fallback has_permission + REVOKE fungsi internal & TRUNCATE anon",
  },
  {
    file: "supabase/migrations/0003_rls_content_to_permissions.sql",
    description: "RLS konten: role legacy → izin halus (punya preflight)",
  },
  {
    file: "supabase/migrations/0004_audit_before_after.sql",
    description: "log_audit() menyimpan nilai sebelum + entity_id untuk tabel ber-PK key",
  },
  {
    file: "supabase/migrations/0005_audit_triggers_missing.sql",
    description:
      "Audit trigger untuk faqs, downloads, ekskuls, program, settings, flags, categories",
  },
  {
    file: "supabase/migrations/0006_migration_ledger_access.sql",
    description: "Akses baca schema_migrations untuk halaman /admin/sql",
  },
  {
    file: "supabase/migrations/0007_handle_new_user_email.sql",
    description: "Trigger signup mengisi email profil + backfill akun lama",
  },
  {
    file: "supabase/migrations/0008_media_urls_to_r2.sql",
    description: "Kolom media yang masih menunjuk path lokal → URL absolut R2",
  },
  {
    file: "supabase/migrations/0009_mission_to_lines.sql",
    description: "Normalisasi school_profile.mission ke teks satu butir per baris",
  },
  {
    file: "supabase/migrations/0010_sql_ledger_permission.sql",
    description: "Policy baca schema_migrations mengikuti izin sql:manage (halaman /admin/sql)",
  },
  {
    file: "supabase/migrations/0011_agenda_soft_delete.sql",
    description: "Soft delete agenda_events (Recycle Bin)",
  },
  {
    file: "supabase/migrations/0012_role_permissions_rpc.sql",
    description: "RPC transaksional replace_role_permissions",
  },
  {
    file: "supabase/migrations/0013_audit_logs_indexes.sql",
    description: "Index audit_logs untuk filter Logs",
  },
  {
    file: "supabase/migrations/0014_spmb_document_verification.sql",
    description: "Verifikasi berkas SPMB per dokumen + agregat publik",
  },
  {
    file: "supabase/migrations/0015_spmb_waves_template_search.sql",
    description: "Kuota/jadwal gelombang, template WA, index pencarian SPMB",
  },
] as const;
