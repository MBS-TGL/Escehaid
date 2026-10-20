#!/usr/bin/env node
/**
 * Restore ke project Supabase BARU (urutan ketat):
 *   1. schema_full.sql     (dibungkus BEGIN/COMMIT)
 *   2. auth_users.sql      (punya BEGIN/COMMIT sendiri; coba disable trigger)
 *   3. DELETE user_profiles hasil trigger (jaga-jaga bila trigger gagal dimatikan)
 *   4. DISABLE trigger user (public+auth) → data.sql → ENABLE lagi
 *      (supaya restore data tidak menulis noise ke audit_logs / slug tidak diproses dua kali)
 *   5. storage_restore.sql (buckets + policies, dibungkus BEGIN/COMMIT)
 *   6. grants.sql          (dibungkus BEGIN/COMMIT)
 *   7. cleanup_urls.sql    (dibungkus BEGIN/COMMIT)
 *   8. verifikasi: count tabel vs table_counts.json + auth.users + buckets
 *
 * Env: TARGET_DATABASE_URL = pooler session/transaction project BARU
 */
import { readFileSync, mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "supabase_backup");
const url = process.env.TARGET_DATABASE_URL;
if (!url) {
  console.error("TARGET_DATABASE_URL belum di-set.");
  process.exit(1);
}
mkdirSync(path.join(DIR, "restore_log"), { recursive: true });
const LOG = path.join(DIR, "restore_log", `restore-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
const log = (...a) => {
  const s = ["[restore]", ...a].join(" ");
  console.log(s);
  appendFileSync(LOG, s + "\n");
};

const { Client } = await import("pg");
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

async function failAt(name, err, sql = "") {
  const pos = Number(err.position || 0);
  let ctx = "";
  if (pos && sql) ctx = `\n--- sekitar posisi ${pos} ---\n` + sql.slice(Math.max(0, pos - 220), pos + 220);
  log(`!! GAGAL ${name}: ${err.message}${ctx}`);
  try { await client.end(); } catch {}
  process.exit(1);
}

function read(f) {
  return readFileSync(path.join(DIR, f), "utf8");
}

/** Jalankan seluruh SQL file sebagai satu multi-statement; bila `wrap`, dibungkus BEGIN/COMMIT. */
async function apply(name, sql, { wrap = false } = {}) {
  const body = wrap ? `BEGIN;\n${sql}\nCOMMIT;` : sql;
  log(`→ ${name} (${(sql.length / 1024).toFixed(0)} KB)${wrap ? " [tx]" : ""}...`);
  const t0 = Date.now();
  try {
    await client.query(body);
    log(`   OK ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    await failAt(name, e, body);
  }
}

// ---------------------------------------------------------------- 1. schema
if (process.env.SKIP_SCHEMA === "1") {
  log("→ schema_full.sql DI-LEWATI (SKIP_SCHEMA=1)");
} else {
  await apply("schema_full.sql", read("schema_full.sql"), { wrap: true });
}

// ---------------------------------------------------------------- 2. auth users
await apply("auth_users.sql", read("auth_users.sql"));

// ---------------------------------------------------------------- 3. bersihkan profil hasil trigger
try {
  await client.query("DELETE FROM public.user_profiles;");
  log("   DELETE user_profiles hasil-trigger: OK");
} catch (e) {
  log(`   (skip DELETE user_profiles: ${e.message.slice(0, 120)})`);
}

// ---------------------------------------------------------------- 4. data (trigger off)
const trig = (
  await client.query(
    `select cn.nspname sch, c.relname tbl
       from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
      join pg_namespace cn on cn.oid = c.relnamespace
      where not tg.tgisinternal and (cn.nspname='public' or cn.nspname='auth')
      group by 1,2`
  )
).rows;
const disabled = [];
for (const { sch, tbl } of trig) {
  try {
    await client.query(`ALTER TABLE "${sch}"."${tbl}" DISABLE TRIGGER USER;`);
    disabled.push(`"${sch}"."${tbl}"`);
  } catch (e) {
    log(`   (tidak bisa disable trigger ${sch}.${tbl}: ${e.message.slice(0, 100)})`);
  }
}
log(`   trigger OFF: ${disabled.length} tabel${disabled.length ? " → " + disabled.map((d) => d.replace(/"/g, "")).join(", ") : ""}`);

await apply("data.sql", read("data.sql"));

for (const t of disabled) {
  try {
    await client.query(`ALTER TABLE ${t} ENABLE TRIGGER USER;`);
  } catch (e) {
    log(`   PERINGATAN re-enable ${t}: ${e.message.slice(0, 100)}`);
  }
}
log("   trigger ON kembali ✔");

// ---------------------------------------------------------------- 5-7
await apply("storage_restore.sql", read("storage_restore.sql"), { wrap: true });
await apply("grants.sql", read("grants.sql"), { wrap: true });
await apply("cleanup_urls.sql", read("cleanup_urls.sql"), { wrap: true });

// ---------------------------------------------------------------- 8. verifikasi
log("=== VERIFIKASI ===");
const counts = JSON.parse(read("table_counts.json"));
const expect = { ...counts };
const res = { ok: 0, mismatch: [] };
for (const t of Object.keys(expect)) {
  const r = (await client.query(`select count(*) n from public."${t}"`)).rows[0].n;
  if (Number(r) === expect[t]) res.ok++;
  else res.mismatch.push(`${t}: db=${r} backup=${expect[t]}`);
}
const au = (await client.query("select count(*) n from auth.users")).rows[0].n;
const bk = (await client.query("select count(*) n from storage.buckets")).rows[0].n;
const pol = (await client.query("select count(*) n from pg_policies where schemaname='public'")).rows[0].n;
const fn = (await client.query("select count(*) n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'")).rows[0].n;
log(`tabel cocok: ${res.ok}/${Object.keys(expect).length}${res.mismatch.length ? " — MISMATCH: " + res.mismatch.join("; ") : ""}`);
log(`auth.users: ${au} (jwa: 3) | buckets: ${bk} (harus: 5) | policies public: ${pol} (harus: 53) | fungsi public: ${fn} (harus: 11)`);
const oldUrlLeft = (await client.query(
  `select sum(c) left from (
     select count(*) c from public.news where image_url||coalesce(attachment_url,'') like '%ljobjrlhaifafvroapeq%'
     union all
     select count(*) c from public.teachers where photo_url like '%ljobjrlhaifafvroapeq%'
     union all
     select count(*) c from public.downloads where file_url like '%ljobjrlhaifafvroapeq%'
   ) x`
)).rows;
log(`sisa referensi URL lama (sample): ${JSON.stringify(oldUrlLeft)}`);

await client.end();
log("=== RESTORE SELESAI ===", LOG);
