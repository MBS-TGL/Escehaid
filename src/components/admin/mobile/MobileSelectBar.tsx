"use client";

import type { ReactNode } from "react";
import { Checks } from "@/components/Icons";

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
 * Nilai `bottom` untuk bar yang mengambang DI ATAS bottom nav admin.
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
 * Bar aksi massal sticky untuk mobile — muncul di bawah layar (di atas bottom
 * nav admin) saat mode pilih aktif: jumlah dipilih, aksi tambahan (opsional),
 * Hapus, Batal. ARIA `region` + `aria-live` pada jumlah agar pembaca layar
 * mengumumkan perubahan pilihan.
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
  /** Aksi tambahan antara jumlah dan Hapus (mis. "Terima/Tolak"). */
  children?: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label="Aksi massal"
      className="fixed inset-x-0 z-40 border-t border-[var(--brand-accent)]/20 bg-white/95 backdrop-blur-md md:hidden"
      style={{ bottom: adminBarBottom() }}
    >
      {/* flex-wrap: aksi massal (mis. Dibaca + Belum Dibaca + Hapus + Batal)
          bisa melebihi 360px — baris kedua turun, bukan overflow horizontal. */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span
          aria-live="polite"
          className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)]"
        >
          <Checks className="h-4 w-4 shrink-0" />
          <span className="tabular-nums">{count}</span>
          <span className="truncate">dipilih</span>
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {children}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={count === 0}
              className="min-h-11 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
