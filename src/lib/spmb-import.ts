/**
 * Logika fitur "Import Pendaftar" (/admin/admission): pemetaan kolom ekspor
 * Google Form → field form SPMB, pembersihan nilai, validasi per baris,
 * deteksi duplikat (dalam file + terhadap database), dan penyusunan payload
 * insert. Pembaca filenya ada di spmb-import-file.ts; UI-nya di
 * ImportRegistrationsModal.tsx.
 *
 * Keputusan penting:
 * - NISN "0"/"-"/kosong dianggap KOSONG (tidak jadi kunci unik), disimpan string.
 * - NIK harus tepat 16 digit angka; salah/kosong → WARNING (bukan crash).
 * - Tanggal lahir pakai parser bahasa Indonesia (nama bulan + d-m-yyyy);
 *   tahun di luar usia wajar SMP/SMA → ERROR + nilai mentah tetap tampil di
 *   preview supaya bisa diperbaiki manual (tidak ditebak).
 * - Duplikat: NIK, fallback nama lengkap ternormalisasi; baris duplikat &
 *   baris ERROR tidak dicentang secara default (admin bisa eksklusi).
 */

import {
  SPMB_PROGRAMS,
  buildSpmbDocuments,
  spmbDatePickerToIso,
  spmbParentName,
  type SpmbDocumentPaths,
  type SpmbRegistrationData,
  createEmptySpmbRegistrationData,
} from "@/lib/spmb-registration";
import type { AdminCreateRegistrationInput } from "@/lib/queries/registrations";
import type { SheetTable } from "./spmb-import-file";

/* ─── Tipe hasil ──────────────────────────────────────────── */

export type ImportIssue = { level: "error" | "warning"; field: string; message: string };
export type ImportRowStatus = "ready" | "warning" | "duplicate" | "error";

/** Kunci nilai mentah per baris: field data + komposit TTL + kunci berkas. */
export type RawKey =
  | keyof SpmbRegistrationData
  | "birth" | "father_birth" | "mother_birth"
  | "kk" | "akta" | "surat_sekolah" | "ktp_ortu" | "bukti_transfer";

export type ImportRow = {
  /** Nomor baris di file (1 = header). */
  index: number;
  /** Nilai kolom sumber per kunci — dasar edit manual di preview. */
  raw: Record<string, string>;
  data: SpmbRegistrationData;
  /** URL berkas hasil scan/upload (langsung dipakai, bukan path storage). */
  docUrls: Record<string, string | null>;
  issues: ImportIssue[];
  /** Keterangan duplikat ("baris N" / "database: Nama"), null bila unik. */
  duplicateOf: string | null;
  include: boolean;
};

export type ImportResult = {
  rows: ImportRow[];
  /** Baris yang dilewati karena NAMA LENGKAP kosong (mis. baris "INDENT"). */
  skipped: number;
  ignored: string[];
  unmapped: string[];
};

/* ─── Pemetaan header (toleran: trim, case-insensitive, keyword) ── */

const IGNORE_PATTERNS = [/^timestamp$/, /^column\s*\d+$/, /^nomor$/];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\u2010-\u2015]/g, "-").replace(/\s+/g, " ").trim();
}

