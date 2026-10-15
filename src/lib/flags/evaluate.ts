/**
 * Evaluasi status flag murni — tanpa akses database, dipakai oleh:
 *   - Server reader (cached)
 *   - Unit test (Phase D)
 *   - Client hook (via serialized initial data)
 */
import { FEATURE_FLAG_MAP, type FeatureFlagDef } from "./registry";

export interface FlagEvaluation {
  /** Kunci flag. */
  key: string;
  /** Apakah flag aktif SAAT INI (enabled && dalam jadwal). */
  active: boolean;
  /** Status untuk UI badge. */
  status: "active" | "scheduled" | "inactive";
  /** Detail perhitungan (debug). */
  detail: {
    enabled: boolean;
    now: string; // ISO
    startAt: string | null; // ISO
    endAt: string | null; // ISO
    inSchedule: boolean;
  };
}

/**
 * Evaluasi satu flag berdasarkan definisinya + nilai override DB + waktu sekarang.
 */
export function evaluateFlag(
  def: FeatureFlagDef,
  override: { enabled: boolean; startAt: string | null; endAt: string | null } | null,
  now: Date = new Date()
): FlagEvaluation {
  const enabled = override?.enabled ?? def.defaultEnabled;
  const startAt = override?.startAt ?? null;
  const endAt = override?.endAt ?? null;

  let inSchedule = true;
  if (startAt && now < new Date(startAt)) inSchedule = false;
  if (endAt && now > new Date(endAt)) inSchedule = false;

  const active = enabled && inSchedule;

  let status: "active" | "scheduled" | "inactive";
  if (!enabled) status = "inactive";
  else if (!inSchedule) status = "scheduled";
  else status = "active";

  return {
    key: def.key,
    active,
    status,
    detail: {
      enabled,
      now: now.toISOString(),
      startAt,
      endAt,
      inSchedule,
    },
  };
}

/**
 * Evaluasi banyak flag sekaligus (dipakai reader).
 */
export function evaluateAllFlags(
  overrides: Record<string, { enabled: boolean; startAt: string | null; endAt: string | null }>,
  now: Date = new Date()
): Record<string, FlagEvaluation> {
  const out: Record<string, FlagEvaluation> = {};
  for (const def of Object.values(FEATURE_FLAG_MAP)) {
    out[def.key] = evaluateFlag(def, overrides[def.key] ?? null, now);
  }
  return out;
}

export const STATUS_LABEL: Record<FlagEvaluation["status"], string> = {
  active: "Aktif",
  scheduled: "Dijadwalkan",
  inactive: "Nonaktif",
};

export const STATUS_TONE: Record<FlagEvaluation["status"], "success" | "warning" | "default"> = {
  active: "success",
  scheduled: "warning",
  inactive: "default",
};