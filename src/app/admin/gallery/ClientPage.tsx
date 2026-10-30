"use client";

import { useAdminBottomBar } from "@/app/admin/AdminChrome";
import { usePermissions } from "@/app/admin/PermissionsProvider";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  getGalleryListAll,
  createGallery,
  updateGallery,
  deleteGallery,
  deleteGalleryBulk,
  uploadGalleryImage,
} from "@/lib/queries";
import { SlideOver, ConfirmModal } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import type { Gallery } from "@/lib/supabase";
import {
  ImageSquare,
  Video,
  Image as ImageIcon,
  X,
  Plus,
  PencilSimple,
  Trash,
  Warning,
  FloppyDisk,
  Checks,
  CheckCircle,
  Eye,
  Users,
  CalendarBlank,
} from "@/components/Icons";
import {
  MobileFilterBar,
  MobilePagination,
  MobilePickButton,
  MobileSelectBar,
  RowActionsMenu,
  useLongPressList,
  DesktopPagination,
  type RowAction,
} from "@/components/admin/mobile";
import { FilterBar, type FilterGroup } from "@/components/admin/FilterBar";
import { useToast } from "@/components/ui/Toast";
import { getYoutubeId, youtubeThumb, youtubeEmbedUrl } from "@/lib/youtube";

// PAGE_SIZE moved to state

type SortField = "created_at" | "title" | "category";
type SortDir = "asc" | "desc";

/** Preview kecil untuk kartu galeri: thumbnail lokal / thumbnail YouTube / "" */
function galleryThumb(item: Gallery): string {
  if (item.media_type !== "foto") {
    const yt = getYoutubeId(item.url);
    return item.thumbnail_url || (yt ? youtubeThumb(yt) : "");
  }
  return item.thumbnail_url || item.url;
}

interface FormData {
  title: string;
  description: string;
  url: string;
  category: string;
  media_type: string;
}

const emptyForm: FormData = {
  title: "",
  description: "",
  url: "",
  category: "",
  media_type: "foto",
};