/** Peta header kolom → kunci field. Urutan penting: aturan spesifik dulu. */
function mapHeader(raw: string): RawKey | null {
  const h = normalizeHeader(raw);
  if (!h) return null;
  if (IGNORE_PATTERNS.some((re) => re.test(h))) return null; // metadata, sengaja diabaikan

  // TTL orang tua dulu (mengandung "tanggal lahir" juga), baru TTL siswa.
  if (h.includes("tanggal lahir") && h.includes("ayah")) return "father_birth";
  if (h.includes("tanggal lahir") && h.includes("ibu")) return "mother_birth";
  if (h.includes("tanggal lahir") || (h.includes("tempat") && h.includes("lahir"))) return "birth";
  if (h.includes("nama ayah")) return "father_name";
  if (h.includes("nama ibu")) return "mother_name";
  if (h.includes("pendidikan") && h.includes("ayah")) return "father_education";
  if (h.includes("pendidikan") && h.includes("ibu")) return "mother_education";
  if (h.includes("pekerjaan") && h.includes("ayah")) return "father_job";
  if (h.includes("pekerjaan") && h.includes("ibu")) return "mother_job";
  if (h.includes("penghasilan") && h.includes("ayah")) return "father_income";
  if (h.includes("penghasilan") && h.includes("ibu")) return "mother_income";

  // Berkas scan (URL unggahan Google Form).
  if (h.includes("kartu keluarga")) return "kk";
  if (h.includes("akta")) return "akta";
  if (h.includes("surat keterangan")) return "surat_sekolah";
  if (h.includes("ktp")) return "ktp_ortu";
  if (h.includes("bukti transfer")) return "bukti_transfer";

  if (h.includes("nama lengkap")) return "full_name";
  if (h.includes("nama panggilan")) return "nickname";
  if (h.includes("jenis kelamin")) return "gender";
  if (h.includes("program")) return "program";
  if (h.includes("nisn")) return "nisn";
  if (h.includes("nik")) return "nik";
  if (h.includes("tinggi")) return "height";
  if (h.includes("berat")) return "weight";
  if (h.includes("bahasa")) return "language";
  if (h.includes("hobi")) return "hobby";
  if (h.includes("cita")) return "ambition";
  if (h.includes("anak ke")) return "child_order";
  if (h.includes("saudara")) return "siblings";
  if (h.includes("golongan darah")) return "blood_type";
  if (h.includes("yatim") || h.includes("piatu")) return "orphan_status";
  if (h.includes("asal sekolah")) return "previous_school";
  if (h.includes("alamat")) return "address";
  if (h.includes("hp") || h.includes("wa") || h.includes("telepon")) return "phone";
  return null;
}

/** Petakan header baris 1. Kolom tanpa field tujuan dikumpulkan (jangan hilang diam-diam). */
export function mapHeaders(headers: string[]): {
  map: Partial<Record<RawKey, number>>;
  ignored: string[];
  unmapped: string[];
} {
  const map: Partial<Record<RawKey, number>> = {};
  const ignored: string[] = [];
  const unmapped: string[] = [];
  headers.forEach((header, i) => {
    const key = mapHeader(header);
    if (key === null) {
      if (header.trim() && IGNORE_PATTERNS.some((re) => re.test(normalizeHeader(header)))) ignored.push(header.trim());
      else if (header.trim()) unmapped.push(header.trim());
      return;
    }
    if (map[key] === undefined) map[key] = i; // kolom pertama menang bila kembar
  });
  return { map, ignored, unmapped };
}

/* ─── Parser tanggal bahasa Indonesia ─────────────────────── */

const MONTHS: Record<string, number> = {
  januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4,
  mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, ags: 8,
  september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11,
  desember: 12, des: 12,
};

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Terima "18 JUNI 2014", "24 Juli 2014", "8-02-1989", "24/07/2014",
 * "08.02.1989", atau ISO "2014-07-24" → { iso, year }. Gagal → null
 * (pemanggil yang menentukan ERROR/WARNING — jangan pernah menebak tahun).
 */
export function parseIndoDate(text: string): { iso: string; year: number } | null {
  const t = text.trim();
  if (!t) return null;

  const finish = (day: number, month: number, year: number) => {
    // Sampai 5 digit: tahun ngawur (mis. 21014) tetap TERDETEKSI sebagai angka
    // supaya pemanggil bisa memberi pesan \"tahun di luar rentang\" — bukan
    // gagal baca. Nilai ISO-nya hanya dipakai pemanggil bila tahun wajar.
    if (!Number.isInteger(year) || year < 1000 || year > 99999) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null; // 31 Feb dst.
    return { iso: `${year}-${pad2(month)}-${pad2(day)}`, year };
  };

  // "18 JUNI 2014" / "18 Jun. 2014"
  let m = t.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4,})$/);
  if (m) {
    const month = MONTHS[m[2].toLowerCase().replace(/\./g, "")];
    if (month) return finish(Number(m[1]), month, Number(m[3]));
    return null;
  }
  // "8-02-1989" / "24/07/2014" / "08.02.1989" (d-m-y, gaya Indonesia)
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4,})$/);
  if (m) return finish(Number(m[1]), Number(m[2]), Number(m[3]));
  // ISO "2014-07-24"
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return finish(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

/** Rentang tahun lahir wajar calon siswa SMP/SMA (umur ~7–21 tahun pada 2026). */
export const SISWA_BIRTH_YEAR_MIN = 2005;
export const SISWA_BIRTH_YEAR_MAX = 2019;
/** Rentang tahun lahir wajar orang tua — hanya dipakai untuk WARNING. */
export const ORTU_BIRTH_YEAR_MIN = 1940;
export const ORTU_BIRTH_YEAR_MAX = 2010;

/** Pola tanggal di AKHIR string — mendukung "Banyuwangi 26 November 2014" tanpa koma. */
const DATE_AT_END = /(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4,}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4,}|\d{4}-\d{2}-\d{2})$/;

