import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { buildXlsx } from "./spmb-xlsx";

describe("buildXlsx", () => {
  it("menghasilkan zip valid dengan sheet & header tebal", () => {
    const bytes = buildXlsx([
      { name: "Pendaftar", rows: [["Nama", "NISN"], ["Ahmad", "001"], ["<Budi>&", null]] },
      { name: "Rekap", rows: [["Bulan", "Total"], ["2026-10", 12]] },
    ]);
    // Magic PK..
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    const files = unzipSync(bytes);
    expect(Object.keys(files)).toContain("xl/worksheets/sheet1.xml");
    expect(Object.keys(files)).toContain("xl/worksheets/sheet2.xml");

    const sheet1 = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(sheet1).toContain("<t xml:space=\"preserve\">Nama</t>");
    expect(sheet1).toContain("&lt;Budi&gt;&amp;");
    expect(sheet1).toContain('t="inlineStr" s="1"');

    const workbook = strFromU8(files["xl/workbook.xml"]);
    expect(workbook).toContain('name="Pendaftar"');
    expect(workbook).toContain('name="Rekap"');
  });
});
