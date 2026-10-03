#!/usr/bin/env node
/**
 * Sinkronkan gambar statis dari Supabase Storage ke folder /public
 * supaya tidak memakai egress Supabase sama sekali.
 *
 *   node scripts/sync-static-images.mjs                  # folder default: teachers
 *   node scripts/sync-static-images.mjs teachers facilities
 *   node scripts/sync-static-images.mjs --dry-run
 *
 * Setelah sinkron, jalankan SQL:
 *   supabase/migrations/004_local_teacher_photos.sql
 * supaya kolom photo_url di database menunjuk ke path lokal.
 * (Upload foto baru tetap ke Supabase — jalankan script + SQL lagi
 *  kapan pun untuk memindahkannya ke lokal.)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 * (dibaca dari .env.local kalau tidak ada di environment).
 */

import { writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BUCKET = "images";
const DEFAULT_PREFIXES = ["teachers"];

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

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const prefixes = args.filter((a) => !a.startsWith("--"));
const { SUPABASE_URL, ANON_KEY } = (() => {
  const env = loadEnv();
  return {
    SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
})();

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan.");
  process.exit(1);
}

const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

async function listFolder(prefix) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: prefix.endsWith("/") ? prefix : `${prefix}/`, limit: 1000 }),
  });
  if (!res.ok) throw new Error(`List ${prefix} gagal: ${res.status} ${await res.text()}`);
  const items = await res.json();
  return items.filter((i) => i.name && i.metadata);
}

async function download(prefix, name, remoteSize) {
  const rel = `images/${prefix}/${name}`.replace(/\\/g, "/");
  const dest = path.join(ROOT, "public", rel);
  await mkdir(path.dirname(dest), { recursive: true });

  if (existsSync(dest)) {
    const s = await stat(dest);
    if (s.size === remoteSize) return { rel, skipped: true, bytes: s.size };
    if (dryRun) return { rel, skipped: false, bytes: remoteSize, note: "beda ukuran → akan di-update" };
  }

  if (dryRun) return { rel, skipped: false, bytes: remoteSize, note: "akan di-download" };

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${prefix}/${name}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Download ${url} gagal: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return { rel, skipped: false, bytes: buf.length };
}

const total = { files: 0, bytes: 0, skipped: 0 };

for (const prefix of prefixes.length ? prefixes : DEFAULT_PREFIXES) {
  const items = await listFolder(prefix);
  console.log(`\n${prefix}/ → ${items.length} file`);
  for (const item of items) {
    const r = await download(prefix, item.name, item.metadata.size || 0);
    total.files += 1;
    total.bytes += r.bytes;
    if (r.skipped) total.skipped += 1;
    console.log(
      `  ${r.skipped ? "=" : "+"} ${r.rel} (${(r.bytes / 1024).toFixed(0)} KB)${r.note ? ` — ${r.note}` : ""}`
    );
  }
}

console.log(
  `\nSelesai${dryRun ? " (dry-run)" : ""}: ${total.files} file, ${(total.bytes / 1048576).toFixed(2)} MB, ${total.skipped} dilewati.`
);
console.log("Langkah berikutnya: jalankan supabase/migrations/004_local_teacher_photos.sql di SQL Editor.");