/**
 * Pisahkan "TEMPAT, TANGGAL LAHIR" jadi tempat + bagian tanggal. Selain format
 * ber-koma ("JEMBER, 18 JUNI 2014"), dukung juga tempat tanpa koma
 * ("Banyuwangi 26 November 2014") dan placeholder jawaban kosong ("-", "0").
 */
function splitPlaceDate(value: string): { place: string; datePart: string } {
  const v = cleanText(value);
  if (!v || PLACEHOLDER.has(v)) return { place: "", datePart: "" }; // "-"/"0" = tidak diisi
  const m = v.match(DATE_AT_END);
  if (m) {
    const place = v.slice(0, m.index ?? 0).replace(/[, ]+$/, "").trim();
    return { place, datePart: m[1] };
  }
  const idx = v.indexOf(",");
  if (idx >= 0) return { place: v.slice(0, idx).trim(), datePart: v.slice(idx + 1).trim() };
  // Tanpa pola tanggal: bila ada angka, anggap seluruhnya tanggal (gagal baca →
  // diberi issue — jangan salah tempatkan jadi tempat lahir); tanpa angka sama
  // sekali, anggap seluruhnya tempat lahir (tanggal tidak diisi).
  return /\d/.test(v) ? { place: "", datePart: v } : { place: v, datePart: "" };
}

/* ─── Pembersihan nilai ───────────────────────────────────── */

/** Placeholder jawaban kosong pada kolom teks opsional → "". */
const PLACEHOLDER = new Set(["-", "--", "0", "0.0"]);

function cleanOptional(v: string): string {
  const t = v.replace(/\s+/g, " ").trim();
  return PLACEHOLDER.has(t) ? "" : t;
}

function cleanText(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}

function digitsOnly(v: string): string {
  const t = v.trim();
  // Sel angka Excel bisa tertulis ilmiah ("3.505123456789012E15") — konversi
  // dulu, kalau tidak "E15" ikut jadi digit dan NIK salah.
  if (/^-?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(t)) {
    const n = Number(t);
    if (Number.isFinite(n)) return String(Math.trunc(Math.abs(n)));
  }
  return t.replace(/\D/g, "");
}

/** NISN: "0"/"-"/kosong → "" (bukan kunci unik). Simpan string. */
function normalizeNisn(v: string): string {
  const d = digitsOnly(v);
  return d === "0" ? "" : d;
}

/**
 * Normalisasi No. HP/WA: buang non-digit, "62…" → "0…", diawali "8" → tambah
 * "0", 0/kosong → "". Selalu string (bukan number) supaya tidak berubah ke
 * notasi ilmiah.
 */
export function normalizePhone(v: string): string {
  let d = digitsOnly(v);
  if (!d || d === "0") return "";
  if (d.startsWith("62")) d = "0" + d.slice(2);
  else if (d.startsWith("8")) d = "0" + d;
  return d;
}

/** "Laki - Laki" → "L", "Perempuan" → "P", lain → null (ERROR). */
export function normalizeGender(v: string): "L" | "P" | null {
  const t = v.toLowerCase().replace(/[\s\-_.]/g, "");
  if (!t) return null;
  if (t === "l" || t.startsWith("laki")) return "L";
  if (t === "p" || t.startsWith("perempuan")) return "P";
  return null;
}

/** YATIM/PIATU → "tidak" | "yatim" | "piatu" | "yatim_piatu"; null bila tak dikenal. */
function normalizeOrphan(v: string): string | null {
  const t = v.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.includes("yatim") && t.includes("piatu")) return "yatim_piatu";
  if (t.includes("yatim")) return "yatim";
  if (t.includes("piatu")) return "piatu";
  if (t.startsWith("tidak")) return "tidak";
  return null;
}

/** Samakan nama untuk deteksi duplikat (uppercase + rapikan spasi). */
export function normalizeNameForDup(n: string): string {
  return n.toUpperCase().replace(/\s+/g, " ").trim();
}

