import { describe, expect, it } from "vitest";
import { isEditStale } from "./edit-staleness";

describe("edit-staleness", () => {
  it("false bila sama, kosong, atau rusak", () => {
    expect(isEditStale("2026-10-01T10:00:00Z", "2026-10-01T10:00:00Z")).toBe(false);
    expect(isEditStale(null, "2026-10-01T10:00:00Z")).toBe(false);
    expect(isEditStale("2026-10-01T10:00:00Z", undefined)).toBe(false);
    expect(isEditStale("bukan-tanggal", "2026-10-01T10:00:00Z")).toBe(false);
  });

  it("true bila baris berubah setelah form dibuka", () => {
    expect(isEditStale("2026-10-01T10:00:00Z", "2026-10-01T10:00:01Z")).toBe(true);
  });

  it("false bila data terbaru justru lebih lama (jam miring)", () => {
    expect(isEditStale("2026-10-01T10:00:01Z", "2026-10-01T10:00:00Z")).toBe(false);
  });
});
