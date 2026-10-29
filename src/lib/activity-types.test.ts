import { describe, expect, it } from "vitest";
import { formatActivityDate, toJakartaDateKey } from "./activity-types";
import { filterUpcomingEvents, type AgendaEvent } from "./queries/agenda";

describe("formatActivityDate", () => {
  it("mengubah timestamptz menjadi tanggal WIB, bukan ISO mentah", () => {
    // 02:00 UTC = 09:00 WIB, masih tanggal 7 November.
    const value = "2026-11-07T02:00:00+00:00";
    expect(toJakartaDateKey(value)).toBe("2026-11-07");
    expect(formatActivityDate(value, { day: "numeric" })).toBe("7");
    expect(formatActivityDate(value, { month: "short" })).toBe("Nov");
    expect(
      formatActivityDate(value, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    ).toBe("Sabtu, 7 November 2026");
    expect(formatActivityDate(value)).not.toContain("T");
  });

  it("menerima tanggal date-only dari input admin", () => {
    expect(formatActivityDate("2026-11-07")).toBe("7 November 2026");
  });

  it("nilai kosong/tidak valid → string kosong (bukan 'Invalid Date')", () => {
    expect(formatActivityDate("")).toBe("");
    expect(formatActivityDate("bukan-tanggal")).toBe("");
  });
});

describe("filterUpcomingEvents", () => {
  const event = { id: "1", title: "Kunjungan", event_date: "2026-11-07T02:00:00+00:00" } as AgendaEvent;

  it("memasukkan acara yang belum mulai", () => {
    expect(filterUpcomingEvents([event], new Date("2026-11-07T01:00:00Z"))).toHaveLength(1);
  });

  it("membuang acara yang sudah lewat (bukan sekadar beda tanggal)", () => {
    expect(filterUpcomingEvents([event], new Date("2026-11-07T03:00:00Z"))).toHaveLength(0);
  });
});
