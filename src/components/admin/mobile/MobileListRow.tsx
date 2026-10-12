"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/** Durasi tekan lama (ms) untuk memicu aksi long-press (mis. mode pilih). */
const LONG_PRESS_MS = 500;
/** Ambang gerak (px) yang membatalkan long-press (pengguna menggeser/scroll). */
const LONG_PRESS_SLOP = 10;

/**
 * Baris daftar mobile serbaguna (bahasa desain putaran 2):
 * [grip/lead 30px] [thumb/tile] [judul + badge + subteks] [⋯ 36×44].
 *
 * Kontainer memakai `gap-2.5 py-2 pl-1.5 pr-0.5 border-t border-slate-100`
 * (baris pertama punya garis pemisah; bila daftar membungkus `divide-y`,
 * hapus divide-y agar garis tidak dobel). Judul 15px/600 `#0f2a4d`
 * line-clamp-2; subteks 12px `#64748b`. Slot `badge` hanya untuk keadaan
 * tidak biasa (Nonaktif/Draft/Terjadwal).
 *
 * Slot `lead` diisi handle drag atau checkbox (pada mode pilih) sehingga
 * lebar baris tidak berubah antar mode. Semua slot interaktif (handle,
 * checkbox, pill status, menu ⋯) wajib memakai `data-no-longpress=""` dan
 * `e.stopPropagation()` agar tidak membajak tap-baris / long-press.
 *
 * `onClick` baris = tap (buka detail/edit atau toggle centang di mode pilih).
 * `onLongPress` (opsional) = tekan lama 500ms di area non-interaktif baris —
 * klik yang lahir dari long-press dibuang. Baris memakai `select-none` +
 * `-webkit-touch-callout:none` agar callout salin-tempel bawaan browser saat
 * tekan lama tidak bentrok dengan aksi long-press.
 */
export function MobileListRow({
  lead,
  thumb,
  title,
  badge,
  subtitle,
  status,
  actions,
  onClick,
  onLongPress,
  selected = false,
  className = "",
}: {
  lead?: ReactNode;
  thumb?: ReactNode;
  title: ReactNode;
  /** Badge kecil di bawah nama (QuietBadge) — HANYA untuk keadaan tidak biasa. */
  badge?: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  className?: string;
}) {
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const pressXY = useRef<{ x: number; y: number } | null>(null);

  function cancelPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }
  // Bersihkan timer saat baris lepas dari DOM (mis. baris terhapus).
  useEffect(
    () => () => {
      if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    },
    []
  );

  function onPointerDownRow(e: ReactPointerEvent<HTMLDivElement>) {
    if (!onLongPress) return;
    // Mulai hanya dari area non-interaktif (bukan handle/chip/status/⋯).
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-longpress]")) return;
    pressXY.current = { x: e.clientX, y: e.clientY };
    longPressFired.current = false;
    cancelPress();
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      longPressFired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function onPointerMoveRow(e: ReactPointerEvent<HTMLDivElement>) {
    const p = pressXY.current;
    if (!p || pressTimer.current === null) return;
    if (Math.abs(e.clientX - p.x) > LONG_PRESS_SLOP || Math.abs(e.clientY - p.y) > LONG_PRESS_SLOP) {
      cancelPress();
    }
  }

  function handleRowClick() {
    if (!onClick) return;
    // Klik yang lahir dari long-press dibuang (aksi long-press sudah berjalan).
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onClick();
  }

  return (
    <div
      onClick={handleRowClick}
      onPointerDown={onPointerDownRow}
      onPointerMove={onPointerMoveRow}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      className={`flex select-none items-center gap-2.5 border-t border-slate-100 py-2 pl-1.5 pr-0.5 [-webkit-touch-callout:none] ${
        onClick ? "cursor-pointer active:bg-slate-50" : ""
      } ${selected ? "bg-[#082b59]/[0.03]" : ""} ${className}`}
    >
      {lead}
      {thumb}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 break-words text-[15px] font-semibold leading-[1.25] text-[#0f2a4d]">
          {title}
        </div>
        {badge && (
          <div data-no-longpress="" className="mt-1 flex flex-wrap items-center gap-1.5">
            {badge}
          </div>
        )}
        {subtitle && (
          <div className="mt-0.5 line-clamp-2 break-words text-xs leading-snug text-[#64748b]">
            {subtitle}
          </div>
        )}
      </div>
      {status && (
        <div data-no-longpress="" onClick={(e) => e.stopPropagation()} className="shrink-0">
          {status}
        </div>
      )}
      {actions && (
        <div data-no-longpress="" onClick={(e) => e.stopPropagation()} className="shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
