/**
 * Selector periode (7/30/90 hari) — server component, dipakai di
 * /admin/analytics. Nilai period dibawa di query string (`?p=30`) supaya
 * bisa di-copy/share dan server-side re-render tidak butuh state client.
 */
import Link from "next/link";

export const PERIODS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

export function isPeriod(value: unknown): value is PeriodDays {
  const num = typeof value === "number" ? value : Number(value);
  return (PERIODS as readonly number[]).includes(num);
}

export function parsePeriod(value: string | undefined): PeriodDays {
  const num = Number(value);
  return isPeriod(num) ? num : 30;
}

/** Link selector: `currentHref` tetap dipertahankan (dgn path asal), hanya `p` diganti. */
export function PeriodSelector({
  basePath,
  current,
  extraQuery = {},
  className = "",
}: {
  basePath: string;
  current: PeriodDays;
  extraQuery?: Record<string, string | undefined>;
  className?: string;
}) {
  const qs = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(extraQuery)) {
      if (v !== undefined && v !== "") sp.set(k, v);
    }
    sp.set("p", String(p));
    return `?${sp.toString()}`;
  };
  const btn = (p: PeriodDays) => {
    const active = p === current;
    return (
      <Link
        key={p}
        href={`${basePath}${qs(p)}`}
        aria-current={active ? "page" : undefined}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${
          active
            ? "bg-[var(--brand-primary)] text-white shadow-sm"
            : "bg-white text-slate-600 hover:bg-slate-50 hover:text-[var(--brand-primary)]"
        }`}
      >
        {p} Hari
      </Link>
    );
  };
  return (
    <nav aria-label="Periode analitik" className={`inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm ${className}`}>
      {PERIODS.map(btn)}
    </nav>
  );
}

/** Kalkulator periode murni — dipisah agar bisa di-unit test.
 *
 *  Batas harian pakai zona WIB (UTC+7, tanpa DST) supaya "hari ini" sama dengan
 *  yang tampil di halaman admin lain. Implementasi: geser `now` +7 jam, ratakan
 *  ke awal "hari WIB", geser nilai "menyusul" sesuai periode, lalu geser balik
 *  ke UTC.
 */
export function periodRange(days: PeriodDays, now: Date): { from: Date; to: Date } {
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const DAY_MS = 86400_000;

  const shifted = new Date(now.getTime() + WIB_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0); // awal hari-ini WIB
  // Mulai: hari-ini − (days−1)
  const fromShifted = new Date(shifted.getTime() - (days - 1) * DAY_MS);

  return {
    from: new Date(fromShifted.getTime() - WIB_OFFSET_MS),
    to: now,
  };
}
