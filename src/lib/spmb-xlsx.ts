/**
 * Penulis .xlsx minimal memakai `fflate` (sudah ada sebagai dependensi —
 * repo sengaja menghindari SheetJS, lihat spmb-import-file.ts).
 *
 * Memakai inline strings (`t="inlineStr"`) sehingga tidak perlu shared
 * strings; cukup untuk ekspor data (teks/angka sederhana). Bukan untuk
 * file dengan formula, gambar, atau styling kompleks.
 */
import { strToU8, zipSync } from "fflate";

type XlsxCell = string | number | null | undefined;
type XlsxGrid = XlsxCell[][];

export interface XlsxSheet {
  /** Nama sheet — karakter []:*?/\ dibuang. */
  name: string;
  /** Baris pertama = header (dicetak tebal). */
  rows: XlsxGrid;
}

/** Escape teks untuk XML; buang control char ilegal kecuali \t \n \r. */
function esc(value: string): string {
  return value
    .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colLetter(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function sheetXml(rows: XlsxGrid): string {
  const colCount = rows.reduce((m, r) => Math.max(m, r?.length ?? 0), 0);
  const widths: string[] = [];
  for (let c = 0; c < colCount; c += 1) {
    let max = 10;
    for (const r of rows) {
      const v = r[c];
      const len = v === null || v === undefined ? 0 : String(v).length;
      if (len > max) max = len;
    }
    widths.push(`<col min="${c + 1}" max="${c + 1}" width="${Math.min(50, max + 2)}" customWidth="1"/>`);
  }

  const body = rows
    .map((r, ri) => {
      const cells = r
        .map((v, ci) => {
          const ref = `${colLetter(ci)}${ri + 1}`;
          if (v === null || v === undefined || v === "") return `<c r="${ref}"/>`;
          const style = ri === 0 ? ` s="1"` : "";
          return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>` +
    `<cols>${widths.join("")}</cols>` +
    `<sheetData>${body}</sheetData></worksheet>`
  );
}

/** Bangun berkas .xlsx dari beberapa sheet. */
export function buildXlsx(sheets: XlsxSheet[]): Uint8Array {
  const safe = sheets.map((s, i) => ({
    name: s.name.replace(/[[\]:*?/\\]/g, "").slice(0, 31) || `Sheet${i + 1}`,
    rows: s.rows,
  }));

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        safe.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets>${safe.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
        `</workbook>`
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        safe.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
        `</Relationships>`
    ),
    "xl/styles.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>` +
        `<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        `<fills count="1"><fill><patternFill patternType="none"/></fill></fills>` +
        `<borders count="1"><border/></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
        `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
        `</styleSheet>`
    ),
  };
  safe.forEach((s, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s.rows));
  });

  return zipSync(files, { level: 6 });
}
