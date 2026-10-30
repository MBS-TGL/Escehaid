"use client";

import type { ReactNode } from "react";
import { Checks, CaretDown, CheckSquare, MagnifyingGlass, X } from "@/components/Icons";
import { useMenu } from "./useMenu";
import { MenuPanel, MenuItem } from "./Menu";

export type MobileFilterOption = {
  key: string;
  label: string;
  /** Jumlah item untuk opsi ini (opsional — tampil di menu & badge). */
  count?: number;
};

export type MobileSortOption = {
  key: string;
  label: string;
};

type DropdownProps = {
  triggerLabel: string;
  menuLabel: string;
  currentKey: string;
  options: { key: string; label: string; count?: number }[];
  onChoose: (key: string) => void;
  /** Ikon kiri tombol pemicu (opsional — default tanpa ikon, hemat ruang). */
  icon?: ReactNode;
  /** Badge angka di samping label tombol (nilainya saat ini). */
  badge?: number;
  /** Tampilkan label dalam Capitalize Each Word (filter; bukan urutan). */
  capitalize?: boolean;
  /** Mode ringkas: hanya tampilkan ikon (atau label pendek bila tanpa ikon) + indikator aktif */
  compact?: boolean;
  /** Title tooltip saat hover/fokus */
  title?: string;
};

