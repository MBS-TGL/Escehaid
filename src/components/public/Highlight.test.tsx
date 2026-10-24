import { describe, expect, it } from "vitest";
import { splitHighlight } from "./Highlight";

describe("splitHighlight", () => {
  it("mengenali SALAH SATU token (case-insensitive, dipotong berurutan)", () => {
    const segments = splitHighlight("Ustadzah mengajar Tahfidz", ["ustadzah", "tahfidz"]);
    expect(segments).toEqual([
      { text: "Ustadzah", matched: true },
      { text: " mengajar ", matched: false },
      { text: "Tahfidz", matched: true },
    ]);
  });

  it("tanpa token → satu segmen utuh tanpa pasaran", () => {
    expect(splitHighlight("Judul Bebas", [])).toEqual([{ text: "Judul Bebas", matched: false }]);
  });

  it("teks kosong / token kosong → [] dan segmen polos", () => {
    expect(splitHighlight("", ["spmb"])).toEqual([]);
    expect(splitHighlight("Kegiatan", ["", "  "])).toEqual([
      { text: "Kegiatan", matched: false },
    ]);
  });

  it("token beda menang saat tumpang tindih pada posisi sama", () => {
    // "spmb" & "spm" cocok mulai index 0 — token terpanjang menang.
    const segments = splitHighlight("SPMB 2026", ["spm", "spmb"]);
    expect(segments[0]).toEqual({ text: "SPMB", matched: true });
    expect(segments).toHaveLength(2);
  });

  it("karakter regex tetap diabaikan — bukan regex, aman dari error", () => {
    expect(() => splitHighlight("a(b) c*d", ["("])).not.toThrow();
    const segments = splitHighlight("a(b) c*d", ["("]);
    expect(segments).toContainEqual({ text: "(", matched: true });
  });

  it("token duplikat tidak menggandakan segmen", () => {
    expect(splitHighlight("SPMB", ["spmb", "SPMB"])).toEqual([
      { text: "SPMB", matched: true },
    ]);
  });
});
