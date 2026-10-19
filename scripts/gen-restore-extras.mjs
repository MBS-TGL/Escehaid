#!/usr/bin/env node
/**
 * Generate file restore tambahan:
 *   - supabase_backup/grants.sql       : diff tabel-grant lama vs baru (REVOKE berlebih / GRANT kurang)
 *   - supabase_backup/cleanup_urls.sql : rewrite URL storage lama → path lokal, clear yang hilang
 *
 * Env:
 *   DATABASE_URL        = connection string pooler project LAMA (sumber of truth)
 *   TARGET_DATABASE_URL = connection string pooler project BARU
 *   OLD_PROJECT         = ref project lama (default: ljobjrlhaifafvroapeq)
 */

import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "supabase_backup");
const OLD_PROJECT = process.env.OLD_PROJECT || "ljobjrlhaifafvroapeq";
const ROLES = ["anon", "authenticated", "service_role"];
const OLD_URL_HOST = `https://${OLD_PROJECT}.supabase.co/storage/v1/object/public/`;

const { Client } = await import("pg");
const mk = (u) => new Client({ connectionString: u, ssl: { rejectUnauthorized: false } });
const old = mk(process.env.DATABASE_URL);
const neo = mk(process.env.TARGET_DATABASE_URL);
await old.connect();
await neo.connect();

const q = async (c, sql) => (await c.query(sql)).rows;

// ---------------------------------------------------------- grants diff (tabel)
const oldT = await q(old, `select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role')`);
const newT = await q(neo, `select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role')`);

const agg = (rows) => {
  const m = new Map();
  for (const r of rows) {
    const k = `${r.table_name}|${r.grantee}`;
    if (!m.has(k)) m.set(k, new Set());
    m.get(k).add(r.privilege_type);
  }
  return m;
};
const OM = agg(oldT), NM = agg(newT);
const keys = new Set([...OM.keys(), ...NM.keys()]);

const G = [];
G.push(`-- ============================================================`);
G.push(`-- GRANTS — tabel public disamakan persis dengan project lama`);
G.push(`-- ============================================================`);
let changed = 0;
for (const k of [...keys].sort()) {
  const [table, grantee] = k.split("|");
  const o = OM.get(k) ?? new Set();
  const n = NM.get(k) ?? new Set();
  const extra = [...n].filter((p) => !o.has(p));
  const missing = [...o].filter((p) => !n.has(p));
  if (extra.length) {
    changed++;
    G.push(`REVOKE ${extra.join(", ")} ON public."${table}" FROM "${grantee}";`);
  }
  if (missing.length) {
    changed++;
    G.push(`GRANT ${missing.join(", ")} ON public."${table}" TO "${grantee}";`);
  }
}
if (!changed) G.push(`-- (tidak ada perbedaan grants tabel)`);
console.log(`grants.sql: ${changed} statement diff`);

for (const role of ROLES) {
  const o = await q(old, `select has_schema_privilege('${role}','public','USAGE') ok`);
  const n = await q(neo, `select has_schema_privilege('${role}','public','USAGE') ok`);
  if (o[0].ok && !n[0].ok) G.push(`GRANT USAGE ON SCHEMA public TO "${role}";`);
}
G.push("");
writeFileSync(path.join(OUT, "grants.sql"), G.join("\n"), "utf8");

// ---------------------------------------------------------- fungsi-grant diff (info saja)
// default EXECUTE = PUBLIC di kedua project identik; hanya lapor kalau beda
const fQ = (c) =>
  q(c, `select routine_name, string_agg(distinct grantee, ',') grantees
          from information_schema.routine_privileges
         where specific_schema='public' and grantee <> 'PUBLIC'
         group by routine_name`);
const OF = Object.fromEntries((await fQ(old)).map((r) => [r.routine_name, r.grantees]));
const NF = Object.fromEntries((await fQ(neo)).map((r) => [r.routine_name, r.grantees]));
for (const name of new Set([...Object.keys(OF), ...Object.keys(NF)])) {
  if ((OF[name] ?? "") !== (NF[name] ?? "")) {
    console.log(`  CATATAN fungsi-grant beda: ${name}  lama=[${OF[name] ?? "-"}]  baru=[${NF[name] ?? "-"}]`);
    if (NF[name] && OF[name]) {
      const missing = OF[name].split(",").filter((g) => !(NF[name] ?? "").includes(g));
      const extra = (NF[name] ?? "").split(",").filter((g) => !OF[name].includes(g));
      if (extra.length) G.push(`REVOKE EXECUTE ON FUNCTION "${name}" FROM "${extra.join('","')}"; -- verifikasi manual`);
      if (missing.length) G.push(`GRANT EXECUTE ON FUNCTION "${name}" TO "${missing.join('","')}"; -- verifikasi manual`);
    }
  }
}

// ---------------------------------------------------------- cleanup_urls
const textCols = await q(old, `
  select table_name, column_name, data_type, ordinal_position
    from information_schema.columns
   where table_schema='public' and data_type in ('text','character varying')
   order by table_name, ordinal_position`);

const C = [];
C.push(`-- ============================================================`);
C.push(`-- CLEANUP URL — kolom DB yang masih menunjuk ke Supabase LAMA`);
C.push(`-- aturan: file ada di public/ → rewrite ke path lokal`);
C.push(`--         file hilang → clear ('') [bisa upload ulang via panel admin]`);
C.push(`-- ============================================================`);
let cw = 0;
const seenCtx = new Map();

for (const col of textCols) {
  let rows;
  try {
    rows = await q(old, `
      select distinct "${col.column_name}"::text x
        from public."${col.table_name}"
       where "${col.column_name}"::text like '%${OLD_PROJECT}.supabase.co%'`);
  } catch {
    continue;
  }
  for (const r of rows) {
    const m = r.x.match(new RegExp(`${OLD_URL_HOST.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([a-z-]+)/([^'"\\\\ ]+)`, "g"));
    if (!m) continue;
    for (const urlHit of m) {
      const urlBase = urlHit.split("?")[0];
      const mparts = urlBase.match(/object\/public\/([a-z-]+)\/(.+)$/);
      if (!mparts) continue;
      const [, bucket, obj] = mparts;
      const localMap = { images: "images", documents: "documents", videos: "videos", "site-images": "site-images" };
      const localPrefix = localMap[bucket];
      const localPath = localPrefix ? `/${localPrefix}/${obj}` : null;
      const exists = !!localPath && existsSync(path.join(ROOT, "public", localPath));

      const needle = urlBase.replace(/'/g, "''");
      const ctx = `${col.table_name}.${col.column_name}`;
      if (seenCtx.get(ctx) && exists) {
        // satu kolom bisa berisi beberapa file — UPDATE replace per needle
      }
      if (exists) {
        C.push(`UPDATE public."${col.table_name}" SET "${col.column_name}" = replace("${col.column_name}", '${needle}', '${localPath}') WHERE "${col.column_name}" LIKE '%${needle}%';`);
        console.log(`  rewrite  [${table_clock(ctx)}] → ${localPath}`);
      } else {
        C.push(`UPDATE public."${col.table_name}" SET "${col.column_name}" = '' WHERE "${col.column_name}" LIKE '%${needle}%';`);
        console.log(`  CLEARED  [${table_clock(ctx)}] ${bucket}/${obj}`);
      }
      cw++;
    }
  }
}
function table_clock(s) { return s; }
C.push("");
writeFileSync(path.join(OUT, "cleanup_urls.sql"), C.join("\n"), "utf8");
console.log(`cleanup_urls.sql: ${cw} aturan`);

await old.end();
await neo.end();
