#!/usr/bin/env node
/**
 * Purge Sampah — hapus permanen baris yang sudah di-soft-delete > 30 hari.
 * Dipanggil .github/workflows/trash-purge.yml (mingguan).
 *
 * Env: DATABASE_URL (transaction pooler port 6543 juga bisa).
 * Catatan: pembersihan file storage news/articles/gallery/downloads yang
 * terkait TIDAK dilakukan di sini (hanya DB); berkas yatim berukuran kecil
 * dan bisa dirapikan manual via /admin/media bila perlu.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

(function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum di-set — purge dilewati. Isi GitHub Secrets (lihat header workflow).");
  process.exit(2);
}

const TABLES = [
  "news",
  "articles",
  "faqs",
  "achievements",
  "activities",
  "gallery",
  "downloads",
  "announcements",
];

const { Client } = await import("pg");
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

let total = 0;
for (const table of TABLES) {
  const res = await client.query(
    `DELETE FROM public.${table} WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days'`
  );
  if (res.rowCount > 0) console.log(`  ${table}: ${res.rowCount} baris dihapus permanen`);
  total += res.rowCount;
}
await client.end();

console.log(`\n✓ Purge selesai — total ${total} baris.`);
