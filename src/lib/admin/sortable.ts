import {
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/**
 * Sumber tunggal konfigurasi drag-urutan admin (dipakai semua halaman yang
 * punya kolom `sort_order`). Jangan duplikasi `lockY`/sensor/DndContext props
 * di halaman lain — impor dari sini.
 */

/** Drag hanya gerak vertikal — mencegah baris "melayang" menyamping. */
export const lockY: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * Sensor standar: pointer (harus geser 5px dulu, supaya tap/klik edit tetap
 * jalan) + keyboard (aksesibilitas: Space lalu panah).
 */
export function useSortableSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}

/** Props `<DndContext>` standar — sebar ke DndContext bersama `sensors`. */
export const SORTABLE_DND = {
  modifiers: [lockY] as Modifier[],
  collisionDetection: closestCenter,
  autoScroll: { threshold: { x: 0, y: 0.08 }, acceleration: 4 },
};

export type { DragEndEvent };
