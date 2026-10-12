"use client";

import { FilterBar as AdminFilterBar, type FilterOption } from "@/components/admin/FilterBar";

export type PortalFilter = "all" | "active" | "soon" | "inactive";

// Label mengikuti tiga status di StatusControl; jumlah tiga chip terakhir
// (Tayang + Segera Hadir + Disembunyikan) selalu berjumlah sama dengan Total.
const CHIPS: { key: PortalFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Tayang" },
  { key: "soon", label: "Segera Hadir" },
  { key: "inactive", label: "Disembunyikan" },
];

/**
 * Baris filter halaman Portal: input pencarian + dropdown status + aksi
 * (mis. "Pilih"). Kini adapter tipis atas `FilterBar` bersama
 * (`@/components/admin/FilterBar`) — gaya, ARIA, keyboard & flip horizontal
 * dikerjakan di komponen itu; halaman lain memakai komponen yang sama.
 */
export function FilterBar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  counts,
  action,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filter: PortalFilter;
  onFilterChange: (value: PortalFilter) => void;
  counts: Record<PortalFilter, number>;
  /** Aksi tambahan di ujung kanan baris (mis. tombol "Pilih" mode pilih mobile). */
  action?: React.ReactNode;
}) {
  const options: FilterOption[] = CHIPS.map((chip) => ({
    key: chip.key,
    label: chip.label,
    count: counts[chip.key],
  }));

  return (
    <AdminFilterBar
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Cari nama atau deskripsi..."
      searchLabel="Cari aplikasi portal"
      filters={[
        {
          value: filter,
          options,
          onChange: (key) => onFilterChange(key as PortalFilter),
          menuLabel: "Filter status",
        },
      ]}
      action={action}
    />
  );
}
