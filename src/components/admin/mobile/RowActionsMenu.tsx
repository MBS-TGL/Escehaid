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
 * Bentuk: kotak lembut `bg-slate-100` TANPA border. Border + latar terang
 * (slate-300/slate-50) terbaca seperti kotak isian di samping avatar + teks
 * baris; tint datar sudah cukup memberi bentuk tombol tanpa kesan "field".
 *
 * Kontras: ikon `slate-600` (#475569) = 6.9:1 di atas `slate-100` (7.58:1 di
 * atas putih) → lolos WCAG AA untuk ikon fungsional; sebelumnya `slate-400`
 * 2.56:1 gagal. Latar solid juga membuat trigger tetap terbaca di atas foto
 * (Gallery menaruhnya di pojok gambar).
 *
 * Saat menu terbuka tombol memakai warna merek supaya tetap terlihat aktif.
 */
export function rowActionsTriggerClass(open: boolean) {
  return `flex h-11 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
    open
      ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-[var(--brand-primary)] active:bg-slate-200"
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
