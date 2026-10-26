"use client";

import type { ReactNode } from "react";
import { DotsThreeVertical } from "@/components/Icons";
import { useMenu } from "./useMenu";
import { MenuPanel, MenuItem } from "./Menu";

/** Satu aksi pada menu ⋯ baris. */
export type RowAction = {
  key: string;
  label: string;
  icon: ReactNode;
  /** Aksi destruktif (hapus) — teks merah. */
  danger?: boolean;
  run: () => void;
};

/**
 * Kelas tombol pemicu ⋯ — SATU sumber kebenaran, dipakai juga oleh baris
 * daftar Portal (`app/admin/portal/SortableRow.tsx`) yang merender trigger
 * sendiri. Jangan menyalin kelas ini ke tempat lain.
 *
 * Kontras: ikon `slate-600` (#475569) = 7.58:1 di atas `slate-50` → lolos WCAG
 * AA untuk ikon fungsional. Sebelumnya `slate-400` (2.56:1) gagal. Border
 * `slate-300` hanya penguat bentuk (di bawah 3:1 batas komponen 1.4.11) —
 * penanda utama kontrol adalah ikonnya.
 *
 * Saat menu terbuka tombol memakai warna merek supaya tetap terlihat aktif.
 */
export function rowActionsTriggerClass(open: boolean) {
  return `flex h-11 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
    open
      ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
      : "border-slate-300 bg-slate-50 text-slate-600 hover:border-[var(--brand-accent)]/40 hover:bg-white hover:text-[var(--brand-primary)] active:bg-slate-100"
  }`;
}

/**
 * Tombol ⋯ + menu aksi floating untuk baris daftar mobile.
 *
 * Di-portal ke document.body (position:fixed, flip atas/bawah, re-posisi saat
 * scroll/resize) lewat `useMenu` sehingga tidak ter-clip container overflow.
 * Item menu min-h-11 (44px) sebagai target ketuk; Esc/klik luar menutup dan
 * fokus kembali ke tombol; panah/Home/End berpindah antar opsi; hapus merah.
 *
 * `onClick` tombol memakai stopPropagation agar tidak bocor ke tap-baris
 * (tap ⋯ = buka menu, bukan membuka detail/edit).
 */
export function RowActionsMenu({
  label,
  actions,
  disabled = false,
  menuMinWidth = 200,
}: {
  /** Nama item — dipakai aria-label ("Aksi untuk …"). */
  label: string;
  actions: RowAction[];
  disabled?: boolean;
  menuMinWidth?: number;
}) {
  const { open, toggle, triggerRef, menuRef, menuId, panelStyle, onMenuKeyDown } = useMenu({
    menuMinWidth,
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        data-no-longpress=""
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Aksi untuk ${label}`}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={rowActionsTriggerClass(open)}
      >
        <DotsThreeVertical className="h-5 w-5" />
      </button>

      <MenuPanel
        id={menuId}
        label={`Aksi untuk ${label}`}
        innerRef={menuRef}
        style={panelStyle}
        onKeyDown={onMenuKeyDown}
      >
        {actions.map((it) => (
          <MenuItem
            key={it.key}
            danger={it.danger}
            onClick={() => {
              toggle();
              it.run();
            }}
          >
            <span className="shrink-0">{it.icon}</span>
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
          </MenuItem>
        ))}
      </MenuPanel>
    </>
  );
}
