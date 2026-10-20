"use client";

import type { ReactNode } from "react";
import { Checks } from "@/components/Icons";

/**
 * Tinggi bar navigasi bawah admin (MobileNav.tsx): py-2.5 (20px) + ikon 20px
 * + gap 4px + teks 10px = 54px, belum termasuk safe-area-inset-bottom.
 * Bar aksi massal diletakkan DI ATAS nav ini, bukan menimpanya.
 */
export const ADMIN_BOTTOM_NAV_H = 54;

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
      style={{ bottom: `calc(${ADMIN_BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px))` }}
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
