import { describe, expect, it } from "vitest";
import {
  spmbCsvCell,
  buildSpmbCsv,
  spmbMonthlyRows,
  buildSpmbSheets,
  type SpmbExportContext,
} from "./spmb-export";
import type { SpmbAdminListRow } from "./queries/spmb-list";

function ctx(): SpmbExportContext {
  return {
    waveNames: new Map([["w1", "Gelombang 1"]]),
    formFields: [],
    docSummary: { a: { total: 5, verified: 3, rejected: 1 } },
    statusLabels: { pending: "Menunggu", accepted: "Diterima" },
    pathLabels: { reguler: "Reguler" },
    today: "2026-11-02",
  };
}

function row(over: Record<string, unknown> = {}): SpmbAdminListRow {
  return {
    id: "a",
    full_name: "ahmad hidayat",
    birth_place: "",
    birth_date: "",
    gender: "L",
    address: "",
    phone: "08123456789",
    email: "a@b.c",
    parent_name: "",
    parent_occupation: "",
    previous_school: "smp n 1",
    registration_path: "reguler",
    status: "pending",
    documents: { nisn: "0012345678", program: "SMP Boarding" },
    admin_notes: "=1+1",
    wave_id: "w1",
    created_at: "2026-10-05T00:00:00.000Z",
    updated_at: "2026-10-05T00:00:00.000Z",
    doc_total: 5,
    doc_verified: 3,
    doc_rejected: 1,
    doc_pending: 1,
    uploaded_docs: 3,
    wave_name: "Gelombang 1",
    wave_quota: null,
    is_overdue: true,
    ...over,
  } as SpmbAdminListRow;
}

describe("spmb-export", () => {
  it("spmbCsvCell mencegah injeksi & menjaga teks angka", () => {
    expect(spmbCsvCell("=1+1")).toBe("\"'=1+1\"");
    expect(spmbCsvCell("0812", true)).toBe("\"'0812\"");
    expect(spmbCsvCell('a"b')).toBe('"a""b"');
  });

  it("buildSpmbCsv memakai BOM, pemisah ;, dan ringkasan verifikasi", () => {
    const csv = buildSpmbCsv([row()], ctx());
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Ahmad Hidayat");
    expect(csv).toContain("3/5 (1 ditolak)");
    expect(csv).toContain("\"'=1+1\"");
  });

  it("spmbMonthlyRows mengelompokkan per bulan", () => {
    const out = spmbMonthlyRows([row(), row({ id: "b", status: "accepted", created_at: "2026-09-01T00:00:00Z" })]);
    expect(out).toEqual([
      ["2026-09", 1, 0, 1, 0],
      ["2026-10", 1, 1, 0, 0],
    ]);
  });

  it("buildSpmbSheets berisi sheet wawancara bila ada jadwal", () => {
    const withInterview = row({ interview_at: "2026-11-05T09:00:00+07:00", interview_note: "bawa rapor" });
    const sheets = buildSpmbSheets([row(), withInterview], ctx());
    expect(sheets.map((s) => s.name)).toContain("Wawancara");
    const plain = buildSpmbSheets([row()], ctx());
    expect(plain.map((s) => s.name)).not.toContain("Wawancara");
    expect(plain[0].rows[0][0]).toBe("No");
  });
});
