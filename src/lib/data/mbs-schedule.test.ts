import { describe, it, expect } from "vitest";
import {
  DAYS,
  SLOTS,
  BLOCKS,
  parseMinutes,
  isSlotCrossingMidnight,
  isSlotActiveNow,
  formatSlotTime,
  itemsForDay,
  slotsForDay,
  dayIndexNowJakarta,
  timeNowJakarta,
  activeSlotNowJakarta,
  slotOwnerDayIndex,
} from "./mbs-schedule";

const slot = SLOTS.find((s) => s.id === "dini-1")!;
const midnight = SLOTS.find((s) => s.id === "mlm-2")!;

describe("parseMinutes", () => {
  it("konversi HH:MM ke menit", () => {
    expect(parseMinutes("03:00")).toBe(180);
    expect(parseMinutes("21:00")).toBe(1260);
    expect(parseMinutes("00:00")).toBe(0);
  });
});

describe("isSlotCrossingMidnight", () => {
  it("slot normal tidak melewati tengah malam", () => {
    expect(isSlotCrossingMidnight(slot)).toBe(false);
  });
  it("slot 21:00-03:00 melewati tengah malam", () => {
    expect(isSlotCrossingMidnight(midnight)).toBe(true);
  });
});

describe("isSlotActiveNow", () => {
  it("batas inklusif di start", () => {
    expect(isSlotActiveNow(slot, "03:00")).toBe(true);
  });
  it("batas eksklusif di end (pindah ke slot berikutnya)", () => {
    expect(isSlotActiveNow(slot, "05:30")).toBe(false);
    expect(isSlotActiveNow(SLOTS.find((s) => s.id === "dini-2")!, "05:30")).toBe(true);
  });
  it("di tengah durasi aktif", () => {
    expect(isSlotActiveNow(slot, "04:15")).toBe(true);
  });
  it("sebelum slot mulai tidak aktif", () => {
    expect(isSlotActiveNow(slot, "02:59")).toBe(false);
  });

  it("slot lintas tengah malam aktif di sisi atas (21:00-23:59)", () => {
    expect(isSlotActiveNow(midnight, "21:00")).toBe(true);
    expect(isSlotActiveNow(midnight, "23:59")).toBe(true);
  });
  it("slot lintas tengah malam aktif di sisi bawah (00:00-02:59)", () => {
    expect(isSlotActiveNow(midnight, "00:00")).toBe(true);
    expect(isSlotActiveNow(midnight, "01:30")).toBe(true);
    expect(isSlotActiveNow(midnight, "02:59")).toBe(true);
  });
  it("slot lintas tengah malam berakhir tepat 03:00", () => {
    expect(isSlotActiveNow(midnight, "03:00")).toBe(false);
  });
  it("jurang 03:00 lalu 21:00 tidak dianggap aktif", () => {
    expect(isSlotActiveNow(midnight, "12:00")).toBe(false);
  });
});

describe("formatSlotTime", () => {
  it("titik pemisah sesuai format dokumen", () => {
    expect(formatSlotTime(slot)).toBe("03.00-05.30");
    expect(formatSlotTime(midnight)).toBe("21.00-03.00");
  });
});

describe("itemsForDay & slotsForDay", () => {
  it("item tanpa days tampil setiap hari", () => {
    const items = itemsForDay(slot, "Rabu").map((i) => i.label);
    expect(items).toContain("Qiyamul Lail");
  });
  it("Sahur hanya Senin & Kamis", () => {
    expect(itemsForDay(slot, "Senin").map((i) => i.label)).toContain("Sahur");
    expect(itemsForDay(slot, "Rabu").map((i) => i.label)).not.toContain("Sahur");
  });
  it("slot Ekstra pekan: psm-3 Sabtu memuat item Ekstra", () => {
    const psm3 = SLOTS.find((s) => s.id === "psm-3")!;
    expect(itemsForDay(psm3, "Sabtu").map((i) => i.label)).toEqual(["Ekstra"]);
    expect(itemsForDay(psm3, "Senin").map((i) => i.label)).toEqual(["Wafa – BTA"]);
  });
  it("semua hari tetap punya slot (tidak ada hari kosong)", () => {
    for (const day of DAYS) {
      expect(slotsForDay(SLOTS, day).length).toBeGreaterThan(0);
    }
  });
});

