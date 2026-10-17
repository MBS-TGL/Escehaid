import { describe, it, expect } from "vitest";
import { evaluateFlag, evaluateAllFlags } from "@/lib/flags/evaluate";
import { FEATURE_FLAGS, type FeatureFlagDef } from "@/lib/flags/registry";

const now = new Date("2026-10-15T12:00:00Z");

function makeOverride(
  enabled: boolean,
  startAt?: string | null,
  endAt?: string | null
): { enabled: boolean; startAt: string | null; endAt: string | null } {
  return { enabled, startAt: startAt ?? null, endAt: endAt ?? null };
}

describe("Feature Flags: evaluateFlag() pure function", () => {
  const def: FeatureFlagDef = {
    key: "test_flag",
    name: "Test Flag",
    description: "Test",
    defaultEnabled: false,
    highImpact: false,
    category: "Test",
  };

  it("disabled + tanpa jadwal → inactive", () => {
    const r = evaluateFlag(def, makeOverride(false), now);
    expect(r.active).toBe(false);
    expect(r.status).toBe("inactive");
    expect(r.detail.enabled).toBe(false);
    expect(r.detail.inSchedule).toBe(true);
  });

  it("enabled + tanpa jadwal → active", () => {
    const r = evaluateFlag(def, makeOverride(true), now);
    expect(r.active).toBe(true);
    expect(r.status).toBe("active");
  });

  it("enabled + startAt masa depan → scheduled (belum mulai)", () => {
    const r = evaluateFlag(def, makeOverride(true, "2026-10-20T00:00:00Z"), now);
    expect(r.active).toBe(false);
    expect(r.status).toBe("scheduled");
    expect(r.detail.inSchedule).toBe(false);
  });

  it("enabled + endAt masa lalu → scheduled (sudah berakhir)", () => {
    const r = evaluateFlag(def, makeOverride(true, null, "2026-10-10T00:00:00Z"), now);
    expect(r.active).toBe(false);
    expect(r.status).toBe("scheduled");
    expect(r.detail.inSchedule).toBe(false);
  });

  it("enabled + startAt sudah lewat + endAt belum → active", () => {
    const r = evaluateFlag(
      def,
      makeOverride(true, "2026-10-10T00:00:00Z", "2026-10-20T00:00:00Z"),
      now
    );
    expect(r.active).toBe(true);
    expect(r.status).toBe("active");
  });

  it("override null → pakai defaultEnabled", () => {
    const defEnabled: FeatureFlagDef = { ...def, defaultEnabled: true };
    const r = evaluateFlag(defEnabled, null, now);
    expect(r.active).toBe(true);
    expect(r.status).toBe("active");
    expect(r.detail.enabled).toBe(true);
  });

  it("override null + defaultEnabled false → inactive", () => {
    const r = evaluateFlag(def, null, now);
    expect(r.active).toBe(false);
    expect(r.status).toBe("inactive");
  });

  it("detail berisi informasi debug lengkap", () => {
    const ov = makeOverride(true, "2026-10-10T00:00:00Z", "2026-10-20T00:00:00Z");
    const r = evaluateFlag(def, ov, now);
    expect(r.detail.enabled).toBe(true);
    // startAt/endAt dikembalikan apa adanya dari override; now dari toISOString()
    expect(r.detail.startAt).toBe("2026-10-10T00:00:00Z");
    expect(r.detail.endAt).toBe("2026-10-20T00:00:00Z");
    expect(r.detail.now).toBe("2026-10-15T12:00:00.000Z");
    expect(r.detail.inSchedule).toBe(true);
  });
});

describe("Feature Flags: evaluateAllFlags() batch evaluasi", () => {
  it("mengembalikan evaluasi untuk semua flag di registry", () => {
    const overrides = {
      maintenance_mode: makeOverride(false),
      spmb_registration_open: makeOverride(true),
    };
    const results = evaluateAllFlags(overrides, now);
    expect(Object.keys(results)).toEqual(FEATURE_FLAGS.map((f) => f.key));
    expect(results.maintenance_mode.active).toBe(false);
    expect(results.spmb_registration_open.active).toBe(true);
  });

  it("flag tanpa override pakai default registry", () => {
    const overrides: Record<string, ReturnType<typeof makeOverride>> = {};
    const results = evaluateAllFlags(overrides, now);
    // spmb_registration_open default true
    expect(results.spmb_registration_open.active).toBe(true);
    // maintenance_mode default false
    expect(results.maintenance_mode.active).toBe(false);
  });
});