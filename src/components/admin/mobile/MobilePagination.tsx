"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CaretLeft, CaretRight } from "@/components/Icons";
import { PAGE_SIZE_OPTIONS } from "./DesktopPagination";
import { useFloatingPanel } from "@/components/ui/useFloatingPanel";

/**
 * Footer daftar mobile (< md): teks "Menampilkan a–b dari n" (12px) selalu
 * tampil; tombol Sebelumnya/Berikutnya HANYA bila totalPages > 1 — satu
 * halaman = teks saja (tanpa tombol mati yang memenuhi ruang).
 *
 * Bila pageSize + onPageSizeChange diberikan, tampilkan selector baris di atas
 * tombol navigasi — konsisten dengan DesktopPagination.
 *
 * Berdiri sebagai footer kartu daftar: garis atas `border-slate-100`,
 * latar putih menyatu dengan kartu.
 */
export function MobilePagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPageChange,
  pageSize,
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
  onPageChange: (page: number) => void;
  /** Bila diberikan, tampilkan selector baris per halaman. */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];
  /** Satuan data, mis. "fasilitas" → "dari 24 fasilitas". */
  itemLabel?: string;
  className?: string;
}) {
  const options =
    pageSize !== undefined
      ? Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b)
      : pageSizeOptions;

  return (
    <div className={`border-t border-slate-100 bg-white px-4 py-3 md:hidden ${className}`}>
      {/* Selector baris (opsional) */}
      {pageSize !== undefined && onPageSizeChange && (
        <div className="mb-2.5 flex items-center gap-1.5 text-xs text-[#64748b]">
          Tampilkan
          <PageSizeDropdown
            options={options}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            onPageChange={onPageChange}
          />
          baris
        </div>
      )}

      <p className="text-xs leading-relaxed text-[#64748b]">
        Menampilkan {from}–{to} dari {total} {itemLabel}
      </p>
      {totalPages > 1 && (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
            className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            <CaretLeft className="h-4 w-4" />
            Sebelumnya
          </button>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            Hal {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label="Halaman berikutnya"
            className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            Berikutnya
            <CaretRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── PageSizeDropdown (top-level, bukan nested) ──────────────────────── */
function PageSizeDropdown({
  options,
  pageSize,
  onPageSizeChange,
  onPageChange,
}: {
  options: readonly number[];
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
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
    function out(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
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
                onClick={() => {
                  onPageSizeChange(n);
                  onPageChange(1);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[#f4f7fb] ${
                  n === pageSize
                    ? "bg-[var(--brand-accent)]/10 font-semibold text-[var(--brand-primary)]"
                    : "text-[#172033]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>,
          document.body,
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
        {pageSize}
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
