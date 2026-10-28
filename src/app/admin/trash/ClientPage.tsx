"use client";

import { useCallback, useEffect, useState } from "react";
import { getTrashItems, restoreItem, purgeItem } from "@/lib/queries";
import type { TrashEntry } from "@/lib/queries";
import { ConfirmModal, SkeletonBlock } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { formatRelativeTime } from "@/lib/admin-display";
import {
  Trash,
  ArrowUUpLeft,
  XCircle,
} from "@/components/Icons";

/** Warna badge per modul — pembeda visual cepat asal item. */
const LABEL_TONE: Record<string, string> = {
  Berita: "bg-blue-50 text-blue-700",
  Artikel: "bg-violet-50 text-violet-700",
  FAQ: "bg-emerald-50 text-emerald-700",
  Prestasi: "bg-amber-50 text-amber-700",
  Kegiatan: "bg-cyan-50 text-cyan-700",
  Galeri: "bg-pink-50 text-pink-700",
  Unduhan: "bg-teal-50 text-teal-700",
  Pengumuman: "bg-orange-50 text-orange-700",
};

export default function TrashClientPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const permUpdate = can("sampah:update");
  const permDelete = can("sampah:delete");

  const [items, setItems] = useState<TrashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<TrashEntry | null>(null);
  const [purging, setPurging] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getTrashItems());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal memuat sampah.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchItems();
    })().catch(() => {});
  }, [fetchItems]);

  const filtered = items.filter((i) =>
    search.trim() ? i.title.toLowerCase().includes(search.trim().toLowerCase()) : true
  );

  async function handleRestore(item: TrashEntry) {
    setRestoringId(`${item.table}:${item.id}`);
    const res = await restoreItem(item.table, item.id);
    setRestoringId(null);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    toast(`Dipulihkan ke ${item.label}.`, "success");
    fetchItems();
  }

  async function handlePurge() {
    if (!purgeTarget) return;
    setPurging(true);
    const res = await purgeItem(purgeTarget.table, purgeTarget.id);
    setPurging(false);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    setPurgeTarget(null);
    toast("Dihapus permanen.", "success");
    fetchItems();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <Trash className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Sampah</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Konten yang dihapus dari semua modul — bisa dipulihkan; hilang permanen setelah 30 hari
            </p>
          </div>
        </div>
      </div>

      {/* Pencarian */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari di sampah…"
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[var(--brand-primary)] focus:outline-none"
        />
      </div>

      {/* Daftar */}
      <div className="space-y-3">
        {loading ? (
          <>
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
          </>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{loadError}</p>
            <button
              onClick={fetchItems}
              className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Coba lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Trash className="h-7 w-7 text-slate-300" />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-600">
              {search ? "Tidak ada yang cocok dengan pencarian." : "Sampah kosong"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Item yang dihapus dari modul mana pun muncul di sini selama 30 hari.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={`${item.table}:${item.id}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
            >
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  LABEL_TONE[item.label] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {item.label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800" title={item.title}>
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Dihapus {formatRelativeTime(item.deletedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {permUpdate && (
                  <button
                    onClick={() => handleRestore(item)}
                    disabled={restoringId !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <ArrowUUpLeft className="h-3.5 w-3.5" weight="bold" />
                    {restoringId === `${item.table}:${item.id}` ? "Memulihkan…" : "Pulihkan"}
                  </button>
                )}
                {permDelete && (
                  <button
                    onClick={() => setPurgeTarget(item)}
                    title="Hapus permanen"
                    aria-label={`Hapus permanen ${item.title}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Konfirmasi hapus permanen */}
      <ConfirmModal
        open={purgeTarget !== null}
        onClose={() => setPurgeTarget(null)}
        onConfirm={handlePurge}
        title="Hapus permanen?"
        description={purgeTarget?.title}
        message={`Item akan dihapus permanen dari ${purgeTarget?.label ?? "database"} beserta medianya. Tidak bisa dipulihkan lagi.`}
        confirmLabel="Ya, Hapus Permanen"
        loading={purging}
      />
    </div>
  );
}