/**
 * Cocokkan nilai "PILIHAN PROGRAM" ke nama resmi SPMB_PROGRAMS. Form Google
 * memakai istilah lain — mis. "SMP REGULER" = program non-boarding — jadi
 * dipetakan dengan pola jenjang + kata kunci; nilai asing dipertahankan
 * apa adanya + WARNING.
 */
function matchProgram(v: string): string | null {
  const t = cleanText(v).toLowerCase();
  if (!t) return null;
  const exact = SPMB_PROGRAMS.find((p) => p.toLowerCase() === t);
  if (exact) return exact;
  const jenjang = t.startsWith("sma") ? "SMA" : t.startsWith("smp") ? "SMP" : null;
  if (!jenjang) return null;
  if (t.includes("boarding") && !t.includes("non")) return `${jenjang} Boarding`;
  if (["reguler", "regular", "full day", "non boarding", "non-boarding", "umum"].some((k) => t.includes(k))) {
    return `${jenjang} Full Day (Non Boarding)`;
  }
  return null;
}

/* ─── Susun satu baris ────────────────────────────────────── */

const OPTIONAL_TEXT_KEYS: (keyof SpmbRegistrationData)[] = [
  "nickname", "height", "weight", "language", "hobby", "ambition",
  "child_order", "siblings", "blood_type", "previous_school", "address",
  "father_education", "father_job", "father_income",
  "mother_education", "mother_job", "mother_income",
];

