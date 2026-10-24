#!/usr/bin/env node
/**
 * Orkestrator backup terjadwal (dipanggil .github/workflows/backup.yml):
 *   1. Jalankan backup-full-dump.mjs  → schema + data + counts
 *   2. Jalankan backup-db-extras.mjs  → auth.users + storage.buckets
 *   3. tar.gz hasilnya → upload ke bucket R2 PRIVAT: backups/db-<YYYY-MM-DD>.tar.gz
 *   4. Refresh backups/manifest.json (dibaca halaman /admin/backup)
 *   5. Rotasi: hapus backup lebih tua dari BACKUP_RETAIN_DAYS (default 30)
 *
 * Env (dari GitHub Secrets; uji lokal boleh dari .env.local):
 *   DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_PRIVATE_BUCKET (fallback R2_BUCKET, lalu "esceha-private")
 *
 * Flag --dry-run: dump + tar TANPA upload (uji lokal tanpa menyentuh R2).
 * Exit non-zero bila ada tahap gagal → workflow Actions merah + email.
 */

import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(ROOT_DIR, "supabase_backup");
const MANIFEST_KEY = "backups/manifest.json";
const RETAIN_DAYS = Number(process.env.BACKUP_RETAIN_DAYS || 30);

const dryRun = process.argv.includes("--dry-run");

// Uji lokal: env boleh datang dari .env.local (Actions sudah inject env asli;
// key yang sudah ada di process.env tidak ditimpa).
(function loadEnvLocal() {
  const file = path.join(ROOT_DIR, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

function run(script) {
  console.log(`\n▶ ${script} …`);
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error(`✗ ${script} gagal (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(
      `Env belum lengkap: ${missing.join(", ")}.\n` +
        "Isi di GitHub Secrets (lihat header .github/workflows/backup.yml) atau .env.local untuk uji lokal."
    );
    process.exit(2);
  }
}

async function main() {
  requireEnv(["DATABASE_URL"]);
  console.log(`== Backup terjadwal ${new Date().toISOString()} ==`);

  // 1-2. Dump DB (script lama menulis ke supabase_backup/)
  run("backup-full-dump.mjs");
  run("backup-db-extras.mjs");

  // 3. tar.gz (tar sistem: bsdtar di Windows/Git Bash, GNU tar di runner Linux)
  const date = new Date().toISOString().slice(0, 10);
  const tarPath = path.join(ROOT_DIR, `supabase_backup-db-${date}.tar.gz`);
  console.log(`\n▶ tar.gz → ${path.relative(ROOT_DIR, tarPath)}`);
  const tar = spawnSync("tar", ["-czf", tarPath, "-C", ROOT_DIR, path.basename(BACKUP_DIR)], { stdio: "inherit" });
  if (tar.status !== 0) {
    console.error(`✗ tar gagal (exit ${tar.status})`);
    process.exit(tar.status ?? 1);
  }
  const bytes = statSync(tarPath).size;
  const entry = { key: `backups/db-${date}.tar.gz`, date, bytes };

  if (dryRun) {
    console.log(`\n--dry-run: upload dilewati. Artefak lokal: ${path.relative(ROOT_DIR, tarPath)} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
    return;
  }

  // 4. Upload ke R2 privat
  requireEnv(["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]);
  const bucket = process.env.R2_PRIVATE_BUCKET || process.env.R2_BUCKET || "esceha-private";
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  console.log(`▶ upload s3://${bucket}/${entry.key} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: entry.key,
    Body: createReadStream(tarPath),
    ContentType: "application/gzip",
  }));

  // Manifest: gabung histori lama + entri hari ini (idempoten per tanggal).
  let backups = [entry];
  try {
    const get = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: MANIFEST_KEY }));
    const old = JSON.parse(await get.Body.transformToString("utf8"));
    if (Array.isArray(old.backups)) {
      backups = old.backups.filter((b) => b.key !== entry.key);
      backups.push(entry);
    }
  } catch {
    console.log("  (manifest belum ada — dibuat baru)");
  }
  const writeManifest = (list) =>
    s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: MANIFEST_KEY,
      Body: JSON.stringify({ last_run: new Date().toISOString(), bucket, backups: list }, null, 2),
      ContentType: "application/json",
    }));
  await writeManifest(backups);

  // 5. Rotasi > RETAIN_DAYS
  const cutoff = Date.now() - RETAIN_DAYS * 86400_000;
  const expired = backups.filter((b) => new Date(b.date + "T23:59:59Z").getTime() < cutoff);
  if (expired.length) {
    console.log(`▶ rotasi: hapus ${expired.length} backup > ${RETAIN_DAYS} hari`);
    await s3.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: expired.map((b) => ({ Key: b.key })) },
    }));
    await writeManifest(backups.filter((b) => !expired.includes(b)));
  }

  await rm(tarPath, { force: true }); // folder supabase_backup/ dibiarkan untuk inspect
  console.log(`\n✓ Backup selesai: ${entry.key}`);
}

main().catch((e) => {
  console.error("✗ Backup gagal:", e);
  process.exit(1);
});
