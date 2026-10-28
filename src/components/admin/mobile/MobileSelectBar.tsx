"use client";

import type { ReactNode } from "react";
import { Checks, X } from "@/components/Icons";

/**
 * Tinggi KONTEN bar navigasi bawah admin (MobileNav.tsx), TANPA safe-area.
 *
 * Dihitung dari kelas CSS MobileNav yang sebenarnya:
 *   border-t 1 + <Link> py-2 (8+8) 16 + kotak ikon h-7 28 + gap-1 4
 *   + label text-[11px] leading-none 11 = 60px
 *
 * Angka ini dulu tertulis 54 dengan alasan "py-2.5 + ikon 20px + teks 10px" —
 * yaitu versi MobileNav yang SUDAH BERUBAH. Akibatnya setiap bar yang
 * mengambang di atas nav (aksi massal di 15 halaman admin, bar Simpan
 * Konfigurasi Situs) duduk 18px TERLALU RENDAH dan tertutup nav.
 */
export const ADMIN_BOTTOM_NAV_CONTENT_H = 60;

/**
 * Nilai `bottom` untuk bar yang mengambang DI ATAS bottom nav admin — hanya
 * untuk bar yang memang tampil BERSAMA nav (mis. "Simpan Konfigurasi Situs").
 *
 * Mode pilih memakai `MobileSelectBar` yang MENGGANTIKAN nav (menempati
 * `bottom-0`), jadi tidak memakai helper ini.
 *
 * Safe-area di-`max()` dengan 12px PERSIS seperti padding nav
 * (`pb-[max(env(safe-area-inset-bottom),12px)]`). Dulu rumusnya
 * `54px + env(safe-area-inset-bottom)` sehingga safe-area terhitung DUA KALI
 * (nav sudah memasukkannya lewat padding) — di iPhone bar malah menimpa nav.
 *
 * @param gap jarak terlihat antara bar dan nav, px (default 8).
 */
export function adminBarBottom(gap = 8): string {
  return `calc(${ADMIN_BOTTOM_NAV_CONTENT_H}px + max(env(safe-area-inset-bottom, 0px), 12px) + ${gap}px)`;
}

/**
 * Bar aksi massal mobile — MENGGANTIKAN bottom nav selama mode pilih aktif
 * (bukan menumpuk di atasnya). Tingginya sengaja sama dengan nav supaya
 * konten tidak melompat saat masuk/keluar mode pilih.
 *
 * Satu baris, tanpa wrap: jumlah terpilih di kiri, grup aksi di kanan yang
 * bisa digeser horizontal bila terlalu panjang (mis. aksi sekunder di layar
 * 320px), tombol keluar ikon-saja paling kanan. `overflow`/`more` tersedia
 * untuk aksi yang tidak muat.
 */
export function MobileSelectBar({
  count,
  onDelete,
  onCancel,
  deleteLabel = "Hapus",
  children,
}: {
  count: number;
  /** Kosongkan (undefined) bila pengguna tidak punya izin hapus — tombol disembunyikan. */
  onDelete?: () => void;
  onCancel: () => void;
  deleteLabel?: string;
  /** Aksi tambahan antara jumlah dan Hapus (mis. "Terbitkan"/"Draft"). */
  children?: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label="Aksi massal"
      data-admin-bottom-bar=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--brand-accent)]/25 bg-white pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden"
    >
      <div className="flex h-[60px] items-center gap-2 px-3">
        <span
          aria-live="polite"
          className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)]"
        >
          <Checks className="h-4 w-4 shrink-0" />
          <span className="tabular-nums">{count}</span>
          <span className="sr-only">dipilih</span>
        </span>

        {/* Satu baris: bila aksi melebihi lebar layar, area ini yang bergeser —
            tombol keluar tetap terlihat. `[&>button]:shrink-0` menjaga tombol
            tidak menyusut jadi elipsis. */}
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto scrollbar-hide [scrollbar-width:none] [&>button]:shrink-0 [&>select]:shrink-0">
          {children}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={count === 0}
              className="min-h-11 whitespace-nowrap rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
            >
              {deleteLabel}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Selesai memilih"
          title="Selesai memilih"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
