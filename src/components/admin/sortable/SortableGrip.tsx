"use client";

import { DotsSixVertical } from "@/components/Icons";

/**
 * Grip urutan untuk tabel desktop: titik 6-dot + nomor posisi. Untuk baris
 * mobile pakai `RowGrip` (`@/components/admin/mobile`) yang sudah bersama.
 * Sebar `attributes` & `listeners` dari `SortableRow`.
 */
export function SortableGrip({
  index,
  label,
  disabled,
  attributes,
  listeners,
}: {
  /** Posisi tampil 0-based — nomor yang ditampilkan adalah `index + 1`. */
  index: number;
  label: string;
  disabled: boolean;
  attributes: React.ButtonHTMLAttributes<HTMLButtonElement>;
  listeners: Record<string, unknown> | undefined;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        {...attributes}
        {...(disabled ? {} : listeners)}
        disabled={disabled}
        aria-label={`Ubah urutan ${label} — posisi ${index + 1}`}
        title={
          disabled
            ? "Urutan hanya bisa diubah saat menampilkan Semua tanpa pencarian"
            : "Tarik untuk mengubah urutan (atau tekan Space, lalu panah)"
        }
        onClick={(e) => e.stopPropagation()}
        className={`flex h-7 w-7 shrink-0 touch-none select-none items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${
          disabled
            ? "cursor-not-allowed text-slate-300"
            : "cursor-grab text-slate-400 hover:bg-[var(--brand-accent)]/10 hover:text-[var(--brand-primary)] active:cursor-grabbing"
        }`}
      >
        <DotsSixVertical className="h-4 w-4" />
      </button>
      <span className="w-5 text-center text-xs font-semibold tabular-nums text-slate-500">
        {index + 1}
      </span>
    </div>
  );
}
