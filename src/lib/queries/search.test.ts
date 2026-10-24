import { describe, expect, it } from "vitest";
import {
  groupSearchResults,
  scoreSearchItem,
  searchStaticPages,
  sortGroupsByRelevance,
  type SearchItem,
} from "./search";
import { buildSearchOr, sanitizeSearchTerm, tokenizeSearch } from "./shared";

const item = (
  over: Partial<SearchItem> & Pick<SearchItem, "id" | "kind" | "title">
): SearchItem => ({
  href: "/contoh",
  date: null,
  excerpt: null,
  ...over,
});

describe("groupSearchResults", () => {
  it("menempatkan grup Halaman pertama bila ada hasilnya", () => {
    const groups = groupSearchResults([
      item({ id: "b1", kind: "berita", title: "Berita" }),
      { id: "/admission", kind: "halaman", title: "SPMB", href: "/admission", date: null, excerpt: null },
    ]);

    expect(groups.map((g) => g.kind)).toEqual(["halaman", "berita"]);
    expect(groups[0].label).toBe("Halaman");
    expect(groups[0].items[0].href).toBe("/admission");
  });

  it("mengelompokkan semua jenis (termasuk ekskul) sesuai urutan tetap", () => {
    const groups = groupSearchResults([
      item({ id: "p1", kind: "prestasi", title: "Lomba" }),
      item({ id: "b1", kind: "berita", title: "Berita" }),
      item({ id: "e1", kind: "ekskul", title: "Tapak Suci" }),
      item({ id: "k1", kind: "kegiatan", title: "Kegiatan" }),
      item({ id: "a1", kind: "artikel", title: "Artikel" }),
    ]);

    expect(groups.map((g) => g.kind)).toEqual([
      "berita",
      "artikel",
      "kegiatan",
      "prestasi",
      "ekskul",
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Berita",
      "Artikel",
      "Kegiatan",
      "Prestasi",
      "Ekstrakurikuler",
    ]);
  });

  it("membuang kelompok kosong dan mengurutkan tiap kelompok terbaru dulu", () => {
    const groups = groupSearchResults([
      item({ id: "b1", kind: "berita", title: "lama", date: "2024-01-01" }),
      item({ id: "b2", kind: "berita", title: "baru", date: "2025-06-01" }),
      item({ id: "e1", kind: "ekskul", title: "Tapak Suci" }),
    ]);

    expect(groups.map((g) => g.kind)).toEqual(["berita", "ekskul"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["b2", "b1"]);
    // Ekskul tanpa tanggal tetap tampil dengan label Ekstrakurikuler.
    expect(groups[1].items[0].title).toBe("Tapak Suci");
  });

  it("mengurutkan kesesuaian skor dulu — item skor tinggi menang lalu tanggal", () => {
    const groups = groupSearchResults([
      item({ id: "b1", kind: "berita", title: "ddd", date: "2025-12-31", score: 0.5 }),
      item({ id: "b2", kind: "berita", title: "ccc", date: "2024-01-01", score: 1.5 }),
      item({ id: "b3", kind: "berita", title: "bbb", date: "2020-01-01" }),
    ]);

    // b2 (skor tertinggi) → b1 (skor sama w/ b3 tapi tanggal baru) → b3
    expect(groups[0].items.map((i) => i.id)).toEqual(["b2", "b1", "b3"]);
  });
});

describe("sortGroupsByRelevance", () => {
  it("mengurutkan grup menurut skor tertinggi anggotanya", () => {
    const groups = groupSearchResults([
      item({ id: "n1", kind: "berita", title: "a", score: 0.4 }),
      item({ id: "a1", kind: "artikel", title: "b", score: 1.5 }),
      item({ id: "k1", kind: "kegiatan", title: "c", score: 0.9 }),
    ]);

    expect(sortGroupsByRelevance(groups).map((g) => g.kind)).toEqual([
      "artikel",
      "kegiatan",
      "berita",
    ]);
  });

  it("halaman tetap di atas bila skornya setara grup terbaik, turun bila tidak", () => {
    const high = groupSearchResults([
      item({ id: "/admission", kind: "halaman", title: "SPMB", score: 1 }),
      item({ id: "n1", kind: "berita", title: "a", score: 0.5 }),
    ]);
    expect(sortGroupsByRelevance(high)[0].kind).toBe("halaman");

    const low = groupSearchResults([
      item({ id: "/galeri", kind: "halaman", title: "Galeri", score: 0.2 }),
      item({ id: "n1", kind: "berita", title: "a", score: 1.2 }),
    ]);
    expect(sortGroupsByRelevance(low)[0].kind).toBe("berita");
  });

  it("stabil saat skor sama (urutan asli dipertahankan) & tak mengubah input", () => {
    const groups = groupSearchResults([
      item({ id: "n1", kind: "berita", title: "a", score: 1 }),
      item({ id: "a1", kind: "artikel", title: "b", score: 1 }),
    ]);
    const before = groups.map((g) => g.kind);
    const sorted = sortGroupsByRelevance(groups);
    expect(sorted.map((g) => g.kind)).toEqual(before);
    expect(groups.map((g) => g.kind)).toEqual(before); // input tidak dimutasi
  });
});

describe("scoreSearchItem", () => {
  it("skor rendah bila token hanya mengenai cuplikan, tinggi bila judul", () => {
    const tokens = ["ustadzah", "tahfidz"];
    const excerptOnly = item({ id: "1", kind: "berita", title: "Judul Bebas", excerpt: "ustadzah mengajar tahfidz" });
    const titleOnly = item({ id: "2", kind: "berita", title: "ustadzah tahfidz" });

    const scoreA = scoreSearchItem(excerptOnly, tokens);
    const scoreB = scoreSearchItem(titleOnly, tokens);
    // Cuplikan: 2/2 token + 0 bonus; judul: 2/2 token + bonus 0.5 → judul menang.
    expect(scoreA).toBeCloseTo(1);
    expect(scoreB).toBeCloseTo(1.5);
    expect(scoreB).toBeGreaterThan(scoreA);
  });

  it("token hafal tetap menyumbang bonus bila judul mengandungnya", () => {
    const tokens = ["spmb", "khayal"];
    const oneHit = item({ id: "1", kind: "berita", title: "jadwal spmb" });
    // 1/2 token kena + 0,5 × 1/2 bonus judul = 0,75
    expect(scoreSearchItem(oneHit, tokens)).toBeCloseTo(0.75);
  });
});

describe("tokenizeSearch", () => {
  it("memecah multi-token, membuang duplikat, maks 4 token", () => {
    expect(tokenizeSearch("ustadzah  tahfidz spmb")).toEqual(["ustadzah", "tahfidz", "spmb"]);
    expect(tokenizeSearch("a a b c d e")).toEqual(["a", "b", "c", "d"]);
  });

  it("menjalankan sanitasi PostgREST + batas 40 karakter per token", () => {
    expect(tokenizeSearch("a,b(c)%")).toEqual(["a", "b", "c"]);
    const long = "x".repeat(50);
    expect(tokenizeSearch(`${long} y`)[0]).toHaveLength(40);
  });
});

describe("buildSearchOr", () => {
  it("menyilang token × kolom — OR di semua klausa", () => {
    expect(buildSearchOr(["ustadzah"], ["title", "content"])).toBe(
      "title.ilike.%ustadzah%,content.ilike.%ustadzah%"
    );
    expect(buildSearchOr(["a", "b"], ["title"])).toBe("title.ilike.%a%,title.ilike.%b%");
  });

  it("tanpa token / tanpa kolom → kosong (pemanggil dilarang kirim .or(\"\"))", () => {
    expect(buildSearchOr([], ["title"])).toBe("");
    expect(buildSearchOr(["a"], [])).toBe("");
  });
});

describe("searchStaticPages", () => {
  it('menemukan halaman SPMB untuk "spmb" maupun alias "pendaftaran" (tanpa beda kapital)', () => {
    for (const term of ["spmb", "SPMB", "pendaftaran", "biaya"]) {
      const items = searchStaticPages(term);
      expect(items).toEqual([
        expect.objectContaining({ kind: "halaman", title: "SPMB", href: "/admission" }),
      ]);
    }
  });

  it("tidak mencocokkan istilah tak berhubungan maupun istilah yang habis sanitasi", () => {
    expect(searchStaticPages("tapak suci")).toEqual([]);
    expect(searchStaticPages("koperasi")).toEqual([]);
    expect(searchStaticPages(",(")).toEqual([]);
  });
});

describe("sanitizeSearchTerm", () => {
  it('menjaga frasa dua kata (mis. "tapak suci") apa adanya', () => {
    expect(sanitizeSearchTerm("tapak suci")).toBe("tapak suci");
  });

  it("mengganti karakter berbahaya sintaks PostgREST dengan spasi", () => {
    expect(sanitizeSearchTerm('a,b(c)%_\'"\\[')).toBe("a b c");
  });
});
