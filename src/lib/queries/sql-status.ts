import { supabase } from "../supabase";
import { tableHasColumn, trgmSearchReady } from "./shared";

/**
 * Status migrasi SQL — registry tiap file SQL di repo + probe "sudah belum
 * dijalankan" di database. Dipakai halaman /admin/sql (grup Developer).
 *
 * Prinsip: probe membuktikan EFEK file (kolom/tabel/permission/RPC ada),
 * bukan membaca DB metadata — jadi aman untuk anon/session client dan
 * tidak perlu service role.
 */

export interface SqlMigrationStatus {
  file: string;
  description: string;
  applied: boolean;
  /**
   * Sumber kebenaran status:
   *  - `ledger`   — tercatat di `schema_migrations` oleh `npm run db:migrate`
   *                 (paling kuat: bukti berkas itu benar-benar dieksekusi),
   *  - `probe`    — disimpulkan dari EFEK di DB (kolom/tabel/RPC/permission),
   *                 dipakai untuk SQL lama yang dijalankan manual sebelum
   *                 runner ada.
   */
  source: "ledger" | "probe";
}

/**
 * Probe RPC ada/tidak. PostgREST mencocokkan RPC berdasarkan SIGNATURE
 * argumen yang dikirim — memanggil tanpa argumen akan mencari varian
 * 0-parameter dan melaporkan PGRST202 walaupun fungsinya ada (bug probe
 * v1). Karena itu panggil DENGAN argumen tidak-valid:
 *   - PGRST202 / "Could not find the function" → belum dibuat ❌
 *   - error lain (permission denied 42501 / validasi P0001) → fungsi ADA ✅
 * Argumen tidak-valid dipilih yang gagal validasi SEBELUM menyentuh data.
 */
async function rpcExists(name: string, invalidArgs: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase.rpc(name, invalidArgs);
  if (!error) return true;
  return !(error.code === "PGRST202" || /Could not find the function|does not exist/i.test(error.message ?? ""));
}

/** Probe permission tertentu sudah di-seed ke role_permissions. */
async function permissionSeeded(perm: string): Promise<boolean> {
  const { data } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("permission", perm)
    .limit(1);
  return (data ?? []).length > 0;
}

interface MigrationDef {
  file: string;
  description: string;
  check: () => Promise<boolean>;
}

/**
 * Migrasi berurutan di `supabase/migrations/` — diterapkan lewat
 * `npm run db:migrate`. Statusnya dibaca dari `schema_migrations`, bukan
 * diprobe, karena runner mencatatnya sendiri.
 *
 * Urutan penting: 0001 harus sebelum 0002 (backfill sebelum pengetatan
 * has_permission), dan 0003 menolak jalan bila 0001 belum beres.
 */
const LEDGER_MIGRATIONS: MigrationDef[] = [
  {
    file: "supabase/migrations/0001_backfill_system_role.sql",
    description: "Backfill system_role untuk admin legacy (prasyarat pengetatan RBAC)",
    check: async () => false, // status asli dari ledger
  },
  {
    file: "supabase/migrations/0002_has_permission_hardening.sql",
    description: "Tutup fallback has_permission + REVOKE fungsi internal & TRUNCATE anon",
    check: async () => false,
  },
  {
    file: "supabase/migrations/0003_rls_content_to_permissions.sql",
    description: "RLS konten: role legacy → izin halus (punya preflight)",
    check: async () => false,
  },
  {
    file: "supabase/migrations/0004_audit_before_after.sql",
    description: "log_audit() menyimpan nilai sebelum + entity_id untuk tabel ber-PK key",
    check: async () => false,
  },
  {
    file: "supabase/migrations/0005_audit_triggers_missing.sql",
    description: "Audit trigger untuk faqs, downloads, ekskuls, program, settings, flags, categories",
    check: async () => false,
  },
  {
    file: "supabase/migrations/0006_migration_ledger_access.sql",
    description: "Akses baca schema_migrations untuk halaman ini",
    check: async () => false,
  },
  {
    file: "supabase/migrations/0007_handle_new_user_email.sql",
    description: "Trigger signup mengisi email profil + backfill akun lama",
    check: async () => false,
  },
];

const MIGRATIONS: MigrationDef[] = [
  {
    file: "supabase/ekskul.sql",
    description: "Tabel ekskuls dinamis + kolom history + tautan prestasi↔ekskul",
    check: () => tableHasColumn("ekskuls", "history"),
  },
  {
    file: "supabase/program.sql",
    description: "3 tabel halaman /program (quran_pillars, agenda_blocks, agenda_slots)",
    check: () => tableHasColumn("agenda_blocks", "id"),
  },
  {
    file: "sql/pg-trgm.sql",
    description: "Pencarian toleran typo (pg_trgm + 5 fungsi RPC search_*)",
    check: () => trgmSearchReady(),
  },
  {
    file: "supabase/faq.sql",
    description: "Tabel faqs (FAQ dinamis beranda & SPMB) + izin faq:*",
    check: () => tableHasColumn("faqs", "scope"),
  },
  {
    file: "supabase/soft-delete.sql",
    description: "Kolom deleted_at di 8 tabel konten (Recycle Bin / Sampah)",
    check: () => tableHasColumn("news", "deleted_at"),
  },
  {
    file: "supabase/sessions.sql",
    description: "Tabel sessions (daftar perangkat & sesi aktif admin)",
    check: () => tableHasColumn("sessions", "session_id"),
  },
  {
    file: "supabase/profile-name.sql",
    description: "RPC update_own_full_name (edit nama di Pengaturan Akun)",
    check: () => rpcExists("update_own_full_name", { p_full_name: "x" }),
  },
  {
    file: "supabase/backup-perm.sql",
    description: "Izin backup:* untuk role (halaman Cadangan)",
    check: () => permissionSeeded("backup:read"),
  },
  {
    file: "supabase/diagnostics-perm.sql",
    description: "Izin diagnostik:read (halaman Diagnostik)",
    check: () => permissionSeeded("diagnostik:read"),
  },
  {
    file: "supabase/trash-perm.sql",
    description: "Izin sampah:* (halaman Sampah)",
    check: () => permissionSeeded("sampah:read"),
  },
];

/** Baca ledger `schema_migrations`. Kosong bila tabel belum ada / tanpa akses. */
async function readLedger(): Promise<Set<string>> {
  const { data, error } = await supabase.from("schema_migrations").select("filename");
  if (error) {
    // Tabel belum dibuat (runner belum pernah jalan) atau RLS menolak —
    // keduanya bukan kondisi error bagi halaman ini.
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.filename as string));
}

/** Cek semua migrasi — tiap probe gagal ditelan sebagai `false`. */
export async function getSqlMigrationStatuses(): Promise<SqlMigrationStatus[]> {
  const ledger = await readLedger();

  const probed = await Promise.all(
    MIGRATIONS.map(async (m): Promise<SqlMigrationStatus> => ({
      file: m.file,
      description: m.description,
      applied: await m.check().catch(() => false),
      source: "probe" as const,
    }))
  );

  const fromLedger: SqlMigrationStatus[] = LEDGER_MIGRATIONS.map((m) => ({
    file: m.file,
    description: m.description,
    applied: ledger.has(m.file),
    source: "ledger" as const,
  }));

  // Migrasi berurutan ditampilkan lebih dulu (paling relevan untuk tindakan).
  return [...fromLedger, ...probed];
}
