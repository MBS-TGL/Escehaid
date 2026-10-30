import { describe, expect, it } from "vitest";
import type { SpmbRegistration } from "./supabase";
import {
  filterSpmbRegistrations,
  matchesSpmbSearch,
  SPMB_NO_PROGRAM,
  spmbGenderLabel,
  spmbProgramOf,
} from "./spmb-filter";

function makeRow(overrides: Partial<SpmbRegistration> = {}): SpmbRegistration {
  return {
    id: "reg-1",
    full_name: "Budi Santoso",
    birth_place: "Jember",
    birth_date: "2012-03-04",
    gender: "L",
    address: "Jl. Kenanga No. 1",
    phone: "081234567890",
    email: "budi@example.com",
    parent_name: "Ahmad Santoso",
    parent_occupation: "Petani",
    previous_school: "SDN Tanggul 1",
    registration_path: "reguler",
    status: "pending",
    documents: { program: "SMP Boarding", nisn: "0012345678" },
    admin_notes: "",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

const ALL = { search: "", status: "all", path: "all", program: "all", gender: "all" };

describe("spmbProgramOf", () => {
  it("mengembalikan program dari documents", () => {
    expect(spmbProgramOf(makeRow())).toBe("SMP Boarding");
  });

  it("mengembalikan string kosong bila documents null", () => {
    expect(spmbProgramOf(makeRow({ documents: null }))).toBe("");
  });
});

describe("spmbGenderLabel", () => {
  it("memetakan L/P ke Putra/Putri", () => {
    expect(spmbGenderLabel("L")).toBe("Putra");
    expect(spmbGenderLabel("P")).toBe("Putri");
  });

  it("memberi fallback untuk nilai tak dikenal", () => {
    expect(spmbGenderLabel("X")).toBe("—");
  });
});

describe("matchesSpmbSearch", () => {
  it("mencari program boarding / full day / jenjang", () => {
    const boarding = makeRow();
    const fullDay = makeRow({ documents: { program: "SMP Full Day (Non Boarding)" } });
    const sma = makeRow({ documents: { program: "SMA Boarding" } });

    expect(matchesSpmbSearch(boarding, "boarding")).toBe(true);
    expect(matchesSpmbSearch(fullDay, "full day")).toBe(true);
    expect(matchesSpmbSearch(sma, "sma")).toBe(true);
  });

  it("mencari jalur lewat label maupun nilai mentah", () => {
    const prestasi = makeRow({ registration_path: "prestasi" });
    const beasiswa = makeRow({ registration_path: "beasiswa" });

    expect(matchesSpmbSearch(prestasi, "prestasi")).toBe(true);
    expect(matchesSpmbSearch(beasiswa, "beasiswa")).toBe(true);
    expect(matchesSpmbSearch(makeRow(), "reguler")).toBe(true);
  });

  it("mencari NISN, jawaban kustom, dan mengabaikan besar-kecil huruf", () => {
    const row = makeRow({ documents: { program: "SMA Boarding", nisn: "0012345678", cf_1: "Tahfidz" } });

    expect(matchesSpmbSearch(row, "0012345678")).toBe(true);
    expect(matchesSpmbSearch(row, "tahfidz")).toBe(true);
    expect(matchesSpmbSearch(row, "  BOARDING  ")).toBe(true);
  });

  it("kata kunci kosong meloloskan semua baris", () => {
    expect(matchesSpmbSearch(makeRow(), "")).toBe(true);
    expect(matchesSpmbSearch(makeRow(), "   ")).toBe(true);
  });

  it("mencari gender lewat putra/putri/perempuan/laki", () => {
    const putra = makeRow({ gender: "L" });
    const putri = makeRow({ gender: "P" });

    expect(matchesSpmbSearch(putra, "putra")).toBe(true);
    expect(matchesSpmbSearch(putra, "laki")).toBe(true);
    expect(matchesSpmbSearch(putri, "putri")).toBe(true);
    expect(matchesSpmbSearch(putri, "perempuan")).toBe(true);
    expect(matchesSpmbSearch(putra, "putri")).toBe(false);
  });
});

describe("filterSpmbRegistrations", () => {
  const rows = [
    makeRow({ id: "a", gender: "L", registration_path: "reguler", status: "pending", documents: { program: "SMP Boarding" } }),
    makeRow({ id: "b", gender: "P", registration_path: "prestasi", status: "accepted", documents: { program: "SMA Boarding" } }),
    makeRow({ id: "c", gender: "L", registration_path: "beasiswa", status: "rejected", documents: { program: "SMP Full Day (Non Boarding)" } }),
    makeRow({ id: "d", gender: "P", registration_path: "reguler", status: "pending", documents: null }),
  ];

  it("mengembalikan semua baris tanpa filter", () => {
    expect(filterSpmbRegistrations(rows, ALL)).toHaveLength(4);
  });

  it("memfilter status", () => {
    const result = filterSpmbRegistrations(rows, { ...ALL, status: "accepted" });
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });

  it("memfilter jalur", () => {
    const result = filterSpmbRegistrations(rows, { ...ALL, path: "reguler" });
    expect(result.map((r) => r.id)).toEqual(["a", "d"]);
  });

  it("memfilter program", () => {
    const result = filterSpmbRegistrations(rows, { ...ALL, program: "SMP Boarding" });
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("memfilter jenis kelamin", () => {
    expect(filterSpmbRegistrations(rows, { ...ALL, gender: "L" }).map((r) => r.id)).toEqual(["a", "c"]);
    expect(filterSpmbRegistrations(rows, { ...ALL, gender: "P" }).map((r) => r.id)).toEqual(["b", "d"]);
  });

  it("memfilter baris tanpa program lewat sentinel none", () => {
    const result = filterSpmbRegistrations(rows, { ...ALL, program: SPMB_NO_PROGRAM });
    expect(result.map((r) => r.id)).toEqual(["d"]);
  });

  it("menggabungkan status + jalur + program + gender + pencarian", () => {
    const result = filterSpmbRegistrations(rows, {
      search: "boarding",
      status: "accepted",
      path: "prestasi",
      program: "SMA Boarding",
      gender: "P",
    });
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });

  it("pencarian program mempersempit hasil", () => {
    const result = filterSpmbRegistrations(rows, { ...ALL, search: "full day" });
    expect(result.map((r) => r.id)).toEqual(["c"]);
  });
});
