/**
 * Test fitur Import Pendaftar: pembaca .xlsx/.csv (spmb-import-file.ts) dan
 * pemetaan kolom (spmb-import.ts).
 *
 * Fokus regresi:
 * - Sel kosong TIDAK boleh menggeser kolom (parser berbasis referensi sel
 *   r="A1", sel tengah yang hilang tetap dilubangi "").
 * - Angka ilmiah Excel ("8.2E10") → digit polos.
 * - Pemetaan header tidak "mencuri" kolom lain: "Alamat email" (kolom bawaan
 *   Google Form) ≠ Alamat; "No. HP/WA Ayah" ≠ No. HP siswa; "Nama Lengkap
 *   Ayah" ≠ nama siswa; "Tempat Lahir Ibu" ≠ TTL siswa; "Status Nikah" ≠ NIK.
 */

import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readSpreadsheetFile, parseCsv } from "./spmb-import-file";
import { buildImportResult, buildImportPayload, updateRowField } from "./spmb-import";

/** Rangkai .xlsx minimal (regex-parser cukup dengan bagian ini saja). */
function makeXlsx(rowsXml: string, shared: string[]): Uint8Array {
  const sst = shared
    .map((s) => `<si><t>${s.replace(/&/g, "&")}</t></si>`)
    .join("");
  return zipSync({
    "xl/workbook.xml": strToU8(
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="Form Responses 1" sheetId="1" r:id="rId1"/></sheets></workbook>`
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`
    ),
    "xl/sharedStrings.xml": strToU8(
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sst}</sst>`
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<sheetData>${rowsXml}</sheetData></worksheet>`
    ),
  });
}

async function readXlsx(rowsXml: string, shared: string[]) {
  const bytes = makeXlsx(rowsXml, shared);
  // Uint8Array<ArrayBufferLike> → BlobPart butuh cast di konfigurasi TS ini.
  const file = new File([bytes as BlobPart], "uji.xlsx");
  // jsdom belum menyediakan File.arrayBuffer — tambahkan dari bytes mentah.
  if (typeof file.arrayBuffer !== "function") {
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(bytes.slice().buffer),
    });
  }
  return readSpreadsheetFile(file);
}

describe("pembaca .xlsx", () => {
  it("sel kosong tidak menggeser kolom (baris sparse diberi lubang '')", async () => {
    // Header: A=Nama Lengkap, B=No. HP/WA, C=Kota. Baris data TANPA sel B —
    // pemetaan per referensi sel harus tetap menaruh "Kota" di kolom 3.
    const table = await readXlsx(
      `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>` +
        `<row r="2"><c r="A2" t="s"><v>3</v></c><c r="C2"><v>8.2257841419E10</v></c></row>`,
      ["Nama Lengkap", "No. HP/WA", "Kota", "Budi Santoso"]
    );
    expect(table.headers).toEqual(["Nama Lengkap", "No. HP/WA", "Kota"]);
    expect(table.rows[0]).toEqual(["Budi Santoso", "", "82257841419"]);
  });

  it("sel tanpa atribut r dibaca posisional (file non-Google), tidak hilang", async () => {
    const table = await readXlsx(
      `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>` +
        `<row r="2"><c t="s"><v>1</v></c><c t="inlineStr"><is><t>0812</t></is></c></row>`,
      ["Nama Lengkap", "No. HP/WA"]
    );
    expect(table.rows[0]).toEqual(["No. HP/WA", "0812"]);
  });

  it("sel kosong bertype s tidak menarik sharedStrings[0] (regresi kolom merosot)", async () => {
    // Sel B2 adalah "<c r=\"B2\" t=\"s\"/>" — tipe shared tapi tanpa <v>.
    // Dulu: shared[Number("")] = shared[0] = "Nama Lengkap" → kolom B terisi
    // judul kolom lain. Sekarang harus tetap "".
    const table = await readXlsx(
      `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>` +
        `<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" t="s"/><c r="C2" t="s"><v>4</v></c></row>`,
      ["Timestamp", "NISN", "Jenis Kelamin", "Budi Santoso", "L"]
    );
    expect(table.headers).toEqual(["Timestamp", "NISN", "Jenis Kelamin"]);
    expect(table.rows[0]).toEqual(["Budi Santoso", "", "L"]);
  });

  it("angka ilmiah menjadi digit polos, bukan berisi 'E10'", async () => {
    const table = await readXlsx(
      `<row r="1"><c r="A1" t="s"><v>0</v></c></row>` +
        `<row r="2"><c r="A2"><v>3.505123456789012E15</v></c></row>`,
      ["NIK"]
    );
    expect(table.rows[0][0]).toBe("3505123456789012");
  });
});

describe("parseCsv", () => {
  it("koma di dalam tanda kutip tidak memecah kolom", () => {
    expect(parseCsv('Nama,"Jl. Melati, No. 4",0812\n', ",")).toEqual([
      ["Nama", "Jl. Melati, No. 4", "0812"],
    ]);
  });
});

