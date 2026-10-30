"use client";

import { useAdminBottomBar } from "@/app/admin/AdminChrome";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getAgendaEvents,
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  deleteAgendaEventBulk,
  reorderAgendaEvents,
  revalidatePaths,
} from "@/lib/queries";
import type { AgendaEvent } from "@/lib/queries";
import { ConfirmModal, SlideOver, SkeletonBlock } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import {
  CalendarBlank,
  Plus,
  PencilSimple,
  Trash,
  Checks,
  FloppyDisk,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Users,
} from "@/components/Icons";
import {
  MobileFilterBar,
  MobilePickButton,
  MobileListRow,
  LongPressHint,
  SelectionMark,
  MobileSelectBar,
  RowActionsMenu,
  RowGrip,
  StatusDot,
  QuietBadge,
  type RowAction,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";
import { SortableList } from "@/components/admin/sortable/SortableList";
import { SortableRow } from "@/components/admin/sortable/SortableRow";
import { SortableGrip } from "@/components/admin/sortable/SortableGrip";
import { useReorder } from "@/lib/admin/useReorder";

type FilterTab = "all" | "active" | "inactive";


export default function AdminAgendaPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy.ts/RLS (lihat PermissionsProvider).
  const permCreate = can("agenda:create");
  const permUpdate = can("agenda:update");
  const permDelete = can("agenda:delete");
  const [items, setItems] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile): checkbox menggantikan lencana tanggal, tap baris =
  // toggle, bar aksi massal sticky di bawah. Desktop tetap pakai checkbox tabel.
  const [pickMode, setPickMode] = useState(false);
  useAdminBottomBar(pickMode);
  const [deleteItem, setDeleteItem] = useState<AgendaEvent | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<AgendaEvent | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getAgendaEvents();
      setItems(data);
    } catch {
      // Query gagal → tampil EmptyState "Gagal memuat", BUKAN daftar kosong palsu.
      setLoadError("Gagal memuat agenda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchItems();
    })().catch(() => {});
  }, [fetchItems]);

  const filtered = useMemo(() => {
    let result = items;
    if (filter === "active") result = result.filter((i) => i.is_active);
    if (filter === "inactive") result = result.filter((i) => !i.is_active);
    if (search) result = result.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [items, filter, search]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  // Urutan hanya bermakna pada daftar penuh tanpa pencarian/filter/mode pilih.
  const dragDisabled = search.trim() !== "" || filter !== "all" || pickMode || !permUpdate;

  // Drag & drop urutan — optimistik via hook bersama (rollback + toast + revalidate).
  const onReorder = useReorder(items, setItems, {
    persist: reorderAgendaEvents,
    onSuccess: () => { revalidatePaths(["/", "/agenda"]).catch(() => {}); },
    label: "agenda",
  });

  function toggleSelectAll() {
    if (allVisibleSelected) {
      const s = new Set(selectedIds);
      filtered.forEach((i) => s.delete(i.id));
      setSelectedIds(s);
    } else {
      const s = new Set(selectedIds);
      filtered.forEach((i) => s.add(i.id));
      setSelectedIds(s);
    }
  }

  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedIds(s);
  }

  // ── Mode pilih (mobile) ─────────────────────────────────────
  /** Masuk mode pilih; bila `id` diisi (long-press), baris itu langsung tercentang. */
  function enterPickMode(id?: string) {
    setPickMode(true);
    if (id) {
      const s = new Set(selectedIds);
      s.add(id);
      setSelectedIds(s);
    }
  }

  /** Keluar mode pilih dan hapus semua centang. */
  function exitPickMode() {
    setPickMode(false);
    setSelectedIds(new Set());
  }

  function openCreate() {
    setEditItem(null);
    setFormTitle("");
    setFormDate("");
    setFormOpen(true);
  }

  function openEdit(item: AgendaEvent) {
    setEditItem(item);
    setFormTitle(item.title);
    if (item.event_date) {
      const d = new Date(item.event_date);
      const pad = (n: number) => String(n).padStart(2, "0");
      setFormDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setFormDate("");
    }
    setFormOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim()) { toast("Judul agenda wajib diisi", "error"); return; }
    if (!formDate) { toast("Tanggal agenda wajib diisi", "error"); return; }
    setFormSaving(true);
    const eventDate = new Date(formDate).toISOString();
    if (editItem) {
      const { error } = await updateAgendaEvent(editItem.id, { title: formTitle, event_date: eventDate });
      if (error) { toast(error, "error"); setFormSaving(false); return; }
      toast("Agenda diperbarui", "success");
    } else {
      const { error } = await createAgendaEvent(formTitle, eventDate);
      if (error) { toast(error, "error"); setFormSaving(false); return; }
      toast("Agenda ditambahkan", "success");
    }
    setFormOpen(false);
    setFormSaving(false);
    fetchItems();
  }

  async function handleToggle(item: AgendaEvent) {
    await updateAgendaEvent(item.id, { is_active: !item.is_active });
    fetchItems();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    await deleteAgendaEvent(deleteItem.id);
    toast("Agenda dihapus", "success");
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchItems();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteAgendaEventBulk(ids);
    toast(`${ids.length} agenda dihapus`, "success");
    exitPickMode();
    setBulkDelete(false);
    fetchItems();
  }


  const activeCount = items.filter((i) => i.is_active).length;
  const inactiveCount = items.length - activeCount;

  // Opsi dropdown status — dipakai toolbar desktop & mobile agar seragam.
  const statusOptions = [
    { key: "all", label: "Semua Status", count: items.length },
    { key: "active", label: "Aktif", count: activeCount },
    { key: "inactive", label: "Nonaktif", count: inactiveCount },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <CalendarBlank className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Agenda</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">Kelola agenda penting yang tampil di countdown homepage</p>
          </div>
        </div>
        {permCreate && (
          <button onClick={openCreate}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)]">
            <Plus className="h-4 w-4" /> Buat Baru
          </button>
        )}
      </div>

      {/* Stats — StatPillGroup: pill kompak satu baris */}
      <StatPillGroup>
        <StatPill icon={Users} label="Total" value={items.length} tone="neutral" />
        <StatPill icon={CheckCircle} label="Aktif" value={activeCount} tone="success" />
        <StatPill icon={XCircle} label="Nonaktif" value={inactiveCount} tone="danger" />
      </StatPillGroup>

      {/* Bulk actions — desktop; mobile memakai bar sticky saat mode pilih */}
      {selectedIds.size > 0 && (
        <div className="mb-4 hidden items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex md:flex-nowrap md:overflow-x-auto">
          <Checks className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
          <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          {permDelete && (
            <button onClick={() => setBulkDelete(true)}
              aria-label={`Hapus ${selectedIds.size} agenda terpilih`}
              className="whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">
              Hapus
            </button>
          )}
          <button onClick={() => setSelectedIds(new Set())}
            aria-label="Hapus pilihan" title="Hapus pilihan"
            className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter + Search (desktop md+) */}
      {/* Filter + Search (desktop md+) — gaya Portal: pencarian di kiri,
          status sebagai pill dropdown berjumlah di kanan. */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari agenda..."
          searchLabel="Cari agenda"
          query={search}
          onQueryChange={(v) => { setSearch(v); }}
          filters={[
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => { setFilter(k as FilterTab); setSelectedIds(new Set()); },
              menuLabel: "Filter status",
            },
          ]}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian penuh + dropdown filter + Pilih */}
      <MobileFilterBar
        placeholder="Cari agenda…"
        searchLabel="Cari agenda"
        query={search}
        onQueryChange={(v) => { setSearch(v); }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => { setFilter(k as FilterTab); setSelectedIds(new Set()); },
        }}
        action={<MobilePickButton onClick={() => setPickMode(true)} />}
        selectMode={pickMode}
        selectedCount={selectedIds.size}
        allSelected={allVisibleSelected}
        onSelectAllVisible={toggleSelectAll}
      />

      {/* Tabel desktop (md+) — tampilan & perilaku sama seperti sebelumnya */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <SortableList ids={filtered.map((i) => i.id)} onReorder={onReorder}>
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                {/* hidden sm:table-cell — di bawah 640px tabel ini masih punya
                    6 kolom padahal lebar kontennya cuma ±328px (kolom ±47px,
                    pasti terpotong). Checkbox dan Urutan disembunyikan:
                    seleksi massal & geser urutan adalah aksi desktop yang tidak
                    masuk akal di layar sentuh. Sisa 4 kolom muat tanpa scroll. */}
                <th className="hidden w-12 px-2 py-3 text-center md:table-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                </th>
                <th className="hidden w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Urutan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Judul Agenda</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tanggal</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data agenda...</p>
                  </div>
                </td></tr>
              ) : loadError ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                      <XCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Gagal memuat data</p>
                    <p className="mt-0.5 text-xs text-slate-500">{loadError}</p>
                    <button onClick={() => fetchItems()} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                      Coba lagi
                    </button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <CalendarBlank className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada agenda"}</p>
                    </div>
                    {!search && filter === "all" && permCreate && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                        <Plus className="h-3.5 w-3.5" /> Buat Agenda Pertama
                      </button>
                    )}
                  </div>
                </td></tr>
              ) : (
                filtered.map((item, index) => (
                  <SortableAgendaRow
                    key={item.id}
                    item={item}
                    index={index}
                    selected={selectedIds.has(item.id)}
                    dragDisabled={dragDisabled}
                    onToggleSelect={toggleSelect}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={setDeleteItem}
                    canEdit={permUpdate}
                    canDelete={permDelete}
                    canToggle={permUpdate}
                  />
                ))
              )}
            </tbody>
          </table>
          </SortableList>
        </div>
      </div>

      {/* Daftar mobile (<md) — baris ringkas tanpa scroll horizontal; semua
          fitur tetap ada: pilih (mode pilih), geser urutan lewat grip drag,
          edit & hapus via menu ⋯. */}
      <LongPressHint />
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <SortableList ids={filtered.map((i) => i.id)} onReorder={onReorder}>
        <div role="list" aria-label="Daftar agenda">
          {loading ? (
            <div className="space-y-3 px-3 py-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-12 w-10 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <SkeletonBlock className="h-3.5 w-2/3 rounded" />
                    <SkeletonBlock className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Gagal memuat data</p>
              <p className="mt-0.5 text-xs text-slate-500">{loadError}</p>
              <button onClick={() => fetchItems()} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                Coba lagi
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <CalendarBlank className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada agenda"}</p>
              </div>
              {!search && filter === "all" && permCreate && (
                <button onClick={openCreate} className="mt-1 flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                  <Plus className="h-3.5 w-3.5" /> Buat Agenda Pertama
                </button>
              )}
            </div>
          ) : (
            filtered.map((item, index) => (
              <AgendaMobileRow
                key={item.id}
                item={item}
                index={index}
                selected={selectedIds.has(item.id)}
                selectMode={pickMode}
                dragDisabled={dragDisabled}
                onEnterPickMode={enterPickMode}
                onToggleSelect={toggleSelect}
                onEdit={openEdit}
                onDelete={setDeleteItem}
                onToggle={handleToggle}
                canEdit={permUpdate}
                canDelete={permDelete}
                canToggle={permUpdate}
              />
            ))
          )}
        </div>
        </SortableList>
      </div>

      {pickMode && (
        <MobileSelectBar
          count={selectedIds.size}
          onDelete={permDelete ? () => setBulkDelete(true) : undefined}
          onCancel={exitPickMode}
        />
      )}

      {/* Create/Edit SlideOver */}
      <SlideOver open={formOpen} onClose={() => !formSaving && setFormOpen(false)}
        title={editItem ? "Edit Agenda" : "Buat Agenda Baru"}
        description={editItem ? "Perbarui data agenda" : "Isi form untuk menambahkan agenda"}
        footer={
          <div className="flex w-full items-center justify-between">
            <button onClick={() => setFormOpen(false)} disabled={formSaving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Batal
            </button>
            <button data-solid data-busy onClick={handleSave} disabled={formSaving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]">
              {formSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <FloppyDisk className="h-4 w-4" />
                  Simpan
                </>
              )}
            </button>
          </div>
        }>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Judul Agenda <span className="text-red-500">*</span></label>
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Contoh: Pengambilan Raport" autoComplete="off"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tanggal & Jam <span className="text-red-500">*</span></label>
            <input type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
            <p className="mt-1.5 text-xs text-slate-400">Tanggal dan waktu acara (countdown akan dihitung mundur ke tanggal ini)</p>
          </div>
        </div>
      </SlideOver>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Agenda?"
        description={`"${deleteItem?.title}" akan dihapus permanen.`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Agenda?`}
        description="Semua agenda yang dipilih akan dihapus permanen."
      />
    </div>
  );
}

/**
 * Satu baris tabel agenda: [checkbox] [grip urutan] [judul] [tanggal]
 * [status] [aksi]. Urutan diubah lewat drag grip.
 */
function SortableAgendaRow({
  item,
  index,
  selected,
  dragDisabled,
  onToggleSelect,
  onToggle,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  canToggle,
}: {
  item: AgendaEvent;
  index: number;
  selected: boolean;
  dragDisabled: boolean;
  onToggleSelect: (id: string) => void;
  onToggle: (e: AgendaEvent) => void;
  onEdit: (e: AgendaEvent) => void;
  onDelete: (e: AgendaEvent) => void;
  canEdit: boolean;
  canDelete: boolean;
  canToggle: boolean;
}) {
  return (
    <SortableRow id={item.id} disabled={dragDisabled}>
      {({ setNodeRef, style, isDragging, attributes, listeners }) => (
        <tr
          ref={setNodeRef}
          style={style}
          className={`relative transition-colors ${isDragging ? "bg-slate-50 opacity-70" : selected ? "bg-[var(--brand-primary)]/[0.03]" : "hover:bg-slate-50/80"}`}
        >
          <td className="hidden w-12 px-2 py-3.5 text-center md:table-cell" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(item.id)}
              aria-label={`Pilih ${item.title}`}
              className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
          </td>
          <td className="hidden px-4 py-3.5 sm:table-cell">
            <SortableGrip index={index} label={item.title} disabled={dragDisabled} attributes={attributes} listeners={listeners} />
          </td>
          <td className="px-4 py-3.5">
            <span className="text-sm font-medium text-slate-700">{item.title}</span>
          </td>
          <td className="px-4 py-3.5 text-center text-sm text-slate-500 whitespace-nowrap">
            {new Date(item.event_date).toLocaleDateString("id-ID", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </td>
          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onToggle(item)} disabled={!canToggle}
              title={canToggle ? "Klik untuk ubah status" : "Tidak berizin mengubah status"}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default ${
                item.is_active
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
              }`}>
              {item.is_active ? "Aktif" : "Nonaktif"}
            </button>
          </td>
          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-1">
              {canEdit && (
                <button onClick={() => onEdit(item)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                  <PencilSimple className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(item)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
                  <Trash className="h-4 w-4" />
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </SortableRow>
  );
}

/**
 * Satu baris agenda versi mobile (<md): [grip urutan] [tile tanggal r12 +
 * titik status] [judul + tanggal lengkap + badge "Nonaktif"] [menu ⋯: Edit,
 * Nonaktifkan/Aktifkan, Hapus]. Tap baris = Edit; long-press = mode pilih; di
 * mode pilih checkbox menggantikan grip dan tap baris = toggle centang.
 * Perubahan status hanya lewat menu ⋯ (bukan pill sekali ketuk). Geser urutan
 * lewat grip (drag).
 */
function AgendaMobileRow({
  item,
  index,
  selected,
  selectMode,
  dragDisabled,
  onEnterPickMode,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggle,
  canEdit,
  canDelete,
  canToggle,
}: {
  item: AgendaEvent;
  index: number;
  selected: boolean;
  selectMode: boolean;
  dragDisabled: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (e: AgendaEvent) => void;
  onDelete: (e: AgendaEvent) => void;
  onToggle: (e: AgendaEvent) => void;
  canEdit: boolean;
  canDelete: boolean;
  canToggle: boolean;
}) {
  const d = new Date(item.event_date);
  const day = d.getDate();
  const monthShort = d.toLocaleDateString("id-ID", { month: "short" }).replace(".", "");
  const fullDate = d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const actions: RowAction[] = [
    ...(canEdit
      ? [{ key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => onEdit(item) }]
      : []),
    ...(canToggle
      ? [{
          key: "toggle",
          label: item.is_active ? "Nonaktifkan" : "Aktifkan",
          icon: item.is_active ? <Clock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
          run: () => onToggle(item),
        }]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) }]
      : []),
  ];

  return (
    <SortableRow id={item.id} disabled={dragDisabled}>
      {({ setNodeRef, style, isDragging, attributes, listeners }) => (
        <div
          ref={setNodeRef}
          style={style}
          role="listitem"
          className={`relative transition-colors ${isDragging ? "bg-slate-50 opacity-70" : ""}`}
        >
          <MobileListRow
            lead={
              selectMode ? (
                <SelectionMark selected={selected} />
              ) : (
                <RowGrip
                  index={index}
                  label={item.title}
                  disabled={dragDisabled}
                  attributes={attributes}
                  listeners={dragDisabled ? {} : listeners}
                />
              )
            }
            thumb={
              <span className="relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#e4ecf6] leading-none">
                <span aria-hidden="true" className="text-base font-bold tabular-nums text-[var(--brand-primary)]">{day}</span>
                <span aria-hidden="true" className="mt-0.5 text-[10px] font-semibold uppercase text-[var(--brand-accent)]">{monthShort}</span>
                <StatusDot
                  tone={item.is_active ? "active" : "off"}
                  label={item.is_active ? "Aktif" : "Nonaktif"}
                  className="absolute bottom-0 right-0"
                />
              </span>
            }
            title={item.title}
            badge={!item.is_active ? <QuietBadge>Nonaktif</QuietBadge> : undefined}
            subtitle={<span className="min-w-0 truncate">{fullDate}</span>}
            actions={<RowActionsMenu label={item.title} actions={actions} disabled={selectMode} />}
            selected={selected}
            selectionMode={selectMode}
            onClick={() => {
              if (selectMode) onToggleSelect(item.id);
              else onEdit(item);
            }}
            onLongPress={() => onEnterPickMode(item.id)}
          />
        </div>
      )}
    </SortableRow>
  );
}
