"use client";

import { CaretLeft, CaretRight } from "@/components/Icons";

/**
 * Paginasi ringkas untuk mobile (< md): "‹ Sebelumnya · Hal x / y ·
 * Berikutnya ›" + teks "Menampilkan a–b dari n" yang bisa membungkus.
 *
 * Tidak merender deretan nomor halaman (bisa meluap saat halaman banyak);
 * desktop tetap memakai paginasi nomor lamanya.
 */
export function MobilePagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPageChange,
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
  /** Satuan data, mis. "fasilitas" → "dari 24 fasilitas". */
  itemLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 md:hidden ${className}`}
    >
      <p className="text-xs leading-relaxed text-slate-400">
        Menampilkan {from}–{to} dari {total} {itemLabel}
      </p>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          className="flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:cursor-not-allowed disabled:opacity-40"
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
          className="flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Berikutnya
          <CaretRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
