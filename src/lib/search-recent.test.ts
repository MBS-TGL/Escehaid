import { beforeEach, describe, expect, it } from "vitest";
import {
  RECENT_MAX,
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  saveRecentSearch,
} from "./search-recent";

describe("search-recent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("menyimpan terbaru dulu, tanpa duplikat — entri lama naik ke atas", () => {
    saveRecentSearch("tapak suci");
    saveRecentSearch("spmb");
    saveRecentSearch("tapak suci");
    expect(readRecentSearches()).toEqual(["tapak suci", "spmb"]);
  });

  it("dipangkas sesuai RECENT_MAX (5)", () => {
    for (const term of ["f1", "f2", "f3", "f4", "f5", "f6", "f7"]) {
      saveRecentSearch(term);
    }
    const list = readRecentSearches();
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0]).toBe("f7");
    expect(list).not.toContain("f1");
  });

  it("hapus satu entri mempertahankan sisanya beserta urutannya", () => {
    saveRecentSearch("a");
    saveRecentSearch("b");
    saveRecentSearch("c");
    expect(removeRecentSearch("b")).toEqual(["c", "a"]);
    expect(readRecentSearches()).toEqual(["c", "a"]);
  });

  it("hapus semua mengosongkan", () => {
    saveRecentSearch("a");
    expect(clearRecentSearches()).toEqual([]);
    expect(readRecentSearches()).toEqual([]);
  });

  it("istilah kosong / spasi tak tersimpan; istilah ter-trim", () => {
    saveRecentSearch("spmb");
    expect(saveRecentSearch("   ")).toEqual(["spmb"]);
    expect(saveRecentSearch("  tapak  ")).toEqual(["tapak", "spmb"]);
  });

  it("data rusak di localStorage → [] tanpa melempar; simpan baru tetap pulih", () => {
    window.localStorage.setItem("search-recent", "{bukan json!!!");
    expect(readRecentSearches()).toEqual([]);
    // Bentuk bukan array juga diabaikan.
    window.localStorage.setItem("search-recent", JSON.stringify({ bukan: "array" }));
    expect(readRecentSearches()).toEqual([]);
    // Setelah rusak, penyimpanan baru berjalan dari basis bersih.
    expect(saveRecentSearch("pulih")).toEqual(["pulih"]);
    expect(readRecentSearches()).toEqual(["pulih"]);
  });
});
