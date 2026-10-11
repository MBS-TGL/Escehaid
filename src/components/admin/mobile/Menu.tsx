"use client";

import { createPortal } from "react-dom";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";
import { MENU_PANEL_CLASS } from "./useMenu";

/**
 * Panel menu yang di-portal ke document.body (position:fixed, lihat useMenu).
 * Dipakai RowActionsMenu & dropdown di MobileFilterBar agar tidak ter-clip
 * kontainer overflow mana pun.
 */
export function MenuPanel({
  id,
  label,
  innerRef,
  style,
  onKeyDown,
  children,
}: {
  id: string;
  label: string;
  innerRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties | null;
  onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  if (!style) return null;
  return createPortal(
    <div
      ref={innerRef}
      id={id}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={style}
      className={MENU_PANEL_CLASS}
    >
      {children}
    </div>,
    document.body
  );
}

/**
 * Satu opsi menu. `min-h-11` (44px) sebagai target ketuk; `data-active` +
 * `aria-current` menandai opsi terpilih (difokuskan saat menu dibuka).
 */
export function MenuItem({
  active,
  danger,
  onClick,
  children,
}: {
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-current={active ? "true" : undefined}
      data-active={active ? "true" : undefined}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1767b1] ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
