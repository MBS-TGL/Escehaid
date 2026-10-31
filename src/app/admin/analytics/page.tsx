import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import { getCachedAnalytics } from "@/lib/queries/analytics";
import { periodRange, parsePeriod, PeriodSelector } from "@/components/admin/charts/PeriodSelector";
import { BarChartWithAxis, DeltaBadge } from "@/components/admin/charts";
import { InsightCard, InsightGrid } from "@/components/admin/charts/InsightCard";
import { ChartLine, Globe, Plus, Minus, Info, Eye, DeviceMobile, CalendarBlank } from "@/components/Icons";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";

export const metadata: Metadata = {
  title: "Analitik",
};

/** Share jenis perangkat (jumlah) — dipakai kartu Mobile Share. */
function deviceCounts(devices: { device_class: string; views: number }[]) {
  return {
    mobile: devices.find((d) => d.device_class === "mobile")?.views ?? 0,
    tablet: devices.find((d) => d.device_class === "tablet")?.views ?? 0,
    desktop: devices.find((d) => d.device_class === "desktop")?.views ?? 0,
  };
}

/** Deret harian untuk chart: null = RPC gagal. */
function toChartData(daily: { day: string; views: number }[]) {
  return daily.map((d) => ({ label: d.day, value: d.views }));
}

function delta(previous: number, current: number): number | null {
  if (previous === 0 && current === 0) return 0;
  return current - previous;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(typeof sp.p === "string" ? sp.p : undefined);

  const supabase = await createClient();
  const now = new Date();

  // Periode aktif & periode pembanding (sama panjang, tepat sebelum).
  const cur = periodRange(period, now);
  const periodMs = now.getTime() - cur.from.getTime();
  const prevFrom = new Date(cur.from.getTime() - periodMs);

  const [curRes, prevRes] = await Promise.all([
    getCachedAnalytics(supabase, cur.from.toISOString(), now.toISOString()),
    getCachedAnalytics(supabase, prevFrom.toISOString(), cur.from.toISOString()),
  ]);

  const curData = curRes.data;
  const prevData = prevRes.data;

  // RPC null → izin ditolak / fungsi belum dijalankan (migrasi 0017).
  if (!curData) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3 shadow-2xs">
          <ChartLine className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Analitik belum tersedia</h1>
        <p className="mt-2 text-sm text-slate-500">
          Fungsi agregat <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">admin_analytics_summary</code>{" "}
          belum ada — jalankan{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">npm run db:migrate</code>{" "}
          (migrasi 0017) supaya halaman ini aktif.
        </p>
      </div>
    );
  }

  const totalViews = curData.total_views ?? 0;
  const prevTotal = prevData?.total_views ?? 0;
  const avgDaily = curData.daily.length > 0 ? Math.round(totalViews / curData.daily.length) : 0;
  const counts = deviceCounts(curData.devices || []);
  const knownViews = counts.mobile + counts.tablet + counts.desktop;
  const mobileShare = knownViews > 0 ? Math.round((counts.mobile / knownViews) * 100) : 0;
  const topPath = curData.top_paths?.[0]?.path ?? null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* ── Page Header Standar esceha ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-primary)]/10">
            <ChartLine className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Analitik Situs</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Statistik lalu lintas publik tanpa pelacak pihak ketiga (privacy-first)
            </p>
          </div>
        </div>
        <PeriodSelector basePath="/admin/analytics" current={period} />
      </div>

      {/* ── Metrik Cepat (StatPillGroup) ── */}
      <StatPillGroup>
        <StatPill icon={Eye} label="Page Views" value={totalViews} tone="neutral" />
        <StatPill icon={CalendarBlank} label="Rata-rata Harian" value={avgDaily} tone="info" />
        <StatPill icon={DeviceMobile} label="Mobile Share" value={`${mobileShare}%`} tone={mobileShare >= 60 ? "warning" : "success"} />
      </StatPillGroup>

      {/* ── KPI Ringkas Cards ── */}
      <section aria-label="Ringkasan KPI" className="mb-6 grid gap-3.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Page Views</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-800">{totalViews}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <span>vs {period} hari sebelumnya:</span>
            <DeltaBadge diff={delta(prevTotal, totalViews)} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Rata-rata Harian</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-800">{avgDaily}</p>
          <p className="mt-1.5 text-xs text-slate-500">{curData.daily.length} hari terlacak</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Mobile Share</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-800">
            {typeof mobileShare === "number" ? `${mobileShare}%` : "—"}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">Dari pengguna smartphone</p>
        </div>
      </section>

      {/* ── Grafik Tren Harian ── */}
      <section aria-label="Tren harian" className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs sm:p-6">
        <h2 className="mb-3 text-sm font-bold text-slate-800">Tren Kunjungan Harian (WIB)</h2>
        {curData.daily.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">Belum ada data — perekam baru mulai merekam hari ini.</p>
        ) : (
          <BarChartWithAxis data={toChartData(curData.daily)} height={160} />
        )}
      </section>

      {/* ── Insight Strip ── */}
      <section aria-label="Insight" className="mb-6">
        <InsightGrid>
          <InsightCard
            title={topPath ? `Halaman terpopuler: ${topPath}` : "Belum ada halaman terpopuler"}
            body={
              topPath
                ? "Paling sering dikunjungi pada periode ini. Pastikan informasinya selalu terbarui."
                : "Data halaman akan muncul secara otomatis setelah ada pengunjung."
            }
            tone={topPath ? "info" : "idle"}
            icon={<Globe className="h-4 w-4 text-[var(--brand-primary)]" />}
          />
          <InsightCard
            title={mobileShare >= 50 ? "Mayoritas pengunjung dari HP" : "Pengunjung berimbang"}
            body={
              mobileShare === 0
                ? "Belum cukup data untuk membandingkan perangkat."
                : `${mobileShare}% kunjungan berasal dari HP. Pastikan konten dan media responsif.`
            }
            tone={mobileShare >= 60 ? "warn" : "ok"}
            icon={mobileShare >= 50 ? <Minus className="h-4 w-4 text-amber-600" /> : <Plus className="h-4 w-4 text-emerald-600" />}
          />
        </InsightGrid>
      </section>

      {/* ── Sumber Trafik & Perangkat ── */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Globe className="h-4 w-4 text-[var(--brand-primary)]" />
            Halaman Terpopuler
          </h2>
          {(curData.top_paths?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Belum ada data kunjungan.</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {curData.top_paths.slice(0, 8).map((p, i) => (
                <li key={p.path} className="flex items-center gap-3 py-2.5 text-xs">
                  <span className="w-5 text-right font-bold text-slate-400 tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{p.path}</span>
                  <span className="shrink-0 font-bold text-slate-800 tabular-nums bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                    {p.views} views
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <h2 className="mb-3 text-sm font-bold text-slate-800">Sumber Perujuk</h2>
          {(curData.top_referrers?.length ?? 0) === 0 ? (
            <p className="flex items-center justify-center gap-1.5 py-8 text-center text-xs text-slate-400">
              <Info className="h-3.5 w-3.5 text-slate-400" /> Belum ada perujuk eksternal.
            </p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {curData.top_referrers.slice(0, 8).map((r) => (
                <li key={r.host ?? "unknown"} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                  <span className="min-w-0 truncate font-medium text-slate-700">{r.host ?? "Langsung / Direct"}</span>
                  <span className="font-bold text-slate-800 tabular-nums bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                    {r.views}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
