/**
 * Pembaca feature flags (Phase C) — ter-cache dengan tag "feature-flags".
 *
 * Resolusi: override DB → default registry.
 * Evaluasi jadwal (startAt/endAt) dilakukan di sisi server saat dibaca.
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { FEATURE_FLAGS, FEATURE_FLAG_MAP, type FeatureFlagKey } from "./registry";
import { evaluateAllFlags, type FlagEvaluation } from "./evaluate";

export const FEATURE_FLAGS_TAG = "feature-flags";

export interface FeatureFlagsSnapshot {
  /** Evaluasi lengkap per flag (active, status, detail). */
  evaluations: Record<FeatureFlagKey, FlagEvaluation>;
  /** Override mentah dari DB (untuk UI admin). */
  overrides: Record<
    FeatureFlagKey,
    { enabled: boolean; startAt: string | null; endAt: string | null }
  >;
}

/** Baca override dari database (ter-cache per request + tag). */
const readFlagOverrides = unstable_cache(
  async function readFlagOverrides(): Promise<
    Record<string, { enabled: boolean; startAt: string | null; endAt: string | null }>
  > {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled, start_at, end_at");

    if (error) {
      // Tabel belum dibuat (migrasi belum dijalankan) = kondisi normal.
      console.warn("feature_flags belum dapat dibaca:", error.message);
      return {};
    }

    const overrides: Record<string, { enabled: boolean; startAt: string | null; endAt: string | null }> = {};
    for (const row of (data ?? []) as { key: string; enabled: boolean; start_at: string | null; end_at: string | null }[]) {
      overrides[row.key] = {
        enabled: row.enabled,
        startAt: row.start_at,
        endAt: row.end_at,
      };
    }
    return overrides;
  },
  ["feature-flags-overrides"],
  { tags: [FEATURE_FLAGS_TAG] }
);

/**
 * Snapshot lengkap feature flags untuk request ini.
 * Di-`cache` per request React (layout, page, actions berbagi pembacaan).
 */
export const getFeatureFlags = cache(async function getFeatureFlags(): Promise<FeatureFlagsSnapshot> {
  const overrides = await readFlagOverrides();
  const evaluations = evaluateAllFlags(overrides);
  return { evaluations, overrides };
});

/**
 * Cepat: cek satu flag aktif atau tidak (untuk guard server-side).
 * Tidak perlu menunggu seluruh snapshot — tapi intern masih memakai
 * cache yang sama (karena readFlagOverrides di-unstable_cache).
 */
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const snapshot = await getFeatureFlags();
  return snapshot.evaluations[key]?.active ?? FEATURE_FLAG_MAP[key]?.defaultEnabled ?? false;
}

/** Server-side guard: throw kalau flag tidak aktif. */
export async function requireFeature(key: FeatureFlagKey): Promise<void> {
  const active = await isFeatureEnabled(key);
  if (!active) {
    const err = new Error(`Feature flag "${key}" tidak aktif`) as Error & { code: string; flag: string };
    err.code = "FEATURE_DISABLED";
    err.flag = key;
    throw err;
  }
}