import { describe, it, expect } from "vitest";
import { toTitleCase, formatRelativeTime, daysSince, PENDING_SLA_DAYS } from "./admin-display";

const NOW = new Date("2026-10-20T04:00:00.000Z"); // 11:00 WIB

describe("toTitleCase", () => {
  it("normalisasi huruf kapital di tiap kata", () => {
    expect(toTitleCase("ahmad fauzi")).toBe("Ahmad Fauzi");
    expect(toTitleCase("MUHAMMAD RIZKI")).toBe("Muhammad Rizki");
    expect(toTitleCase("siti   azizah")).toBe("Siti Azizah");
  });

  it("aman terhadap nilai kosong / null-ish (string kosong)", () => {
    expect(toTitleCase("")).toBe("");
    expect(toTitleCase("   ")).toBe("");
    // @ts-expect-error — dipanggil dengan null dari DB pun tetap aman
    expect(toTitleCase(null)).toBe("");
  });

  it("huruf pertama tetap kapital, sisanya lowercase", () => {
    expect(toTitleCase("aBdul")).toBe("Abdul");
  });
});

describe("formatRelativeTime", () => {
  it("baru saja di bawah 1 menit", () => {
    expect(formatRelativeTime("2026-10-20T03:59:30.000Z", NOW)).toBe("baru saja");
  });

  it("menit", () => {
    expect(formatRelativeTime("2026-10-20T03:55:00.000Z", NOW)).toBe("5 menit lalu");
  });

  it("jam", () => {
    expect(formatRelativeTime("2026-10-20T02:00:00.000Z", NOW)).toBe("2 jam lalu");
  });

  it("hari", () => {
    expect(formatRelativeTime("2026-10-18T00:00:00.000Z", NOW)).toBe("2 hari lalu");
  });

  it("lebih dari 30 hari jatuh ke tanggal WIB", () => {
    expect(formatRelativeTime("2026-08-01T06:00:00.000Z", NOW)).toBe("1 Agu 2026");
  });

  it("tanggal tidak valid → kosong", () => {
    expect(formatRelativeTime("tanggal-aneh", NOW)).toBe("");
  });
});

describe("daysSince", () => {
  it("hitung hari penuh", () => {
    expect(daysSince("2026-10-17T04:00:00.000Z", NOW)).toBe(3);
  });

  it("di bawah satu hari → 0", () => {
    expect(daysSince("2026-10-20T01:00:00.000Z", NOW)).toBe(0);
  });

  it("batas hari mengikuti kalender Asia/Jakarta (bukan blok 24 jam)", () => {
    // 18:00 UTC = 01:00 WIB 20 Okt — hari kalender yang sama dengan NOW.
    expect(daysSince("2026-10-19T18:00:00.000Z", NOW)).toBe(0);
    // 17:00 UTC = 00:00 WIB 20 Okt — masih hari yang sama.
    expect(daysSince("2026-10-19T17:00:00.000Z", NOW)).toBe(0);
    // 16:59 UTC = 23:59 WIB 19 Okt — sudah hari sebelumnya.
    expect(daysSince("2026-10-19T16:59:00.000Z", NOW)).toBe(1);
  });

  it("konstanta ambang lewat bersama dashboard & tabel", () => {
    expect(PENDING_SLA_DAYS).toBe(3);
  });
});
