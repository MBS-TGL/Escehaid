#!/usr/bin/env node
/**
 * Full backup Supabase tanpa pg_dump/Docker:
 *   - supabase_backup/schema_full.sql  (tables, enums, functions, trigger, policies, RLS, indexes, FK)
 *   - supabase_backup/data.sql         (semua data tabel public, urut sesuai dependensi FK)
 *   - supabase_backup/table_counts.json
 *
 * Jalankan pakai env DATABASE_URL (transaction pooler port 6543 juga bisa):
 *   DATABASE_URL="postgresql://postgres.<ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres" \
 *     node scripts/backup-full-dump.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "supabase_backup");
mkdirSync(OUT, { recursive: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL belum di-set. Contoh:\n  DATABASE_URL="postgresql://..." node scripts/backup-full-dump.mjs');
  process.exit(1);
}

const { Client } = await import("pg");
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const q = async (sql) => (await client.query(sql)).rows;
const ident = (s) => `"${String(s).replace(/"/g, '""')}"`;
const esc = (s) => String(s).replace(/'/g, "''");

function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'::timestamptz`;
  if (typeof v === "object") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${esc(v)}'`;
}

// ---------------------------------------------------------- kumpulkan katalog
const extensions = await q(`select extname, extversion from pg_extension e join pg_namespace n on n.oid=e.extnamespace where n.nspname='public'`);
const types = await q(`
  select t.typname,
         array_agg(e.enumlabel order by e.enumsortorder)::text[] labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
   where n.nspname='public'
   group by t.oid, t.typname order by t.typname`);

// node-pg kadang mengembalikan array sebagai string "{a,b,c}"
for (const t of types) {
  if (typeof t.labels === "string") t.labels = t.labels.replace(/^\{|\}$/g, "").split(",");
}

const tables = await q(`
  select c.oid, c.relname,
         (select count(*) from pg_constraint con where con.conrelid=c.oid and con.contype='p') > 0 as has_pk
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' order by c.relname`);

// kolom + default + generated
const columns = await q(`
  select c.relname as table_name, a.attname as column_name,
         pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
         a.attnotnull as not_null,
         a.attnum as ordinal,
         a.attgenerated as generated,
         pg_get_expr(ad.adbin, ad.adrelid) as default_expr
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
   where n.nspname='public' and c.relkind='r' and a.attnum > 0 and not a.attisdropped`);

const constraints = await q(`
  select c.relname as table_name, con.contype, con.conname,
         pg_get_constraintdef(con.oid, true) as def
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname='public' and con.contype in ('p','u','f','c')`);

const fkDeps = await q(`
  select c.relname as src, r.relname as dst
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_class r on r.oid = con.confrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname='public' and con.contype='f' and r.relnamespace = n.oid`);

const indexes = await q(`
  select c.relname as table_name, i.relname as index_name, pg_get_indexdef(ix.indexrelid) as def
    from pg_index ix
    join pg_class c on c.oid = ix.indrelid
    join pg_class i on i.oid = ix.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname='public' and c.relkind='r'
     and not ix.indisprimary
     and not (ix.indisunique and exists (select 1 from pg_constraint con where con.conindid = i.oid))`);

const rls = await q(`
  select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' and c.relrowsecurity = true`);

const policies = await q(`
  select * from pg_policies where schemaname='public'`);

const functions = await q(`
  select p.oid, n.nspname as schema, p.proname
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'`);

const triggers = await q(`
  select tg.oid, tg.tgname, pg_get_triggerdef(tg.oid) as def,
         c.relname as table_name, cn.nspname as table_schema
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace cn on cn.oid = c.relnamespace
   where not tg.tgisinternal
     and (cn.nspname = 'public' or cn.nspname = 'auth')`);

const views = await q(`
  select c.relname, c.relkind, pg_get_viewdef(c.oid, true) as def
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('v','m')`);

// ---------------------------------------------------------- emit schema
const L = [];
L.push(`-- ============================================================`);
L.push(`-- SCHEMA FULL ECEHA.ID  — dump ${new Date().toISOString()}`);
L.push(`-- Restorasi: jalankan seluruh file ini di SQL Editor project BARU`);
L.push(`-- (idempotent: aman dijalankan ulang, guard berupa IF NOT EXISTS)`);
L.push(`-- Isi: extensions, enum, tabel + kolom, constraints, indexes, views,`);
L.push(`--      fungsi (11), RLS + policies (53), triggers (29)`);
L.push(`-- ============================================================`);
L.push(``);
L.push(`-- ---------- extensions ----------`);
for (const e of extensions) L.push(`CREATE EXTENSION IF NOT EXISTS ${ident(e.extname)}${e.extversion && e.extversion !== "1.0" ? ` VERSION ${ident(e.extversion)}` : ""};`);

L.push(`\n-- ---------- enum types ----------`);
for (const t of types) {
  const vals = t.labels.map((l) => `'${esc(l)}'`).join(", ");
  L.push(`DO $block$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='${esc(t.typname)}' AND n.nspname='public') THEN
  CREATE TYPE public.${ident(t.typname)} AS ENUM (${vals});
END IF; END $block$;`);
}

L.push(`\n-- ---------- tables (kolom saja; constraint menyusul) ----------`);
for (const t of tables) {
  const cols = columns.filter((c) => c.table_name === t.relname).sort((a, b) => a.ordinal - b.ordinal);
  const colLines = cols
    .map((c) => {
      let line = `  ${ident(c.column_name)} ${c.data_type}`;
      if (c.generated) line += ` GENERATED ${c.generated === "s" ? "ALWAYS" : ""} AS (${c.default_expr}) STORED`;
      else if (c.default_expr) {
        let d = c.default_expr;
        if (/^nextval\(/.test(d)) {
          d = d.replace(/::regclass$/, "");
        }
        line += ` DEFAULT ${d}`;
      }
      if (c.not_null && !c.generated) line += " NOT NULL";
      return line;
    })
    .join(",\n");
  L.push(`CREATE TABLE IF NOT EXISTS public.${ident(t.relname)} (\n${colLines}\n);`);
}

L.push(`\n-- ---------- constraints (PK, FK, UNIQUE, CHECK; idempotent) ----------`);
const guardConstraint = (c) => {
  L.push(`DO $block$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con
       JOIN pg_class cn ON cn.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = cn.relnamespace
       WHERE con.conname='${esc(c.conname)}' AND n.nspname='public' AND cn.relname='${esc(c.table_name)}') THEN
    ALTER TABLE public.${ident(c.table_name)} ADD CONSTRAINT ${ident(c.conname)} ${c.def};
  END IF; END $block$;`);
};
for (const c of constraints.filter((x) => x.contype === "p")) guardConstraint(c);
for (const c of constraints.filter((x) => x.contype === "u")) guardConstraint(c);
for (const c of constraints.filter((x) => x.contype === "f")) guardConstraint(c);
for (const c of constraints.filter((x) => x.contype === "c")) guardConstraint(c);

// index duplikat dgn UNIQUE constraint (contoh: articles_slug_unique_idx) → skip
const parseCols = (def) => {
  const inner = def.match(/\(([^)]*)\)/);
  return inner ? inner[1].split(",").map((s) => s.replace(/"/g, "").trim().toLowerCase()) : [];
};
const uniqConstraints = constraints
  .filter((x) => x.contype === "u")
  .map((x) => ({ table: x.table_name, cols: parseCols(x.def).sort().join("|") }));
const dupIndex = (row, def) => {
  const cols = parseCols(def.replace(/USING btree/i, "")).sort().join("|");
  return def.toUpperCase().startsWith("CREATE UNIQUE") &&
    uniqConstraints.some((u) => u.table === row.table_name && u.cols === cols);
};

L.push(`\n-- ---------- indexes ----------`);
for (const i of indexes) {
  if (dupIndex(i, i.def)) {
    L.push(`-- SKIP (duplikat dgn UNIQUE constraint pada kolom sama): ${i.index_name}`);
    console.log(`  skip dup index: ${i.index_name}`);
    continue;
  }
  L.push(`${i.def.replace(/^(CREATE (?:UNIQUE )?)INDEX /, "$1INDEX IF NOT EXISTS ")};`);
}

L.push(`\n-- ---------- views / matviews ----------`);
for (const v of views)
  L.push(`${v.relkind === "v" ? "CREATE OR REPLACE VIEW" : "CREATE MATERIALIZED VIEW IF NOT EXISTS"} public.${ident(v.relname)} AS\n${v.def};`);

L.push(`\n-- ---------- functions ----------`);
for (const f of functions) L.push(`${await client.query("SELECT pg_get_functiondef($1::oid) d", [f.oid]).then((r) => r.rows[0].d + ";")}`);

L.push(`\n-- ---------- row level security ----------`);
for (const r of rls)
  L.push(`ALTER TABLE public.${ident(r.relname)} ENABLE ROW LEVEL SECURITY;${r.relforcerowsecurity ? `\nALTER TABLE public.${ident(r.relname)} FORCE ROW LEVEL SECURITY;` : ""}`);

L.push(`\n-- ---------- policies ----------`);
const emitPolicy = (p) => {
  const rolesArr = String(p.roles)
    .replace(/^\{|\}$/g, "")
    .split(",")
    .filter(Boolean)
    .map((r) => ident(r))
    .join(", ");
  const clean = (s) => (s ? s.replace(/\s+/g, " ").trim().replace(/^ /, "") : "");
  const qual = clean(p.qual) ? `\n    USING (${clean(p.qual)})` : "";
  const chk = clean(p.with_check) ? `\n    WITH CHECK (${clean(p.with_check)})` : "";
  const guard = `DO $block$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
       WHERE schemaname='public'
         AND tablename='${esc(p.tablename)}'
         AND policyname='${esc(p.policyname)}') THEN`;
  const body = `    EXECUTE $policy$CREATE POLICY ${ident(p.policyname)} ON public.${ident(p.tablename)}
      AS ${p.permissive} FOR ${p.cmd} TO ${rolesArr}${qual}${chk}$policy$;`;
  return `${guard}\n${body}\nEND IF; END $block$;`;
};
for (const p of policies) L.push(emitPolicy(p));

L.push(`\n-- ---------- triggers (idempotent; termasuk trigger di auth.users dari fungsi public) ----------`);
for (const t of triggers)
  L.push(`DO $block$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger tg
       JOIN pg_class tc ON tc.oid=tg.tgrelid
       JOIN pg_namespace tn ON tn.oid=tc.relnamespace
       WHERE tg.tgname='${esc(t.tgname)}' AND tn.nspname='${esc(t.table_schema)}' AND tc.relname='${esc(t.table_name)}') THEN
    EXECUTE $trg$${t.def}$trg$;
  END IF; END $block$;`);

L.push(`\n-- ============================================ END SCHEMA ============================================\n`);
writeFileSync(path.join(OUT, "schema_full.sql"), L.join("\n"), "utf8");
console.log(`schema_full.sql: ${L.length} baris, ${tables.length} tabel, ${functions.length} fungsi, ${policies.length} policy, ${triggers.length} trigger`);

// ---------------------------------------------------------- topo-order tabel utk data
const tblNames = tables.map((t) => t.relname);
const deps = {};
for (const d of fkDeps) {
  (deps[d.src] ??= new Set()).add(d.dst);
}
const ordered = [];
const done = new Set();
const visiting = new Set();
function visit(n) {
  if (done.has(n)) return;
  if (visiting.has(n)) return; // siklus FK — biarkan diurut seadanya
  visiting.add(n);
  for (const d of deps[n] ?? []) if (tblNames.includes(d)) visit(d);
  visiting.delete(n);
  done.add(n);
  ordered.push(n);
}
for (const n of tblNames) visit(n);

// ---------------------------------------------------------- emit data
const D = [];
D.push(`-- ============================================================`);
D.push(`-- DATA DUMP ECEHA.ID — ${new Date().toISOString()}`);
D.push(`-- Urutan topologis sesuai FK (auth users di-import dulu sebelum file ini)`);
D.push(`-- ============================================================`);
D.push(`BEGIN;\n`);
const counts = {};
for (const name of ordered) {
  const cols = columns.filter((c) => c.table_name === name).sort((a, b) => a.ordinal - b.ordinal);
  const pk = constraints.find((x) => x.table_name === name && x.contype === "p")?.def ?? "";
  const conflict = pk ? `ON CONFLICT DO NOTHING` : "";
  const { rows } = await client.query(`SELECT * FROM public.${ident(name)}`);
  counts[name] = rows.length;
  if (!rows.length) {
    D.push(`-- ${name}: (kosong)`);
    continue;
  }
  const colIds = cols.map((c) => ident(c.column_name)).join(", ");
  const isJson = cols.map((c) => /jsonb?$/.test(c.data_type));
  const lit = (v, json) => {
    if (v === null || v === undefined) return "NULL";
    if (json) return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    return sqlLiteral(v);
  };
  D.push(`-- ${name}: ${rows.length} baris`);
  for (const row of rows) {
    const vals = cols.map((c, i) => lit(row[c.column_name], isJson[i])).join(", ");
    D.push(`INSERT INTO public.${ident(name)} (${colIds}) VALUES (${vals})${conflict};`);
  }
  D.push("");
}
D.push(`COMMIT;\n-- total tabel: ${ordered.length}`);
writeFileSync(path.join(OUT, "data.sql"), D.join("\n"), "utf8");

writeFileSync(path.join(OUT, "table_counts.json"), JSON.stringify(counts, null, 2), "utf8");
console.log(`data.sql: ${ordered.length} tabel (urutan topo): ${ordered.join(" → ")}`);
console.log(`baris:`, JSON.stringify(counts));

await client.end();
