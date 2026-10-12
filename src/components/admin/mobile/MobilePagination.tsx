"use client";

import { CaretLeft, CaretRight } from "@/components/Icons";

/**
 * Footer daftar mobile (< md): teks "Menampilkan a–b dari n" (12px) selalu
 * tampil; tombol Sebelumnya/Berikutnya HANYA bila totalPages > 1 — satu
 * halaman = teks saja (tanpa tombol mati yang memenuhi ruang).
 *
 * Berdiri sebagai footer kartu daftar: garis atas `border-slate-100`,
 * latar putih menyatu dengan kartu. Desktop tetap memakai paginasi nomor.
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
      className={`border-t border-slate-100 bg-white px-4 py-3 md:hidden ${className}`}
    >
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
            className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:cursor-not-allowed disabled:opacity-40"
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
            className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Berikutnya
            <CaretRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
