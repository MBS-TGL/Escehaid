import { describe, expect, it } from "vitest";
import { SUGGEST_MAX, diceCoefficient, suggestCorrections } from "./search-suggest";

const DICT = ["spmb", "pendaftaran", "profil", "galeri", "prestasi", "tahfidz"];

describe("diceCoefficient", () => {
  it("identik 1, tak mirip 0, mirip sebagian di antaranya", () => {
    expect(diceCoefficient("galeri", "galeri")).toBe(1);
    expect(diceCoefficient("galeri", "zzzzzz")).toBe(0);
    const mid = diceCoefficient("ustadzhtub", "ustadzah");
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(1);
  });

  it("string kosong → 0", () => {
    expect(diceCoefficient("", "galeri")).toBe(0);
  });
});

describe("suggestCorrections", () => {
  it("typo terdekat → saran kata yang benar", () => {
    expect(suggestCorrections("galery", DICT)).toContain("galeri");
    expect(suggestCorrections("spmb", DICT)).not.toContain("spmb");
  });

  it("input yang sudah benar tidak disarankan ulang", () => {
    expect(suggestCorrections("profil", DICT)).not.toContain("profil");
  });

  it("tanpa kemiripan → []", () => {
    expect(suggestCorrections("zxqwk", DICT)).toEqual([]);
  });

  it("maksimal SUGGEST_MAX saran, urut skor menurun", () => {
    const wide = ["galeri", "galera", "galeru", "galer", "galerii"];
    const result = suggestCorrections("galeri", wide);
    expect(result.length).toBeLessThanOrEqual(SUGGEST_MAX);
  });

  it("query kosong / kamus kosong → []", () => {
    expect(suggestCorrections("", DICT)).toEqual([]);
    expect(suggestCorrections("galery", [])).toEqual([]);
  });
});
