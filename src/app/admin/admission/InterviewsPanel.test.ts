import { describe, expect, it } from "vitest";
import { interviewGroupOf } from "./InterviewsPanel";

// Patokan: 2026-11-02T00:00 UTC = 2026-11-02T07:00 WIB.
const NOW = Date.UTC(2026, 10, 2, 0, 0, 0);

describe("interviewGroupOf", () => {
  it("mengelompokkan lewat/hari ini/besok/minggu/nanti (basis WIB)", () => {
    // Kemarin WIB → overdue
    expect(interviewGroupOf("2026-11-01T10:00:00+07:00", NOW)).toBe("overdue");
    // Hari ini WIB
    expect(interviewGroupOf("2026-11-02T15:00:00+07:00", NOW)).toBe("today");
    // Besok WIB
    expect(interviewGroupOf("2026-11-03T09:00:00+07:00", NOW)).toBe("tomorrow");
    // 5 hari lagi → week
    expect(interviewGroupOf("2026-11-07T09:00:00+07:00", NOW)).toBe("week");
    // 10 hari lagi → later
    expect(interviewGroupOf("2026-11-12T09:00:00+07:00", NOW)).toBe("later");
  });

  it("batas tengah malam WIB: 00:30 WIB besok bukan hari ini", () => {
    expect(interviewGroupOf("2026-11-03T00:30:00+07:00", NOW)).toBe("tomorrow");
  });

  it("ISO rusak → later", () => {
    expect(interviewGroupOf("bukan-tanggal", NOW)).toBe("later");
  });
});
