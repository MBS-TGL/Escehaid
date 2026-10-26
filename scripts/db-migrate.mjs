#!/usr/bin/env node
/**
 * Runner migrasi SQL — MANUAL, bukan auto-apply.
 *
 * Repo ini tidak punya sistem migration sejak awal: SQL dijalankan tangan di
 * Supabase SQL Editor. Itu sudah mematikan pencarian produksi dua kali karena
 * kode dan isi DB bisa tidak sinkron tanpa ada yang tahu (lihat komentar
 * header `sql/pg-trgm.sql`). Runner ini menutup celah itu tanpa mengubah
 * kebijakan rilis: **tidak ada yang jalan otomatis saat deploy**.
 *
 *   npm run db:migrate:status    # daftar berkas + applied/pending
 *   npm run db:migrate:dry       # tampilkan SQL yang AKAN dijalankan
 *   npm run db:migrate           # terapkan yang pending
 *
 * Sifat:
 *  - Satu transaksi per berkas: gagal di tengah → berkas itu di-rollback
 *    seluruhnya, berkas sebelumnya tetap tercatat.
 *  - `schema_migrations` mencatat nama berkas + checksum SHA-256 + waktu.
 *    Berkas yang sudah diterapkan lalu DIUBAH akan ditolak (checksum beda),
 *    supaya riwayat tidak berbohong. Perbaikan = berkas baru bernomor lanjut.
 *  - Berkas SQL sendiri harus idempoten sedapat mungkin (`if not exists`,
 *    `create or replace`, `drop policy if exists`), karena DB ini mungkin
 *    sudah menerima sebagian isinya secara manual sebelum runner ada.
 *
 * Env: DATABASE_URL (connection string Postgres; sudah dipakai
 * scripts/backup-scheduled.mjs). Uji lokal boleh dari .env.local.
 *
 * Exit code: 0 sukses, 1 gagal, 2 env tidak lengkap, 3 ada perubahan berkas
 * yang sudah diterapkan.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT_DIR, "supabase", "migrations");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("--dry");
const statusOnly = args.includes("--status");

// Uji lokal: env boleh datang dari .env.local (jangan timpa yang sudah ada).
(function loadEnvLocal() {
  const file = path.join(ROOT_DIR, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function listMigrationFiles() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

function checksumOf(file) {
  return createHash("sha256").update(readFileSync(file, "utf8")).digest("hex");
}

async function ensureLedger(client) {
  await client.query(`
    create table if not exists public.schema_migrations (
      filename    text primary key,
      checksum    text not null,
      applied_at  timestamptz not null default now(),
      applied_by  text
    );
  `);
}

async function readLedger(client) {
  const { rows } = await client.query(
    "select filename, checksum, applied_at from public.schema_migrations order by filename"
  );
  return new Map(rows.map((r) => [r.filename, r]));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      c.red("DATABASE_URL belum di-set.") +
        "\nIsi di .env.local (uji lokal) atau environment tempat kamu menjalankan."
    );
    process.exit(2);
  }

  const files = listMigrationFiles();
  if (files.length === 0) {
    console.log(c.yellow(`Tidak ada berkas migrasi di ${MIGRATIONS_DIR}`));
    return;
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await ensureLedger(client);
    const applied = await readLedger(client);

    const pending = [];
    const modified = [];

    for (const filename of files) {
      const full = path.join(MIGRATIONS_DIR, filename);
      const sum = checksumOf(full);
      const row = applied.get(filename);
      if (!row) pending.push({ filename, full, sum });
      else if (row.checksum !== sum) modified.push({ filename, row });
    }

    // ── Laporan status ────────────────────────────────────────────────────
    console.log(c.bold("\nMigrasi SQL"));
    console.log(c.dim(`Folder: supabase/migrations (${files.length} berkas)\n`));

    for (const filename of files) {
      const row = applied.get(filename);
      const isModified = modified.some((m) => m.filename === filename);
      if (row && isModified) {
        console.log(`  ${c.yellow("!")} ${filename}  ${c.yellow("sudah diterapkan, isi BERUBAH")}`);
      } else if (row) {
        const when = new Date(row.applied_at).toISOString().slice(0, 16).replace("T", " ");
        console.log(`  ${c.green("✓")} ${filename}  ${c.dim(when)}`);
      } else {
        console.log(`  ${c.yellow("·")} ${filename}  ${c.yellow("pending")}`);
      }
    }

    if (modified.length > 0) {
      console.error(
        c.red("\nBerkas migrasi yang sudah diterapkan TIDAK boleh diubah:") +
          modified.map((m) => `\n  - ${m.filename}`).join("") +
          "\nBuat berkas baru bernomor lanjut untuk perbaikan."
      );
      process.exit(3);
    }

    if (pending.length === 0) {
      console.log(c.green("\nSemua migrasi sudah diterapkan.\n"));
      return;
    }

    console.log(c.bold(`\n${pending.length} migrasi pending.`));

    if (statusOnly) {
      console.log(c.dim("Mode --status: tidak ada yang dijalankan.\n"));
      return;
    }

    if (dryRun) {
      for (const p of pending) {
        console.log(`\n${c.bold("── " + p.filename + " ──")}`);
        console.log(readFileSync(p.full, "utf8"));
      }
      console.log(c.dim("\nMode --dry-run: tidak ada yang dijalankan.\n"));
      return;
    }

    // ── Terapkan ──────────────────────────────────────────────────────────
    for (const p of pending) {
      console.log(`\n▶ ${p.filename} …`);
      const sql = readFileSync(p.full, "utf8");

      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(
          `insert into public.schema_migrations (filename, checksum, applied_by)
           values ($1, $2, current_user)
           on conflict (filename) do update
             set checksum = excluded.checksum,
                 applied_at = now(),
                 applied_by = excluded.applied_by`,
          [p.filename, p.sum]
        );
        await client.query("commit");
        console.log(`  ${c.green("✓")} diterapkan`);
      } catch (err) {
        await client.query("rollback").catch(() => {});
        console.error(`  ${c.red("✗")} gagal, berkas ini di-rollback: ${err.message}`);
        console.error(c.dim("\nBerkas sebelumnya yang sudah sukses TETAP tercatat."));
        process.exitCode = 1;
        return;
      }
    }

    console.log(c.green("\nSelesai. Semua migrasi pending berhasil diterapkan.\n"));
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(c.red("Gagal:"), err.message);
  process.exit(1);
});
