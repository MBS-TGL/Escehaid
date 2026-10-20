"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  deleteAnnouncementBulk,
} from "@/lib/queries";
import type { Announcement } from "@/lib/queries";
import { ConfirmModal, SlideOver, SkeletonBlock } from "@/components/ui";
import AiFillPanel from "@/components/admin/AiFillPanel";
import type { RefineData } from "@/lib/queries/ai";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { formatRelativeTime } from "@/lib/admin-display";
import {
  Megaphone,
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

export default function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy.ts/RLS (lihat PermissionsProvider).
  const permCreate = can("pengumuman:create");
  const permUpdate = can("pengumuman:update");
  const permDelete = can("pengumuman:delete");
  const permPublish = can("pengumuman:publish");
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile): checkbox menggantikan nomor, tap baris = toggle,
  // bar aksi massal sticky di bawah. Desktop tetap pakai checkbox tabel.
  const [pickMode, setPickMode] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Announcement | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [formText, setFormText] = useState("");
  const [formExpires, setFormExpires] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  // Terisi bila teks diisi panel AI → pengumuman baru ditandai source="panel-ai".
  const [aiAssisted, setAiAssisted] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getAnnouncements();
      setItems(data);
    } catch {
      // Query gagal → tampil EmptyState "Gagal memuat", BUKAN daftar kosong palsu.
      setLoadError("Gagal memuat pengumuman.");
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
    if (search) result = result.filter((i) => i.text.toLowerCase().includes(search.toLowerCase()));
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
    setFormText("");
    setFormExpires("");
    setAiAssisted(false);
    setFormOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditItem(item);
    setFormText(item.text);
    setFormExpires(item.expires_at ? item.expires_at.slice(0, 10) : "");
    setAiAssisted(false);
    setFormOpen(true);
  }

  // ── Panel isi-otomatis AI ──
  /** Isi teks pengumuman hasil AI (field memang cuma satu). */
  function applyAiFields(f: RefineData) {
    setFormText((prev) => f.announcement || prev);
    setAiAssisted(true);
  }

  /** Undo: kembalikan teks ke nilai sebelum ditimpa AI. */
  function restoreAiSnapshot(s: Record<string, string>) {
    setFormText(s.text ?? "");
    setAiAssisted(false);
  }

  async function handleSave() {
    if (!formText.trim()) { toast("Teks pengumuman wajib diisi", "error"); return; }
    const expiresAt = formExpires.trim() || null;
    setFormSaving(true);
    if (editItem) {
      const { error } = await updateAnnouncement(editItem.id, { text: formText, expires_at: expiresAt });
      if (error) { toast(error, "error"); setFormSaving(false); return; }
      toast("Pengumuman diperbarui", "success");
    } else {
      const { error } = await createAnnouncement(
        formText,
        expiresAt,
        aiAssisted ? "panel-ai" : undefined
      );
      if (error) { toast(error, "error"); setFormSaving(false); return; }
      toast("Pengumuman ditambahkan", "success");
    }
    setFormOpen(false);
    setFormSaving(false);
    fetchItems();
  }

  async function handleToggle(item: Announcement) {
    await updateAnnouncement(item.id, { is_active: !item.is_active });
    fetchItems();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    await deleteAnnouncement(deleteItem.id);
    toast("Pengumuman dihapus", "success");
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchItems();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteAnnouncementBulk(ids);
    toast(`${ids.length} pengumuman dihapus`, "success");
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
      await updateAnnouncement(newOrder[i].id, { sort_order: i });
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
            <Megaphone className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Pengumuman</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">Kelola teks pengumuman yang tampil di bar atas website</p>
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
              aria-label={`Hapus ${selectedIds.size} pengumuman terpilih`}
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
          placeholder="Cari pengumuman..."
          searchLabel="Cari pengumuman"
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
        placeholder="Cari pengumuman…"
        searchLabel="Cari pengumuman"
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
                {/* hidden sm:table-cell — 6 kolom terlihat pada konten ±328px.
                    Checkbox, No dan Urutan adalah afordansi desktop (seleksi
                    massal & geser urutan), sama seperti tabel agenda/teachers. */}
                <th className="hidden w-10 px-4 py-3 sm:table-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">No</th>
                <th className="hidden w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Urutan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Teks Pengumuman</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">Berlaku s/d</th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">Tanggal</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data pengumuman...</p>
                  </div>
                </td></tr>
              ) : loadError ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
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
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Megaphone className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pengumuman"}</p>
                    </div>
                    {!search && filter === "all" && permCreate && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                        <Plus className="h-3.5 w-3.5" /> Buat Pengumuman Pertama
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
                      <span className="text-sm text-slate-700">{item.text}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleToggle(item)} disabled={!permPublish}
                        title={permPublish ? "Klik untuk ubah status" : "Tidak berizin mengubah status"}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default ${item.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          } disabled:opacity-70`}>
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="hidden px-4 py-3.5 text-center text-sm text-slate-500 lg:table-cell">
                      {item.expires_at
                        ? new Date(item.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="hidden px-4 py-3.5 text-center text-sm text-slate-500 lg:table-cell whitespace-nowrap" title={new Date(item.created_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}>
                      {formatRelativeTime(item.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {permUpdate && (
                          <button onClick={() => openEdit(item)} aria-label={`Edit pengumuman ${item.text.slice(0, 30)}`}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                            <PencilSimple className="h-4 w-4" />
                          </button>
                        )}
                        {permDelete && (
                          <button onClick={() => setDeleteItem(item)} aria-label={`Hapus pengumuman ${item.text.slice(0, 30)}`}
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
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} pengumuman
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
        <div role="list" aria-label="Daftar pengumuman">
          {loading ? (
            <div className="space-y-3 px-3 py-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-1.5">
                  <SkeletonBlock className="h-3.5 w-3/4 rounded" />
                  <SkeletonBlock className="h-3 w-1/3 rounded" />
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
                <Megaphone className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pengumuman"}</p>
              </div>
              {!search && filter === "all" && permCreate && (
                <button onClick={openCreate} className="mt-1 flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                  <Plus className="h-3.5 w-3.5" /> Buat Pengumuman Pertama
                </button>
              )}
            </div>
          ) : (
            paginated.map((item, index) => (
              <AnnouncementMobileRow
                key={item.id}
                item={item}
                index={(page - 1) * PAGE_SIZE + index}
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
                canToggle={permPublish}
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
            itemLabel="pengumuman"
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
        title={editItem ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
        description={editItem ? "Perbarui teks pengumuman" : "Isi form untuk menambahkan pengumuman"}
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
          {/* Isi otomatis AI — tempel kalimat mentah → dirapikan; di mode
              edit tampil juga (menimpa teks lama setelah konfirmasi,
              ada Undo). */}
          <AiFillPanel
            target="announcements"
            current={{ text: formText }}
            hasContent={!!formText.trim()}
            onApply={applyAiFields}
            onRestore={restoreAiSnapshot}
            disabled={formSaving}
          />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Teks Pengumuman <span className="text-red-500">*</span></label>
            <input type="text" value={formText} onChange={(e) => setFormText(e.target.value)}
              placeholder="Contoh: SPMB 2026/2027 Sudah Dibuka!" autoComplete="off"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
            <p className="mt-1.5 text-xs text-slate-400">Teks ini akan ditampilkan di bar berjalan (marquee) di atas website</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Berlaku sampai (opsional)</label>
            <input type="date" value={formExpires} onChange={(e) => setFormExpires(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
            <p className="mt-1.5 text-xs text-slate-400">Setelah tanggal ini (zona WIB) pengumuman otomatis disembunyikan dari bar. Kosongkan = tampil terus.</p>
          </div>
        </div>
      </SlideOver>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Pengumuman?"
        description={`"${deleteItem?.text}" akan dihapus permanen.`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Pengumuman?`}
        description="Semua pengumuman yang dipilih akan dihapus permanen."
      />
    </div>
  );
}

