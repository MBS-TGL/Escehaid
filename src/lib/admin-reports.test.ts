import { describe, expect, it } from "vitest";
import { buildAnalyticsCsv, buildSpmbMonthlyRecap, buildSpmbRecapCsv } from "./admin-reports";

describe("admin-reports", () => {
  it("membangun CSV analitik dengan 4 seksi tabel", () => {
    const csv = buildAnalyticsCsv(
      {
        total_views: 42,
        daily: [{ day: "2026-10-26T00:00:00.000+07:00", views: 10 }],
        top_paths: [{ path: "/news/a", views: 8 }],
        top_referrers: [{ host: "google.com", views: 5 }],
        devices: [{ device_class: "mobile", views: 30 }],
      },
      "30 hari terakhir"
    );
    expect(csv).toContain("Tanggal");
    expect(csv).toContain("2026-10-26");
    expect(csv).toContain("/news/a");
    expect(csv).toContain("google.com");
    expect(csv).toContain("mobile");
  });

  it("mengelompokkan pendaftar per bulan, terbaru dulu", () => {
    const recap = buildSpmbMonthlyRecap([
      { status: "pending", created_at: "2026-09-02T10:00:00Z" },
      { status: "accepted", created_at: "2026-10-05T10:00:00Z" },
      { status: "rejected", created_at: "2026-10-20T10:00:00Z" },
      { status: "pending", created_at: "invalid-date" },
    ]);
    expect(recap).toHaveLength(2);
    expect(recap[0].month).toBe("2026-10");
    expect(recap[0].total).toBe(2);
    expect(recap[0].accepted).toBe(1);
    expect(recap[0].rejected).toBe(1);
    expect(recap[1].month).toBe("2026-09");
    const csv = buildSpmbRecapCsv(recap);
    expect(csv).toContain("Bulan");
    expect(csv).toContain("2026-10");
  });
});
