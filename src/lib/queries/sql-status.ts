import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";
import { LEDGER_MIGRATIONS, ledgerKey } from "@/lib/sql-migrations";

/**
 * Status migrasi SQL — registry tiap file SQL di repo + probe "sudah belum
 * dijalankan" di database. Dipakai halaman /admin/sql (grup Developer).
 *
 * Prinsip: probe membuktikan EFEK file (kolom/tabel/permission/RPC ada),
 * bukan membaca DB metadata.
 *
 * PENTING: semua query di sini memakai klien SERVER ber-cookie
 * (`@/lib/supabase-server`), bukan `@/lib/supabase` (browser/anon). Halaman
 * ini adalah server component yang mengambil data SEBELUM hidrasi; browser
 * client tidak membawa sesi user saat itu, sehingga:
 *   • `schema_migrations` → 401 (policy hanya untuk authenticated),
 *   • `role_permissions` → [] (policy SELECT hanya untuk authenticated),
 * dan halaman menampilkan "Belum" palsu untuk hampir semua migrasi runner.
 */
type Db = SupabaseClient;

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
  /** Metadata ledger (hanya bila `source = ledger`). */
  appliedAt?: string | null;
  appliedBy?: string | null;
  checksum?: string | null;
}

type LedgerRow = {
  filename: string;
  applied_at?: string | null;
  applied_by?: string | null;
  checksum?: string | null;
};

/**
 * Probe RPC ada/tidak. PostgREST mencocokkan RPC berdasarkan SIGNATURE
 * argumen yang dikirim — memanggil tanpa argumen akan mencari varian
 * 0-parameter dan melaporkan PGRST202 walaupun fungsinya ada (bug probe
 * v1). Karena itu panggil DENGAN argumen tidak-valid:
 *   - PGRST202 / "Could not find the function" → belum dibuat ❌
 *   - error lain (permission denied 42501 / validasi P0001) → fungsi ADA ✅
 * Argumen tidak-valid dipilih yang gagal validasi SEBELUM menyentuh data.
 */
async function rpcExists(
  db: Db,
  name: string,
  invalidArgs: Record<string, unknown>
): Promise<boolean> {
  const { error } = await db.rpc(name, invalidArgs);
  if (!error) return true;
  return !(error.code === "PGRST202" || /Could not find the function|does not exist/i.test(error.message ?? ""));
}

/** Probe permission tertentu sudah di-seed ke role_permissions. */
async function permissionSeeded(db: Db, perm: string): Promise<boolean> {
  const { data } = await db
    .from("role_permissions")
    .select("permission")
    .eq("permission", perm)
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * Probe kolom lewat `select(...).limit(0)`: kolom hilang → 42703,
 * kolom ada → 200 (walau RLS menyaring semua baris).
 */
async function tableHasColumn(db: Db, table: string, column: string): Promise<boolean> {
  const { error } = await db.from(table).select(column).limit(0);
  return !error || !/does not exist|42703/.test(error.message || "");
}

/** Probe RPC pg_trgm aktif (dibuat `sql/pg-trgm.sql`). */
async function trgmSearchReady(db: Db): Promise<boolean> {
  const { data, error } = await db.rpc("search_trgm_enabled");
  return !error && data === true;
}

interface MigrationDef {
  file: string;
  description: string;
  check: (db: Db) => Promise<boolean>;
}

/**
 * SQL yang TIDAK lewat runner (dijalankan manual di Supabase SQL Editor) —
 * statusnya disimpulkan dari efeknya di DB. Urutan mengikuti riwayat rilis.
 */
const MIGRATIONS: MigrationDef[] = [
  {
    file: "supabase/ekskul.sql",
    description: "Tabel ekskuls dinamis + kolom history + tautan prestasi↔ekskul",
    check: (db) => tableHasColumn(db, "ekskuls", "history"),
  },
  {
    file: "supabase/program.sql",
    description: "3 tabel halaman /program (quran_pillars, agenda_blocks, agenda_slots)",
    check: (db) => tableHasColumn(db, "agenda_blocks", "id"),
  },
  {
    file: "sql/pg-trgm.sql",
    description: "Pencarian toleran typo (pg_trgm + 5 fungsi RPC search_*)",
    check: (db) => trgmSearchReady(db),
  },
  {
    file: "supabase/faq.sql",
    description: "Tabel faqs (FAQ dinamis beranda & SPMB) + izin faq:*",
    check: (db) => tableHasColumn(db, "faqs", "scope"),
  },
  {
    file: "supabase/soft-delete.sql",
    description: "Kolom deleted_at di 8 tabel konten (Recycle Bin / Sampah)",
    check: (db) => tableHasColumn(db, "news", "deleted_at"),
  },
  {
    file: "supabase/sessions.sql",
    description: "Tabel sessions (daftar perangkat & sesi aktif admin)",
    check: (db) => tableHasColumn(db, "sessions", "session_id"),
  },
  {
    file: "supabase/profile-name.sql",
    description: "RPC update_own_full_name (edit nama di Pengaturan Akun)",
    check: (db) => rpcExists(db, "update_own_full_name", { p_full_name: "x" }),
  },
  {
    file: "supabase/backup-perm.sql",
    description: "Izin backup:* untuk role (halaman Cadangan)",
    check: (db) => permissionSeeded(db, "backup:read"),
  },
  {
    file: "supabase/diagnostics-perm.sql",
    description: "Izin diagnostik:read (halaman Diagnostik)",
    check: (db) => permissionSeeded(db, "diagnostik:read"),
  },
  {
    file: "supabase/trash-perm.sql",
    description: "Izin sampah:* (halaman Sampah)",
    check: (db) => permissionSeeded(db, "sampah:read"),
  },
];

/** Baca ledger `schema_migrations`. Kosong bila tabel belum ada / tanpa akses. */
async function readLedger(db: Db): Promise<Map<string, LedgerRow>> {
  const { data, error } = await db
    .from("schema_migrations")
    .select("filename, applied_at, applied_by, checksum");
  if (error) {
    // Tabel belum dibuat (runner belum pernah jalan) atau RLS menolak —
    // keduanya bukan kondisi error bagi halaman ini.
    return new Map();
  }
  // `filename` = basename (lihat scripts/db-migrate.mjs). Normalkan supaya
  // pencocokan dengan `LEDGER_MIGRATIONS` (path repo) tidak meleset.
  return new Map(
    ((data ?? []) as LedgerRow[]).map((r) => [ledgerKey(r.filename), r])
  );
}

/** Cek semua migrasi — tiap probe gagal ditelan sebagai `false`. */
export async function getSqlMigrationStatuses(): Promise<SqlMigrationStatus[]> {
  // Klien server ber-cookie: RLS melihat user admin yang sedang membuka
  // halaman, bukan anon.
  const db = await createClient();

  const ledger = await readLedger(db);

  const probed = await Promise.all(
    MIGRATIONS.map(async (m): Promise<SqlMigrationStatus> => ({
      file: m.file,
      description: m.description,
      applied: await m.check(db).catch(() => false),
      source: "probe" as const,
    }))
  );

  const fromLedger: SqlMigrationStatus[] = LEDGER_MIGRATIONS.map((m) => {
    const row = ledger.get(ledgerKey(m.file));
    return {
      file: m.file,
      description: m.description,
      applied: Boolean(row),
      source: "ledger" as const,
      appliedAt: row?.applied_at ?? null,
      appliedBy: row?.applied_by ?? null,
      checksum: row?.checksum ?? null,
    };
  });

  // Migrasi berurutan ditampilkan lebih dulu (paling relevan untuk tindakan).
  return [...fromLedger, ...probed];
}
