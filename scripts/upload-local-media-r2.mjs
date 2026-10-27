#!/usr/bin/env node
/**
 * Unggah media yang masih tersimpan di repo (`public/`) ke Cloudflare R2.
 *
 * Latar belakang: sebelum cutover R2, `scripts/sync-static-images.mjs` menarik
 * gambar dari Supabase Storage ke `public/images/` supaya bebas egress. Kolom
 * DB lalu di-rewrite ke path lokal (/images/...). Setelah R2 aktif, file itu
 * harus pindah ke R2 dan kolom DB di-backfill (migration 0008).
 *
 * Key mengikuti konvensi `src/lib/storage.ts`: `<bucketSupabase>/<path>`
 *   public/images/teachers/<f>   → images/teachers/<f>
 *   public/images/facilities/<f> → images/facilities/<f>
 *   public/images/Kepala-Sekolah.jpg → images/Kepala-Sekolah.jpg
 *   public/documents/<path>      → documents/<path>
 *
 *   node scripts/upload-local-media-r2.mjs            # unggah (idempoten)
 *   node scripts/upload-local-media-r2.mjs --dry-run  # hanya rencana
 *   node scripts/upload-local-media-r2.mjs --verify   # cek HEAD CDN saja
 *
 * Idempoten: objek yang sudah ada di R2 dengan ukuran sama di-skip.
 * Env (.env.local): R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY /
 * R2_PUBLIC_BASE_URL / R2_BUCKET.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "supabase_backup", "r2-upload-manifest.json");

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
const ACCOUNT_ID = env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY;
const PUBLIC_BASE = (env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const BUCKET = env.R2_BUCKET || "esceha-cdn";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verifyOnly = args.includes("--verify");

const CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};
const contentTypeOf = (p) => CONTENT_TYPES[(p.split(".").pop() || "").toLowerCase()] || "application/octet-stream";

/** Kumpulkan berkas lokal → key R2 (relatif terhadap `public/`). */
async function collectTargets() {
  const out = [];
  const addDir = async (dir) => {
    if (!existsSync(dir)) return;
    for (const name of await readdir(dir)) {
      if (name.startsWith(".")) continue;
      const abs = path.join(dir, name);
      const st = await stat(abs);
      if (st.isDirectory()) await addDir(abs);
      else out.push(abs);
    }
  };

  await addDir(path.join(ROOT, "public", "images", "teachers"));
  await addDir(path.join(ROOT, "public", "images", "facilities"));
  await addDir(path.join(ROOT, "public", "documents", "news"));

  const principal = path.join(ROOT, "public", "images", "Kepala-Sekolah.jpg");
  if (existsSync(principal)) out.push(principal);

  return out.map((abs) => ({
    abs,
    key: path.relative(path.join(ROOT, "public"), abs).split(path.sep).join("/"),
    size: 0,
  }));
}

if (!PUBLIC_BASE) {
  console.error("R2_PUBLIC_BASE_URL tidak ditemukan di .env.local.");
  process.exit(1);
}

if (!verifyOnly && (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY)) {
  console.error("Kredensial R2 belum lengkap di .env.local (wajib kecuali --verify).");
  process.exit(1);
}

const targets = await collectTargets();
if (targets.length === 0) {
  console.log("Tidak ada berkas untuk diunggah (folder sudah bersih).");
  process.exit(0);
}

if (verifyOnly) {
  let ok = 0;
  const bad = [];
  for (const t of targets) {
    const url = `${PUBLIC_BASE}/${t.key}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) ok += 1;
      else bad.push(`${res.status} ${t.key}`);
    } catch {
      bad.push(`ERR ${t.key}`);
    }
  }
  console.log(`VERIFY: ${ok}/${targets.length} objek tersedia di CDN.`);
  if (bad.length) {
    console.log("Bermasalah:");
    bad.forEach((b) => console.log("  -", b));
    process.exit(1);
  }
  process.exit(0);
}

const { S3Client, HeadObjectCommand, PutObjectCommand } = await import("@aws-sdk/client-s3");
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

const manifest = [];
let uploaded = 0;
let skipped = 0;
let failed = 0;

for (const t of targets) {
  t.size = (await stat(t.abs)).size;

  let exists = false;
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: t.key }));
    exists = Number(head.ContentLength) === t.size;
  } catch {
    exists = false;
  }

  if (exists) {
    skipped += 1;
    manifest.push({ key: t.key, size: t.size, uploaded: false, skipped: true });
    console.log(`= ${t.key} (${(t.size / 1024).toFixed(0)} KB) sudah ada`);
    continue;
  }

  if (dryRun) {
    manifest.push({ key: t.key, size: t.size, uploaded: false, dry: true });
    console.log(`~ ${t.key} (${(t.size / 1024).toFixed(0)} KB)`);
    continue;
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: t.key,
        Body: readFileSync(t.abs),
        ContentType: contentTypeOf(t.key),
        CacheControl: "public, max-age=31536000",
      })
    );
    uploaded += 1;
    manifest.push({ key: t.key, size: t.size, uploaded: true });
    console.log(`+ ${t.key} (${(t.size / 1024).toFixed(0)} KB)`);
  } catch (e) {
    failed += 1;
    manifest.push({ key: t.key, size: t.size, uploaded: false, error: String(e?.message ?? e) });
    console.error(`! ${t.key}: ${e?.message ?? e}`);
  }
}

if (!dryRun) {
  writeFileSync(
    MANIFEST,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        bucket: BUCKET,
        publicBase: PUBLIC_BASE,
        total: { files: targets.length, uploaded, skipped, failed },
        manifest,
      },
      null,
      2
    ),
    "utf8"
  );
}

console.log(
  `\nRingkasan: ${targets.length} berkas — ${uploaded} diunggah, ${skipped} dilewati, ${failed} gagal.`
);
if (dryRun) console.log("Jalankan tanpa --dry-run untuk benar-benar mengunggah.");
if (failed > 0) process.exit(1);
