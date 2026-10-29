"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  CaretLeft,
  CaretRight,
} from "@/components/Icons";

const PAGE_SIZE = 20;
const RETENTION_DAYS = 30;

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
  Agenda: "bg-indigo-50 text-indigo-700",
};

function keyOf(item: TrashEntry) {
  return `${item.table}:${item.id}`;
}

function daysLeft(item: TrashEntry): number | null {
  const t = new Date(item.deletedAt).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t + RETENTION_DAYS * 86400_000 - Date.now()) / 86400_000);
}

export default function TrashClientPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const permUpdate = can("sampah:update");
  const permDelete = can("sampah:delete");
  const canSelect = permUpdate || permDelete;

  const [items, setItems] = useState<TrashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<TrashEntry | null>(null);
  const [bulkPurge, setBulkPurge] = useState(false);
  const [purging, setPurging] = useState(false);
  const [bulkRestore, setBulkRestore] = useState(false);

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

  const modules = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.table)))],
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (moduleFilter !== "all" && i.table !== moduleFilter) return false;
      return q ? i.title.toLowerCase().includes(q) : true;
    });
  }, [items, search, moduleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allVisibleSelected = paged.length > 0 && paged.every((i) => selected.has(keyOf(i)));

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) paged.forEach((i) => next.delete(keyOf(i)));
      else paged.forEach((i) => next.add(keyOf(i)));
      return next;
    });
  }

  async function handleRestore(item: TrashEntry) {
    const key = keyOf(item);
    setBusyKey(key);
    const res = await restoreItem(item.table, item.id);
    setBusyKey(null);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    toast(`Dipulihkan ke ${item.label}.`, "success");
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
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
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(keyOf(purgeTarget));
      return next;
    });
    fetchItems();
  }

  async function handleBulkRestore() {
    if (!permUpdate || selected.size === 0) return;
    setBulkBusy(true);
    const targets = items.filter((i) => selected.has(keyOf(i)));
    let ok = 0;
    let failed = 0;
    for (const item of targets) {
      const res = await restoreItem(item.table, item.id);
      if (res.error) failed += 1;
      else ok += 1;
    }
    setBulkBusy(false);
    setBulkRestore(false);
    setSelected(new Set());
    toast(
      failed > 0 ? `${ok} dipulihkan, ${failed} gagal.` : `${ok} item dipulihkan.`,
      failed > 0 ? "error" : "success"
    );
    fetchItems();
  }

  async function handleBulkPurge() {
    if (!permDelete || selected.size === 0) return;
    setBulkBusy(true);
    const targets = items.filter((i) => selected.has(keyOf(i)));
    let ok = 0;
    let failed = 0;
    for (const item of targets) {
      const res = await purgeItem(item.table, item.id);
      if (res.error) failed += 1;
      else ok += 1;
    }
    setBulkBusy(false);
    setBulkPurge(false);
    setSelected(new Set());
    toast(
      failed > 0 ? `${ok} dihapus permanen, ${failed} gagal.` : `${ok} item dihapus permanen.`,
      failed > 0 ? "error" : "success"
    );
    fetchItems();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <Trash className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Sampah</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Konten terhapus dari semua modul — pulihkan atau hapus permanen. Retensi {RETENTION_DAYS} hari.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Cari di sampah…"
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[var(--brand-primary)] focus:outline-none"
        />
        <select
          value={moduleFilter}
          onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
          aria-label="Filter modul"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
        >
          {modules.map((m) => (
            <option key={m} value={m}>
              {m === "all" ? "Semua modul" : items.find((i) => i.table === m)?.label ?? m}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400 sm:ml-auto">{filtered.length} item</span>
      </div>

      {canSelect && paged.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAll}
            aria-label="Pilih semua yang tampil"
            className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-primary)]"
          />
          <span className="text-xs font-semibold text-[var(--brand-primary)]">
            {selected.size > 0 ? `${selected.size} dipilih` : "Pilih semua di halaman ini"}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {permUpdate && (
              <button
                type="button"
                disabled={selected.size === 0 || bulkBusy}
                onClick={() => setBulkRestore(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
              >
                <ArrowUUpLeft className="h-3.5 w-3.5" weight="bold" /> Pulihkan
              </button>
            )}
            {permDelete && (
              <button
                type="button"
                disabled={selected.size === 0 || bulkBusy}
                onClick={() => setBulkPurge(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" /> Hapus permanen
              </button>
            )}
            {selected.size > 0 && (
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold text-slate-500 hover:underline">
                Bersihkan
              </button>
            )}
          </div>
        </div>
      )}

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
            <button onClick={fetchItems} className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
              Coba lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Trash className="h-7 w-7 text-slate-300" />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-600">
              {search || moduleFilter !== "all" ? "Tidak ada yang cocok dengan filter." : "Sampah kosong"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Item yang dihapus dari modul mana pun muncul di sini selama {RETENTION_DAYS} hari.
            </p>
          </div>
        ) : (
          paged.map((item) => {
            const key = keyOf(item);
            const left = daysLeft(item);
            return (
              <div
                key={key}
                className={`flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 transition ${
                  selected.has(key) ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/[0.03]" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {canSelect && (
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggleSelect(key)}
                    aria-label={`Pilih ${item.title}`}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[var(--brand-primary)]"
                  />
                )}
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${LABEL_TONE[item.label] ?? "bg-slate-100 text-slate-600"}`}>
                  {item.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800" title={item.title}>{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Dihapus {formatRelativeTime(item.deletedAt)}
                    {left !== null && (
                      <span className={`ml-2 font-semibold ${left <= 3 ? "text-red-600" : left <= 7 ? "text-amber-600" : "text-slate-400"}`}>
                        {left > 0 ? `${left} hari lagi` : "jatuh tempo purge"}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {permUpdate && (
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={busyKey !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <ArrowUUpLeft className="h-3.5 w-3.5" weight="bold" />
                      {busyKey === key ? "Memulihkan…" : "Pulihkan"}
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
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <p className="text-xs text-slate-400">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Halaman sebelumnya" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40">
              <CaretLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-500">{safePage} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Halaman berikutnya" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40">
              <CaretRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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

      <ConfirmModal
        open={bulkPurge}
        onClose={() => setBulkPurge(false)}
        onConfirm={handleBulkPurge}
        title={`Hapus permanen ${selected.size} item?`}
        message="Semua item terpilih akan dihapus permanen beserta medianya. Tidak bisa dipulihkan lagi."
        confirmLabel="Ya, Hapus Semua"
        loading={bulkBusy}
      />

      <ConfirmModal
        open={bulkRestore}
        onClose={() => setBulkRestore(false)}
        onConfirm={handleBulkRestore}
        title={`Pulihkan ${selected.size} item?`}
        message="Item terpilih akan dikembalikan ke modul asalnya."
        confirmLabel="Ya, Pulihkan"
        loading={bulkBusy}
      />
    </div>
  );
}
