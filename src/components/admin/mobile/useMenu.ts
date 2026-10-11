"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useFloatingPanel } from "@/components/ui/useFloatingPanel";

/** Kelas dasar panel menu floating — mengikuti FilterBar/menu ⋯ halaman Portal. */
export const MENU_PANEL_CLASS =
  "overflow-y-auto rounded-xl border border-[#dce3ed] bg-white p-1.5 shadow-xl shadow-slate-900/10";

type UseMenuOptions = {
  /** Lebar minimum panel, px (default 200 — cukup untuk label + jumlah). */
  menuMinWidth?: number;
  /** Tinggi maksimum panel, px (default 260). */
  maxHeight?: number;
  /** Ruang bawah minimal agar panel turun tanpa flip, px (default 200). */
  minFit?: number;
};

/**
 * Hook bersama untuk dropdown/menu floating di halaman admin (mobile).
 *
 * Menggabungkan `useFloatingPanel` (panel fixed, portal ke body, flip atas/
 * bawah, re-posisi saat scroll/resize) dengan perilaku menu standar:
 *  - klik di luar & Esc (capture, stopPropagation) menutup panel tanpa
 *    ikut menutup Modal/SlideOver di belakangnya;
 *  - saat dibuka fokus pindah ke opsi aktif/pertama, saat ditutup kembali
 *    ke tombol pemicu;
 *  - panah atas-bawah / Home / End berpindah antar `role="menuitem"`, Tab
 *    menutup panel;
 *  - flip horizontal: tepi kanan panel menempel tepi kanan pemicu bila muat
 *    di viewport, selain itu rata kiri mengikuti pemicu (diklamp ke viewport).
 *
 * Pemakaian: hitung posisi SEBELUM membuka — `toggle()` sudah melakukannya
 * dalam batch yang sama dengan setOpen(true).
 */
export function useMenu({
  menuMinWidth = 200,
  maxHeight = 260,
  minFit = 200,
}: UseMenuOptions = {}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const { pos, reposition } = useFloatingPanel({
    triggerRef,
    open,
    maxHeight,
    minFit,
    gap: 6,
    // Pemicu hilang dari DOM (mis. baris terhapus) → tutup panel.
    onTriggerLost: () => setOpen(false),
  });

  // Buka → fokus opsi aktif (atau opsi pertama); tutup → fokus ke pemicu.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const first =
        menuRef.current?.querySelector<HTMLElement>('[data-active="true"]') ??
        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      first?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  // Klik di luar pemicu & panel (portal) → tutup.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Esc → tutup saja; capture + stopPropagation mencegah Modal/SlideOver di
  // belakangnya ikut tertutup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!triggerRef.current) return;
    // Hitung posisi dalam batch yang sama dengan setOpen (tanpa frame kosong).
    reposition();
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  // Panah atas-bawah / Home / End berpindah antar opsi menu.
  function onMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % items.length;
    else next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  // Flip horizontal + klamp viewport (pola FilterBar halaman Portal).
  // clientWidth = ICB supaya tidak meleset 15px karena scrollbar Windows.
  const menuW = Math.max(menuMinWidth, pos?.width ?? menuMinWidth);
  const vw = typeof document !== "undefined" ? document.documentElement.clientWidth : 0;
  const rightAlignedLeft = pos ? pos.left + pos.width - menuW : 0;
  const menuLeft =
    pos && vw
      ? rightAlignedLeft >= 8
        ? Math.min(rightAlignedLeft, vw - menuW - 8)
        : Math.max(8, Math.min(pos.left, vw - menuW - 8))
      : 0;

  const panelStyle: CSSProperties | null =
    open && pos
      ? {
          position: "fixed",
          top: pos.top,
          bottom: pos.bottom,
          left: menuLeft,
          width: menuW,
          maxHeight: pos.maxHeight,
          zIndex: 10000,
        }
      : null;

  return {
    open,
    toggle,
    close,
    triggerRef,
    menuRef,
    menuId,
    pos,
    panelStyle,
    onMenuKeyDown,
  };
}
