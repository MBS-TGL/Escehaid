"use client";

import { CaretLeft, CaretRight } from "@/components/Icons";
import { PAGE_SIZE_OPTIONS } from "./DesktopPagination";

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
  const options = pageSize !== undefined
    ? Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b)
    : pageSizeOptions;
  return (
    <div
      className={`border-t border-slate-100 bg-white px-4 py-3 md:hidden ${className}`}
    >
      {/* Selector baris (opsional) */}
      {pageSize !== undefined && onPageSizeChange && (
        <label className="mb-2.5 flex items-center gap-1.5 text-xs text-[#64748b]">
          Tampilkan
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-600 shadow-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          baris
        </label>
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

