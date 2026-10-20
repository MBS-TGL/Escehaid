"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  getDownloadListAll,
  createDownload,
  updateDownload,
  deleteDownload,
  deleteDownloadBulk,
  uploadDownloadFile,
  downloadKind,
  formatFileSize,
  checkDownloadFile,
  friendlyDownloadError,
  revalidatePaths,
} from "@/lib/queries";
import type { Download as DownloadItem } from "@/lib/supabase";
import { ConfirmModal, SlideOver, SkeletonBlock } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import {
  Download,
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
  FileText,
  Warning,
  Paperclip,
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

/** Draft form tambah/edit unduhan. */
type DownloadFormState = {
  title: string;
  category: string;
  description: string;
};

const emptyForm: DownloadFormState = { title: "", category: "", description: "" };

export default function AdminDownloadsPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy.ts/RLS (lihat PermissionsProvider).
  const permCreate = can("unduhan:create");
  const permUpdate = can("unduhan:update");
  const permDelete = can("unduhan:delete");
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  /** Pesan kegagalan memuat (RLS/tabel belum ada) — tampil sebagai banner. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile): checkbox menggantikan tile berkas, tap baris = toggle,
  // bar aksi massal sticky di bawah. Desktop tetap pakai checkbox tabel.
  const [pickMode, setPickMode] = useState(false);
  const [deleteItem, setDeleteItem] = useState<DownloadItem | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<DownloadItem | null>(null);
  const [form, setForm] = useState<DownloadFormState>(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Berkas baru yang dipilih pengguna (belum terunggah sampai Simpan)
  const [file, setFile] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getDownloadListAll();
      setItems(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal memuat data unduhan.");
      setItems([]);
    }
    setLoading(false);
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
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q)
      );
    }
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
    setForm(emptyForm);
    setFormError("");
    setFile(null);
    setFormOpen(true);
  }

  function openEdit(item: DownloadItem) {
    setEditItem(item);
    setForm({
      title: item.title,
      category: item.category === "Umum" ? "" : item.category,
      description: item.description || "",
    });
    setFormError("");
    setFile(null);
    setFormOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const invalid = checkDownloadFile(selected);
    if (invalid) {
      toast(invalid, "error");
      e.target.value = "";
      return;
    }
    setFile(selected);
    e.target.value = "";
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Judul wajib diisi."); return; }
    if (!editItem && !file) { setFormError("Pilih berkas terlebih dahulu."); return; }

    setFormSaving(true);
    setFormError("");

    // Unggah berkas baru bila diganti/dipilih (nama tampil + ukuran ikut dipakai).
    let fileUrl = editItem?.file_url ?? "";
    let fileName = editItem?.file_name ?? null;
    let fileSize = editItem?.file_size ?? null;
    if (file) {
      setFileUploading(true);
      const uploaded = await uploadDownloadFile(file);
      setFileUploading(false);
      if (!uploaded.url) {
        setFormSaving(false);
        setFormError(uploaded.error || "Gagal mengunggah berkas.");
        return;
      }
      fileUrl = uploaded.url;
      fileName = uploaded.name;
      fileSize = uploaded.size;
    }

    if (editItem) {
      const { error } = await updateDownload(editItem.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || "Umum",
        ...(file ? { file_url: fileUrl, file_name: fileName, file_size: fileSize } : {}),
      });
      if (error) { setFormSaving(false); setFormError(error); toast(error, "error"); return; }
      toast("Unduhan diperbarui", "success");
    } else {
      const { error } = await createDownload({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || "Umum",
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        sort_order: items.length,
      });
      if (error) {
        setFormSaving(false);
        setFormError(friendlyDownloadError(error));
        toast(friendlyDownloadError(error), "error");
        return;
      }
      toast("Unduhan ditambahkan", "success");
    }
    setFormOpen(false);
    setFormSaving(false);
    fetchItems();
    revalidatePaths(["/", "/downloads"]).catch(() => {});
  }

  async function handleToggle(item: DownloadItem) {
    const { error } = await updateDownload(item.id, { is_active: !item.is_active });
    if (error) { toast(error, "error"); return; }
    toast(item.is_active ? "Unduhan disembunyikan" : "Unduhan ditampilkan", "success");
    fetchItems();
    revalidatePaths(["/", "/downloads"]).catch(() => {});
  }

  async function handleDelete() {
    if (!deleteItem) return;
    const { error } = await deleteDownload(deleteItem.id);
    if (error) { toast(error, "error"); fetchItems(); return; }
    toast("Unduhan dihapus", "success");
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchItems();
    revalidatePaths(["/", "/downloads"]).catch(() => {});
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await deleteDownloadBulk(ids);
    if (error) { toast(error, "error"); fetchItems(); return; }
    toast(`${ids.length} unduhan dihapus`, "success");
    exitPickMode();
    setBulkDelete(false);
    fetchItems();
    revalidatePaths(["/", "/downloads"]).catch(() => {});
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= items.length) return;
    const newOrder = [...items];
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    for (let i = 0; i < newOrder.length; i++) {
      await updateDownload(newOrder[i].id, { sort_order: i });
    }
    fetchItems();
    revalidatePaths(["/", "/downloads"]).catch(() => {});
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
            <Download className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Unduhan</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">Kelola berkas yang dapat diunduh publik di halaman Unduhan</p>
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

      {/* Error memuat data */}
      {loadError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <Warning className="h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* Bulk actions — desktop; mobile memakai bar sticky saat mode pilih */}
      {selectedIds.size > 0 && (
        <div className="mb-4 hidden flex-wrap items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex">
          <Checks className="h-4 w-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          {permDelete && (
            <button onClick={() => setBulkDelete(true)}
              aria-label={`Hapus ${selectedIds.size} unduhan terpilih`}
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

      {/* Filter + Search (desktop md+) — gaya Portal: pencarian di kiri,
          status sebagai pill dropdown berjumlah di kanan. */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari unduhan..."
          searchLabel="Cari unduhan"
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
        placeholder="Cari unduhan…"
        searchLabel="Cari unduhan"
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

      {/* Tabel desktop (md+) — tampilan & perilaku sama seperti modul lain */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                {/* Checkbox/No/Urutan disembunyikan di <sm (pasangan dari kolom
                    <td> — lihat catatan pola di modul Agenda). */}
                <th className="hidden w-10 px-4 py-3 sm:table-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">No</th>
                <th className="hidden w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Urutan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Berkas</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kategori</th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">Ukuran</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data unduhan...</p>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Download className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada unduhan"}</p>
                    </div>
                    {!search && filter === "all" && !loadError && permCreate && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                        <Plus className="h-3.5 w-3.5" /> Buat Unduhan Pertama
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
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/5 text-[10px] font-bold text-[var(--brand-primary)]">
                          {downloadKind(item.file_name || item.file_url)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700">{item.title}</p>
                          {item.description && <p className="truncate text-xs text-slate-400">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {item.category}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 text-center text-xs text-slate-500 lg:table-cell">
                      {formatFileSize(item.file_size) || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleToggle(item)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}>
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <a href={item.file_url} target="_blank" rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Lihat berkas">
                          <FileText className="h-4 w-4" />
                        </a>
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
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} unduhan
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
          menu ⋯), edit & hapus via menu ⋯, lihat berkas via menu ⋯. */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <div role="list" aria-label="Daftar unduhan">
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
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Download className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada unduhan"}</p>
              </div>
              {!search && filter === "all" && !loadError && permCreate && (
                <button onClick={openCreate} className="mt-1 flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                  <Plus className="h-3.5 w-3.5" /> Buat Unduhan Pertama
                </button>
              )}
            </div>
          ) : (
            paginated.map((item, index) => (
              <DownloadMobileRow
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
            itemLabel="unduhan"
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
        title={editItem ? "Edit Unduhan" : "Buat Unduhan Baru"}
        description={editItem ? "Perbarui data unduhan" : "Isi form untuk menambahkan berkas unduhan"}
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
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Judul <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); setFormError(""); }}
              placeholder="Contoh: Brosur SPMB 2026/2027" autoComplete="off"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori</label>
            <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Umum" autoComplete="off"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
            <p className="mt-1.5 text-xs text-slate-400">Pengelompokan tampilan di halaman publik (mis. SPMB, Siswa, Umum)</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} placeholder="Keterangan singkat berkas (opsional)"
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Berkas {editItem ? <span className="font-normal text-slate-400">(kosongkan bila tidak diganti)</span> : <span className="text-red-500">*</span>}
            </label>
            {editItem && !file && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#f4f7fb] px-3 py-2.5 text-xs text-slate-600">
                <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                <a href={editItem.file_url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent)]">
                  {editItem.file_name || "Berkas saat ini"}
                </a>
                <span className="shrink-0 text-slate-400">{formatFileSize(editItem.file_size) || downloadKind(editItem.file_name)}</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={formSaving}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-sm font-semibold text-slate-500 transition-colors hover:border-[var(--brand-accent)]/40 hover:bg-slate-50 hover:text-[var(--brand-primary)] disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              {file ? file.name : "Pilih berkas untuk diunggah"}
            </button>
            {file && (
              <p className="mt-1.5 text-xs text-slate-400">
                {file.name} · {formatFileSize(file.size)} — diunggah saat disimpan
              </p>
            )}
            {fileUploading && <p className="mt-1.5 text-xs text-slate-400">Mengunggah berkas...</p>}
          </div>
          {formError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</p>
          )}
        </div>
      </SlideOver>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Unduhan?"
        description={`"${deleteItem?.title}" akan dihapus permanen beserta berkasnya.`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Unduhan?`}
        description="Semua unduhan yang dipilih akan dihapus permanen beserta berkasnya."
      />
    </div>
  );
}

/**
 * Satu baris unduhan versi mobile (<md): [tile jenis berkas + titik status]
 * [judul + kategori · ukuran + badge "Nonaktif"] [menu ⋯: Edit, Lihat Berkas,
 * Nonaktifkan/Aktifkan, Naik, Turun, Hapus]. Tap baris = Edit (halaman ini
 * tidak punya modal lihat); long-press = mode pilih; di mode pilih checkbox
 * menggantikan tile dan tap baris = toggle centang. Perubahan status hanya
 * lewat menu ⋯ (bukan pill sekali ketuk). Geser urutan lewat Naik/Turun di
 * menu ⋯ — padanan tombol panah kolom "Urutan" di tabel desktop.
 */
function DownloadMobileRow({
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
  item: DownloadItem;
  selected: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (d: DownloadItem) => void;
  onDelete: (d: DownloadItem) => void;
  onToggle: (d: DownloadItem) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  canGoUp: boolean;
  canGoDown: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canToggle: boolean;
}) {
  const sizeLabel = formatFileSize(item.file_size);

  const actions: RowAction[] = [
    ...(canEdit
      ? [{ key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => onEdit(item) } as RowAction]
      : []),
    {
      key: "open",
      label: "Lihat Berkas",
      icon: <FileText className="h-4 w-4" />,
      run: () => window.open(item.file_url, "_blank", "noopener"),
    },
    ...(canToggle
      ? [{
          key: "toggle",
          label: item.is_active ? "Nonaktifkan" : "Aktifkan",
          icon: item.is_active ? <Clock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
          run: () => onToggle(item),
        } as RowAction]
      : []),
    ...(canGoUp
      ? [{ key: "up", label: "Naik", icon: <ArrowUp className="h-4 w-4" />, run: () => onReorder(item.id, "up") }]
      : []),
    ...(canGoDown
      ? [{ key: "down", label: "Turun", icon: <ArrowDown className="h-4 w-4" />, run: () => onReorder(item.id, "down") }]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) } as RowAction]
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
              <FileText aria-hidden="true" className="h-5 w-5 text-[var(--brand-primary)]" />
              <span aria-hidden="true" className="mt-0.5 text-[9px] font-bold uppercase text-[var(--brand-accent)]">
                {downloadKind(item.file_name || item.file_url)}
              </span>
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
        subtitle={
          <span className="min-w-0 truncate">
            {item.category}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
          </span>
        }
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
