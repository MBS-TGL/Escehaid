import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import { getCachedAnalytics } from "@/lib/queries/analytics";
import { periodRange, parsePeriod, PeriodSelector } from "@/components/admin/charts/PeriodSelector";
import { BarChartWithAxis, DeltaBadge } from "@/components/admin/charts";
import { InsightCard, InsightGrid } from "@/components/admin/charts/InsightCard";
import { ChartLine, Globe, Plus, Minus, Info } from "@/components/Icons";

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
  // periodMs = durasi periode aktif → pembanding = [from - periodMs, from).
  const cur = periodRange(period, now);
  const periodMs = now.getTime() - cur.from.getTime();
  const prevFrom = new Date(cur.from.getTime() - periodMs);

  const [curRes, prevRes] = await Promise.all([
    getCachedAnalytics(supabase, cur.from.toISOString(), now.toISOString()),
    getCachedAnalytics(supabase, prevFrom.toISOString(), cur.from.toISOString()),
  ]);

  const curData = curRes.data;
  const prevData = prevRes.data;

  // RPC null → izin ditolak / fungsi belum dijalankan (migrasi 0017). Tampilkan
  // empty state yang actionable, bukan halaman kosong.
  if (!curData) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <h1 className="text-lg font-bold text-slate-800">Analitik belum tersedia</h1>
        <p className="mt-2 text-sm text-slate-500">
          Fungsi agregat <code className="rounded bg-slate-100 px-1">admin_analytics_summary</code>{" "}
          belum ada — jalankan{" "}
          <code className="rounded bg-slate-100 px-1">npm run db:migrate</code>{" "}
          (migrasi 0017) supaya halaman ini aktif.
        </p>
      </div>
    );
  }

  const totalViews = curData.total_views ?? 0;
  const prevTotal = prevData?.total_views ?? 0;
  const avgDaily = curData.daily.length > 0 ? Math.round(totalViews / curData.daily.length) : 0;
  const counts = deviceCounts(curData.devices || []);
  // share dihitung terhadap SEMUA perangkat (mobile + tablet + desktop),
  // supaya angka % tidak melebihi 100.
  const knownViews = counts.mobile + counts.tablet + counts.desktop;
  const mobileShare = knownViews > 0 ? Math.round((counts.mobile / knownViews) * 100) : 0;

  const topPath = curData.top_paths?.[0]?.path ?? null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <ChartLine className="h-5 w-5 text-[var(--brand-accent)]" />
            Analitik Situs
          </h1>
          <p className="text-xs text-slate-500">
            Trafik publik tanpa cookie. Admin panel & halaman API tidak direkam.
          </p>
        </div>
        <PeriodSelector basePath="/admin/analytics" current={period} />
      </div>

      {/* KPI Ringkas */}
      <section aria-label="Ringkasan KPI" className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Page Views</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{totalViews}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            vs {period} hari sebelumnya:
            <DeltaBadge diff={delta(prevTotal, totalViews)} />
          </p>
        </div>
        <div className="rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Rata-rata Harian</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{avgDaily}</p>
          <p className="mt-1 text-[11px] text-slate-500">{curData.daily.length} hari terlacak</p>
        </div>
        <div className="rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Mobile Share</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">
            {typeof mobileShare === "number" ? `${mobileShare}%` : "—"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Pengunjung di HP</p>
        </div>
      </section>

      {/* Grafik harian */}
      <section aria-label="Tren harian" className="mb-6 rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-800">Tren Harian (WIB)</h2>
        {curData.daily.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500">Belum ada data — beacon baru mulai merekam hari ini.</p>
        ) : (
          <BarChartWithAxis data={toChartData(curData.daily)} height={160} />
        )}
      </section>

      {/* Insight strip */}
      <section aria-label="Insight" className="mb-6">
        <InsightGrid>
          <InsightCard
            title={topPath ? `Halaman terpopuler: ${topPath}` : "Belum ada halaman terpopuler"}
            body={
              topPath
                ? "Posisi 1 pada periode ini. Tinjau isi halaman; bila relevan tautkan ke berita terbit berikutnya."
                : "Beacon baru berjalan — data halaman muncul setelah pengunjung datang."
            }
            tone={topPath ? "info" : "idle"}
            icon={<Globe className="h-4 w-4 text-blue-600" />}
          />
          <InsightCard
            title={mobileShare >= 50 ? "Mayoritas pengunjung dari HP" : "Pengunjung berimbang"}
            body={
              mobileShare === 0
                ? "Belum cukup data untuk membandingkan perangkat."
                : `${mobileShare}% page views berasal dari mobile. Pastikan layout & gambar tetap ringan untuk HP.`
            }
            tone={mobileShare >= 60 ? "warn" : "ok"}
            icon={mobileShare >= 50 ? <Minus className="h-4 w-4 text-amber-600" /> : <Plus className="h-4 w-4 text-emerald-600" />}
          />
        </InsightGrid>
      </section>

      {/* Sumber trafik & perangkat */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Globe className="h-4 w-4 text-blue-600" /> Halaman Terpopuler
          </h2>
          {(curData.top_paths?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">Belum ada data.</p>
          ) : (
            <ol className="divide-y divide-slate-50">
              {curData.top_paths.slice(0, 8).map((p, i) => (
                <li key={p.path} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-5 text-right text-xs font-bold text-slate-400 tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700">{p.path}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-600 tabular-nums">{p.views}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-slate-800">Sumber Perujuk</h2>
          {(curData.top_referrers?.length ?? 0) === 0 ? (
            <p className="flex items-center justify-center gap-1.5 py-6 text-center text-xs text-slate-400">
              <Info className="h-3.5 w-3.5" /> Belum ada perujuk eksternal.
            </p>
          ) : (
            <ol className="divide-y divide-slate-50">
              {curData.top_referrers.slice(0, 8).map((r) => (
                <li key={r.host ?? "unknown"} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 truncate text-slate-700">{r.host ?? "tidak diketahui"}</span>
                  <span className="text-xs font-semibold text-slate-600 tabular-nums">{r.views}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