/** Bangun data + daftar issue dari nilai mentah SATU baris. */
function buildRow(index: number, raw: Record<string, string>): ImportRow {
  const data = createEmptySpmbRegistrationData();
  const docUrls: Record<string, string | null> = {
    kk: null, akta: null, surat_sekolah: null, ktp_ortu: null, bukti_transfer: null,
  };
  const issues: ImportIssue[] = [];
  const err = (field: string, message: string) => issues.push({ level: "error", field, message });
  const warn = (field: string, message: string) => issues.push({ level: "warning", field, message });

  // Kolom teks: rapikan + buang placeholder ("-"/"--"/"0").
  for (const key of OPTIONAL_TEXT_KEYS) data[key] = cleanOptional(raw[key] ?? "");
  data.full_name = cleanText(raw.full_name ?? "");
  data.father_name = cleanText(raw.father_name ?? "");
  data.mother_name = cleanText(raw.mother_name ?? "");
  data.email = ""; // ekspor Google Form tidak punya kolom email

  // Program: cocokkan toleran; nilai asing tetap disimpan + WARNING.
  const programRaw = cleanText(raw.program ?? "");
  const program = matchProgram(programRaw);
  data.program = program ?? programRaw;
  if (programRaw && !program) warn("program", `Program "${programRaw}" tidak dikenali — disimpan apa adanya`);

  // Jenis kelamin: kosong → ERROR juga (kolom wajib di database).
  const gender = normalizeGender(raw.gender ?? "");
  if (gender) data.gender = gender;
  else err("gender", `Jenis kelamin "${cleanText(raw.gender ?? "")}" tidak dikenali (pakai "Laki - Laki" / "Perempuan")`);

  // TTL siswa.
  const birth = splitPlaceDate(raw.birth ?? "");
  data.birth_place = cleanText(birth.place);
  if (birth.datePart) {
    const parsed = parseIndoDate(birth.datePart);
    if (!parsed) {
      data.birth_date = birth.datePart; // nilai mentah — supaya bisa diperbaiki di preview
      err("birth", `Tanggal lahir "${birth.datePart}" tidak terbaca (contoh: 24 Juli 2014 atau 24/07/2014)`);
    } else if (parsed.year < SISWA_BIRTH_YEAR_MIN || parsed.year > SISWA_BIRTH_YEAR_MAX) {
      data.birth_date = birth.datePart;
      err("birth", `Tahun lahir ${parsed.year} di luar rentang usia wajar calon siswa (${SISWA_BIRTH_YEAR_MIN}–${SISWA_BIRTH_YEAR_MAX}) — periksa nilai`);
    } else {
      data.birth_date = parsed.iso;
    }
  } else {
    // Termasuk placeholder "-"/"0" → dianggap tidak diisi (peringatan, bukan error).
    warn("birth", "Tanggal lahir tidak diisi");
  }

  // TTL orang tua: parser sama, toleransi longgar → hanya WARNING.
  for (const [key, field, label] of [
    ["father_birth", "father_birth_date", "Tanggal lahir ayah"],
    ["mother_birth", "mother_birth_date", "Tanggal lahir ibu"],
  ] as const) {
    const rawKey = cleanText(raw[key] ?? "");
    if (!rawKey || PLACEHOLDER.has(rawKey)) continue; // kosong / "-" → lewati, tanpa warning
    const sp = splitPlaceDate(rawKey);
    if (key === "father_birth") data.father_birth_place = cleanText(sp.place);
    else data.mother_birth_place = cleanText(sp.place);
    if (!sp.datePart) {
      warn(field, `${label} tidak diisi`);
      continue;
    }
    const parsed = parseIndoDate(sp.datePart);
    if (!parsed) {
      if (key === "father_birth") data.father_birth_date = sp.datePart;
      else data.mother_birth_date = sp.datePart;
      warn(field, `${label} "${sp.datePart}" tidak terbaca`);
    } else if (parsed.year < ORTU_BIRTH_YEAR_MIN || parsed.year > ORTU_BIRTH_YEAR_MAX) {
      // Tahun tak lazim → nilai mentah disimpan (jangan menebak ISO) + WARNING.
      if (key === "father_birth") data.father_birth_date = sp.datePart;
      else data.mother_birth_date = sp.datePart;
      warn(field, `${label} tahun ${parsed.year} tidak lazim untuk orang tua`);
    } else {
      if (key === "father_birth") data.father_birth_date = parsed.iso;
      else data.mother_birth_date = parsed.iso;
    }
  }

  // NISN / NIK. Nilai berisi huruf (mis. tercampur nama sekolah) → kosongkan,
  // jangan sampai jadi digit palsu (mis. "SD MUHAMMADIYAH 01" → "0101").
  const nisnText = cleanText(raw.nisn ?? "");
  const nisnHasLetters = /[A-Za-z]/.test(nisnText);
  data.nisn = nisnHasLetters ? "" : normalizeNisn(raw.nisn ?? "");
  const nisnRaw = digitsOnly(raw.nisn ?? "");
  if (nisnHasLetters) {
    warn("nisn", `NISN "${nisnText}" berisi teks, bukan 10 digit angka — kosongkan atau isi ulang`);
  } else if (nisnRaw && nisnRaw !== "0" && data.nisn.length !== 10) {
    warn("nisn", `NISN "${nisnText}" bukan 10 digit (${data.nisn.length} digit)`);
  }
  const nikText = cleanText(raw.nik ?? "");
  const nikIsSci = /^-?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(nikText); // sel angka Excel ("3.5E15")
  const nikDigits = digitsOnly(raw.nik ?? "");
  if (/[A-Za-z]/.test(nikText) && !nikIsSci) {
    data.nik = "";
    warn("nik", `NIK "${nikText}" berisi teks, bukan angka — kosongkan atau isi ulang`);
  } else {
    data.nik = nikDigits;
    if (!nikDigits) warn("nik", "NIK kosong — duplikat hanya bisa dicek lewat nama");
    else if (nikDigits.length !== 16) warn("nik", `NIK "${nikText}" bukan 16 digit (${nikDigits.length} digit)`);
  }

  // No. HP/WA. "0"/"-" = tidak diisi (tanpa warning); huruf → warning.
  const phoneText = cleanText(raw.phone ?? "");
  data.phone = normalizePhone(raw.phone ?? "");
  if (phoneText && !PLACEHOLDER.has(phoneText) && !data.phone) {
    warn("phone", `No. HP "${phoneText}" tidak berisi angka valid`);
  }

  // YATIM/PIATU. Nilai kosong → biarkan default panel ("tidak").
  const orphan = normalizeOrphan(raw.orphan_status ?? "");
  if (orphan === null) {
    warn("orphan_status", `Nilai Yatim/Piatu "${cleanText(raw.orphan_status ?? "")}" tidak dikenali`);
    data.orphan_status = cleanText(raw.orphan_status ?? "");
  } else if (orphan !== "") data.orphan_status = orphan;

  // Berkas scan: kolom berisi URL → langsung dipakai (bukan path storage).
  for (const key of ["kk", "akta", "surat_sekolah", "ktp_ortu", "bukti_transfer"] as const) {
    const v = cleanText(raw[key] ?? "");
    docUrls[key] = v ? v : null;
  }

  return { index, raw, data, docUrls, issues, duplicateOf: null, include: false };
}

/* ─── Duplikat ────────────────────────────────────────────── */

type ExistingRow = { full_name: string; documents: Record<string, string | null> | null };

