/**
 * Agregat analitik SPMB — fungsi murni di atas baris daftar admin
 * (dipakai tab "Statistik": funnel, tren harian, waktu keputusan,
 * breakdown gelombang/jalur/program/sekolah/jenis kelamin).
 */

export interface SpmbAnalyticsRow {
  id: string;
  status: "pending" | "accepted" | "rejected";
  registration_path?: string | null;
  gender?: string | null;
  previous_school?: string | null;
  wave_id?: string | null;
  created_at: string;
  updated_at: string;
  interview_at?: string | null;
  reregistration_status?: string | null;
  documents?: { program?: string } | null;
}

export interface SpmbFunnelTier {
  label: string;
  count: number;
}

export interface SpmbAnalytics {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  docsComplete: number;
  docsVerified: number;
  interviewed: number;
  reregistered: number;
  funnel: SpmbFunnelTier[];
  /** Rata-rata hari dari daftar sampai keputusan (accepted/rejected). null bila belum ada. */
  avgDaysToDecision: number | null;
  daily: { label: string; value: number }[];
  byWave: { label: string; total: number; accepted: number }[];
  byPath: { label: string; total: number; accepted: number }[];
  byProgram: { label: string; total: number; accepted: number }[];
  bySchool: { label: string; total: number; accepted: number }[];
  byGender: { label: string; total: number; accepted: number }[];
}

export interface SpmbAnalyticsDoc {
  total: number;
  verified: number;
  rejected: number;
}

const DAY_MS = 86_400_000;

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildSpmbAnalytics(
  rows: SpmbAnalyticsRow[],
  docs: Record<string, SpmbAnalyticsDoc>,
  waveNames: Map<string, string>,
  days = 30
): SpmbAnalytics {
  const total = rows.length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const accepted = rows.filter((r) => r.status === "accepted").length;
  const rejected = rows.filter((r) => r.status === "rejected").length;
  const interviewed = rows.filter((r) => !!r.interview_at).length;
  const reregistered = rows.filter((r) => r.reregistration_status === "verified").length;

  let docsComplete = 0;
  let docsVerified = 0;
  for (const r of rows) {
    const d = docs[r.id];
    if (!d) continue;
    if (d.total > 0 && d.total - d.verified - d.rejected <= 0 && d.rejected === 0) docsComplete += 1;
    if (d.verified >= 5) docsVerified += 1;
  }

  const funnel: SpmbFunnelTier[] = [
    { label: "Pendaftar", count: total },
    { label: "Berkas lengkap", count: docsComplete },
    { label: "Berkas terverifikasi", count: docsVerified },
    { label: "Wawancara", count: interviewed },
    { label: "Diterima", count: accepted },
    { label: "Terdaftar", count: reregistered },
  ];

  const decided = rows.filter((r) => r.status !== "pending");
  const avgDaysToDecision =
    decided.length === 0
      ? null
      : decided.reduce((sum, r) => {
          const diff = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime();
          return sum + (Number.isFinite(diff) && diff >= 0 ? diff / DAY_MS : 0);
        }, 0) / decided.length;

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    dailyMap.set(dayKey(d.toISOString()), 0);
  }
  for (const r of rows) {
    const k = dayKey(r.created_at);
    if (dailyMap.has(k)) dailyMap.set(k, (dailyMap.get(k) ?? 0) + 1);
  }
  const daily = Array.from(dailyMap.entries()).map(([label, value]) => ({ label, value }));

  function group(getKey: (r: SpmbAnalyticsRow) => string) {
    const m = new Map<string, { total: number; accepted: number }>();
    for (const r of rows) {
      const k = getKey(r) || "-";
      const e = m.get(k) ?? { total: 0, accepted: 0 };
      e.total += 1;
      if (r.status === "accepted") e.accepted += 1;
      m.set(k, e);
    }
    return Array.from(m.entries())
      .map(([label, v]) => ({ label, total: v.total, accepted: v.accepted }))
      .sort((a, b) => b.total - a.total);
  }

  return {
    total,
    pending,
    accepted,
    rejected,
    docsComplete,
    docsVerified,
    interviewed,
    reregistered,
    funnel,
    avgDaysToDecision,
    daily,
    byWave: group((r) => (r.wave_id ? waveNames.get(r.wave_id) || "Tanpa nama" : "Tanpa gelombang")),
    byPath: group((r) => r.registration_path || "reguler"),
    byProgram: group((r) => r.documents?.program || "Tanpa program"),
    bySchool: group((r) => r.previous_school || "Tanpa sekolah").slice(0, 15),
    byGender: group((r) => (r.gender === "L" ? "Putra" : r.gender === "P" ? "Putri" : "-")),
  };
}