function Dropdown({
  triggerLabel,
  menuLabel,
  currentKey,
  options,
  onChoose,
  icon,
  badge,
  capitalize = false,
  compact = false,
  title,
}: DropdownProps) {
  const { open, toggle, triggerRef, menuRef, menuId, panelStyle, onMenuKeyDown } = useMenu({
    menuMinWidth: 180,
  });

  const isFiltered = currentKey !== "all" && currentKey !== "";

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={menuLabel}
        title={title || menuLabel}
        onClick={toggle}
        className={`flex h-11 w-full min-w-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${
          isFiltered
            ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5 text-[var(--brand-primary)] font-semibold shadow-xs"
            : "border-slate-200 bg-white text-slate-700 hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-primary)]"
        } ${compact ? "px-1.5" : "gap-1.5 pl-2.5 pr-2 text-sm font-semibold"}`}
      >
        {icon && (
          <span className={`shrink-0 ${isFiltered ? "text-[var(--brand-primary)]" : "text-slate-500"}`}>
            {icon}
          </span>
        )}
        {!compact && (
          <span className={`min-w-0 flex-1 truncate text-left${capitalize ? " capitalize" : ""}`}>
            {triggerLabel}
          </span>
        )}
        {!compact && typeof badge === "number" && (
          <span className="shrink-0 rounded-full bg-[var(--brand-primary)] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums">
            {badge}
          </span>
        )}
        {compact && isFiltered && (
          <span
            aria-hidden="true"
            className="ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]"
          />
        )}
        <CaretDown
          className={`shrink-0 text-slate-400 transition-transform ${compact ? "h-3 w-3 ml-0.5" : "h-3.5 w-3.5"} ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <MenuPanel
        id={menuId}
        label={menuLabel}
        innerRef={menuRef}
        style={panelStyle}
        onKeyDown={onMenuKeyDown}
      >
        {options.map((opt) => {
          const active = opt.key === currentKey;
          return (
            <MenuItem
              key={opt.key}
              active={active}
              onClick={() => {
                toggle();
                onChoose(opt.key);
              }}
            >
              <span className={`min-w-0 flex-1 break-words leading-snug${capitalize ? " capitalize" : ""}`}>{opt.label}</span>
              {typeof opt.count === "number" && (
                <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">
                  {opt.count}
                </span>
              )}
              {active && <Checks className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />}
            </MenuItem>
          );
        })}
      </MenuPanel>
    </div>
  );
}

/**
 * Toolbar mobile (< md):
 *   baris 1 — pencarian penuh (44px, r12);
 *   baris kontrol berikutnya — `Filter (dropdown + jumlah)` · `Urut` · aksi
 *   (mis. "Pilih"), semuanya 44px; pill filter/urut membagi sisa ruang
 *   (flex-1, label terpotong bila perlu), aksi `shrink-0` di kanan.
 *
 * Dua layout baris kontrol:
 *   • ≤3 kontrol (mis. Filter · Urut · Pilih) — SATU baris, seperti sebelumnya;
 *   • 4 kontrol (ada `filter2`, mis. Kategori · Tahun · Urut · Pilih di
 *     halaman Prestasi/Galeri/Kegiatan) — DUA baris: [filter · filter2] lalu
 *     [urut · aksi]. Tanpa ini, di layar 360px keempat pill terdesak sampai
 *     labelnya tinggal huruf pertama ("S… 3", "Terb…").
 *
 * Saat `selectMode`, kedua baris digantikan `MobileSelectModeBar` (label mode +
 * Pilih semua). Jumlah terpilih dan tombol keluar ada di MobileSelectBar yang
 * menempel di atas bottom nav — desktop tetap memakai toolbar lamanya (tab +
 * pencarian), jadi komponen ini selalu dirender `md:hidden`.
 *
 * `MobileSelectModeBar` diekspor terpisah agar halaman tanpa MobileFilterBar
 * (mis. Pengguna, yang memakai FilterBar) tetap punya bar yang sama.
 */

/**
 * Bar mode pilih versi ringkas: label mode + "Pilih semua". Jumlah terpilih
 * dan tombol keluar tinggal di MobileSelectBar yang menempel di atas bottom
 * nav, supaya tidak ada dua hitungan/tombol keluar di layar yang sama.
 */
export function MobileSelectModeBar({
  selectedCount = 0,
  allSelected = false,
  onSelectAllVisible,
}: {
  selectedCount?: number;
  allSelected?: boolean;
  onSelectAllVisible?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/5 px-3 py-2 md:hidden">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)]">
        <Checks className="h-4 w-4 shrink-0" />
        Mode pilih
      </span>
      {onSelectAllVisible && (
        <button
          type="button"
          onClick={onSelectAllVisible}
          aria-label={allSelected ? "Hapus centang semua" : `Pilih semua ${selectedCount} item`}
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
        >
          {allSelected ? "Hapus centang" : "Pilih semua"}
        </button>
      )}
    </div>
  );
}

export function MobileFilterBar({
  query,
  onQueryChange,
  placeholder = "Cari…",
  searchLabel = "Cari",
  filter,
  filter2,
  filter3,
  filter4,
  compactFilters = false,
  sort,
  action,
  selectMode = false,
  selectedCount = 0,
  allSelected = false,
  onSelectAllVisible,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  searchLabel?: string;
  filter?: {
    value: string;
    options: MobileFilterOption[];
    onChange: (key: string) => void;
    /** aria-label tombol & menu (mis. "Filter status"). */
    menuLabel?: string;
    /** Ikon kiri tombol (opsional). */
    icon?: ReactNode;
  };
  /**
   * Filter kedua (opsional) — mis. tipe kegiatan di halaman Kegiatan.
   * Tampil sebagai pill kedua di baris filter, sebelum urut.
   */
  filter2?: {
    value: string;
    options: MobileFilterOption[];
    onChange: (key: string) => void;
    /** aria-label tombol & menu (mis. "Filter jalur"). */
    menuLabel?: string;
    /** Ikon kiri tombol (opsional — default tanpa ikon; hemat ruang di layar kecil). */
    icon?: ReactNode;
  };
  /**
   * Filter ketiga (opsional) — mis. program di halaman SPMB. Bila ada,
   * baris kontrol dipecah: [filter · filter2] / [filter3 · urut · aksi].
   */
  filter3?: {
    value: string;
    options: MobileFilterOption[];
    onChange: (key: string) => void;
    /** aria-label tombol & menu (mis. "Filter program"). */
    menuLabel?: string;
    /** Ikon kiri tombol (opsional). */
    icon?: ReactNode;
  };
  /**
   * Filter keempat (opsional) — mis. jenis kelamin di halaman SPMB. Bila ada,
   * baris kontrol dipecah: [filter · filter2] / [filter3 · filter4] / [urut · aksi].
   */
  filter4?: {
    value: string;
    options: MobileFilterOption[];
    onChange: (key: string) => void;
    /** aria-label tombol & menu (mis. "Filter jenis kelamin"). */
    menuLabel?: string;
    /** Ikon kiri tombol (opsional). */
    icon?: ReactNode;
  };
  /**
   * Jadikan filter-filter dalam 1 baris grid kompak (khusus ikon + status aktif).
   * Urut & Aksi ditaruh di baris tersendiri di bawahnya.
   */
  compactFilters?: boolean;
  sort?: {
    value: string;
    options: MobileSortOption[];
    onChange: (key: string) => void;
  };
  /** Aksi tambahan di ujung kanan baris kedua, sebelah urut (mis. tombol "Pilih"). */
  action?: ReactNode;
  selectMode?: boolean;
  selectedCount?: number;
  allSelected?: boolean;
  onSelectAllVisible?: () => void;
}) {
  const currentFilter = filter?.options.find((o) => o.key === filter.value);
  const currentFilter2 = filter2?.options.find((o) => o.key === filter2.value);
  const currentFilter3 = filter3?.options.find((o) => o.key === filter3.value);
  const currentFilter4 = filter4?.options.find((o) => o.key === filter4.value);
  const currentSort = sort?.options.find((o) => o.key === sort.value);

  /** Ada filter tambahan + (urut/aksi) → baris kontrol dipecah jadi dua. */
  const stackedControls = !!((filter && (filter2 || filter3 || filter4)) && (sort || action));

  const filterDropdown = filter && (
    <Dropdown
      triggerLabel={currentFilter?.label ?? "Filter"}
      menuLabel={filter.menuLabel ?? "Filter"}
      currentKey={filter.value}
      options={filter.options}
      onChoose={filter.onChange}
      icon={filter.icon}
      badge={currentFilter?.count}
      capitalize
      compact={compactFilters}
    />
  );
  const filter2Dropdown = filter2 && (
    <Dropdown
      triggerLabel={currentFilter2?.label ?? "Filter"}
      menuLabel={filter2.menuLabel ?? "Filter tambahan"}
      currentKey={filter2.value}
      options={filter2.options}
      onChoose={filter2.onChange}
      icon={filter2.icon}
      badge={currentFilter2?.count}
      capitalize
      compact={compactFilters}
    />
  );
  const filter3Dropdown = filter3 && (
    <Dropdown
      triggerLabel={currentFilter3?.label ?? "Filter"}
      menuLabel={filter3.menuLabel ?? "Filter tambahan"}
      currentKey={filter3.value}
      options={filter3.options}
      onChoose={filter3.onChange}
      icon={filter3.icon}
      badge={currentFilter3?.count}
      capitalize
      compact={compactFilters}
    />
  );
  const filter4Dropdown = filter4 && (
    <Dropdown
      triggerLabel={currentFilter4?.label ?? "Filter"}
      menuLabel={filter4.menuLabel ?? "Filter tambahan"}
      currentKey={filter4.value}
      options={filter4.options}
      onChoose={filter4.onChange}
      icon={filter4.icon}
      badge={currentFilter4?.count}
      capitalize
      compact={compactFilters}
    />
  );
  const sortDropdown = sort && (
    <Dropdown
      triggerLabel={currentSort?.label ?? "Urut"}
      menuLabel="Urutkan"
      currentKey={sort.value}
      options={sort.options}
      onChoose={sort.onChange}
    />
  );
  const actionGroup = action && (
    <div className={`flex shrink-0 items-center gap-2${stackedControls || compactFilters ? " ml-auto" : ""}`}>{action}</div>
  );

  if (selectMode) {
    return (
      <MobileSelectModeBar
        selectedCount={selectedCount}
        allSelected={allSelected}
        onSelectAllVisible={onSelectAllVisible}
      />
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-2 md:hidden">
      {/* Baris 1 — pencarian penuh (44px, r12). */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            aria-label={searchLabel}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-base focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Baris kontrol */}
      {compactFilters ? (
        <>
          {/* Baris 2: 4 filter ikon dalam 1 baris */}
          <div className="grid grid-cols-4 gap-2">
            {filterDropdown}
            {filter2Dropdown}
            {filter3Dropdown}
            {filter4Dropdown}
          </div>
          {/* Baris 3: Urutkan + Aksi (Pilih) */}
          {(sortDropdown || actionGroup) && (
            <div className="flex items-center gap-2">
              {sortDropdown}
              {actionGroup}
            </div>
          )}
        </>
      ) : stackedControls ? (
        <>
          <div className="flex items-center gap-2">
            {filterDropdown}
            {filter2Dropdown}
          </div>
          {(filter3Dropdown || filter4Dropdown) && (
            <div className="flex items-center gap-2">
              {filter3Dropdown}
              {filter4Dropdown}
            </div>
          )}
          <div className="flex items-center gap-2">
            {sortDropdown}
            {actionGroup}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          {filterDropdown}
          {filter2Dropdown}
          {filter3Dropdown}
          {filter4Dropdown}
          {sortDropdown}
          {actionGroup}
        </div>
      )}
    </div>
  );
}

/** Tombol "Pilih" bawaan untuk `action` MobileFilterBar. */
export function MobilePickButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Masuk mode pilih"
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white pl-2.5 pr-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
    >
      <CheckSquare className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
      Pilih
    </button>
  );
}
