import { describe, expect, it } from "vitest";
import { SUGGEST_DICTIONARY, formatRelativeDate } from "./SearchMeta";

const NOW = new Date("2026-10-24T12:00:00Z").getTime();
const iso = (ms: number) => new Date(NOW - ms).toISOString();

describe("formatRelativeDate", () => {
  it("memakai satuan yang sesuai jarak waktu", () => {
    expect(formatRelativeDate(iso(10_000), NOW)).toBe("baru saja");
    expect(formatRelativeDate(iso(5 * 60_000), NOW)).toBe("5 menit lalu");
    expect(formatRelativeDate(iso(3 * 3_600_000), NOW)).toBe("3 jam lalu");
    expect(formatRelativeDate(iso(4 * 86_400_000), NOW)).toBe("4 hari lalu");
    expect(formatRelativeDate(iso(2 * 7 * 86_400_000), NOW)).toBe("2 minggu lalu");
    expect(formatRelativeDate(iso(3 * 30 * 86_400_000), NOW)).toBe("3 bulan lalu");
  });

  it("di atas setahun → tanggal absolut", () => {
    const result = formatRelativeDate(iso(400 * 86_400_000), NOW);
    expect(result).toMatch(/\d{4}/);
    expect(result).not.toContain("lalu");
  });

  it("null / string rusak → string kosong; masa depan → absolut", () => {
    expect(formatRelativeDate(null, NOW)).toBe("");
    expect(formatRelativeDate("bukan-tanggal", NOW)).toBe("");
    expect(formatRelativeDate(new Date(NOW + 86_400_000).toISOString(), NOW)).toMatch(/\d{4}/);
  });
});

describe("SUGGEST_DICTIONARY", () => {
  it("tidak berisi duplikat & semua huruf kecil", () => {
    expect(new Set(SUGGEST_DICTIONARY).size).toBe(SUGGEST_DICTIONARY.length);
    for (const word of SUGGEST_DICTIONARY) expect(word).toBe(word.toLowerCase());
  });
});