/**
 * Satu baris pengumuman versi mobile (<md): [nomor urut] [tile ikon 40px
 * r12 + titik status] [teks (2 baris) + tanggal + badge "Nonaktif"] [menu
 * ⋯: Edit, Nonaktifkan/Aktifkan, Naik, Turun, Hapus]. Perubahan status
 * hanya lewat menu ⋯ (bukan pill sekali ketuk). Tap baris = Edit (halaman
 * ini tidak punya modal lihat); long-press = mode pilih; di mode pilih
 * checkbox menggantikan nomor dan tap baris = toggle centang. Geser urutan
 * lewat Naik/Turun di menu ⋯ — padanan tombol panah kolom "Urutan" di tabel
 * desktop.
 */
function AnnouncementMobileRow({
  item,
  index,
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
  item: Announcement;
  index: number;
  selected: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
  onToggle: (a: Announcement) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  canGoUp: boolean;
  canGoDown: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canToggle: boolean;
}) {
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
                aria-label={`Pilih pengumuman ${item.text.slice(0, 30)}`}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              />
            </span>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-[11px] font-semibold tabular-nums text-[#64748b]">
              {index + 1}
            </span>
          )
        }
        thumb={
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e4ecf6]">
            <Megaphone className="h-5 w-5 text-[var(--brand-accent)]" />
            <StatusDot
              tone={item.is_active ? "active" : "off"}
              label={item.is_active ? "Aktif" : "Nonaktif"}
              className="absolute -bottom-1 -right-1"
            />
          </span>
        }
        title={<span className="break-words">{item.text}</span>}
        badge={!item.is_active ? <QuietBadge>Nonaktif</QuietBadge> : undefined}
        subtitle={
          <span className="min-w-0 truncate" title={new Date(item.created_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}>
            {formatRelativeTime(item.created_at)}
            {item.expires_at
              ? ` · s/d ${new Date(item.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
              : ""}
          </span>
        }
        actions={<RowActionsMenu label={`pengumuman ${item.text.slice(0, 30)}`} actions={actions} disabled={selectMode} />}
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
