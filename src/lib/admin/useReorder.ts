"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useToast } from "@/components/ui/Toast";

/**
 * Hook alur reorder optimistik untuk semua halaman admin berurutan:
 * `arrayMove` → renumber `1..n` → set state optimistik → simpan HANYA baris
 * yang berubah → gagal = rollback + toast; sukses = toast + `onSuccess`
 * (biasanya revalidate path publik).
 *
 * `onReorder(from, to)` menerima indeks; aman dipakai langsung dari
 * `<SortableList onReorder>`.
 */
export function useReorder<T extends { id: string; sort_order: number }>(
  items: T[],
  setItems: Dispatch<SetStateAction<T[]>>,
  opts: {
    persist: (rows: { id: string; sort_order: number }[]) => Promise<{ error?: string }>;
    onSuccess?: () => void;
    /** Label pesan sukses, mis. "FAQ" → "Urutan FAQ diperbarui". */
    label?: string;
  }
) {
  const { toast } = useToast();

  return useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0) return;
      const previous = items;
      const reordered = arrayMove(items, from, to).map((it, idx) => ({
        ...it,
        sort_order: idx + 1,
      }));

      // Hanya kirim baris yang nilai sort_order-nya benar-benar berubah.
      const before = new Map(items.map((it) => [it.id, it.sort_order]));
      const changed = reordered
        .filter((it) => before.get(it.id) !== it.sort_order)
        .map((it) => ({ id: it.id, sort_order: it.sort_order }));
      const rows = changed.length > 0 ? changed : reordered.map((it) => ({ id: it.id, sort_order: it.sort_order }));

      setItems(reordered);

      opts.persist(rows).then(({ error }) => {
        if (error) {
          setItems(previous);
          toast(`Gagal menyimpan urutan: ${error}`, "error");
          return;
        }
        toast(opts.label ? `Urutan ${opts.label} diperbarui` : "Urutan diperbarui", "success");
        opts.onSuccess?.();
      });
    },
    [items, setItems, opts, toast]
  );
}
