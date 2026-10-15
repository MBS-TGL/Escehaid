"use client";

import type { ReactNode } from "react";
import { CaretDown, Checks, Funnel, MagnifyingGlass, X } from "@/components/Icons";
import { MenuPanel, MenuItem, useMenu } from "@/components/admin/mobile";

/**
 * Toolbar filter daftar admin — mengikuti gaya halaman Portal: pencarian di
 * kiri (melebar), filter sebagai pill dropdown berikon + badge jumlah di
 * kanan. Menggantikan segmented tabs + `<select>` native yang dulu dipakai
 * di hampir semua halaman, agar satu bahasa UI di seluruh admin.
 *
 * Komponen ini responsif (di luar md pun tetap layak):
 *   < sm  → dua baris: pencarian selebar penuh, lalu dropdown (grow /
 *     fit-width — melebar mengisi baris, tak ada jarak menggantung) + aksi.
 *   ≥ sm  → satu baris: pencarian melebar (maks max-w-sm) di kiri.
 * Halaman yang punya `MobileFilterBar` sendiri cukup membungkusnya dengan
 * `hidden md:block` agar versi mobile tetap milik MobileFilterBar.
 *
 * Dropdown memakai `useMenu` + `MenuPanel` (portal ke body, flip atas/bawah,
 * klamp viewport, fokus ke opsi aktif saat dibuka) — primitif yang sama
 * dengan menu baris & MobileFilterBar, sehingga perilaku & gaya seragam.
 */
export type FilterOption = {
  key: string;
  label: string;
  /** Jumlah item untuk opsi ini — tampil sebagai angka di menu & badge tombol. */
  count?: number;
  /** Teks kecil kedua di bawah label (mis. hint bucket pada halaman Media). */
  hint?: string;
};

export type FilterGroup = {
  value: string;
  options: FilterOption[];
  onChange: (key: string) => void;
  /** aria-label tombol & menu, mis. "Filter status". */
  menuLabel: string;
  /** Ikon kiri tombol (default Funnel). */
  icon?: ReactNode;
};

function FilterDropdown({ group }: { group: FilterGroup }) {
  const { open, toggle, triggerRef, menuRef, menuId, panelStyle, onMenuKeyDown } = useMenu({
    menuMinWidth: 180,
  });
  const current = group.options.find((o) => o.key === group.value) ?? group.options[0];

  return (
    // grow: hanya berpengaruh saat baris selebar layar (<sm); pada ≥sm baris
    // berlebar konten sehingga grow tidak punya ruang → tampilan lama persis.
    <div className="relative grow">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${group.menuLabel} — ${current?.label ?? ""}`}
        onClick={toggle}
        className="inline-flex w-full items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 pl-2.5 pr-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] sm:gap-2 sm:pl-3 sm:pr-2.5"
      >
        <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="shrink-0 text-slate-400">{group.icon ?? <Funnel className="h-4 w-4" />}</span>
          <span className="min-w-0 max-w-[9rem] truncate">{current?.label}</span>
          {typeof current?.count === "number" && (
            <span className="rounded-full bg-[var(--brand-primary)] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums">
              {current.count}
            </span>
          )}
        </span>
        <CaretDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <MenuPanel id={menuId} label={group.menuLabel} innerRef={menuRef} style={panelStyle} onKeyDown={onMenuKeyDown}>
        {group.options.map((opt) => {
          const active = opt.key === group.value;
          return (
            <MenuItem
              key={opt.key || "all"}
              active={active}
              onClick={() => {
                toggle();
                group.onChange(opt.key);
              }}
            >
              <span className="min-w-0 flex-1 truncate">
                {opt.label}
                {opt.hint && (
                  <span className="block truncate text-xs font-normal text-slate-400">{opt.hint}</span>
                )}
              </span>
              {typeof opt.count === "number" && (
                <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">{opt.count}</span>
              )}
              {active && <Checks className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />}
            </MenuItem>
          );
        })}
      </MenuPanel>
    </div>
  );
}

export function FilterBar({
  query,
  onQueryChange,
  placeholder = "Cari…",
  searchLabel = "Cari",
  filters,
  action,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  searchLabel?: string;
  /** Satu grup filter per pill (mis. status + tipe kegiatan). */
  filters: FilterGroup[];
  /** Aksi tambahan di ujung kanan (mis. tombol "Pilih"). */
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
      <div className="relative w-full min-w-0 sm:w-auto sm:max-w-sm sm:flex-1">
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          aria-label={searchLabel}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
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

      <div className="flex w-full items-center gap-2 sm:w-auto">
        {filters.map((group) => (
          <FilterDropdown key={group.menuLabel} group={group} />
        ))}
        {action && <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">{action}</div>}
      </div>
    </div>
  );
}
