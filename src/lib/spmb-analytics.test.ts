import { describe, expect, it } from "vitest";
import { buildSpmbAnalytics } from "./spmb-analytics";

function row(over: Record<string, unknown> = {}) {
  return {
    id: "x",
    status: "pending",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...over,
  } as Parameters<typeof buildSpmbAnalytics>[0][number];
}

describe("buildSpmbAnalytics", () => {
  it("menghitung funnel, keputusan, dan breakdown", () => {
    const rows = [
      row({ id: "a", status: "accepted", registration_path: "reguler", gender: "L", previous_school: "SMP A", updated_at: "2026-10-03T00:00:00.000Z", interview_at: "2026-10-02T00:00:00.000Z", reregistration_status: "verified", documents: { program: "SMP Boarding" } }),
      row({ id: "b", status: "rejected", registration_path: "prestasi", gender: "P", previous_school: "SMP B", updated_at: "2026-10-05T00:00:00.000Z" }),
      row({ id: "c", status: "pending", registration_path: "reguler", gender: "L", previous_school: "SMP A" }),
    ];
    const docs = {
      a: { total: 5, verified: 5, rejected: 0 },
      b: { total: 3, verified: 1, rejected: 1 },
    };
    const out = buildSpmbAnalytics(rows, docs, new Map(), 30);
    expect(out.total).toBe(3);
    expect(out.accepted).toBe(1);
    expect(out.docsComplete).toBe(1);
    expect(out.docsVerified).toBe(1);
    expect(out.interviewed).toBe(1);
    expect(out.reregistered).toBe(1);
    // (2 + 4) / 2 hari
    expect(out.avgDaysToDecision).toBeCloseTo(3, 5);
    expect(out.funnel.map((f) => f.count)).toEqual([3, 1, 1, 1, 1, 1]);
    expect(out.bySchool[0]).toEqual({ label: "SMP A", total: 2, accepted: 1 });
    expect(out.byPath.find((p) => p.label === "prestasi")).toEqual({ label: "prestasi", total: 1, accepted: 0 });
  });

  it("avgDaysToDecision null bila belum ada keputusan", () => {
    const out = buildSpmbAnalytics([row({ id: "a" })], {}, new Map(), 7);
    expect(out.avgDaysToDecision).toBeNull();
    expect(out.daily).toHaveLength(7);
  });
});
