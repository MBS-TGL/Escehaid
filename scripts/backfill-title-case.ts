#!/usr/bin/env node
/**
 * BACKFILL Title Case — perbaiki nama pendaftar lama yang tersimpan belum
 * rapi (kecil semua / besar semua / spasi ganda) memakai helper yang SAMA
 * dengan aplikasi (src/lib/format-name.ts). Script TERPISAH dan TIDAK DIJALANKAN
 * OTOMATIS oleh aplikasi.
 *
 *   node scripts/backfill-title-case.ts            # DRY-RUN (default): hanya cetak tabel perubahan
 *   node scripts/backfill-title-case.ts --apply    # EKSPLISIT: tulis perubahan ke DB
 *
 * YANG DIUBAH (hanya):
 *   full_name            → normalizeName
 *   previous_school      → normalizeSchool
 *   parent_name          → normalizeParentName (format "Ayah / Ibu" dipertahankan)
 *   documents.nickname / father_name / mother_name → normalizeName (MERGE —
 *     kunci lain di documents: cf_*, berkas, input_source, ... TIDAK disentuh)
 *
 * YANG TIDAK DISentuh: email, phone, status, notes, berkas, kolom lain.
 *
 * CATATAN PENTING — baca SEBELUM --apply:
 *   1. unduh eksport CSV backup seluruh tabel spmb_registrations dari
 *      Supabase Dashboard (Table Editor → Export CSV) dan simpan aman;
 *   2. PostgREST tidak mendukung transaksi multi-pernyataan tanpa function DB
 *      (menambah skema — dilarang aturan repo), jadi --apply menulis PER BARIS:
 *      tiap PATCH atomik, dan script berhenti pada PATCH pertama yang gagal
 *      supaya kondisi tidak berlanjut diam-diam. Jalankan ulang =resume
 *      (aman: baris yang sudah rapi ter-deteksi tidak berubah).
 *   --apply SADAR BISA PARTIAL bila dihentikan di tengah — dry-run ulang
 *   untuk melihat sisa.
 *
 * DILARANG memakai SQL initcap(): merusak apostrof ("Nafi'ah" → "Nafi'Ah")
 * dan singkatan ("MTsN", "S.Pd.I").
 *
 * Env (.env.local): SUPABASE_URL (fallback NEXT_PUBLIC_SUPABASE_URL) +
 * SUPABASE_SERVICE_ROLE_KEY (wajib untuk update lintas RLS).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeName,
  normalizeSchool,
  normalizeParentName,
} from "../src/lib/format-name.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PAGE_SIZE = 500;

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
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY wajib ada di .env.local.");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const REST = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function fetchRows(offset) {
  const url =
    `${REST}/spmb_registrations?select=id,full_name,previous_school,parent_name,documents` +
    `&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET gagal: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("Respon bukan array.");
  return rows;
}

const NAME_DOC_KEYS = ["nickname", "father_name", "mother_name"];

/** Kandidat perubahan untuk satu baris — null berarti sudah rapi (tanpa perubahan). */
function diffFor(row) {
  const full_name = normalizeName(row.full_name);
  const previous_school = normalizeSchool(row.previous_school);
  const parent_name = normalizeParentName(row.parent_name);
  let documents = null;
  if (row.documents && typeof row.documents === "object") {
    const nextDocs = { ...row.documents };
    for (const k of NAME_DOC_KEYS) {
      const v = nextDocs[k];
      if (typeof v === "string" && v && normalizeName(v) !== v) nextDocs[k] = normalizeName(v);
    }
    if (Object.keys(nextDocs).some((k) => nextDocs[k] !== row.documents[k])) documents = nextDocs;
  }
  const changed =
    full_name !== row.full_name ||
    previous_school !== row.previous_school ||
    parent_name !== row.parent_name ||
    documents !== null;
  if (!changed) return null;
  return { full_name, previous_school, parent_name, documents };
}

async function applyRow(id, d) {
  const payload = {
    full_name: d.full_name,
    previous_school: d.previous_school,
    parent_name: d.parent_name,
    ...(d.documents ? { documents: d.documents } : {}),
  };
  const res = await fetch(`${REST}/spmb_registrations?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`PATCH id=${id} gagal: ${res.status} ${await res.text()}`);
}

/** Tampilkan "id | sebelum → sesudah" untuk semua baris yang berubah. */
function printDiff(id, row, d) {
  const parts = [];
  if (d.full_name !== row.full_name) parts.push(`full_name: "${row.full_name}" -> "${d.full_name}"`);
  if (d.previous_school !== row.previous_school)
    parts.push(`previous_school: "${row.previous_school}" -> "${d.previous_school}"`);
  if (d.parent_name !== row.parent_name)
    parts.push(`parent_name: "${row.parent_name}" -> "${d.parent_name}"`);
  if (d.documents) {
    const nameDocs = NAME_DOC_KEYS.map((k) =>
      d.documents[k] !== undefined && d.documents[k] !== row.documents[k]
        ? `${k}: "${row.documents[k]}" -> "${d.documents[k]}"`
        : null
    ).filter(Boolean);
    if (nameDocs.length) parts.push(nameDocs.join("; "));
  }
  console.log(`${id} | ${parts.join(" || ")}`);
}

async function main() {
  console.log(
    APPLY
      ? "MODE: --apply (tulis perubahan ke DB)\nSEBELUM APPLY: pastikan export CSV backup tabel spmb_registrations sudah diunduh.\n"
      : "MODE: --dry-run (default) — tidak menulis apa pun.\nJalankan `node scripts/backfill-title-case.ts --apply` untuk menerapkan.\n"
  );

  let offset = 0;
  let scanned = 0;
  let pending = 0;
  let applied = 0;

  for (;;) {
    const rows = await fetchRows(offset);
    if (rows.length === 0) break;
    scanned += rows.length;
    for (const row of rows) {
      const d = diffFor(row);
      if (!d) continue;
      pending++;
      printDiff(row.id, row, d);
      if (APPLY) {
        try {
          await applyRow(row.id, d);
          applied++;
        } catch (e) {
          console.error(`\nSTOP pada id=${row.id} (${applied} baris sudah ditulis).`, e);
          process.exit(2);
        }
      }
    }
    offset += rows.length;
  }

  console.log(`\nScan ${scanned} baris; ${pending} baris berubah.`);
  if (APPLY) {
    console.log(`Ditulis: ${applied}/${pending} baris.`);
    if (pending > applied) {
      console.error("ADA BARIS YANG TIDAK TERTULIS — rerun script (idempoten) untuk sisa.");
      process.exit(3);
    }
  } else {
    console.log("Dry-run selesai — DB tidak disentuh.");
  }
}

main().catch((e) => {
  console.error("Backfill gagal:", e);
  process.exit(1);
});
