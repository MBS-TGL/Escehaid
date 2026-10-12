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
};

function Dropdown({
  triggerLabel,
  menuLabel,
  currentKey,
  options,
  onChoose,
  icon,
  badge,
}: DropdownProps) {
  const { open, toggle, triggerRef, menuRef, menuId, panelStyle, onMenuKeyDown } = useMenu({
    menuMinWidth: 180,
  });

  return (
    <>
      {/* grow → pill melebar mengisi sisa baris (fit-width): baris terisi
          penuh sampai tepi, tak ada jarak menggantung. Overflow ditangani
          flex-wrap baris induk, jadi label tidak pernah terpotong. */}
      <div className="relative grow">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={menuLabel}
          onClick={toggle}
          className="inline-flex min-h-10 w-full items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-white py-2 pl-2 pr-1.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#1767b1]/40 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
            <span className="min-w-0 max-w-[9rem] truncate">{triggerLabel}</span>
            {typeof badge === "number" && (
              <span className="rounded-full bg-[#082b59] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums">
                {badge}
              </span>
            )}
          </span>
          <CaretDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
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
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {typeof opt.count === "number" && (
                  <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">
                    {opt.count}
                  </span>
                )}
                {active && <Checks className="h-4 w-4 shrink-0 text-[#1767b1]" />}
              </MenuItem>
            );
          })}
        </MenuPanel>
      </div>
    </>
  );
}

/**
 * Toolbar mobile (< md) — **dua baris**:
 *   baris 1 — pencarian (melebar) + aksi (mis. tombol "Pilih");
 *   baris 2 — pill dropdown filter (dengan jumlah) + dropdown filter kedua
 *   opsional (filter2) + dropdown urut, digulir mendatang bila tak muat.
 *
 * Aksi sengaja berada di baris pencarian: bila ikut baris pill, tombol wrap
 * ke baris ketiga saat tak muat di layar 360–390px (toolbar jadi 3 baris).
 * Pill baris 2 tanpa ikon + padding ringkas agar tiga pill (status + tipe +
 * urut) muat satu baris di layar 360–430px dan **terlihat penuh** — tanpa
 * scroll mendatang (dulu pill terpotong di tepi kanan). Bila tetap tak muat,
 * pill wrap ke baris berikutnya, tidak pernah terpotong. Setiap pill juga
 * `grow` + `justify-between` (**fit-width**): baris terisi penuh sampai tepi
 * kanan, tak ada jarak menggantung antara pill terakhir dan tepi.
 *
 * Saat `selectMode`, kedua baris digantikan bar mode pilih (jumlah dipilih +
 * Pilih semua + Selesai) — desktop tetap memakai toolbar lamanya (tab +
 * pencarian), jadi komponen ini selalu dirender `md:hidden`.
 */
export function MobileFilterBar({
  query,
  onQueryChange,
  placeholder = "Cari…",
  searchLabel = "Cari",
  filter,
  filter2,
  sort,
  action,
  selectMode = false,
  selectedCount = 0,
  allSelected = false,
  onSelectAllVisible,
  onCancelSelect,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  searchLabel?: string;
  filter?: {
    value: string;
    options: MobileFilterOption[];
    onChange: (key: string) => void;
  };
  /**
   * Filter kedua (opsional) — mis. tipe kegiatan di halaman Kegiatan.
   * Tampil sebagai pill kedua di baris filter, sebelum urut.
   */
  filter2?: {
    value: string;
    options: MobileFilterOption[];
    onChange: (key: string) => void;
    /** Ikon kiri tombol (opsional — default tanpa ikon; hemat ruang di layar kecil). */
    icon?: ReactNode;
  };
  sort?: {
    value: string;
    options: MobileSortOption[];
    onChange: (key: string) => void;
  };
  /** Aksi tambahan di ujung kanan baris pertama, sebelah pencarian (mis. tombol "Pilih"). */
  action?: ReactNode;
  selectMode?: boolean;
  selectedCount?: number;
  allSelected?: boolean;
  onSelectAllVisible?: () => void;
  onCancelSelect?: () => void;
}) {
  const currentFilter = filter?.options.find((o) => o.key === filter.value);
  const currentFilter2 = filter2?.options.find((o) => o.key === filter2.value);
  const currentSort = sort?.options.find((o) => o.key === sort.value);

  if (selectMode) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#1767b1]/30 bg-[#1767b1]/5 px-3 py-2.5 md:hidden">
        <span aria-live="polite" className="flex items-center gap-1.5 text-sm font-semibold text-[#082b59]">
          <Checks className="h-4 w-4 shrink-0" />
          {selectedCount} dipilih
        </span>
        <div className="ml-auto flex items-center gap-2">
          {onSelectAllVisible && (
            <button
              type="button"
              onClick={onSelectAllVisible}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[#1767b1]/40 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
            >
              {allSelected ? "Hapus centang" : "Pilih semua"}
            </button>
          )}
          {onCancelSelect && (
            <button
              type="button"
              onClick={onCancelSelect}
              className="min-h-10 rounded-lg px-2 text-xs font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-slate-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
            >
              Selesai
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-2 md:hidden">
      {/* Baris 1 — pencarian (melebar) + aksi. Pindah ke baris ini agar
          toolbar tetap dua baris (dulu "Pilih" ikut baris pill & wrap ke
          baris ketiga di layar 360–390px). */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            aria-label={searchLabel}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-base focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
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
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>

      {/* Baris 2 — pill filter + urut: `grow` → semua pill melebar mengisi
          baris sampai tepi (fit-width, tanpa jarak menggantung); tanpa ikon &
          padding ringkas agar tiga pill Kegiatan tetap muat satu baris di
          360–430px; `flex-wrap` sebagai cadangan bila label sangat panjang. */}
      <div className="flex flex-wrap items-center gap-2">
        {filter && (
          <Dropdown
            triggerLabel={currentFilter?.label ?? "Filter"}
            menuLabel="Filter status"
            currentKey={filter.value}
            options={filter.options}
            onChoose={filter.onChange}
            badge={currentFilter?.count}
          />
        )}
        {filter2 && (
          <Dropdown
            triggerLabel={currentFilter2?.label ?? "Filter"}
            menuLabel="Filter tambahan"
            currentKey={filter2.value}
            options={filter2.options}
            onChoose={filter2.onChange}
            icon={filter2.icon}
            badge={currentFilter2?.count}
          />
        )}
        {sort && (
          <Dropdown
            triggerLabel={currentSort?.label ?? "Urut"}
            menuLabel="Urutkan"
            currentKey={sort.value}
            options={sort.options}
            onChoose={sort.onChange}
          />
        )}
      </div>
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
      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 pl-2.5 pr-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#1767b1]/40 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
    >
      <CheckSquare className="h-4 w-4 shrink-0 text-[#1767b1]" />
      Pilih
    </button>
  );
}
