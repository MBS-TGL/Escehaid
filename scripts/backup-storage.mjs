#!/usr/bin/env node
/**
 * Backup SEMUA file Supabase Storage → supabase_backup/storage/<bucket>/<path>.
 * Struktur folder identik dengan yang di storage supaya restore jaga path.
 *
 *   node scripts/backup-storage.mjs                       # bucket default
 *   node scripts/backup-storage.mjs images documents      # bucket custom
 *   node scripts/backup-storage.mjs --dry-run
 *
 * Pakai anon key dari .env.local. Untuk file private, set
 * SUPABASE_SERVICE_ROLE_KEY di .env.local agar fallback ke signed URL.
 * Idempotent: file dengan ukuran sama di lokal dilewati.
 */

import { writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(ROOT, "supabase_backup", "storage");
const DEFAULT_BUCKETS = ["images", "documents", "videos"];

function loadEnv() {
  const env = { ...process.env };
  const file = path.join(ROOT, ".env.local");
  if (existsSync(file)) {
    const raw = readFileSync(file, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan di .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const buckets = args.filter((a) => !a.startsWith("--"));
const bucketList = buckets.length ? buckets : DEFAULT_BUCKETS;

const baseHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" };

async function listObjects(bucket, prefix = "") {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) throw new Error(`List ${bucket}/${prefix} gagal: ${res.status} ${await res.text()}`);
  const items = await res.json();
  return items ?? [];
}

/** Walk recursive: folder (tanpa metadata) → lanjut ke dalam. */
async function walk(bucket, prefix, collected) {
  const items = await listObjects(bucket, prefix);
  for (const item of items) {
    const p = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id && item.metadata) collected.push({ path: p, size: item.metadata.size ?? 0 });
    else await walk(bucket, `${p}`, collected);
    if (!item.id && items.length === 1000) {
      console.warn(`  PERINGATAN: ${p} berisi >=1000 item — cek manual jika file terlewat`);
    }
  }
}

async function downloadObject(bucket, objPath) {
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objPath}`;
  let res = await fetch(publicUrl);
  if (!res.ok && SERVICE_KEY) {
    // fallback file private: minta signed URL via service role
    const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${objPath}`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 120 }),
    });
    if (signRes.ok) {
      const { signedURL } = await signRes.json();
      res = await fetch(`${SUPABASE_URL}/storage/v1${signedURL}`);
    } else {
      throw new Error(`Sign gagal (${signRes.status}): ${bucket}/${objPath}`);
    }
  }
  if (!res.ok) throw new Error(`Download ${publicUrl} gagal: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

const manifest = [];
const total = { files: 0, bytes: 0, skipped: 0, failed: 0 };
const failures = [];

for (const bucket of bucketList) {
  console.log(`\n[${bucket}] listing...`);
  let objects;
  try {
    objects = [];
    await walk(bucket, "", objects);
  } catch (err) {
    console.error(`  Gagal list bucket ${bucket}: ${err.message}`);
    failures.push({ bucket, error: err.message });
    continue;
  }
  console.log(`  ${objects.length} file ditemukan`);

  for (const obj of objects) {
    const dest = path.join(BACKUP_DIR, bucket, obj.path.replace(/\//g, path.sep));
    try {
      await mkdir(path.dirname(dest), { recursive: true });
      if (!dryRun && existsSync(dest)) {
        const s = await stat(dest);
        if (s.size === obj.size) {
          total.skipped += 1;
          manifest.push({ bucket, path: obj.path, size: obj.size, skipped: true });
          continue;
        }
      }
      if (dryRun) {
        manifest.push({ bucket, path: obj.path, size: obj.size, dry: true });
      } else {
        const buf = await downloadObject(bucket, obj.path);
        await writeFile(dest, buf);
        manifest.push({ bucket, path: obj.path, size: buf.length });
        total.files += 1;
        total.bytes += buf.length;
        console.log(`  + ${bucket}/${obj.path} (${(buf.length / 1024).toFixed(0)} KB)`);
      }
    } catch (err) {
      total.failed += 1;
      failures.push({ bucket, path: obj.path, error: err.message });
      console.error(`  GAGAL ${bucket}/${obj.path}: ${err.message}`);
    }
  }
}

await writeFile(path.join(ROOT, "supabase_backup", "storage-manifest.json"), JSON.stringify({ manifest, failures, total }, null, 2), "utf8");

console.log(
  `\nSelesai${dryRun ? " (dry-run)" : ""}: ${total.files} file baru, ${total.skipped} di-skip, ${total.failed} gagal, ${(total.bytes / 1048576).toFixed(2)} MB`
);
if (failures.length) console.error(`ADA ${failures.length} KEGAGALAN — lihat supabase_backup/storage-manifest.json`);
if (dryRun) console.log("Manifest dry-run ditulis; jalankan ulang tanpa --dry-run untuk mengunduh.");
