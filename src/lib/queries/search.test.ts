import { describe, expect, it } from "vitest";
import { groupSearchResults, searchStaticPages, type SearchItem } from "./search";
import { sanitizeSearchTerm } from "./shared";

const item = (over: Partial<SearchItem> & Pick<SearchItem, "id" | "kind" | "title">): SearchItem => ({
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
