"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

/** Durasi tekan lama (ms) untuk memicu mode pilih. */
const LONG_PRESS_MS = 500;
/** Ambang gerak (px) yang membatalkan long-press (pengguna menggeser/scroll). */
const LONG_PRESS_SLOP = 10;

/**
 * Long-press untuk daftar/grid mobile tanpa checkbox.
 *
 * Dipasang SATU KALI di kontainer (bukan per item, supaya tidak melanggar
 * aturan hooks di dalam map). Item yang bisa ditekan wajib punya
 * `data-longpress-id="<id>"`; elemen interaktif di dalamnya wajib
 * `data-no-longpress=""` agar tidak memicu mode pilih.
 *
 * Klik yang lahir dari long-press harus dibuang oleh pemanggil:
 *   onClick={() => { if (longPress.consumeClick()) return; ... }}
 */
export function useLongPressList({
  onLongPress,
  enabled = true,
}: {
  onLongPress: (id: string) => void;
  enabled?: boolean;
}) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  function cancel() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  useEffect(() => () => cancel(), []);

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (!enabled) return;
    // Mouse desktop tidak memakai gesture — grid galeri juga tampil di md+.
    if (e.pointerType === "mouse") return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-longpress]")) return;
    const item = target.closest<HTMLElement>("[data-longpress-id]");
    const id = item?.dataset.longpressId;
    if (!id) return;
    start.current = { x: e.clientX, y: e.clientY };
    fired.current = false;
    cancel();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      fired.current = true;
      onLongPress(id);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const p = start.current;
    if (!p || timer.current === null) return;
    if (Math.abs(e.clientX - p.x) > LONG_PRESS_SLOP || Math.abs(e.clientY - p.y) > LONG_PRESS_SLOP) {
      cancel();
    }
  }

  function consumeClick() {
    if (!fired.current) return false;
    fired.current = false;
    return true;
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    consumeClick,
  };
}