describe("pemetaan header tidak mencuri kolom lain", () => {
  const headers = [
    "Timestamp",                    // 0 — metadata, diabaikan
    "Alamat email",                 // 1 — kolom bawaan Google Form → email
    "Nama Lengkap",                 // 2 — nama siswa
    "Nama Lengkap Ayah",            // 3 — BUKAN nama siswa
    "Alamat",                       // 4 — alamat siswa
    "Tempat, Tanggal Lahir",        // 5 — TTL siswa
    "Tempat, Tanggal Lahir Ayah",   // 6 — TTL ayah
    "Tempat Lahir Ibu",             // 7 — TTL ibu (tanpa tanggal)
    "No. HP/WA",                    // 8 — HP siswa
    "No. WhatsApp Ayah",            // 9 — tanpa padanan, BUKAN HP siswa
    "Jenis Kelamin",                // 10
    "Status Nikah",                 // 11 — BUKAN NIK
    "NISN",                         // 12
  ];

  function buildRow() {
    const table = {
      sheetName: "Form Responses 1",
      headers,
      rows: [
        [
          "01/10/2026 10:00:00",     // Timestamp
          "ortu@gmail.com",          // Alamat email
          "Budi Santoso",            // Nama Lengkap
          "Bapak Budi Santoso",      // Nama Lengkap Ayah
          "Jl. Melati No. 4, Jember",// Alamat
          "Jember, 24 Juli 2014",    // TTL siswa
          "Jember, 1 Januari 1985",  // TTL ayah
          "Jember",                  // Tempat Lahir Ibu
          "081234567890",            // No. HP/WA
          "081299988877",            // No. WhatsApp Ayah
          "Laki - Laki",             // Jenis Kelamin
          "Kawin",                   // Status Nikah
          "1234567890",              // NISN
        ],
      ],
    };
    return buildImportResult(table, []);
  }

  it("field terisi dari kolom yang benar", () => {
    const { rows } = buildRow();
    const d = rows[0].data;
    expect(d.email).toBe("ortu@gmail.com");
    expect(d.full_name).toBe("Budi Santoso");
    expect(d.father_name).toBe("Bapak Budi Santoso");
    expect(d.address).toBe("Jl. Melati No. 4, Jember");
    expect(d.birth_place).toBe("Jember");
    expect(d.birth_date).toBe("2014-07-24");
    expect(d.father_birth_place).toBe("Jember");
    expect(d.father_birth_date).toBe("1985-01-01");
    expect(d.mother_birth_place).toBe("Jember");
    expect(d.phone).toBe("081234567890");
    expect(d.gender).toBe("L");
    expect(d.nisn).toBe("1234567890");
  });

  it("kolom orang tua / metadata masuk unmapped, bukan field siswa", () => {
    const { unmapped, ignored, mapping } = buildRow();
    expect(unmapped).toContain("No. WhatsApp Ayah");
    expect(unmapped).toContain("Status Nikah");
    expect(ignored).toContain("Timestamp");
    const byKey = Object.fromEntries(mapping.map((m) => [m.key, m.header]));
    expect(byKey.email).toBe("Alamat email");
    expect(byKey.full_name).toBe("Nama Lengkap");
    expect(byKey.father_name).toBe("Nama Lengkap Ayah");
    expect(byKey.address).toBe("Alamat");
    expect(byKey.birth).toBe("Tempat, Tanggal Lahir");
    expect(byKey.father_birth).toBe("Tempat, Tanggal Lahir Ayah");
    expect(byKey.mother_birth).toBe("Tempat Lahir Ibu");
    expect(byKey.phone).toBe("No. HP/WA");
  });

  it("email responden ikut tersimpan lewat payload (bukan selalu kosong)", () => {
    const { rows } = buildRow();
    expect(buildImportPayload(rows[0]).email).toBe("ortu@gmail.com");
  });
});

describe("kolom JALUR → registration_path", () => {
  function hasil(jalur: string | null, header = "JALUR") {
    const headers = ["Nama Lengkap", "Jenis Kelamin", ...(jalur === null ? [] : [header]), "PILIHAN PROGRAM"];
    const row = ["Budi Santoso", "Laki - Laki", ...(jalur === null ? [] : [jalur]), "SMP BOARDING"];
    return buildImportResult({ sheetName: "Form Responses 1", headers, rows: [row] }, []);
  }

  it("header JALUR dikenali dan nilainya dipakai payload", () => {
    const { rows, mapping } = hasil("PRESTASI");
    expect(mapping.some((m) => m.key === "registration_path")).toBe(true);
    expect(rows[0].data.registration_path).toBe("prestasi");
    expect(buildImportPayload(rows[0]).registration_path).toBe("prestasi");
  });

  it("header 'PILIHAN JALUR' juga dikenali", () => {
    expect(hasil("Beasiswa", "PILIHAN JALUR").rows[0].data.registration_path).toBe("beasiswa");
  });

  it("Reguler/regular case-insensitive; program tetap terpisah dari jalur", () => {
    const { rows } = hasil("Regular");
    expect(rows[0].data.registration_path).toBe("reguler");
    expect(rows[0].data.program).toBe("SMP Boarding");
    expect(buildImportPayload(rows[0]).registration_path).toBe("reguler");
  });

  it("nilai jalur asing → warning + fallback Reguler", () => {
    const { rows } = hasil("Jalur Khusus");
    expect(rows[0].data.registration_path).toBe("reguler");
    expect(
      rows[0].issues.some((i) => i.level === "warning" && i.field === "registration_path")
    ).toBe(true);
    expect(buildImportPayload(rows[0]).registration_path).toBe("reguler");
  });

  it("tanpa kolom JALUR → Reguler tanpa warning", () => {
    const { rows } = hasil(null);
    expect(rows[0].data.registration_path).toBe("reguler");
    expect(rows[0].issues.some((i) => i.field === "registration_path")).toBe(false);
  });

  it("edit nilai JALUR di pratinjau membangun ulang baris", () => {
    const { rows } = hasil("reguler");
    const next = updateRowField(rows[0], "registration_path", "BEASISWA");
    expect(next.data.registration_path).toBe("beasiswa");
    expect(buildImportPayload(next).registration_path).toBe("beasiswa");
  });
});
