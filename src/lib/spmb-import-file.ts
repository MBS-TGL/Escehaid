/**
 * Pembaca file ekspor Google Form (.xlsx / .csv) untuk fitur "Import Pendaftar"
 * (/admin/admission). Tugasnya hanya mengubah file jadi matriks string[][]
 * (baris × kolom) — logika pemetaan kolom, pembersihan, dan validasi ada di
 * spmb-import.ts.
 *
 * Kenapa parser sendiri (tanpa SheetJS / read-excel-file): file .xlsx pada
 * dasarnya adalah zip berisi XML. Library berat (SheetJS ±7,5 MB) hanya
 * dipakai untuk membaca XML sederhana itu. Di sini kita pakai fflate (±8 KB,
 * unzip saja) lalu regex atas XML-nya — cukup untuk file ekspor Google Form
 * yang selalu memakai sharedStrings dan sel tunggal standar. CSV diparse
 * sendiri (dukung tanda kutip + pemisah , atau ;).
 */

import { unzipSync, strFromU8 } from "fflate";

/** Hasil pembacaan: header baris 1 + baris data di bawahnya. */
export type SheetTable = {
  /** Nama sheet yang dibaca ("Form Responses 1" / "CSV"). */
  sheetName: string;
  headers: string[];
  rows: string[][];
};

/** Sheet yang dibaca dari .xlsx — sheet lain (mis. "SMA") diabaikan. */
const TARGET_SHEET = "form responses 1";

/** Decode entity XML standar (&amp; &lt; &#nnn; &#xhh;). */
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/** Huruf kolom Excel ("A", "AB", …) → indeks 0-based. */
function colIndex(cellRef: string): number {
  const letters = cellRef.match(/^[A-Z]+/)?.[0] ?? "";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Angka dari XML bisa tertulis ilmiah ("8.2257841419E10" — HP yang tersimpan
 * sebagai angka). Konversi ke digit polos; pecahan dilepas tanpa menebak.
 */
function plainNumber(v: string): string {
  if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v)) return v;
  if (!/[.eE]/.test(v)) return v;
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return Number.isInteger(n) ? n.toFixed(0) : String(n);
}

/* ─── CSV ─────────────────────────────────────────────────── */

/** Deteksi pemisah kolom dari baris pertama (Google Form memakai , atau ;). */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",";
}

/** Parser CSV ringan: dukung tanda kutip ganda ("") dan baris di dalam kutip. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  const d = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === d) { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/* ─── XLSX ────────────────────────────────────────────────── */

/** Cari <sheet name="…" r:id="…"/> dari workbook.xml. */
function listSheets(workbookXml: string): { name: string; rid: string }[] {
  const out: { name: string; rid: string }[] = [];
  for (const tag of workbookXml.match(/<sheet\b[^>]*\/?>/g) ?? []) {
    const name = tag.match(/name="([^"]*)"/)?.[1] ?? "";
    const rid = tag.match(/r:id="([^"]*)"/)?.[1] ?? "";
    if (name && rid) out.push({ name: decodeXml(name), rid });
  }
  return out;
}

/** Ambil isi semua <t> di dalam tiap <si> (sharedStrings; rich text di-join). */
function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    const parts = si.match(/<t\b[^>]*>[\s\S]*?<\/t>/g) ?? [];
    out.push(parts.map((p) => decodeXml(p.replace(/^<t\b[^>]*>/, "").replace(/<\/t>$/, ""))).join(""));
  }
  return out;
}

