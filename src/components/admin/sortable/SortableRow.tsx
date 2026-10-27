"use client";

import type { CSSProperties, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Nilai yang disalurkan ke pemanggil lewat render-prop `SortableRow`. */
export interface SortableRowRender {
  /** Pasang ke `ref` elemen baris (`<tr>`/`<div>`). */
  setNodeRef: (node: HTMLElement | null) => void;
  /** Pasang ke `style` elemen baris (transform/transition/zIndex). */
  style: CSSProperties;
  isDragging: boolean;
  /** Sebar ke tombol grip. */
  attributes: React.ButtonHTMLAttributes<HTMLButtonElement>;
  listeners: Record<string, unknown> | undefined;
}

/**
 * Satu baris sortable. Mengabstraksi `useSortable` supaya halaman cukup
 * menyediakan render-prop dan tidak menyalin boilerplate transform/style.
 * `disabled` → grip dinonaktifkan (mis. saat difilter / tanpa izin update).
 */
export function SortableRow({
  id,
  disabled = false,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (p: SortableRowRender) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <>
      {children({
        setNodeRef,
        style: {
          transform: CSS.Transform.toString(transform),
          transition,
          zIndex: isDragging ? 10 : undefined,
        },
        isDragging,
        attributes,
        listeners,
      })}
    </>
  );
}