export default function AdminGalleryPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  const permCreate = can("galeri:create");
  const permUpdate = can("galeri:update");
  const permDelete = can("galeri:delete");
  const [gallery, setGallery] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** Mode pilih mobile (toolbar "Pilih") — desktop tetap pakai checkbox kartu. */
  const [pickMode, setPickMode] = useState(false);
  useAdminBottomBar(pickMode);

  // Modals
  const [viewItem, setViewItem] = useState<Gallery | null>(null);
  const [deleteItem, setDeleteItem] = useState<Gallery | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Gallery | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const fetchGallery = useCallback(async () => {
    const data = await getGalleryListAll();
    setGallery(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchGallery();
    })().catch(() => {});
  }, [fetchGallery]);

  const categories = useMemo(() => [...new Set(gallery.map((g) => g.category))], [gallery]);

  const filtered = useMemo(() => {
    const result = gallery.filter((item) => {
      const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filter === "all" || item.category === filter;
      const matchType = typeFilter === "all" || item.media_type === typeFilter;
      return matchSearch && matchCategory && matchType;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "category") cmp = (a.category || "").localeCompare(b.category || "");
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [gallery, search, filter, typeFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: gallery.length,
    foto: gallery.filter((g) => g.media_type === "foto").length,
    video: gallery.filter((g) => g.media_type === "video").length,
    thisMonth: gallery.filter((g) => {
      const d = new Date(g.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  const allVisibleSelected = paginated.length > 0 && paginated.every((item) => selectedIds.has(item.id));

  // Grup dropdown filter — tipe media + kategori (dari data).
  const filterGroups: FilterGroup[] = [
    {
      value: typeFilter,
      options: [
        { key: "all", label: "Semua Tipe", count: gallery.length },
        { key: "foto", label: "Foto", count: stats.foto },
        { key: "video", label: "Video", count: stats.video },
      ],
      onChange: (k) => { setTypeFilter(k); setPage(1); setSelectedIds(new Set()); },
      menuLabel: "Filter tipe media",
    },
  ];
  if (categories.length > 0) {
    filterGroups.push({
      value: filter,
      options: [
        { key: "all", label: "Semua Kategori" },
        ...categories.map((cat) => ({
          key: cat,
          label: cat,
          count: gallery.filter((g) => g.category === cat).length,
        })),
      ],
      onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
      menuLabel: "Filter kategori",
    });
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      const s = new Set(selectedIds);
      paginated.forEach((item) => s.delete(item.id));
      setSelectedIds(s);
    } else {
      const s = new Set(selectedIds);
      paginated.forEach((item) => s.add(item.id));
      setSelectedIds(s);
    }
  }

  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedIds(s);
  }

  function enterPickMode(id?: string) {
    setPickMode(true);
    if (id) {
      setSelectedIds((s) => {
        const n = new Set(s);
        n.add(id);
        return n;
      });
    }
  }

  function exitPickMode() {
    setPickMode(false);
    setSelectedIds(new Set());
  }

  // Hold di kartu → masuk mode pilih + centang kartu itu; hold lagi = toggle.
  const longPress = useLongPressList({
    enabled: permDelete,
    onLongPress: (id) => (pickMode ? toggleSelect(id) : enterPickMode(id)),
  });

  function openCreate() {
    setEditItem(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(item: Gallery) {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description || "",
      url: item.url || "",
      category: item.category || "",
      media_type: item.media_type || "foto",
    });
    setImageFile(null);
    setImagePreview(item.url || "");
    setFormError("");
    setFormOpen(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Judul wajib diisi."); return; }
    setFormSaving(true);
    setFormError("");

    let url = form.url;
    if (imageFile) {
      const tempId = editItem?.id || (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
      const uploaded = await uploadGalleryImage(imageFile, tempId);
      if (!uploaded.url) {
        setFormError(uploaded.error || "Gagal mengunggah gambar galeri.");
        setFormSaving(false);
        return;
      }
      url = uploaded.url;
    }

    if (editItem) {
      const { error } = await updateGallery(editItem.id, { ...form, url });
      if (error) { setFormError(error); setFormSaving(false); toast("Gagal memperbarui galeri", "error"); return; }
    } else {
      const { error } = await createGallery({ ...form, url });
      if (error) { setFormError(error); setFormSaving(false); toast("Gagal menambahkan galeri", "error"); return; }
    }

    toast(editItem ? "Galeri berhasil diperbarui" : "Galeri berhasil ditambahkan", "success");
    setFormOpen(false);
    setFormSaving(false);
    fetchGallery();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    await deleteGallery(deleteItem.id);
    toast("Galeri berhasil dihapus", "success");
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchGallery();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteGalleryBulk(ids);
    toast(`${ids.length} galeri berhasil dihapus`, "success");
    setSelectedIds(new Set());
    setBulkDelete(false);
    fetchGallery();
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <ImageSquare className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola Galeri</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">Foto dan video kegiatan sekolah</p>
          </div>
        </div>
        {permCreate && (
          <button onClick={openCreate} className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)]">
            <Plus className="h-4 w-4" /> Tambah Media
          </button>
        )}
      </div>

      {/* Stats — StatPillGroup: pill kompak satu baris */}
      <StatPillGroup>
        <StatPill icon={Users} label="Total" value={stats.total} tone="neutral" />
        <StatPill icon={ImageSquare} label="Foto" value={stats.foto} tone="info" />
        <StatPill icon={Video} label="Video" value={stats.video} tone="purple" />
        <StatPill icon={CalendarBlank} label="Bulan Ini" value={stats.thisMonth} tone="success" />
      </StatPillGroup>

      {/* Bulk actions — desktop; mobile memakai bar sticky saat mode pilih */}
      {permDelete && selectedIds.size > 0 && (
        <div className="mb-4 hidden items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex md:flex-nowrap md:overflow-x-auto">
          <Checks className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
          <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          <button onClick={() => setBulkDelete(true)} className="whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Hapus</button>
          <button onClick={() => setSelectedIds(new Set())} aria-label="Batalkan pilihan" title="Batalkan pilihan" className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter desktop (md+) — pencarian + tipe + kategori. */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari gallery..."
          searchLabel="Cari judul atau kategori"
          query={search}
          onQueryChange={(v) => { setSearch(v); setPage(1); }}
          filters={filterGroups}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian + filter (tipe & kategori) + urut + Pilih */}
      <MobileFilterBar
        placeholder="Cari media…"
        searchLabel="Cari judul atau kategori"
        query={search}
        onQueryChange={(v) => { setSearch(v); setPage(1); }}
        filter={{
          value: typeFilter,
          options: [
            { key: "all", label: "Semua Tipe", count: gallery.length },
            { key: "foto", label: "Foto", count: stats.foto },
            { key: "video", label: "Video", count: stats.video },
          ],
          onChange: (k) => { setTypeFilter(k); setPage(1); setSelectedIds(new Set()); },
        }}
        filter2={{
          value: filter,
          options: [
            { key: "all", label: "Semua Kategori", count: gallery.length },
            ...categories.map((cat) => ({
              key: cat,
              label: cat,
              count: gallery.filter((g) => g.category === cat).length,
            })),
          ],
          onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
        }}
        sort={{
          value: `${sortField}:${sortDir}`,
          options: [
            { key: "created_at:desc", label: "Terbaru" },
            { key: "created_at:asc", label: "Terlama" },
            { key: "title:asc", label: "Judul A–Z" },
            { key: "title:desc", label: "Judul Z–A" },
            { key: "category:asc", label: "Kategori A–Z" },
            { key: "category:desc", label: "Kategori Z–A" },
          ],
          onChange: (k) => {
            const [f, d] = k.split(":");
            setSortField(f as SortField);
            setSortDir(d as SortDir);
          },
        }}
        action={permDelete ? <MobilePickButton onClick={() => enterPickMode()} /> : undefined}
        selectMode={pickMode}
        selectedCount={selectedIds.size}
        allSelected={allVisibleSelected}
        onSelectAllVisible={toggleSelectAll}
      />

      {/* Grid View */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          <p className="text-sm text-slate-500">Memuat data gallery...</p>
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <ImageSquare className="h-8 w-8 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
            <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada gallery"}</p>
          </div>
          {permCreate && !search && typeFilter === "all" && filter === "all" && (
            <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
              <Plus className="h-3.5 w-3.5" /> Tambah Media Pertama
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            onPointerDown={longPress.onPointerDown}
            onPointerMove={longPress.onPointerMove}
            onPointerUp={longPress.onPointerUp}
            onPointerCancel={longPress.onPointerCancel}
            onPointerLeave={longPress.onPointerLeave}
            onContextMenu={(e) => e.preventDefault()}
          >
            {paginated.map((item, index) => {
              const isSelected = selectedIds.has(item.id);
              const menuActions: RowAction[] = [
                { key: "view", label: "Lihat", icon: <Eye className="h-4 w-4" />, run: () => setViewItem(item) },
                ...(permUpdate
                  ? [{ key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => openEdit(item) } as RowAction]
                  : []),
                ...(permDelete
                  ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => setDeleteItem(item) } as RowAction]
                  : []),
              ];
              return (
                <div key={item.id}
                  data-longpress-id={item.id}
                  className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md hover:border-[var(--brand-accent)]/30 ${isSelected ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20" : "border-slate-200/70"}`}>
                  {/* Checkbox hanya desktop; mobile memakai hold + badge centang. */}
                  {permDelete && (
                    <div className="absolute left-2 top-2 z-10 hidden md:block" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                        aria-label={`Pilih ${item.title}`}
                        className="h-5 w-5 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                    </div>
                  )}
                  {pickMode && isSelected && (
                    <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-md md:hidden">
                      <CheckCircle className="h-4 w-4" weight="fill" aria-hidden="true" />
                    </span>
                  )}
                  {/* Aksi desktop — hover; mobile memakai menu ⋄ di pojok gambar */}
                  {(permUpdate || permDelete) && (
                    <div className="absolute right-2 top-2 z-10 hidden gap-1 opacity-0 transition-opacity group-hover:opacity-100 md:flex" onClick={(e) => e.stopPropagation()}>
                      {permUpdate && (
                        <button onClick={() => openEdit(item)} aria-label={`Edit ${item.title}`} className="rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70">
                          <PencilSimple className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {permDelete && (
                        <button onClick={() => setDeleteItem(item)} aria-label={`Hapus ${item.title}`} className="rounded-lg bg-red-500/80 p-1.5 text-white hover:bg-red-600">
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  {/* Menu ⋯ mobile — area sentuh 44px, di pojok kanan-atas gambar.
                      Trigger ikon-saja, jadi di atas foto memakai tone="onDark"
                      (ikon putih + halo) agar tidak hilang di foto terang/gelap. */}
                  <div className="absolute right-1 top-1 z-10 md:hidden" onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu
                      label={item.title}
                      actions={menuActions}
                      disabled={pickMode && !isSelected}
                      tone="onDark"
                    />
                  </div>
                  <div
                    onClick={() => {
                      if (longPress.consumeClick()) return;
                      if (pickMode) toggleSelect(item.id);
                      else setViewItem(item);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center md:aspect-square">
                      {galleryThumb(item) ? (
                        <Image src={galleryThumb(item)} alt={item.title} width={400} height={300} loading={index === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
                      ) : item.media_type === "video" ? (
                        <Video className="h-10 w-10 text-slate-300 sm:h-12 sm:w-12" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-slate-300 sm:h-12 sm:w-12" />
                      )}
                    </div>
                    <div className="p-2.5 sm:p-3">
                      <p className="text-xs font-medium leading-snug text-slate-800 line-clamp-2 md:line-clamp-1 md:text-sm">{item.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          item.media_type === "foto" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        }`}>
                          {item.media_type === "foto" ? "Foto" : "Video"}
                        </span>
                        <span className="truncate text-[10px] text-[#64748b]">{item.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pagination desktop (md+) */}
          <DesktopPagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            from={(page - 1) * pageSize + 1}
            to={Math.min(page * pageSize, filtered.length)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemLabel="media"
            className="mt-4 rounded-2xl border border-slate-200/70"
          />
          {/*
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} media
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50">
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[var(--brand-primary)] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50">
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>*/}
          {/* Pagination mobile (<md) — tombol hanya bila totalPages > 1 */}
          <MobilePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            from={(page - 1) * pageSize + 1}
            to={Math.min(page * pageSize, filtered.length)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemLabel="media"
            className="mt-4 rounded-2xl border border-slate-200/70"
          />
        </>
      )}

      {pickMode && permDelete && (
        <MobileSelectBar
          count={selectedIds.size}
          onDelete={() => setBulkDelete(true)}
          onCancel={exitPickMode}
        />
      )}

      {/* ── VIEW MODAL ──────────────────────────────── */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setViewItem(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-slate-100 flex items-center justify-center">
              {viewItem.media_type === "video" ? (
                getYoutubeId(viewItem.url) ? (
                  <iframe
                    src={youtubeEmbedUrl(getYoutubeId(viewItem.url)!)}
                    title={viewItem.title}
                    className="h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : viewItem.url ? (
                  <video src={viewItem.url} controls preload="none" poster={viewItem.thumbnail_url || undefined} className="h-full w-full object-cover" />
                ) : (
                  <Video className="h-16 w-16 text-slate-300" />
                )
              ) : viewItem.url ? (
                <Image src={viewItem.url} alt={viewItem.title} width={640} height={360} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <ImageSquare className="h-16 w-16 text-slate-300" />
              )}
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{viewItem.title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{viewItem.category} &middot; {new Date(viewItem.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <button onClick={() => setViewItem(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {viewItem.description && (
              <div className="px-6 pb-4">
                <p className="text-sm text-slate-600">{viewItem.description}</p>
              </div>
            )}
            {(permUpdate || permDelete) && (
              <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
                {permUpdate && (
                  <button onClick={() => { setViewItem(null); openEdit(viewItem); }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <PencilSimple className="h-4 w-4" /> Edit
                  </button>
                )}
                {permDelete && (
                  <button onClick={() => { setViewItem(null); setDeleteItem(viewItem); }}
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100">
                    <Trash className="h-4 w-4" /> Hapus
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Media?"
        description={`"${deleteItem?.title}" dipindahkan ke Sampah — hilang permanen setelah 30 hari.`}
        confirmLabel="Ya, Hapus"
        variant="danger"
      />

      {/* ── BULK DELETE CONFIRM ─────────────────────── */}
      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Media?`}
        description="Semua media yang dipilih dipindahkan ke Sampah — hilang permanen setelah 30 hari."
        confirmLabel="Ya, Hapus"
        variant="danger"
      />

      {/* ── CREATE/EDIT FORM PANEL ──────────────────── */}
      <SlideOver
        open={formOpen}
        onClose={() => !formSaving && setFormOpen(false)}
        title={editItem ? "Edit Media" : "Tambah Media Baru"}
        description={editItem ? "Perbarui informasi media" : "Upload foto atau video baru"}
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
                  {editItem ? "Simpan Perubahan" : "Simpan"}
                </>
              )}
            </button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <Warning className="h-4 w-4 shrink-0" /> {formError}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Judul <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              placeholder="Judul media" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tipe Media</label>
            <div className="flex gap-2">
              {[{ key: "foto", label: "Foto", icon: ImageIcon }, { key: "video", label: "Video", icon: Video }].map((t) => (
                <button key={t.key} type="button" onClick={() => setForm({ ...form, media_type: t.key })}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-all ${
                    form.media_type === t.key
                      ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori</label>
            <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              placeholder="Contoh: Kegiatan, Fasilitas, Prestasi" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">{form.media_type === "video" ? "URL Video" : "Gambar"}</label>
            {imagePreview ? (
              <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200">
                {form.media_type === "video" ? (
                  getYoutubeId(imagePreview) ? (
                    <iframe
                      src={youtubeEmbedUrl(getYoutubeId(imagePreview)!)}
                      title="Preview video"
                      className="h-40 w-full bg-black"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <video src={imagePreview} preload="none" className="h-40 w-full object-cover bg-black" />
                  )
                ) : (
                  <Image src={imagePreview} alt="Preview" width={640} height={160} sizes="100%" unoptimized className="h-40 w-full object-cover" />
                )}
                <button onClick={() => { setImageFile(null); setImagePreview(""); setForm({ ...form, url: "" }); }}
                  className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : form.media_type === "video" ? (
              <input type="url" value={form.url} onChange={(e) => { setForm({ ...form, url: e.target.value }); setImagePreview(e.target.value); }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
                placeholder="https://youtube.com/watch?v=..." />
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 transition-colors hover:border-[var(--brand-accent)]/40 hover:bg-slate-50">
                <ImageIcon className="h-8 w-8 text-slate-300" />
                <span className="text-xs text-slate-400">Klik untuk upload gambar</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 resize-none"
              placeholder="Deskripsi singkat (opsional)" />
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
