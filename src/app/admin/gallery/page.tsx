"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getGalleryListAll,
  createGallery,
  updateGallery,
  deleteGallery,
  deleteGalleryBulk,
  uploadGalleryImage,
} from "@/lib/queries";
import { StatCard, StatCardRow, SlideOver } from "@/components/ui";
import type { Gallery } from "@/lib/supabase";
import {
  ImageSquare,
  MagnifyingGlass,
  Video,
  Image as ImageIcon,
  X,
  CaretLeft,
  CaretRight,
  Plus,
  PencilSimple,
  Trash,
  Warning,
  FloppyDisk,
  ArrowUp,
  ArrowDown,
  SortAscending,
  Checks,
} from "@/components/Icons";

const PAGE_SIZE = 12;

type SortField = "created_at" | "title" | "category";
type SortDir = "asc" | "desc";

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
  const [gallery, setGallery] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const categories = useMemo(() => [...new Set(gallery.map((g) => g.category))], [gallery]);

  const filtered = useMemo(() => {
    let result = gallery.filter((item) => {
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: gallery.length,
    foto: gallery.filter((g) => g.media_type === "foto").length,
    video: gallery.filter((g) => g.media_type === "video").length,
  };

  const allVisibleSelected = paginated.length > 0 && paginated.every((item) => selectedIds.has(item.id));

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

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

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
      const tempId = editItem?.id || crypto.randomUUID();
      const uploaded = await uploadGalleryImage(imageFile, tempId);
      if (uploaded.url) url = uploaded.url;
    }

    if (editItem) {
      const { error } = await updateGallery(editItem.id, { ...form, url });
      if (error) { setFormError(error); setFormSaving(false); return; }
    } else {
      const { error } = await createGallery({ ...form, url });
      if (error) { setFormError(error); setFormSaving(false); return; }
    }

    setFormOpen(false);
    setFormSaving(false);
    fetchGallery();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    await deleteGallery(deleteItem.id);
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchGallery();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteGalleryBulk(ids);
    setSelectedIds(new Set());
    setBulkDelete(false);
    fetchGallery();
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <SortAscending className="h-3 w-3 text-slate-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-[#1767b1]" />
      : <ArrowDown className="h-3 w-3 text-[#1767b1]" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1767b1]/10">
            <ImageSquare className="h-5 w-5 text-[#1767b1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola Gallery</h1>
            <p className="text-sm text-slate-500">Foto dan video kegiatan sekolah</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1767b1]">
          <Plus className="h-4 w-4" /> Tambah Media
        </button>
      </div>

      {/* Stats */}
      <StatCardRow>
        <StatCard label="Total" value={stats.total} variant="brand" />
        <StatCard label="Foto" value={stats.foto} variant="info" />
        <StatCard label="Video" value={stats.video} variant="purple" />
      </StatCardRow>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#082b59]/20 bg-[#082b59]/5 px-4 py-2.5">
          <Checks className="h-4 w-4 text-[#082b59]" />
          <span className="text-xs font-semibold text-[#082b59]">{selectedIds.size} dipilih</span>
          <button onClick={() => setBulkDelete(true)} className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Hapus</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {[
              { key: "all", label: "Semua" },
              { key: "foto", label: "Foto" },
              { key: "video", label: "Video" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => { setTypeFilter(tab.key); setPage(1); setSelectedIds(new Set()); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${typeFilter === tab.key ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>
          {categories.length > 0 && (
            <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); setSelectedIds(new Set()); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 focus:border-[#1767b1] focus:outline-none">
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari gallery..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 sm:w-72"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Grid View */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
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
          {!search && typeFilter === "all" && filter === "all" && (
            <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#082b59] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1767b1]">
              <Plus className="h-3.5 w-3.5" /> Tambah Media Pertama
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {paginated.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div key={item.id}
                  className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md hover:border-[#1767b1]/30 ${isSelected ? "border-[#082b59] ring-2 ring-[#082b59]/20" : "border-slate-200/80"}`}>
                  {/* Checkbox */}
                  <div className="absolute left-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-[#082b59] focus:ring-[#1767b1]" />
                  </div>
                  {/* Action buttons */}
                  <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(item)} className="rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70">
                      <PencilSimple className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteItem(item)} className="rounded-lg bg-red-500/80 p-1.5 text-white hover:bg-red-600">
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div onClick={() => setViewItem(item)} className="cursor-pointer">
                    <div className="aspect-square bg-slate-100 flex items-center justify-center">
                      {item.url ? (
                        <img src={item.url} alt={item.title} className="h-full w-full object-cover" />
                      ) : item.media_type === "video" ? (
                        <Video className="h-10 w-10 text-slate-300 sm:h-12 sm:w-12" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-slate-300 sm:h-12 sm:w-12" />
                      )}
                    </div>
                    <div className="p-2.5 sm:p-3">
                      <p className="text-xs font-medium text-slate-800 line-clamp-1 sm:text-sm">{item.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          item.media_type === "foto" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        }`}>
                          {item.media_type === "foto" ? "Foto" : "Video"}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} media
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[#082b59] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── VIEW MODAL ──────────────────────────────── */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setViewItem(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-slate-100 flex items-center justify-center">
              {viewItem.url ? (
                viewItem.media_type === "video" ? (
                  <video src={viewItem.url} controls className="h-full w-full object-cover" />
                ) : (
                  <img src={viewItem.url} alt={viewItem.title} className="h-full w-full object-cover" />
                )
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
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => { setViewItem(null); openEdit(viewItem); }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <PencilSimple className="h-4 w-4" /> Edit
              </button>
              <button onClick={() => { setViewItem(null); setDeleteItem(viewItem); }}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100">
                <Trash className="h-4 w-4" /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      {deleteItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteItem(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus Media?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">&ldquo;{deleteItem.title}&rdquo; akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDeleteItem(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK DELETE CONFIRM ─────────────────────── */}
      {bulkDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setBulkDelete(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus {selectedIds.size} Media?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Semua media yang dipilih akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setBulkDelete(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={handleBulkDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE/EDIT FORM PANEL ──────────────────── */}
      <SlideOver
        open={formOpen}
        onClose={() => !formSaving && setFormOpen(false)}
        title={editItem ? "Edit Media" : "Tambah Media Baru"}
        description={editItem ? "Perbarui informasi media" : "Upload foto atau video baru"}
        footer={
          <>
            <button onClick={() => setFormOpen(false)} disabled={formSaving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              Batal
            </button>
            <button onClick={handleSave} disabled={formSaving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1] disabled:opacity-70">
              {formSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <FloppyDisk className="h-4 w-4" />
                  {editItem ? "Simpan Perubahan" : "Simpan"}
                </>
              )}
            </button>
          </>
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
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
              placeholder="Judul media" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tipe Media</label>
            <div className="flex gap-2">
              {[{ key: "foto", label: "Foto", icon: ImageIcon }, { key: "video", label: "Video", icon: Video }].map((t) => (
                <button key={t.key} type="button" onClick={() => setForm({ ...form, media_type: t.key })}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-all ${
                    form.media_type === t.key
                      ? "border-[#1767b1] bg-[#1767b1]/10 text-[#1767b1]"
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
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
              placeholder="Contoh: Kegiatan, Fasilitas, Prestasi" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">{form.media_type === "video" ? "URL Video" : "Gambar"}</label>
            {imagePreview ? (
              <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200">
                {form.media_type === "video" ? (
                  <video src={imagePreview} className="h-40 w-full object-cover" />
                ) : (
                  <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover" />
                )}
                <button onClick={() => { setImageFile(null); setImagePreview(""); setForm({ ...form, url: "" }); }}
                  className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : form.media_type === "video" ? (
              <input type="url" value={form.url} onChange={(e) => { setForm({ ...form, url: e.target.value }); setImagePreview(e.target.value); }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
                placeholder="https://youtube.com/watch?v=..." />
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 transition-colors hover:border-[#1767b1]/40 hover:bg-slate-50">
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
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 resize-none"
              placeholder="Deskripsi singkat (opsional)" />
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
