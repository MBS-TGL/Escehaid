"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getAgendaEvents,
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  deleteAgendaEventBulk,
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
  CaretLeft,
  CaretRight,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  Users,
} from "@/components/Icons";
import {
  MobileFilterBar,
  MobilePagination,
  MobilePickButton,
  MobileListRow,
  MobileSelectBar,
  RowActionsMenu,
  StatusDot,
  QuietBadge,
  type RowAction,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";

type FilterTab = "all" | "active" | "inactive";

const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile): checkbox menggantikan lencana tanggal, tap baris =
  // toggle, bar aksi massal sticky di bawah. Desktop tetap pakai checkbox tabel.
  const [pickMode, setPickMode] = useState(false);
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allVisibleSelected = paginated.length > 0 && paginated.every((i) => selectedIds.has(i.id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      const s = new Set(selectedIds);
      paginated.forEach((i) => s.delete(i.id));
      setSelectedIds(s);
    } else {
      const s = new Set(selectedIds);
      paginated.forEach((i) => s.add(i.id));
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

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= items.length) return;
    const newOrder = [...items];
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    for (let i = 0; i < newOrder.length; i++) {
      await updateAgendaEvent(newOrder[i].id, { sort_order: i });
    }
    fetchItems();
  }

  const activeCount = items.filter((i) => i.is_active).length;
  const inactiveCount = items.length - activeCount;

  // Opsi dropdown status — dipakai toolbar desktop & mobile agar seragam.
  const statusOptions = [
    { key: "all", label: "Semua", count: items.length },
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
        <div className="mb-4 hidden flex-wrap items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex">
          <Checks className="h-4 w-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          {permDelete && (
            <button onClick={() => setBulkDelete(true)}
              aria-label={`Hapus ${selectedIds.size} agenda terpilih`}
              className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">
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
          onQueryChange={(v) => { setSearch(v); setPage(1); }}
          filters={[
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => { setFilter(k as FilterTab); setPage(1); setSelectedIds(new Set()); },
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
        onQueryChange={(v) => { setSearch(v); setPage(1); }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => { setFilter(k as FilterTab); setPage(1); setSelectedIds(new Set()); },
        }}
        action={<MobilePickButton onClick={() => setPickMode(true)} />}
        selectMode={pickMode}
        selectedCount={selectedIds.size}
        allSelected={allVisibleSelected}
        onSelectAllVisible={toggleSelectAll}
        onCancelSelect={exitPickMode}
      />

      {/* Tabel desktop (md+) — tampilan & perilaku sama seperti sebelumnya */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                {/* hidden sm:table-cell — di bawah 640px tabel ini masih punya
                    7 kolom padahal lebar kontennya cuma ±328px (kolom ±47px,
                    pasti terpotong). Checkbox, No dan Urutan disembunyikan:
                    seleksi massal & geser urutan adalah aksi desktop yang tidak
                    masuk akal di layar sentuh. Sisa 4 kolom muat tanpa scroll. */}
                <th className="hidden w-10 px-4 py-3 sm:table-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">No</th>
                <th className="hidden w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Urutan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Judul Agenda</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tanggal</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data agenda...</p>
                  </div>
                </td></tr>
              ) : loadError ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
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
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
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
                paginated.map((item, index) => (
                  <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[var(--brand-primary)]/[0.03]" : ""}`}>
                    {/* hidden sm:table-cell — pasangan dari <th> di atas */}
                    <td className="hidden px-4 py-3.5 sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-400 sm:table-cell">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleReorder(item.id, "up")} disabled={index === 0}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 8h5v8h6v-8h5z" /></svg>
                        </button>
                        <span className="w-6 text-center text-xs font-semibold text-slate-500">{item.sort_order}</span>
                        <button onClick={() => handleReorder(item.id, "down")} disabled={index === paginated.length - 1}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l8-8h-5V4H9v8H4z" /></svg>
                        </button>
                      </div>
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
                      <button onClick={() => handleToggle(item)} disabled={!permUpdate}
                        title={permUpdate ? "Klik untuk ubah status" : "Tidak berizin mengubah status"}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default disabled:opacity-70 ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}>
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {permUpdate && (
                          <button onClick={() => openEdit(item)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                            <PencilSimple className="h-4 w-4" />
                          </button>
                        )}
                        {permDelete && (
                          <button onClick={() => setDeleteItem(item)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
                            <Trash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} agenda
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[var(--brand-primary)] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Daftar mobile (<md) — baris ringkas tanpa scroll horizontal; semua
          fitur tetap ada: pilih (mode pilih), geser urutan (Naik/Turun di
          menu ⋯), edit & hapus via menu ⋯. */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
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
          ) : paginated.length === 0 ? (
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
            paginated.map((item, index) => (
              <AgendaMobileRow
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                selectMode={pickMode}
                onEnterPickMode={enterPickMode}
                onToggleSelect={toggleSelect}
                onEdit={openEdit}
                onDelete={setDeleteItem}
                onToggle={handleToggle}
                onReorder={handleReorder}
                canGoUp={index > 0}
                canGoDown={index < paginated.length - 1}
                canEdit={permUpdate}
                canDelete={permDelete}
                canToggle={permUpdate}
              />
            ))
          )}
        </div>
        {!loading && filtered.length > 0 && (
          <MobilePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            from={(page - 1) * PAGE_SIZE + 1}
            to={Math.min(page * PAGE_SIZE, filtered.length)}
            onPageChange={setPage}
            itemLabel="agenda"
          />
        )}
        {/* Ruang ekstra agar baris terakhir tidak tertutup bar sticky mode pilih */}
        {pickMode && <div className="h-24" aria-hidden="true" />}
      </div>

      {/* Bar aksi massal sticky (mobile, mode pilih) — di atas bottom nav admin */}
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
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              Batal
            </button>
            <button onClick={handleSave} disabled={formSaving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-70">
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
 * Satu baris agenda versi mobile (<md): [tile tanggal r12 + titik status]
 * [judul + tanggal lengkap + badge "Nonaktif"] [menu ⋯: Edit,
 * Nonaktifkan/Aktifkan, Naik, Turun, Hapus]. Tap baris = Edit (halaman ini
 * tidak punya modal lihat); long-press = mode pilih; di mode pilih checkbox
 * menggantikan tile dan tap baris = toggle centang. Perubahan status hanya
 * lewat menu ⋯ (bukan pill sekali ketuk). Geser urutan lewat Naik/Turun di
 * menu ⋯ — padanan tombol panah kolom "Urutan" di tabel desktop.
 */
function AgendaMobileRow({
  item,
  selected,
  selectMode,
  onEnterPickMode,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
  canGoUp,
  canGoDown,
  canEdit,
  canDelete,
  canToggle,
}: {
  item: AgendaEvent;
  selected: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (e: AgendaEvent) => void;
  onDelete: (e: AgendaEvent) => void;
  onToggle: (e: AgendaEvent) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  canGoUp: boolean;
  canGoDown: boolean;
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
    ...(canGoUp
      ? [{ key: "up", label: "Naik", icon: <ArrowUp className="h-4 w-4" />, run: () => onReorder(item.id, "up") }]
      : []),
    ...(canGoDown
      ? [{ key: "down", label: "Turun", icon: <ArrowDown className="h-4 w-4" />, run: () => onReorder(item.id, "down") }]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) }]
      : []),
  ];

  return (
    <div role="listitem">
      <MobileListRow
        lead={
          selectMode ? (
            <span
              data-no-longpress=""
              onClick={(e) => e.stopPropagation()}
              className="flex h-10 w-10 shrink-0 items-center justify-center"
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(item.id)}
                aria-label={`Pilih ${item.title}`}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              />
            </span>
          ) : (
            <span className="relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#e4ecf6] leading-none">
              <span aria-hidden="true" className="text-base font-bold tabular-nums text-[var(--brand-primary)]">{day}</span>
              <span aria-hidden="true" className="mt-0.5 text-[10px] font-semibold uppercase text-[var(--brand-accent)]">{monthShort}</span>
              <StatusDot
                tone={item.is_active ? "active" : "off"}
                label={item.is_active ? "Aktif" : "Nonaktif"}
                className="absolute bottom-0 right-0"
              />
            </span>
          )
        }
        title={item.title}
        badge={!item.is_active ? <QuietBadge>Nonaktif</QuietBadge> : undefined}
        subtitle={<span className="min-w-0 truncate">{fullDate}</span>}
        actions={<RowActionsMenu label={item.title} actions={actions} disabled={selectMode} />}
        selected={selected}
        onClick={() => {
          if (selectMode) onToggleSelect(item.id);
          else onEdit(item);
        }}
        onLongPress={() => onEnterPickMode(item.id)}
      />
    </div>
  );
}