"use client";

import { MagnifyingGlass, X } from "@/components/Icons";

export type PortalFilter = "all" | "active" | "soon" | "inactive";

// Label mengikuti tiga status di StatusControl; jumlah tiga chip terakhir
// (Tayang + Segera Hadir + Disembunyikan) selalu berjumlah sama dengan Total.
const CHIPS: { key: PortalFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Tayang" },
  { key: "soon", label: "Segera Hadir" },
  { key: "inactive", label: "Disembunyikan" },
];

/** Input pencarian + chip filter (Semua / Aktif / Segera Hadir / Nonaktif). */
export function FilterBar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  counts,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filter: PortalFilter;
  onFilterChange: (value: PortalFilter) => void;
  counts: Record<PortalFilter, number>;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Cari nama atau deskripsi..."
          aria-label="Cari aplikasi portal"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Bersihkan pencarian"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onFilterChange(chip.key)}
              aria-pressed={active}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-[#082b59] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-[#1767b1]/40 hover:text-[#082b59]"
              }`}
            >
              {chip.label} ({counts[chip.key]})
            </button>
          );
        })}
      </div>
    </div>
  );
}
