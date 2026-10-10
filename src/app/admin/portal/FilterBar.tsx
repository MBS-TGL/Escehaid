"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { MagnifyingGlass, X, Funnel, CaretDown, Checks } from "@/components/Icons";
import { useFloatingPanel } from "@/components/ui/useFloatingPanel";

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
 * Baris filter: input pencarian + dropdown status (di samping pencarian).
 *
 * Dulu4 chip label panjang berdampingan → di layar sempit wrap ke dua baris
 * (lalu diganti nowrap + scroll). Kini satu tombol dropdown ("Semua" + badge
 * jumlah) yang membuka menu; baris pencarian tetap selalu satu baris di semua
 * lebar, dan jumlah tiap status tidak hilang — pindah ke dalam menu.
 *
 * Menu memakai `useFloatingPanel` (fixed, flip atas/bawah, re-posisi saat
 * scroll/resize) dan pola ARIA yang sama dengan StatusPill di halaman ini:
 * aria-haspopup="menu", role="menu"/"menuitem", panah berpindah antar opsi,
 * Esc/klik luar menutup + fokus kembali ke tombol.
 */
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
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const { pos, reposition } = useFloatingPanel({
    triggerRef,
    open,
    maxHeight: 260,
    minFit: 200,
    gap: 6,
  });

  const current = CHIPS.find((c) => c.key === filter) ?? CHIPS[0];

  // Buka → fokus ke opsi aktif; tutup → kembalikan fokus ke tombol.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      menuRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  // Klik di luar wrap & menu (portal) → tutup.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Esc → tutup saja; capture + stopPropagation mencegah Modal/panel di
  // belakangnya ikut tertutup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!triggerRef.current) return;
    // Hitung posisi dalam batch yang sama dengan setOpen (tanpa frame kosong).
    reposition();
    setOpen(true);
  }

  // Panah atas-bawah / Home / End berpindah antar opsi menu.
  function onMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % items.length;
    else next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  function choose(key: PortalFilter) {
    onFilterChange(key);
    setOpen(false);
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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

      <div ref={wrapRef} className="relative shrink-0 self-start sm:self-auto">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={`Filter status — ${current.label}`}
          onClick={toggle}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#1767b1]/40 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
        >
          <Funnel className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{current.label}</span>
          <span className="rounded-full bg-[#082b59] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums">
            {counts[filter]}
          </span>
          <CaretDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && pos && (
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Filter status"
            onKeyDown={onMenuKeyDown}
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: Math.max(pos.width, 180),
              maxHeight: pos.maxHeight,
              zIndex: 10000,
            }}
            className="overflow-y-auto rounded-xl border border-[#dce3ed] bg-white p-1.5 shadow-xl shadow-slate-900/10"
          >
            {CHIPS.map((chip) => {
              const active = filter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  role="menuitem"
                  aria-current={active ? "true" : undefined}
                  data-active={active}
                  onClick={() => choose(chip.key)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1767b1]"
                >
                  <span className="min-w-0 flex-1 truncate">{chip.label}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">
                    {counts[chip.key]}
                  </span>
                  {active && <Checks className="h-4 w-4 shrink-0 text-[#1767b1]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