describe("Intl Jakarta helpers", () => {
  it("dayIndexNowJakarta memetakan tanggal tetap ke index DAYS", () => {
    // 2026-01-05 adalah Senin.
    expect(dayIndexNowJakarta(new Date("2026-01-05T12:00:00Z"))).toBe(0);
    // 2026-01-11 adalah Ahad.
    expect(dayIndexNowJakarta(new Date("2026-01-11T12:00:00Z"))).toBe(6);
  });
  it("timeNowJakarta memformat HH:MM 24 jam", () => {
    // 2026-01-05T04:30 UTC = 11:30 WIB.
    expect(timeNowJakarta(new Date("2026-01-05T04:30:00Z"))).toBe("11:30");
  });
  it("dayIndexNowJakarta mengikuti perubahan hari tepat tengah malam WIB", () => {
    // 2026-01-11T16:30 UTC = Ahad 23:30 WIB.
    expect(dayIndexNowJakarta(new Date("2026-01-11T16:30:00Z"))).toBe(6);
    // 2026-01-11T17:30 UTC = Senin 00:30 WIB (lintas tengah malam WIB).
    expect(dayIndexNowJakarta(new Date("2026-01-11T17:30:00Z"))).toBe(0);
  });
});

describe("activeSlotNowJakarta", () => {
  it("jam normal mengembalikan slot yang berjalan", () => {
    // 2026-01-05T07:45Z = 14:45 WIB -> sm-1 mulai.
    const r = activeSlotNowJakarta(SLOTS, new Date("2026-01-05T07:45:00Z"));
    expect(r.slot?.id).toBe("sm-1");
    expect(r.time).toBe("14:45");
    expect(r.dayIndex).toBe(0);
  });
  it("pukul 01:00 WIB: slot malam lintas tengah malam tetap ditemukan", () => {
    // 2026-01-05T18:00Z = 01:00 WIB.
    const r = activeSlotNowJakarta(SLOTS, new Date("2026-01-05T18:00:00Z"));
    expect(r.slot?.id).toBe("mlm-2");
  });
  it("selalu ditemukan tepat satu slot aktif pada jam-jam sampel", () => {
    // Sampel tiap 30 menit: pastikan tidak ada double-claim antar slot.
    const base = new Date("2026-01-05T00:00:00Z").getTime();
    for (let i = 0; i < 48; i++) {
      const now = new Date(base + i * 30 * 60 * 1000);
      const time = timeNowJakarta(now);
      const hits = SLOTS.filter((s) => isSlotActiveNow(s, time));
      expect(hits.length).toBe(1);
    }
  });
});

describe("slotOwnerDayIndex", () => {
  const midnight = SLOTS.find((s) => s.id === "mlm-2")!;
  const subuh = SLOTS.find((s) => s.id === "dini-1")!;
  it("slot normal: pemiliknya hari ini", () => {
    expect(slotOwnerDayIndex(subuh, "04:00", 3)).toBe(3);
  });
  it("slot lintas tengah malam, jam >= start (malam): pemiliknya hari ini", () => {
    expect(slotOwnerDayIndex(midnight, "23:00", 1)).toBe(1);
    expect(slotOwnerDayIndex(midnight, "21:00", 1)).toBe(1);
  });
  it("slot lintas tengah malam, jam < end (subuh): pemiliknya HARI KEMARIN", () => {
    expect(slotOwnerDayIndex(midnight, "01:00", 1)).toBe(0);
    // wrap Senin (0) -> Ahad (6).
    expect(slotOwnerDayIndex(midnight, "02:00", 0)).toBe(6);
  });
});

describe("BLOCKS", () => {
  it("4 blok ringkas dengan key unik", () => {
    expect(BLOCKS.length).toBe(4);
    expect(new Set(BLOCKS.map((b) => b.key)).size).toBe(4);
  });
  it("blok malam menjangkau tengah malam hingga 03:00", () => {
    const malam = BLOCKS.find((b) => b.key === "malam")!;
    expect(malam.end).toBe("03:00");
    expect(isSlotActiveNow({ ...SLOTS[0], start: malam.start, end: malam.end }, "23:00")).toBe(true);
  });
});
