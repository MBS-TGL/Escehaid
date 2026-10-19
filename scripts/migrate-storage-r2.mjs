#!/usr/bin/env node
/**
 * MIGRASI Storage Supabase → Cloudflare R2 (Tahap B).
 *
 * Menyalin SEMUA objek dari bucket Supabase ke bucket R2 dengan struktur key
 * yang sama dengan konvensi src/lib/storage.ts: key fisik = `<bucketSupabase>/<path>`
 * (custom domain R2 memetakan URL path langsung ke key) — bucket Supabase publik
 * (images/documents) masuk R2_BUCKET, privat (spmb-documents) ke R2_PRIVATE_BUCKET.
 *
 *   node scripts/migrate-storage-r2.mjs                          # 3 bucket app
 *   node scripts/migrate-storage-r2.mjs images documents         # bucket custom
 *   node scripts/migrate-storage-r2.mjs --dry-run                # hanya rencana
 *   node scripts/migrate-storage-r2.mjs --verify                 # cocokkan isi R2
 *
 * Idempoten: objek yang sudah ada di R2 dengan ukuran sama di-skip, jadi
 * aman dijalankan ulang berkali-kali (resume). SENGAJA tidak menghapus apa
 * pun dari Supabase — bucket Supabase tetap sebagai rollback sampai Tahap E.
 *
 * Env (.env.local):
 *   SUPABASE_URL + SUPABASE_ANON_KEY   — sumber (fallback NEXT_PUBLIC_* legacy)
 *   SUPABASE_SERVICE_ROLE_KEY          — opsional: unduh file bucket privat
 *                                        (spmb-documents) via signed URL
 *   R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY — tujuan
 *   R2_PUBLIC_BASE_URL                 — domain publik (divalidasi ada)
 *   R2_BUCKET        — bucket PUBLIK, default "esceha-cdn"
 *   R2_PRIVATE_BUCKET — bucket PRIVAT (spmb-documents), default "esceha-private"
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "supabase_backup", "r2-migration-manifest.json");
const DEFAULT_BUCKETS = ["images", "documents", "spmb-documents"];

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
const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";

const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_BASE_URL = (env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const R2_BUCKET = env.R2_BUCKET || "esceha-cdn";
const R2_PRIVATE_BUCKET = env.R2_PRIVATE_BUCKET || "esceha-private";

/** Bucket R2 tujuan: spmb-documents (privat) → R2_PRIVATE_BUCKET, sisanya publik. */
const r2BucketFor = (supabaseBucket) =>
  supabaseBucket === "spmb-documents" ? R2_PRIVATE_BUCKET : R2_BUCKET;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("SUPABASE_URL / SUPABASE_ANON_KEY tidak ditemukan di .env.local.");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verify = args.includes("--verify");
const buckets = args.filter((a) => !a.startsWith("--"));
const bucketList = buckets.length ? buckets : DEFAULT_BUCKETS;

const NEED_R2 = !dryRun || verify;
if (NEED_R2 && (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)) {
  console.error(
    "R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY belum lengkap di .env.local (wajib mode tulis/verify)."
  );
  process.exit(1);
}

const baseHeaders = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

// ============ SUMBER: Supabase Storage ============

async function listObjects(bucket, prefix = "") {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) throw new Error(`List ${bucket}/${prefix} gagal: ${res.status} ${await res.text()}`);
  return (await res.json()) ?? [];
}

/** Walk rekursif seperti scripts/backup-storage.mjs — folder → turun ke dalam. */
async function walkSupabase(bucket, prefix, collected) {
  const items = await listObjects(bucket, prefix);
  for (const item of items) {
    const p = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id && item.metadata) {
      collected.push({ path: p, size: item.metadata.size ?? 0, mimetype: item.metadata.mimetype ?? null });
    } else {
      await walkSupabase(bucket, p, collected);
      if (items.length === 1000) {
        console.warn(`  PERINGATAN: ${p} berisi >=1000 item — cek manual jika ada file terlewat`);
      }
    }
  }
}