function rowDupKey(row: ImportRow): string {
  return row.data.nik ? `N:${row.data.nik}` : `N:${normalizeNameForDup(row.data.full_name)}`;
}

/**
 * Tandai baris duplikat: (a) terhadap baris lain dalam file (NIK, fallback
 * nama ternormalisasi), (b) terhadap data di database. Pemanggil mengatur
 * ulang `include` sesuai status.
 */
export function detectDuplicates(rows: ImportRow[], existing: ExistingRow[]): void {
  const dbNik = new Set<string>();
  const dbName = new Set<string>();
  for (const r of existing) {
    const nik = digitsOnly(r.documents?.nik ?? "");
    if (nik && nik !== "0") dbNik.add(nik);
    const name = normalizeNameForDup(r.full_name);
    if (name) dbName.add(name);
  }

  const seen = new Map<string, number>();
  for (const row of rows) {
    row.duplicateOf = null;
    const key = rowDupKey(row);
    const first = seen.get(key);
    if (first !== undefined) {
      row.duplicateOf = `baris ${first}`;
    } else {
      seen.set(key, row.index);
      // Cek database hanya untuk baris pertama tiap kunci.
      if (row.data.nik && dbNik.has(row.data.nik)) row.duplicateOf = "database (NIK sama)";
      else if (!row.data.nik && dbName.has(normalizeNameForDup(row.data.full_name))) {
        row.duplicateOf = "database (nama sama)";
      }
    }
  }
}

/* ─── Status & payload ────────────────────────────────────── */

export function rowStatus(row: ImportRow): ImportRowStatus {
  if (row.issues.some((i) => i.level === "error")) return "error";
  if (row.duplicateOf) return "duplicate";
  if (row.issues.length > 0) return "warning";
  return "ready";
}

export const STATUS_LABEL: Record<ImportRowStatus, string> = {
  ready: "Siap",
  warning: "Peringatan",
  duplicate: "Duplikat",
  error: "Error",
};

/** Edit nilai mentah satu field → baris dibangun ulang (validasi jalan lagi). */
export function updateRowField(row: ImportRow, field: RawKey, value: string): ImportRow {
  return buildRow(row.index, { ...row.raw, [field]: value });
}

/**
 * Susun payload insert dari baris yang sudah lolos (panggil hanya untuk baris
 * yang dicentang). Status default "pending", tanpa gelombang — sama seperti
 * default panel "Tambah Pendaftar".
 */
export function buildImportPayload(row: ImportRow): AdminCreateRegistrationInput {
  const documents = buildSpmbDocuments(row.data, row.docUrls as SpmbDocumentPaths);
  documents.input_source = "import";
  return {
    full_name: row.data.full_name,
    birth_place: row.data.birth_place,
    birth_date: spmbDatePickerToIso(row.data.birth_date) || null,
    gender: row.data.gender === "P" ? "P" : "L",
    address: row.data.address,
    phone: row.data.phone,
    email: "",
    parent_name: spmbParentName(row.data),
    parent_occupation: row.data.father_job,
    previous_school: row.data.previous_school,
    registration_path: "reguler",
    status: "pending",
    wave_id: null,
    admin_notes: "Impor massal dari ekspor Google Form",
    documents,
  };
}

/* ─── Entry point ─────────────────────────────────────────── */

/**
 * Proses seluruh tabel hasil pembacaan file: petakan header, skip baris tanpa
 * nama, bangun tiap baris, deteksi duplikat, set default centang.
 */
export function buildImportResult(table: SheetTable, existing: ExistingRow[]): ImportResult {
  const { map, ignored, unmapped } = mapHeaders(table.headers);

  const rawOf = (cells: string[]): Record<string, string> => {
    const raw: Record<string, string> = {};
    for (const [key, col] of Object.entries(map)) raw[key] = cells[col] ?? "";
    return raw;
  };

  const rows: ImportRow[] = [];
  let skipped = 0;
  table.rows.forEach((cells, i) => {
    const raw = rawOf(cells);
    if (!cleanText(raw.full_name ?? "")) { skipped++; return; } // baris "INDENT" dsb.
    rows.push(buildRow(i + 2, raw)); // +2: baris 1 header, indeks mulai 0
  });

  detectDuplicates(rows, existing);
  for (const row of rows) {
    const status = rowStatus(row);
    row.include = status === "ready" || status === "warning";
  }

  return { rows, skipped, ignored, unmapped };
}
