import { describe, expect, it } from "vitest";
import {
  findDuplicateGroups,
  duplicateIdSet,
  normalizeDupePhone,
} from "./spmb-duplicates";

describe("normalizeDupePhone", () => {
  it("menyeragamkan awalan 0 dan 62", () => {
    expect(normalizeDupePhone("0812-3456-789")).toBe("628123456789");
    expect(normalizeDupePhone("+62 812 3456 789")).toBe("628123456789");
    expect(normalizeDupePhone(null)).toBe("");
  });
});

describe("findDuplicateGroups", () => {
  it("mengelompokkan NISN, NIK, dan telepon yang sama", () => {
    const groups = findDuplicateGroups([
      { id: "a", full_name: "Ahmad", phone: "081234567890", documents: { nisn: "001" } },
      { id: "b", full_name: "Budi", phone: "+6281234567890", documents: { nisn: "001" } },
      { id: "c", full_name: "Citra", phone: "0822", documents: { nik: "1234567890123456" } },
      { id: "d", full_name: "Dedi", phone: "0833", documents: { nik: "1234567890123456" } },
      { id: "e", full_name: "Eka", phone: "0844", documents: {} },
    ]);
    const keys = groups.map((g) => g.key).sort();
    expect(keys).toEqual(["nik:1234567890123456", "nisn:001", "phone:6281234567890"]);
    expect(groups.find((g) => g.key === "nisn:001")?.ids).toEqual(["a", "b"]);
  });

  it("mengabaikan nilai kosong dan telepon pendek", () => {
    const groups = findDuplicateGroups([
      { id: "a", full_name: "A", phone: "123", documents: {} },
      { id: "b", full_name: "B", phone: "123", documents: {} },
    ]);
    expect(groups).toEqual([]);
  });

  it("duplicateIdSet mengumpulkan semua id berduplikat", () => {
    const groups = findDuplicateGroups([
      { id: "a", full_name: "A", documents: { nisn: "001" } },
      { id: "b", full_name: "B", documents: { nisn: "001" } },
      { id: "c", full_name: "C", documents: { nisn: "002" } },
    ]);
    expect(duplicateIdSet(groups)).toEqual(new Set(["a", "b"]));
  });
});
