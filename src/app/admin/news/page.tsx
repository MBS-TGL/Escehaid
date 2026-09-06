"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getNewsListAll,
  createNews,
  updateNews,
  deleteNews,
  deleteNewsBulk,
  togglePublishNews,
  togglePublishNewsBulk,
  uploadNewsImage,
} from "@/lib/queries";
import { compressImage } from "@/lib/compress-image";
import { StatCard, StatCardRow, Modal, ConfirmModal, SlideOver, RichTextEditor } from "@/components/ui";
import type { News } from "@/lib/supabase";
import {
  Megaphone,
  MagnifyingGlass,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  X,
  FileText,
  User,
  CaretLeft,
  CaretRight,
  Plus,
  PencilSimple,
  Trash,
  Warning,
  Image as ImageIcon,
  FloppyDisk,
  ArrowUp,
  ArrowDown,
  SortAscending,
  Funnel,
  Checks,
} from "@/components/Icons";
import { useToast } from "@/components/ui/Toast";

const PAGE_SIZE = 10;

const categoryConfig: Record<string, { label: string; color: string }> = {
  berita: { label: "Berita", color: "bg-blue-50 text-blue-700 border-blue-200" },
  pengumuman: { label: "Pengumuman", color: "bg-amber-50 text-amber-700 border-amber-200" },
  agenda: { label: "Agenda", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

type SortField = "created_at" | "title" | "category";
type SortDir = "asc" | "desc";

interface FormData {
  title: string;
  summary: string;
  content: string;
  category: string;
  image_url: string;
  cover_image_position: string;
  writer_name: string;
  editor_name: string;
  published_at: string;
  is_published: boolean;
}

const emptyForm: FormData = {
  title: "",
  summary: "",
  content: "",
  category: "berita",
  image_url: "",
  cover_image_position: "center",
  writer_name: "",
  editor_name: "",
  published_at: "",
  is_published: false,
};

export default function AdminBeritaPage() {
  const { toast } = useToast();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [viewItem, setViewItem] = useState<News | null>(null);
  const [deleteItem, setDeleteItem] = useState<News | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<News | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);

  // Fetch
  const fetchNews = useCallback(async () => {
    setLoading(true);
    const data = await getNewsListAll();
    setNews(data as News[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  // Paste image handler
  useEffect(() => {
    if (!formOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [formOpen]);

  // Filtered + Sorted
  const filtered = useMemo(() => {
    let result = news.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.summary && item.summary.toLowerCase().includes(search.toLowerCase()));
      const matchFilter =
        filter === "all" ||
        (filter === "published" && item.is_published) ||
        (filter === "draft" && !item.is_published);
      return matchSearch && matchFilter;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "category") cmp = a.category.localeCompare(b.category);
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [news, search, filter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: news.length,
    published: news.filter((n) => n.is_published).length,
    draft: news.filter((n) => !n.is_published).length,
    thisMonth: news.filter((n) => {
      const d = new Date(n.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
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

  // Form handlers
  function openCreate() {
    setEditItem(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(item: News) {
    setEditItem(item);
    setForm({
      title: item.title,
      summary: item.summary || "",
      content: item.content || "",
      category: item.category,
      image_url: item.image_url || "",
      cover_image_position: item.cover_image_position || "center",
      writer_name: item.writer_name || "",
      editor_name: item.editor_name || "",
      published_at: item.published_at ? new Date(item.published_at).toISOString().slice(0, 16) : "",
      is_published: item.is_published,
    });
    setImageFile(null);
    setImagePreview(item.image_url || "");
    setFormError("");
    setFormOpen(true);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Judul wajib diisi."); return; }
    setFormSaving(true);
    setFormError("");

    let imageUrl = form.image_url;
    if (imageFile) {
      const tempId = editItem?.id || (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
      const uploaded = await uploadNewsImage(imageFile, tempId);
      if (uploaded.url) imageUrl = uploaded.url;
    }

    if (editItem) {
      const { error } = await updateNews(editItem.id, { ...form, image_url: imageUrl });
      if (error) { setFormError(error); setFormSaving(false); return; }
      toast("Berita berhasil diperbarui", "success");
    } else {
      const { error } = await createNews({ ...form, image_url: imageUrl });
      if (error) { setFormError(error); setFormSaving(false); return; }
      toast("Berita berhasil diterbitkan", "success");
    }

    setFormOpen(false);
    setFormSaving(false);
    fetchNews();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    await deleteNews(deleteItem.id);
    toast("Berita berhasil dihapus", "success");
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchNews();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteNewsBulk(ids);
    toast(`${ids.length} berita berhasil dihapus`, "success");
    setSelectedIds(new Set());
    setBulkDelete(false);
    fetchNews();
  }

  async function handleBulkPublish(publish: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await togglePublishNewsBulk(ids, publish);
    toast(`${ids.length} berita ${publish ? "diterbitkan" : "draft"}`, "success");
    setSelectedIds(new Set());
    fetchNews();
  }

  async function handleTogglePublish(item: News) {
    await togglePublishNews(item.id, !item.is_published);
    toast(`Berita ${!item.is_published ? "diterbitkan" : "draft"}`, "success");
    fetchNews();
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
            <Megaphone className="h-5 w-5 text-[#1767b1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola Berita</h1>
            <p className="text-sm text-slate-500">Berita, pengumuman, dan agenda sekolah</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1767b1]">
          <Plus className="h-4 w-4" /> Buat Baru
        </button>
      </div>

      {/* Stats */}
      <StatCardRow>
        <StatCard label="Total" value={stats.total} variant="brand" />
        <StatCard label="Diterbitkan" value={stats.published} variant="success" />
        <StatCard label="Draft" value={stats.draft} variant="warning" />
        <StatCard label="Bulan Ini" value={stats.thisMonth} variant="info" />
      </StatCardRow>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#082b59]/20 bg-[#082b59]/5 px-4 py-2.5">
          <Checks className="h-4 w-4 text-[#082b59]" />
          <span className="text-xs font-semibold text-[#082b59]">{selectedIds.size} dipilih</span>
          <button onClick={() => handleBulkPublish(true)} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Publish</button>
          <button onClick={() => handleBulkPublish(false)} className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600">Unpublish</button>
          <button onClick={() => setBulkDelete(true)} className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Hapus</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter + Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {[
              { key: "all", label: "Semua" },
              { key: "published", label: "Diterbitkan" },
              { key: "draft", label: "Draft" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => { setFilter(tab.key); setPage(1); setSelectedIds(new Set()); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === tab.key ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari judul, ringkasan..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 sm:w-72"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[#082b59] focus:ring-[#1767b1]" />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">No</th>
                <th className="w-[40%] cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none" onClick={() => toggleSort("title")}>
                  <span className="flex items-center gap-1">Judul <SortIcon field="title" /></span>
                </th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("category")}>
                  <span className="flex items-center justify-center gap-1">Kategori <SortIcon field="category" /></span>
                </th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Penulis</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center justify-center gap-1">Tanggal <SortIcon field="created_at" /></span>
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data berita...</p>
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
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada berita"}</p>
                    </div>
                    {!search && filter === "all" && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#082b59] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1767b1]">
                        <Plus className="h-3.5 w-3.5" /> Buat Berita Pertama
                      </button>
                    )}
                  </div>
                </td></tr>
              ) : (
                paginated.map((item, index) => (
                  <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[#082b59]/[0.03]" : ""}`}>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#082b59] focus:ring-[#1767b1]" />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => setViewItem(item)}>
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <FileText className="h-5 w-5 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.title}</p>
                          {item.summary && <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{item.summary}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-center sm:table-cell">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${categoryConfig[item.category]?.color || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {categoryConfig[item.category]?.label || item.category}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 text-center md:table-cell">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                          <User className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="text-xs text-slate-500">{(item as any).author_name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleTogglePublish(item)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          item.is_published
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        }`}>
                        {item.is_published ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {item.is_published ? "Publish" : "Draft"}
                      </button>
                    </td>
                    <td className="hidden px-4 py-3.5 text-center text-sm text-slate-500 lg:table-cell">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewItem(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Lihat">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                          <PencilSimple className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteItem(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
                          <Trash className="h-4 w-4" />
                        </button>
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
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} berita
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
        )}
      </div>

      {/* ── VIEW MODAL ──────────────────────────────── */}
      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.title}
        description={viewItem ? `${categoryConfig[viewItem.category]?.label || viewItem.category} · ${viewItem.is_published ? "Published" : "Draft"}` : undefined}
        footer={
          <>
            <button onClick={() => { setViewItem(null); openEdit(viewItem!); }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <PencilSimple className="h-4 w-4" /> Edit
            </button>
            <a href={`/news/${viewItem?.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1]">
              <Eye className="h-4 w-4" /> Lihat di Website
            </a>
          </>
        }
      >
        {viewItem?.image_url && (
          <div className="mb-4 -mx-6 -mt-5 overflow-hidden">
            <img src={viewItem.image_url} alt={viewItem.title} className="h-48 w-full object-cover sm:h-64" />
          </div>
        )}
        {viewItem && (
          <>
            <div className="mb-4 flex items-center gap-4 text-xs text-slate-500">
              <span>Oleh: {(viewItem as any).author_name || "Tidak diketahui"}</span>
              <span>{viewItem.published_at ? new Date(viewItem.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</span>
            </div>
            {viewItem.summary && <p className="mb-4 text-sm text-slate-600 italic border-l-2 border-[#f4d21f] pl-3">{viewItem.summary}</p>}
            <div
              className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: viewItem.content || "Tidak ada konten" }}
            />
          </>
        )}
      </Modal>

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Berita?"
        description={`"${deleteItem?.title}" akan dihapus permanen.`}
      />

      {/* ── BULK DELETE CONFIRM ─────────────────────── */}
      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Berita?`}
        description="Semua berita yang dipilih akan dihapus permanen."
      />

      {/* ── CREATE/EDIT FORM PANEL ──────────────────── */}
      <SlideOver
        open={formOpen}
        onClose={() => !formSaving && setFormOpen(false)}
        title={editItem ? "Edit Berita" : "Buat Berita Baru"}
        description={editItem ? "Perbarui informasi berita" : "Isi form untuk menerbitkan berita"}
        footer={
          <div className="flex w-full items-center justify-between">
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
                  {editItem ? "Simpan Perubahan" : "Terbitkan"}
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
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Judul <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
              placeholder="Judul berita" />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori</label>
            <div className="flex gap-2">
              {Object.entries(categoryConfig).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setForm({ ...form, category: key })}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    form.category === key
                      ? `${cfg.color} border-current shadow-sm`
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Gambar Sampul</label>
            {imagePreview ? (
              <div className="mb-3">
                <div className="relative overflow-hidden rounded-xl border border-slate-200">
                  <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover" style={{
                    objectPosition: form.cover_image_position === "top" ? "center 20%" : form.cover_image_position === "bottom" ? "center 80%" : "center center"
                  }} />
                  <button onClick={() => { setImageFile(null); setImagePreview(""); setForm({ ...form, image_url: "" }); }}
                    className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Focal point selector */}
                <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Focal Point Gambar</p>
                      <p className="text-[11px] text-slate-400">Atur posisi fokus saat gambar ditampilkan</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {[
                      { value: "top", label: "Atas", icon: "▲" },
                      { value: "center", label: "Tengah", icon: "◆" },
                      { value: "bottom", label: "Bawah", icon: "▼" },
                    ].map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => setForm({ ...form, cover_image_position: opt.value })}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                          form.cover_image_position === opt.value
                            ? "border-[#1767b1] bg-[#1767b1]/10 text-[#1767b1] shadow-sm"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}>
                        <span className="text-[10px]">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("border-[#1767b1]", "bg-[#1767b1]/5"); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("border-[#1767b1]", "bg-[#1767b1]/5"); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove("border-[#1767b1]", "bg-[#1767b1]/5");
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) {
                    setImageUploading(true);
                    try {
                      const compressed = await compressImage(file);
                      setImageFile(compressed);
                      setImagePreview(URL.createObjectURL(compressed));
                    } finally {
                      setImageUploading(false);
                    }
                  }
                }}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 transition-colors hover:border-[#1767b1]/40 hover:bg-slate-50"
              >
                {imageUploading ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1767b1] border-t-transparent" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
                <span className="text-xs text-slate-400">
                  {imageUploading ? "Mengkompresi gambar..." : "Klik, seret & lepas, atau Ctrl+V untuk paste gambar"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ringkasan</label>
            <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 resize-none"
              placeholder="Ringkasan singkat berita (opsional)" />
          </div>

          {/* Writer & Editor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Penulis</label>
              <input type="text" value={form.writer_name} onChange={(e) => setForm({ ...form, writer_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
                placeholder="Nama penulis" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Editor</label>
              <input type="text" value={form.editor_name} onChange={(e) => setForm({ ...form, editor_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
                placeholder="Nama editor" />
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Konten</label>
            <RichTextEditor value={form.content} onChange={(val) => setForm({ ...form, content: val })} />
          </div>

          {/* Publish toggle + Date */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Terbitkan Sekarang</p>
                <p className="text-xs text-slate-400">{form.is_published ? "Berita akan langsung tampil di website" : "Berita disimpan sebagai draft"}</p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, is_published: !form.is_published })}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.is_published ? "bg-[#1767b1]" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_published ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Tanggal Publish</label>
              <input type="datetime-local" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20" />
              {form.published_at && (
                <button type="button" onClick={() => setForm({ ...form, published_at: "" })}
                  className="text-[11px] text-slate-400 hover:text-slate-600">Reset</button>
              )}
            </div>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
