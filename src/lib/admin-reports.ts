/**
 * Builder laporan CSV murni (tanpa I/O) — dipakai tombol ekspor Analitik &
 * rekap bulanan SPMB. Dites unit; pengunduhan lewat `downloadCsv`.
 */
import { buildCsv } from "./csv";
import type { AnalyticsSummary } from "./queries/analytics";

export interface SpmbRecapRow {
  month: string;
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

/** Ringkasan analitik → CSV: tren harian + halaman terpopuler + perujuk + perangkat. */
export function buildAnalyticsCsv(data: AnalyticsSummary, periodLabel: string): string {
  const sections: string[] = [];

  sections.push(`# Laporan Analitik Situs — ${periodLabel}`);
  sections.push(`# Total page views;${data.total_views ?? 0}`);
  sections.push("");

  sections.push(
    buildCsv(
      ["Tanggal", "Page Views"],
      (data.daily ?? []).map((d) => [d.day.slice(0, 10), d.views])
    )
  );
  sections.push("");
  sections.push(
    buildCsv(
      ["Halaman Terpopuler", "Views"],
      (data.top_paths ?? []).map((p) => [p.path, p.views])
    )
  );
  sections.push("");
  sections.push(
    buildCsv(
      ["Perujuk", "Views"],
      (data.top_referrers ?? []).map((r) => [r.host ?? "Langsung / Direct", r.views])
    )
  );
  sections.push("");
  sections.push(
    buildCsv(
      ["Perangkat", "Views"],
      (data.devices ?? []).map((d) => [d.device_class, d.views])
    )
  );

  return sections.join("\r\n");
}

/** Kelompokkan pendaftar per bulan daftar (YYYY-MM) untuk rekap bulanan. */
export function buildSpmbMonthlyRecap(
  rows: { status: string; created_at: string }[]
): SpmbRecapRow[] {
  const map = new Map<string, SpmbRecapRow>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = map.get(month) ?? { month, total: 0, pending: 0, accepted: 0, rejected: 0 };
    cur.total += 1;
    if (r.status === "pending") cur.pending += 1;
    else if (r.status === "accepted") cur.accepted += 1;
    else if (r.status === "rejected") cur.rejected += 1;
    map.set(month, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
}

/** Rekap bulanan SPMB → CSV siap unduh. */
export function buildSpmbRecapCsv(recap: SpmbRecapRow[]): string {
  return buildCsv(
    ["Bulan", "Total", "Menunggu", "Diterima", "Ditolak"],
    recap.map((r) => [r.month, r.total, r.pending, r.accepted, r.rejected])
  );
}
