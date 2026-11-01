"use client";

import { Download } from "@/components/Icons";
import { buildAnalyticsCsv } from "@/lib/admin-reports";
import { downloadCsv } from "@/lib/download-csv";
import type { AnalyticsSummary } from "@/lib/queries/analytics";

/** Tombol ekspor CSV laporan analitik — data sudah dihitung server, tinggal unduh. */
export function AnalyticsExportButton({
  data,
  periodLabel,
}: {
  data: AnalyticsSummary;
  periodLabel: string;
}) {
  function handleExport() {
    const csv = buildAnalyticsCsv(data, periodLabel);
    downloadCsv(`analitik-situs-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
    >
      <Download className="h-3.5 w-3.5" /> Ekspor CSV
    </button>
  );
}
