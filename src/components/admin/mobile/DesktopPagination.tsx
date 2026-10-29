"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CaretLeft, CaretRight } from "@/components/Icons";
import { useFloatingPanel } from "@/components/ui/useFloatingPanel";

/**
 * Footer tabel desktop (≥ md): selector "Tampilkan N baris" + info rentang +
 * tombol navigasi halaman (angka + arrow).
 *
 * Kalau halaman hanya 1 dan pageSize tidak dikendalikan, footer tetap tampil
 * agar admin bisa ganti jumlah baris per halaman.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

/* ── Compact floating dropdown (no form chrome) ─────────────────────────── */
function PageSizeDropdown({
  value,
  options,
  onChange,
}: {
  value: number;
  options: readonly number[];
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { pos, reposition } = useFloatingPanel({
    triggerRef,
    open,
    onTriggerLost: () => setOpen(false),
    maxHeight: 200,
    gap: 4,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle() {
    if (open) { setOpen(false); return; }
    if (!triggerRef.current) return;
    reposition();
    setOpen(true);
  }

  const dropdown =
    open && pos
      ? createPortal(
          <div
            ref={listRef}
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              zIndex: 10000,
            }}
            className="overflow-auto rounded-xl border border-[#dce3ed] bg-white py-1 shadow-lg"
          >
            {options.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { onChange(n); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[#f4f7fb] ${
                  n === value
                    ? "bg-[var(--brand-accent)]/10 font-semibold text-[var(--brand-primary)]"
                    : "text-[#172033]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-w-[3rem] items-center justify-between gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus:border-[var(--brand-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
      >
        {value}
        <svg
          className={`h-3 w-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}

export function DesktopPagination({
  page,
  totalPages,
  total,
  from,
  to,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemLabel = "data",
  className = "",
}: {
  page: number;
  totalPages: number;
  total: number;
  /** Nomor item pertama di halaman ini (1-based). */
  from: number;
  /** Nomor item terakhir di halaman ini. */
  to: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: readonly number[];
  /** Satuan data, mis. "berita" → "dari 24 berita". */
  itemLabel?: string;
  className?: string;
}) {
  const options = Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b);
  return (
    <div
      className={`flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {/* Kiri: selector baris + teks rentang */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        Tampilkan
        <PageSizeDropdown
          value={pageSize}
          options={options}
          onChange={(newSize) => {
            onPageSizeChange(newSize);
            onPageChange(1);
          }}
        />
        baris
        <span className="mx-0.5 text-slate-300">·</span>
        <p>
          {total === 0 ? "0" : `${from}\u2013${to}`} dari {total} {itemLabel}
        </p>
      </div>

      {/* Kanan: navigasi halaman */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <CaretLeft className="h-4 w-4" />
          </button>

          {/* Tombol angka — collapse kalau > 7 halaman */}
          {buildPageButtons(page, totalPages).map((item, i) =>
            item === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="flex h-8 w-8 items-center justify-center text-xs text-slate-400 select-none"
              >
                &hellip;
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item as number)}
                aria-current={item === page ? "page" : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                  item === page
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label="Halaman berikutnya"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <CaretRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hasilkan daftar tombol halaman dengan elipsis bila > 7 halaman.
 * Selalu tampilkan: halaman pertama, terakhir, aktif, ± 1 halaman dari aktif.
 */
function buildPageButtons(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let d = -1; d <= 1; d++) {
    const p = current + d;
    if (p >= 1 && p <= total) pages.add(p);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("...");
    result.push(p);
    prev = p;
  }
  return result;
}
