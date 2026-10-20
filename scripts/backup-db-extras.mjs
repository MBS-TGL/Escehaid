#!/usr/bin/env node
/**
 * Backup bagian database yang TIDAK ter-cover `supabase db dump`:
 *   1. auth.users + auth.identities  → supabase_backup/auth_users.sql
 *   2. storage.buckets + policies    → supabase_backup/storage_restore.sql
 *
 * Password DB tidak pernah ditulis ke file — masukkan lewat env:
 *   DATABASE_URL="postgresql://postgres.<ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres" \
 *     node scripts/backup-db-extras.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "supabase_backup");
mkdirSync(OUT, { recursive: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL belum di-set. Contoh:\n" +
      '  DATABASE_URL="postgresql://postgres.<ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres" node scripts/backup-db-extras.mjs'
  );
  process.exit(1);
}

const { Client } = await import("pg");
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

/** Serialisasi nilai Postgres jadi literal SQL yang aman. */
function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'::timestamptz`;
  if (Array.isArray(v)) {
    // array Postgres → literal '{\"a\",\"b\"}' (elemen di-quote aman)
    const inner = v
      .map((e) => {
        if (e === null) return "NULL";
        if (typeof e === "number") return String(e);
        return '"' + String(e).replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + '"';
      })
      .join(",");
    return `'{${inner}}'`;
  }
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const esc = (s) => `${s.replace(/'/g, "''")}`;

// ---------------------------------------------------------------- auth.users
// introspeksi kolom supaya tahan banting terhadap variasi versi GoTrue
const { rows: users } = await client.query(`SELECT * FROM auth.users ORDER BY created_at`);

// ---------------------------------------------------------------- auth.identities
const { rows: identities } = await client.query(
  `SELECT * FROM auth.identities ORDER BY provider, user_id`
);

// Filter kolom: sisakan yang juga ada di schema auth project BARU (TARGET_DATABASE_URL),
// dan buang GENERATED/IDENTITY (mis. confirmed_at) supaya INSERT tidak error.
if (process.env.TARGET_DATABASE_URL) {
  const { rows: tu } = await client.query(
    `SELECT column_name, is_generated FROM information_schema.columns WHERE table_schema='auth' AND table_name='users'`
  );
  const { rows: ti } = await client.query(
    `SELECT column_name, is_generated FROM information_schema.columns WHERE table_schema='auth' AND table_name='identities'`
  );
  const mkSet = (rows) => new Set(rows.filter((r) => r.is_generated === "NEVER").map((r) => r.column_name));
  const dropNonGenerated = (rows, setset, label) => {
    rows.forEach((r) => { Object.keys(r).forEach((k) => { if (!setset.has(k)) delete r[k]; }); });
    console.log(`  filter kolom ${label}: ok (${setset.size} kolom non-generated)`);
  };
  dropNonGenerated(users, mkSet(tu), "auth.users");
  dropNonGenerated(identities, mkSet(ti), "auth.identities");
}

// ---------------------------------------------------------------- storage.buckets
const { rows: buckets } = await client.query(
  `SELECT id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at
     FROM storage.buckets ORDER BY id`
);

// ---------------------------------------------------------------- storage policies
const { rows: policies } = await client.query(
  `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
     FROM pg_policies
    WHERE schemaname = 'storage'`
);

await client.end();

// ---------------------------------------------------------------- generate auth_users.sql
const userCols = Object.keys(users[0] ?? { id: null });
const identCols = Object.keys(identities[0] ?? { user_id: null, provider: null });

const authSql = `-- ============================================================
-- RESTORE auth users → jalan di SQL Editor project BARU
-- Password (hash bcrypt) tetap valid — user bisa login tanpa reset.
-- Catatan: sesi lama tidak ikut; semua user diminta login ulang.
-- ============================================================
BEGIN;

DO $block$ BEGIN
  ALTER TABLE auth.users DISABLE TRIGGER USER;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Tidak bisa disable trigger — restore user_profiles mungkin perlu cleanup';
END $block$;

-- users${userCols.length === 0 ? "\n-- (KOSONG: tidak ada user)" : ""}
INSERT INTO auth.users (${userCols.join(", ")})${
    users.length
      ? `\nVALUES\n${users
          .map((u) => `  (${userCols.map((c) => sqlLiteral(u[c])).join(", ")})`)
          .join(",\n")}`
      : ""
  }
ON CONFLICT DO NOTHING;

-- identities
INSERT INTO auth.identities (${identCols.join(", ")})${
    identities.length
      ? `\nVALUES\n${identities
          .map((i) => `  (${identCols.map((c) => sqlLiteral(i[c])).join(", ")})`)
          .join(",\n")}`
      : ""
  }
ON CONFLICT DO NOTHING;

DO $block$ BEGIN
  ALTER TABLE auth.users ENABLE TRIGGER USER;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Tidak bisa re-enable trigger — cek manual di SQL editor';
END $block$;

COMMIT;
-- total: ${users.length} user, ${identities.length} identity
`;

writeFileSync(path.join(OUT, "auth_users.sql"), authSql, "utf8");

// ---------------------------------------------------------------- generate storage_restore.sql
const policySql = (p) => {
  const roles = String(p.roles)
    .replace(/^\{|\}$/g, "")
    .split(",")
    .filter(Boolean)
    .map((r) => `"${r}"`)
    .join(", ");
  const qual = p.qual ? `\n  USING (${p.qual})` : "";
  const chk = p.with_check ? `\n  WITH CHECK (${p.with_check})` : "";
  const cmd = { ALL: "ALL", SELECT: "SELECT", INSERT: "INSERT", UPDATE: "UPDATE", DELETE: "DELETE" }[p.cmd] ?? p.cmd;
  return `-- ${p.policyname} (${p.tablename})
DO $block$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='${esc(p.tablename)}' AND policyname='${esc(p.policyname)}') THEN
    EXECUTE $policy$CREATE POLICY "${esc(p.policyname)}" ON storage.${p.tablename}
      AS ${p.permissive} FOR ${cmd} TO ${roles}${qual}${chk}$policy$;
  END IF;
END $block$;`;
};

const storageSql = `-- ============================================================
-- RESTORE storage buckets + policies → jalan di SQL Editor project BARU
-- ============================================================
-- Buckets${buckets.length ? "" : "\n-- (KOSONG: tidak ada bucket)"}
${buckets
  .map(
    (b) => `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (${sqlLiteral(b.id)}, ${sqlLiteral(b.name)}, ${sqlLiteral(b.public)}, ${sqlLiteral(b.file_size_limit)}, ${sqlLiteral(b.allowed_mime_types)})
ON CONFLICT (id) DO NOTHING;`
  )
  .join("\n\n")}

-- Policies
${policies.map(policySql).join("\n\n")}
-- total: ${buckets.length} bucket, ${policies.length} policy storage
`;

writeFileSync(path.join(OUT, "storage_restore.sql"), storageSql, "utf8");

console.log(`OK → supabase_backup/auth_users.sql    (${users.length} user, ${identities.length} identity)`);
console.log(`OK → supabase_backup/storage_restore.sql (${buckets.length} bucket, ${policies.length} policy)`);
buckets.forEach((b) => console.log(`   bucket: ${b.id}  public=${b.public}`));
users.forEach((u) => console.log(`   user: ${u.email}`));
