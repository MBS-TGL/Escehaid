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
 * Bentuk: IKON SAJA, tanpa border & tanpa latar. Kotak (border/tint) terbaca
 * seperti kotak isian di samping avatar + teks baris. Karena ikon jadi satu-
 * satunya penanda, ikonnya dibuat tegas (`weight="bold"`, lihat
 * `RowActionsTriggerIcon`) — bukan garis tipis yang tenggelam.
 *
 * Kontras: `slate-600` (#475569) = 7.58:1 di atas putih → lolos WCAG AA untuk
 * ikon fungsional; sebelumnya `slate-400` 2.56:1 gagal.
 *
 * `onDark` untuk trigger yang menempel di atas foto (Gallery) — tanpa latar,
 * ikon gelap akan hilang di foto gelap. Varian ini memakai ikon putih dengan
 * halo gelap tipis agar tetap terbaca di foto terang maupun gelap.
 *
 * Saat menu terbuka tombol memakai warna merek supaya tetap terlihat aktif.
 */
export function rowActionsTriggerClass(open: boolean, tone: RowActionsTone = "default") {
  const base =
    "flex h-11 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] disabled:cursor-not-allowed disabled:opacity-40";
  if (tone === "onDark") {
    return `${base} text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] hover:text-white/80 active:text-white/70`;
  }
  return `${base} ${
    open
      ? "text-[var(--brand-primary)]"
      : "text-slate-600 hover:bg-slate-100 hover:text-[var(--brand-primary)] active:bg-slate-200"
  }`;
}

/** Varian warna trigger ⋯ — `onDark` untuk trigger di atas foto. */
export type RowActionsTone = "default" | "onDark";

/**
 * Ikon ⋯ tebal (Phosphor `weight="bold"`) — dipakai trigger di sini dan di
 * baris Portal. Varian `regular` terlalu tipis: titiknya radius 12 dan
 * tenggelam saat berdiri sendiri tanpa kotak.
 */
export function RowActionsTriggerIcon() {
  return <DotsThreeVertical weight="bold" className="h-5 w-5" />;
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
  tone = "default",
}: {
  /** Nama item — dipakai aria-label ("Aksi untuk …"). */
  label: string;
  actions: RowAction[];
  disabled?: boolean;
  menuMinWidth?: number;
  /** `onDark` bila trigger menempel di atas foto (ikon putih + halo). */
  tone?: RowActionsTone;
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
        className={rowActionsTriggerClass(open, tone)}
      >
        <RowActionsTriggerIcon />
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
            {/* Label dibungkus (bukan `truncate`): panel hanya 200px, sehingga
                label panjang seperti "Tandai Belum Dibaca" terpotong jadi
                "Tandai Belum Di…" di layar sempit. `break-words` menangani
                kata sangat panjang tanpa memaksa lebar panel. */}
            <span className="min-w-0 flex-1 break-words leading-snug">{it.label}</span>
          </MenuItem>
        ))}
      </MenuPanel>
    </>
  );
}