/** Ubah XML worksheet jadi baris×kolom (dipakai bersama fungsi lain). */
function parseSheetData(sheetXml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowTag of sheetXml.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const cells = new Map<number, string>();
    let seq = 0; // fallback posisional bila <c> tanpa atribut r
    // [^>]* rakus akan menelan "/" sehingga alternatif \/ > tak pernah menang;
    // oleh karena itu pakai [^>/]* agar ">" penutup <c .../> dikenali sebagai
    // self-close, bukan sebagai pembuka <c ...> berikutnya.
    for (const cellTag of rowTag.match(/<c\b[^>/]*(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
      const ref = cellRef(cellTag);
      // Sel hampir selalu punya r="A1"; bila tidak ada (file buatan non-Google),
      // anggap berurutan tanpa lubang agar kolom tidak bergeser.
      const col = ref !== null ? colIndex(ref) : seq;
      seq = col + 1;
      const type = cellTag.match(/\bt="([^"]*)"/)?.[1] ?? "";
      let value = "";
      if (type === "inlineStr") {
        value = (cellTag.match(/<t\b[^>]*>[\s\S]*?<\/t>/g) ?? [])
          .map((t) => decodeXml(t.replace(/^<t\b[^>]*>/, "").replace(/<\/t>$/, "")))
          .join("");
      } else {
        const v = cellTag.match(/<v>([\s\S]*?)<\/v>/)?.[1]?.trim() ?? "";
        // Sel kosong bertype shared-string (tanpa <v>) → "" apa adanya. Tanpa
        // guard ini, Number("") = 0 dan shared[0] (biasanya judul "Timestamp")
        // ikut terisi ke kolom yang seharusnya kosong.
        if (type === "s") value = v === "" ? "" : (shared[Number(v)] ?? "");
        else if (type === "str") value = decodeXml(v);
        else value = plainNumber(decodeXml(v)); // angka / tanpa t
      }
      cells.set(col, value);
    }
    const max = cells.size > 0 ? Math.max(...cells.keys()) : -1;
    const row: string[] = [];
    for (let i = 0; i <= max; i++) row.push(cells.get(i) ?? "");
    rows.push(row);
  }
  return rows;
}

function cellRef(cellTag: string): string | null {
  const m = cellTag.match(/\br="([A-Z]+\d+)"/);
  return m ? m[1] : null;
}

function readXlsx(files: Record<string, Uint8Array>): SheetTable {
  const workbook = files["xl/workbook.xml"];
  if (!workbook) throw new Error("File .xlsx tidak berisi workbook.xml — file rusak?");
  const sheets = listSheets(strFromU8(workbook));
  const target = sheets.find((s) => s.name.trim().toLowerCase() === TARGET_SHEET);
  if (!target) {
    const names = sheets.map((s) => `"${s.name}"`).join(", ") || "(tidak ada)";
    throw new Error(
      `Sheet "Form Responses 1" tidak ditemukan. Sheet yang tersedia: ${names}. Ekspor ulang dari Google Form tanpa mengganti nama sheet.`
    );
  }

  // Petakan r:id sheet → path file worksheet (via rels workbook).
  const relsXml = files["xl/_rels/workbook.xml.rels"] ? strFromU8(files["xl/_rels/workbook.xml.rels"]) : "";
  let targetPath = "";
  for (const tag of relsXml.match(/<Relationship\b[^>]*\/?>/g) ?? []) {
    if (tag.match(/\bId="([^"]*)"/)?.[1] !== target.rid) continue;
    const t = tag.match(/\bTarget="([^"]*)"/)?.[1] ?? "";
    targetPath = t.startsWith("/") ? t.slice(1) : `xl/${t}`;
    break;
  }
  if (!targetPath || !files[targetPath]) {
    throw new Error(`Isi sheet "${target.name}" tidak ditemukan di dalam file.`);
  }

  const shared = files["xl/sharedStrings.xml"] ? parseSharedStrings(strFromU8(files["xl/sharedStrings.xml"])) : [];
  const rows = parseSheetData(strFromU8(files[targetPath]), shared);
  const headers = (rows[0] ?? []).map((h) => h.trim());
  return { sheetName: target.name, headers, rows: rows.slice(1) };
}

/* ─── Entry point ─────────────────────────────────────────── */

/** Baca file .xlsx / .csv ekspor Google Form jadi tabel string. */
export async function readSpreadsheetFile(file: File): Promise<SheetTable> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const text = (await file.text()).replace(/^\uFEFF/, ""); // buang BOM
    const rows = parseCsv(text);
    return { sheetName: "CSV", headers: (rows[0] ?? []).map((h) => h.trim()), rows: rows.slice(1) };
  }
  if (name.endsWith(".xlsx")) {
    return readXlsx(unzipSync(new Uint8Array(await file.arrayBuffer())));
  }
  throw new Error("Format file tidak didukung — gunakan .xlsx atau .csv hasil ekspor Google Form.");
}