async function downloadObject(bucket, objPath) {
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objPath}`;
  let res = await fetch(publicUrl);
  if (!res.ok && SERVICE_KEY) {
    // Bucket privat (spmb-documents): minta signed URL via service role.
    const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${objPath}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
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
  return Buffer.from(await res.arrayBuffer());
}

// ============ TUJUAN: Cloudflare R2 ============

let s3 = null;

async function getS3() {
  if (!s3) {
    const [{ S3Client }] = await Promise.all([
      import("@aws-sdk/client-s3"),
    ]);
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return s3;
}

async function r2Imports() {
  return import("@aws-sdk/client-s3");
}

const r2Key = (bucket, objPath) => `${bucket}/${objPath}`;

/** HeadObject → { exists, size } (null bila kredensial tidak tersedia). */
async function r2Head(bucket, objPath) {
  try {
    const client = await getS3();
    const { HeadObjectCommand } = await r2Imports();
    const res = await client.send(
      new HeadObjectCommand({ Bucket: r2BucketFor(bucket), Key: r2Key(bucket, objPath) })
    );
    return { exists: true, size: res.ContentLength ?? 0 };
  } catch (e) {
    const status = e?.$metadata?.httpStatusCode;
    if (status === 404 || status === 410) return { exists: false, size: 0 };
    if (e?.Code === "NoSuchKey" || e?.name === "NotFound") return { exists: false, size: 0 };
    throw e;
  }
}

async function r2Put(bucket, objPath, buf, contentType) {
  const client = await getS3();
  const { PutObjectCommand } = await r2Imports();
  await client.send(
    new PutObjectCommand({
      Bucket: r2BucketFor(bucket),
      Key: r2Key(bucket, objPath),
      Body: buf,
      ContentType: contentType || undefined,
      // Nilai supabase umum dipakai app; panjang cache untuk objek mapan.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

/** Listing rekursif R2 utk satu bucket (prefix list). */
async function main() {
  // ============ MODE VERIFY ============
  if (verify) {
    const missing = [];
    let matched = 0;
    for (const bucket of bucketList) {
      const source = [];
      await walkSupabase(bucket, "", source);
      for (const obj of source) {
        const head = await r2Head(bucket, obj.path);
        if (!head.exists) missing.push(`${bucket}/${obj.path}`);
        else if (head.size !== obj.size) missing.push(`${bucket}/${obj.path} (beda ukuran: ${head.size} vs ${obj.size})`);
        else matched += 1;
      }
      console.log(`[verify ${bucket}] ${source.length} objek sumber — ${matched} cocok, ${missing.length} bermasalah`);
    }
    if (missing.length > 0) {
      console.error(`\nVERIFY GAGAL: ${missing.length} objek tidak ada/beda:`);
      for (const m of missing) console.error(`  - ${m}`);
      process.exit(1);
    }
    console.log(`\nVERIFY OK: semua ${matched} objek cocok ukuran.`);
    return;
  }

  // ============ MODE MIGRASI ============
  const manifest = [];
  const failures = [];
  const total = { files: 0, bytes: 0, skipped: 0, failed: 0 };

  for (const bucket of bucketList) {
    console.log(`\n[${bucket}] listing...`);
    let objects;
    try {
      objects = [];
      await walkSupabase(bucket, "", objects);
    } catch (err) {
      console.error(`  Gagal list bucket ${bucket}: ${err.message}`);
      failures.push({ bucket, error: err.message });
      continue;
    }
    console.log(`  ${objects.length} file ditemukan`);

    for (const obj of objects) {
      const logName = `${bucket}/${obj.path}`;
      try {
        if (!dryRun) {
          const head = await r2Head(bucket, obj.path);
          if (head.exists && head.size === obj.size) {
            total.skipped += 1;
            manifest.push({ bucket, path: obj.path, size: obj.size, skipped: true });
            continue;
          }
        }
        if (dryRun) {
          const head = await r2Head(bucket, obj.path).catch(() => ({ exists: false, size: 0 }));
          manifest.push({ bucket, path: obj.path, size: obj.size, dry: true, adaDiR2: head.exists });
          console.log(`  ~ ${logName} (${(obj.size / 1024).toFixed(0)} KB)${head.exists ? " [sudah ada di R2]" : ""}`);
        } else {
          const buf = await downloadObject(bucket, obj.path);
          await r2Put(bucket, obj.path, buf, obj.mimetype);
          manifest.push({ bucket, path: obj.path, size: buf.length });
          total.files += 1;
          total.bytes += buf.length;
          console.log(`  + ${logName} (${(buf.length / 1024).toFixed(0)} KB)`);
        }
      } catch (err) {
        total.failed += 1;
        failures.push({ bucket, path: obj.path, error: err.message });
        console.error(`  GAGAL ${logName}: ${err.message}`);
      }
    }
  }

  if (!dryRun) {
    const nota = {
      generatedAt: new Date().toISOString(),
      from: SUPABASE_URL,
      to: `${R2_PUBLIC_BASE_URL || "(R2_PUBLIC_BASE_URL belum diset)"}`,
      bucketPublik: R2_BUCKET,
      bucketPrivat: R2_PRIVATE_BUCKET,
      manifest,
      failures,
      total,
    };
    writeFileSync(MANIFEST, JSON.stringify(nota, null, 2), "utf8");
  }

  console.log(
    `\nSelesai${dryRun ? " (dry-run)" : ""}: ${total.files} diunggah, ${total.skipped} di-skip, ${total.failed} gagal, ${(total.bytes / 1048576).toFixed(2)} MB`
  );
  if (failures.length) {
    console.error(`ADA ${failures.length} KEGAGALAN${dryRun ? "" : " — lihat " + MANIFEST}`);
    process.exit(2);
  }
  if (dryRun) console.log("Jalankan tanpa --dry-run untuk benar-benar mengunggah.");
  console.log(
    `\nLangkah berikutnya (setelah verify OK): set STORAGE_DRIVER=r2 di Vercel dan jalankan` +
      ` SQL rewrite URL (Tahap C/D).`
  );
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
