/**
 * Primitif chart SVG tanpa dependensi — dipakai /admin/analytics & dashboard.
 *
 * Aturan umum:
 *  - Input selalu `number[]` (sehari = satu nilai), `null` = tidak tahu/reload.
 *  - Server-component friendly: tak ada state, tak ada event listener.
 *  - Warna dari variabel brand CSS agar ikut tema situs.
 */

const BRAND = "var(--brand-primary)";
const GRID = "#e2e8f0";

/** Sumbu label kompak: "12 Jul". */
export function dayLabelHid(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);
}

/** Kumpulan util skala bersama. */
function scaleMax(values: (number | null)[]): number {
  const real = values.filter((v): v is number => v !== null);
  const max = Math.max(...real, 0);
  return max <= 0 ? 4 : max;
}

/** Fungsi jejak path polyline dari nilai (di-skip bila null? tidak: null=0). */
export function linePath(values: number[], width: number, height: number, max: number): string {
  if (values.length === 0) return "";
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((v, i) => {
      const x = i * stepX;
      // 2px padding atas & dasar agar garis tidak menyentuh tepi svg.
      const y = height - 2 - ((v / max) * (height - 4));
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${Math.max(2, y).toFixed(2)}`;
    })
    .join(" ");
}

/* ─── Sparkline — garis kecil di kartu statistik ─────────────────────────── */

export function Sparkline({
  values,
  width = 96,
  height = 28,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length === 0) return <span className={`inline-block ${className}`} style={{ width, height }} />;
  const max = scaleMax(values);
  const path = linePath(values, width, height, max);
  // Area di bawah digaris bawah (fill transparan) agar bentuk lebih terbaca
  // pada kartu kecil.
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={className}
      role="presentation"
    >
      <path d={area} fill={BRAND} fillOpacity="0.08" />
      <path d={path} fill="none" stroke={BRAND} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ─── TrendChart — batang harian dengan label ────────────────────────────── */

export function BarChart({
  data,
  height = 160,
  className = "",
}: {
  /** Pasangan (label, jumlah) — label seperti "2026-10-12". */
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
}) {
  if (data.length === 0) return null;
  const max = scaleMax(data.map((d) => d.value));
  return (
    <div className={`flex items-end gap-[3px] ${className}`} style={{ height }}>
      {data.map((d) => {
        const pct = max <= 0 ? 0 : (d.value / max) * 100;
        return (
          <div
            key={d.label}
            className="group relative flex min-w-0 flex-1 flex-col justify-end"
            title={`${dayLabelHid(d.label)}: ${d.value}`}
          >
            {/* Batang min-height 2 agar titik data 0 tetap terlihat di ujung dasar.
                `group-hover` memakai warna accent agar posisi aktif terlihat. */}
            <div
              className="w-full rounded-t-sm transition-all duration-200 group-hover:bg-[var(--brand-primary)]/80"
              style={{ height: `max(2px, ${pct}%)`, background: pct > 0 ? BRAND : GRID }}
            />
            {/* Label hanya tampil via title tooltip — ruang terlalu kecil
                untuk tulis tiap hari; sumbu diberi garis dasar tipis. */}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Axises — bar chart + sumbu bawah (7 pilihan default: 7/30/90) ──────── */

export function BarChartWithAxis({
  data,
  height = 160,
  className = "",
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <BarChart data={data} height={height} />
      {/* Garis dasar */}
      <div className="mt-1 h-px w-full bg-slate-100" />
      {/* Maksimal 6 label agar tidak berdesakan di 30/90 hari. */}
      <RowLabels data={data} />
    </div>
  );
}

function RowLabels({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return null;
  const show = Math.min(6, data.length);
  const step = data.length > show ? data.length / (show - 1) : 1;
  const indices: number[] = [];
  for (let i = 0; i < show - 1; i += 1) indices.push(Math.round(i * step));
  indices.push(data.length - 1);
  const uniq = [...new Set(indices)];
  return (
    <div className="flex justify-between px-1 pt-1 text-[10px] tabular-nums text-slate-400">
      {uniq.map((i) => (
        <span key={i}>{dayLabelHid(data[i].label)}</span>
      ))}
    </div>
  );
}

/* ─── FunnelChart — funnel SPMB (pipeline) ───────────────────────────────── */

export function FunnelChart({
  tiers,
  className = "",
}: {
  tiers: { label: string; count: number; tone?: "brand" | "success" | "warning" }[];
  className?: string;
}) {
  const max = scaleMax(tiers.map((t) => t.count));
  const colorOf = (t: (typeof tiers)[number]) =>
    t.tone === "success" ? "bg-emerald-500/90" : t.tone === "warning" ? "bg-amber-500/90" : "bg-[var(--brand-primary)]/85";
  return (
    <ol className={`flex flex-col gap-1.5 ${className}`}>
      {tiers.map((t) => {
        const pct = max <= 0 ? 0 : (t.count / max) * 100;
        return (
          <li key={t.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-xs font-medium text-slate-600">{t.label}</span>
            <span className="relative h-6 min-w-0 flex-1 rounded-md bg-slate-50">
              <span
                className={`absolute inset-y-0 left-0 rounded-md ${colorOf(t)}`}
                style={{ width: `${pct}%` }}
              />
              <span className="absolute inset-y-0 left-2 flex items-center text-xs font-bold text-white tabular-nums drop-shadow-sm">
                {t.count}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Delta badge dengan segitiga trend (nanah: naik/hijau, turun/merah, datar). */
export function DeltaBadge({
  diff,
  className = "",
}: {
  diff: number | null;
  className?: string;
}) {
  if (diff === null) return null;
  const pinned = diff > 0 ? "▲" : diff < 0 ? "▼" : "—";
  const cls =
    diff > 0
      ? "bg-emerald-50 text-emerald-700"
      : diff < 0
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-500";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${cls} ${className}`}>
      {pinned} {Math.abs(diff)}
    </span>
  );
}

export { GRID };
