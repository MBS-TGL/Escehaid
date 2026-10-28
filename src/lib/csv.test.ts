import { describe, it, expect } from "vitest";
import { buildCsv, csvCell } from "@/lib/csv";

describe("csvCell", () => {
  it("mengapit nilai dan menggandakan tanda kutip", () => {
    expect(csvCell('Nama "Panggilan"')).toBe('"Nama ""Panggilan"""');
  });

  it("menetralkan formula (CSV injection)", () => {
    expect(csvCell("=HYPERLINK(evil)")).toBe('"\'=HYPERLINK(evil)"');
    expect(csvCell("+62 812")).toBe('"\'+62 812"');
    expect(csvCell("-1")).toBe('"\'-1"');
    expect(csvCell("@user")).toBe('"\'@user"');
  });

  it("forceText selalu memberi awalan kutip", () => {
    expect(csvCell("user@mbs.id", true)).toBe('"\'user@mbs.id"');
  });

  it("null/undefined menjadi sel kosong", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
});

describe("buildCsv", () => {
  it("menyusun header + baris dengan pemisah ; dan CRLF", () => {
    expect(buildCsv(["Nama", "Email"], [["A", "a@x.id"]])).toBe(
      '"Nama";"Email"\r\n"A";"a@x.id"'
    );
  });

  it("mendukung pemisah lain", () => {
    expect(buildCsv(["A", "B"], [["1", "2"]], ",")).toBe('"A","B"\r\n"1","2"');
  });
});
