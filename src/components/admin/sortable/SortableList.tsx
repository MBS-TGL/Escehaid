"use client";

import type { ReactNode } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SORTABLE_DND, useSortableSensors } from "@/lib/admin/sortable";

/**
 * Pembungkus drag-urutan standar: DndContext (sensor + modifier + autoScroll
 * dari `@/lib/admin/sortable`) + SortableContext (strategi list vertikal).
 *
 * `ids` = id baris sesuai URUTAN TAMPIL saat ini. `onReorder(from, to)` diberi
 * indeks (bukan id) agar pemanggil tinggal `arrayMove` pada array yang sama.
 *
 * PENTING — jangan letakkan komponen ini DI DALAM `<table>`/`<tbody>`/`<tr>`.
 * DndContext menyisipkan elemen aksesibilitas `<div>` (petunjuk pembaca layar),
 * dan `<div>` tidak sah sebagai anak tabel → hydration error
 * "In div cannot be a child of table". Untuk tabel, bungkus elemen `<table>`-nya:
 *
 *   <SortableList ids={…} onReorder={…}>
 *     <table>…</table>
 *   </SortableList>
 */
export function SortableList({
  ids,
  onReorder,
  children,
}: {
  ids: (string | number)[];
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const sensors = useSortableSensors();

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  }

  return (
    <DndContext sensors={sensors} {...SORTABLE_DND} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
