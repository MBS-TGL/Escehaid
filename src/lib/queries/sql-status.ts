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

/** Cek semua migrasi — tiap probe gagal ditelan sebagai `false`. */
export async function getSqlMigrationStatuses(): Promise<SqlMigrationStatus[]> {
  return Promise.all(
    MIGRATIONS.map(async (m): Promise<SqlMigrationStatus> => ({
      file: m.file,
      description: m.description,
      applied: await m.check().catch(() => false),
    }))
  );
}
