import { describe, it, expect } from "vitest";
import {
  isPeriod,
  parsePeriod,
  periodRange,
} from "@/components/admin/charts/PeriodSelector";

describe("PeriodSelector: kalkulator & validator periode", () => {
  it("validasi & parse periode 7, 30, 90", () => {
    expect(isPeriod("7")).toBe(true);
    expect(isPeriod(7)).toBe(true);
    expect(isPeriod("99")).toBe(false);
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("30")).toBe(30);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("invalid")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });

  it("periodRange menghitung rentang mundur sesuai jumlah hari", () => {
    const fixedNow = new Date("2026-10-31T15:00:00.000Z"); // 22:00 WIB
    const range7 = periodRange(7, fixedNow);
    const range30 = periodRange(30, fixedNow);

    expect(range7.to).toEqual(fixedNow);
    expect(range30.to).toEqual(fixedNow);
    expect(range7.from.getTime()).toBeLessThan(range7.to.getTime());

    // Rentang 7 hari harus mencakup tepat selisih hari yang benar
    const diffDays7 = Math.round((range7.to.getTime() - range7.from.getTime()) / 86400000);
    expect(diffDays7).toBeGreaterThanOrEqual(6);
    expect(diffDays7).toBeLessThanOrEqual(7);
  });
});
