"use client";

/**
 * Client hook untuk feature flags.
 * Data diambil dari server via `getFeatureFlags()` (layout/page) lalu
 * diserialisasi ke klien melalui props/initialData — TIDAK ada fetch client-side.
 */
import { createContext, useContext, useMemo } from "react";
import type { FeatureFlagKey, FlagEvaluation, FeatureFlagsSnapshot } from "./registry";

interface FlagsContextValue {
  /** Evaluasi aktif/inaktif per flag. */
  evaluations: FeatureFlagsSnapshot["evaluations"];
  /** Cepat: apakah flag aktif? */
  isEnabled: (key: FeatureFlagKey) => boolean;
  /** Status badge label (Aktif/Dijadwalkan/Nonaktif). */
  getStatusLabel: (key: FeatureFlagKey) => string;
  /** Semua flag (untuk iterasi di UI). */
  allFlags: FeatureFlagKey[];
}

const FlagsContext = createContext<FlagsContextValue | null>(null);

export function FlagsProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: FeatureFlagsSnapshot;
}) {
  const value = useMemo(() => {
    const evals = initial.evaluations;
    return {
      evaluations: evals,
      isEnabled: (key: FeatureFlagKey) => evals[key]?.active ?? false,
      getStatusLabel: (key: FeatureFlagKey) => {
        const s = evals[key]?.status;
        if (!s) return "Tidak dikenal";
        if (s === "active") return "Aktif";
        if (s === "scheduled") return "Dijadwalkan";
        return "Nonaktif";
      },
      allFlags: Object.keys(evals) as FeatureFlagKey[],
    };
  }, [initial]);

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

/** Gunakan di dalam subtree yang dibungkus FlagsProvider. */
export function useFeatureFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext);
  if (!ctx) {
    throw new Error("useFeatureFlags harus dipakai di dalam FlagsProvider");
  }
  return ctx;
}