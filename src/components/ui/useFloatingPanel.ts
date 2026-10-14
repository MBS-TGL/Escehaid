"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** Posisi panel fixed — dihitung dari rect trigger (lihat useFloatingPanel). */
export interface FloatingPanelPos {
  /** Dipakai saat panel turun (buka ke bawah). */
  top?: number;
  /** Dipakai saat panel naik (buka ke atas) — lihat catatan di bawah. */
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

interface UseFloatingPanelOptions {
  /** Elemen pemicu; posisi panel diukur dari getBoundingClientRect-nya. */
  triggerRef: RefObject<HTMLElement | null>;
  /** Panel sedang terbuka — listener re-posisi hanya aktif saat true. */
  open: boolean;
  /**
   * Dipanggil saat panel terbuka tetapi trigger hilang dari DOM (mis. step
   * form berpindah) → konsumen wajib menutup panelnya (setOpen(false)).
   */
  onTriggerLost?: () => void;
  /** Batas tinggi panel, px (default 240 — ukuran daftar opsi Select). */
  maxHeight?: number;
  /** Ruang bawah minimal, px, agar panel bebas turun tanpa flip (default 160). */
  minFit?: number;
  /** Jarak panel ke trigger, px (default 6). */
  gap?: number;
  /** Pad viewport, px, saat mengukur ruang atas/bawah (default 12). */
  pad?: number;
}

/** Cari wadah scroll terdekat (mis. area `overflow-y-auto` SlideOver/Modal,
 *  tabel, sidebar) — dipakai sebagai BATAS panel supaya tidak melayang keluar
 *  wadahnya: dropdown tampil "di dalam modal", bukan di atas footer/tepi panel.
 *  Dipakai juga oleh DatePicker untuk membatasi & membalik kalendernya. */
export function nearestScroller(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p && p !== document.body && p !== document.documentElement) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === "auto" || oy === "scroll") return p;
    p = p.parentElement;
  }
  return null;
}

/* ── Geometri panel floating ─────────────────────────────────────────────
 * Panel di-portal ke document.body dengan position:fixed sehingga:
 *  1) tidak ter-clipping oleh wadah overflow mana pun (Modal/SlideOver punya
 *     overflow-y-auto — panel inline ikut ter-scroll/terpotong);
 *  2) flip otomatis: turun (properti `top`) bila ruang bawah lega, naik
 *     (properti `bottom`) bila ruang bawah sempit — penempatan "ke atas"
 *     memakai `bottom` sehingga tidak perlu mengukur tinggi konten lebih
 *     dulu: posisi benar sejak render pertama;
 *  3) re-posisi saat scroll (capture — menangkap scroll container mana pun,
 *     termasuk di dalam modal) dan resize, lalu tutup bila trigger hilang;
 *  4) maxHeight dikunci ke ruang tersedia (min 80px, maks opsi maxHeight)
 *     agar tidak keluar viewport;
 *  5) ruang dihitung dari wadah scroll terdekat bila ada (lihat
 *     nearestScroller) → di dalam SlideOver/Modal panel flip & terbatas di
 *     area scroll yang sama seperti DatePicker inline: tidak menutupi footer
 *     dan tidak keluar tepi panel ("di dalam modal"). Di luar wadah scroll,
 *     batas = viewport → perilaku lama tidak berubah.
 *
 * Tinggi viewport memakai documentElement.clientHeight = ICB, yaitu viewport
 * MINUS scrollbar horizontal; window.innerHeight menyertakan scrollbar
 * (~15px di Windows) sehingga perhitungan `bottom` bisa meleset dan panel
 * naik nyembul di atas batas viewport.
 *
 * Pemakaian: hitung posisi SEBELUM menyalakan `open`, dalam event handler
 * yang sama — `reposition(); setOpen(true);` — supaya React me-render
 * sekali dengan posisi sudah benar (tanpa frame kosong), persis perilaku
 * Select sebelum hook ini diekstrak.
 */
export function useFloatingPanel({
  triggerRef,
  open,
  onTriggerLost,
  maxHeight = 240,
  minFit = 160,
  gap = 6,
  pad = 12,
}: UseFloatingPanelOptions): { pos: FloatingPanelPos | null; reposition: () => void } {
  const [pos, setPos] = useState<FloatingPanelPos | null>(null);

  // Ref supaya reposition tetap referensi stabil walau konsumen meng-inline
  // callback onTriggerLost (listener tidak perlu lepas-pasang tiap render).
  const lostRef = useRef(onTriggerLost);
  useEffect(() => {
    lostRef.current = onTriggerLost;
  });

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) {
      // Trigger hilang → posisi mustahil dihitung; konsumen menutup panel.
      lostRef.current?.();
      return;
    }
    const rect = el.getBoundingClientRect();
    const vh = document.documentElement.clientHeight;
    // Batas ruang: wadah scroll terdekat bila ada, selalu dipotong viewport
    // supaya panel tidak pernah keluar layar maupun menutupi footer wadahnya.
    const scRect = nearestScroller(el)?.getBoundingClientRect() ?? null;
    const boundTop = Math.max(pad, scRect ? scRect.top + pad : pad);
    const boundBottom = Math.min(vh - pad, scRect ? scRect.bottom - pad : vh - pad);
    const spaceBelow = boundBottom - rect.bottom - pad;
    const spaceAbove = rect.top - boundTop - gap;
    // Turun bila ruang bawah lega; kalau sempit, naik — kecuali ruang atas
    // justru lebih sempit (maka sisi paling lapang yang dipakai).
    const useBottom = spaceBelow >= minFit || spaceBelow >= spaceAbove;
    const space = useBottom ? spaceBelow : spaceAbove;
    const h = Math.min(maxHeight, Math.max(80, space));
    setPos(
      useBottom
        ? { top: rect.bottom + gap, left: rect.left, width: rect.width, maxHeight: h }
        : { bottom: vh - rect.top + gap, left: rect.left, width: rect.width, maxHeight: h }
    );
  }, [triggerRef, minFit, gap, pad, maxHeight]);

  // Re-posisi saat scroll (capture: menangkap scroll di container mana pun,
  // termasuk overflow-y modal) & resize viewport. Listener = callback async,
  // bukan setState sinkron di body effect.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  return { pos, reposition };
}
