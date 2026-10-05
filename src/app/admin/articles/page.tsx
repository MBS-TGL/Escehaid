"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getArticleListAll,
  getArticleColumnSupport,
  getCategoryList,
  createArticle,
  updateArticle,
  deleteArticle,
  deleteArticleBulk,
  togglePublishArticle,
  togglePublishArticleBulk,
  uploadArticleImage,
  slugify,
  revalidateArticles,
  revalidatePaths,
  type ArticleWithAuthor,
} from "@/lib/queries";
import { StatCard, StatCardRow, SlideOver, RichTextEditor } from "@/components/ui";
import { sanitize } from "@/lib/sanitize";
import { compressImage } from "@/lib/compress-image";
import {
  Note,
  MagnifyingGlass,
  Eye,
  CheckCircle,
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
  ArrowUpRight,
  SortAscending,
  Checks,
} from "@/components/Icons";
import { useToast } from "@/components/ui/Toast";

const PAGE_SIZE = 10;
const EXCERPT_MAX = 160;
const WORDS_PER_MINUTE = 200;

type SortField = "created_at" | "title" | "category";
type SortDir = "asc" | "desc";

interface FormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  image_url: string;
  author_name: string;
  editor_name: string;
  is_published: boolean;
  // datetime-local dalam zona WIB; dikonversi ke UTC sebelum dikirim
  published_at: string;
}

const emptyForm: FormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  image_url: "",
  author_name: "",
  editor_name: "",
  is_published: false,
  published_at: "",
};

// ── WIB (UTC+7) ⇄ UTC untuk field Tanggal Publish ──────────────
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function utcToWibInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 16);
}

function wibInputToUtc(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}:00+07:00`);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ── Konten lama (teks polos) → HTML untuk editor rich text ─────
function looksLikeHtml(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

function plainTextToHtml(text: string): string {
  if (!text.trim()) return "";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Paragraf = baris kosong; baris tunggal dalam paragraf = <br>
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

function toEditorContent(text: string): string {
  if (!text.trim()) return "";
  return looksLikeHtml(text) ? text : plainTextToHtml(text);
}

export default function AdminArticlesPage() {
  const { toast } = useToast();
  const [articles, setArticles] = useState<ArticleWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [viewItem, setViewItem] = useState<ArticleWithAuthor | null>(null);
  const [deleteItem, setDeleteItem] = useState<ArticleWithAuthor | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ArticleWithAuthor | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [initialForm, setInitialForm] = useState<FormData>(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugOverride, setSlugOverride] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  // Hasil probe kolom author_name/editor_name — field hanya tampil bila ada
  const [colSupport, setColSupport] = useState({ author_name: false, editor_name: false });
  // Paksa remount RichTextEditor tiap form dibuka (sinkron nilai awal)
  const [formKey, setFormKey] = useState(0);

  const fetchArticles = useCallback(async () => {
    const data = await getArticleListAll();
    setArticles(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  // Probe kolom author_name/editor_name + kategori dari tabel categories
  useEffect(() => {
    getArticleColumnSupport().then(setColSupport);
    getCategoryList("artikel")
      .then((rows) => setDbCategories(rows.map((r) => r.name).filter(Boolean)))
      .catch(() => {});
  }, []);

  // True bila form/sampul berubah dibanding kondisi awal dibuka
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm) || imageFile !== null,
    [form, initialForm, imageFile]
  );

  // Saran kategori dari DB: nama unik di tabel articles ∪ tabel categories
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of [...dbCategories, ...articles.map((i) => i.category || "")]) {
      const v = (c || "").trim();
      if (v && !map.has(v.toLowerCase())) map.set(v.toLowerCase(), v);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "id"));
  }, [articles, dbCategories]);

  const filtered = useMemo(() => {
    let result = articles.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.excerpt || "").toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        (filter === "published" && item.is_published) ||
        (filter === "draft" && !item.is_published);
      return matchSearch && matchFilter;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "category") cmp = (a.category || "").localeCompare(b.category || "");
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [articles, search, filter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.is_published).length,
    draft: articles.filter((a) => !a.is_published).length,
    thisMonth: articles.filter((a) => {
      const d = new Date(a.created_at);
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

  function openCreate() {
    setEditItem(null);
    setForm(emptyForm);
    setInitialForm(emptyForm);
    setSlugTouched(false);
    setSlugOverride(false);
    setTitleError("");
    setImageFile(null);
    setImagePreview("");
    setFormError("");
    setAddingCategory(false);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function openEdit(item: ArticleWithAuthor) {
    const next: FormData = {
      title: item.title,
      slug: item.slug || "",
      excerpt: item.excerpt || "",
      // Konten lama berupa teks polos → dikonversi ke HTML untuk editor.
      // Nilai yang sama dipakai untuk dirty-check, jadi tak dianggap berubah.
      content: toEditorContent(item.content || ""),
      category: item.category || "",
      image_url: item.image_url || "",
      author_name: item.author_name || "",
      editor_name: item.editor_name || "",
      is_published: item.is_published,
      published_at: utcToWibInput(item.published_at),
    };
    setEditItem(item);
    setForm(next);
    setInitialForm(next);
    setSlugTouched(true);
    setSlugOverride(false);
    setTitleError("");
    setImageFile(null);
    setImagePreview(item.image_url || "");
    setFormError("");
    setAddingCategory(false);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function closeForm() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setConfirmClose(false);
    setFormOpen(false);
    setImagePreview("");
    setImageFile(null);
  }

  function requestClose() {
    if (formSaving) return;
    if (isDirty) { setConfirmClose(true); return; }
    closeForm();
  }

  function handleTitleChange(value: string) {
    setTitleError("");
    setForm((prev) => ({
      ...prev,
      title: value,
      // Slug otomatis dari judul hanya saat artikel baru & belum diedit manual
      slug: !editItem && !slugTouched ? slugify(value) : prev.slug,
    }));
  }

  // Kompres → revoke URL lama → preview (pola sama dengan form berita)
  async function applyImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageUploading(true);
    try {
      const compressed = await compressImage(file);
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch {
      setFormError("Gagal memproses gambar. Coba gambar lain.");
    } finally {
      setImageUploading(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // izinkan memilih file yang sama lagi
    if (file) applyImageFile(file);
  }

  // Ctrl+V gambar dari clipboard → sampul (aktif selama form terbuka)
  useEffect(() => {
    if (!formOpen) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            applyImageFile(file);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen, imagePreview]);

  function removeImage() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    setForm({ ...form, image_url: "" });
  }

  function normalizeCategory(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const hit = categoryOptions.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    return hit ?? trimmed;
  }

  // Revalidate /articles + halaman detail (dibatasi 49 path, limit route 50)
  function revalidateBulk(slugs: (string | null | undefined)[]) {
    const paths = Array.from(new Set([
      "/articles",
      ...slugs.filter((s): s is string => !!s).map((s) => `/articles/${s}`),
    ])).slice(0, 49);
    revalidatePaths(paths).catch(() => {});
  }

  async function handleSave() {
    if (!form.title.trim()) { setTitleError("Judul wajib diisi."); return; }
    setFormSaving(true);
    setFormError("");

    let imageUrl = form.image_url;
    if (imageFile) {
      const tempId = editItem?.id || (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
      const uploaded = await uploadArticleImage(imageFile, tempId);
      if (!uploaded.url) {
        setFormError(uploaded.error || "Gagal mengunggah gambar artikel.");
        setFormSaving(false);
        return;
      }
      imageUrl = uploaded.url;
    }

    const dateChanged = form.published_at !== initialForm.published_at;
    const publishedAtUtc = dateChanged ? wibInputToUtc(form.published_at) : undefined;

    // Kolom author_name/editor_name hanya dikirim bila ada di DB (probe colSupport)
    const payload: Partial<FormData> & { title: string } = {
      title: form.title,
      slug: form.slug.trim() ? slugify(form.slug) : "",
      excerpt: form.excerpt,
      content: form.content,
      category: normalizeCategory(form.category),
      image_url: imageUrl,
      is_published: form.is_published,
    };
    if (colSupport.author_name) payload.author_name = form.author_name;
    if (colSupport.editor_name) payload.editor_name = form.editor_name;
    // Tanggal Publish hanya dikirim bila diubah dari nilai awal form —
    // supaya edit biasa tidak menimpa published_at lama.
    if (publishedAtUtc) payload.published_at = publishedAtUtc;

    if (editItem) {
      const { data, error } = await updateArticle(editItem.id, payload);
      if (error) { setFormError(error); toast(error, "error"); setFormSaving(false); return; }
      revalidateArticles(data?.slug, editItem.slug).catch(() => {});
      toast("Artikel berhasil diperbarui", "success");
    } else {
      const { data, error } = await createArticle(payload);
      if (error) { setFormError(error); toast(error, "error"); setFormSaving(false); return; }
      revalidateArticles(data?.slug).catch(() => {});
      toast(payload.is_published ? "Artikel berhasil diterbitkan" : "Draft tersimpan", "success");
    }

    closeForm();
    setFormSaving(false);
    fetchArticles();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteArticle(deleteItem.id);
      revalidateArticles(undefined, deleteItem.slug).catch(() => {});
      toast("Artikel berhasil dihapus", "success");
    } catch (e: any) {
      toast(e?.message || "Gagal menghapus artikel", "error");
    }
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchArticles();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const slugs = ids.map((id) => articles.find((a) => a.id === id)?.slug);
    try {
      await deleteArticleBulk(ids);
      revalidateBulk(slugs);
      toast(`${ids.length} artikel berhasil dihapus`, "success");
    } catch (e: any) {
      toast(e?.message || "Gagal menghapus artikel", "error");
    }
    setSelectedIds(new Set());
    setBulkDelete(false);
    fetchArticles();
  }

  async function handleBulkPublish(publish: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const slugs = ids.map((id) => articles.find((a) => a.id === id)?.slug);
    try {
      await togglePublishArticleBulk(ids, publish);
      revalidateBulk(slugs);
      toast(`${ids.length} artikel berhasil ${publish ? "diterbitkan" : "draft"}`, "success");
    } catch (e: any) {
      toast(e?.message || "Gagal memperbarui status artikel", "error");
    }
    setSelectedIds(new Set());
    fetchArticles();
  }

  async function handleTogglePublish(item: ArticleWithAuthor) {
    try {
      await togglePublishArticle(item.id, !item.is_published);
      revalidateArticles(item.slug).catch(() => {});
      toast(`Artikel berhasil ${!item.is_published ? "diterbitkan" : "draft"}`, "success");
    } catch (e: any) {
      toast(e?.message || "Gagal memperbarui status artikel", "error");
    }
    fetchArticles();
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <SortAscending className="h-3 w-3 text-slate-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-[#1767b1]" />
      : <ArrowDown className="h-3 w-3 text-[#1767b1]" />;
  };

  // Slug field readonly untuk artikel terbit, kecuali ditekan "Ubah slug"
  const slugReadonly = !!editItem?.is_published && !slugOverride;
  const excerptLength = form.excerpt.length;
  const excerptOver = excerptLength > EXCERPT_MAX;
  // Hitung kata dari teks polos (tag HTML tidak ikut dihitung)
  const contentText = form.content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
  const wordCount = contentText ? contentText.split(/\s+/).length : 0;
  const readMinutes = Math.ceil(wordCount / WORDS_PER_MINUTE);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d4a8a]/10">
            <Note className="h-5 w-5 text-[#0d4a8a]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola Artikel</h1>
            <p className="text-sm text-slate-500">Artikel, tips, dan edukasi</p>
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
                <th className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none" onClick={() => toggleSort("title")}>
                  <span className="flex items-center gap-1">Judul <SortIcon field="title" /></span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("category")}>
                  <span className="flex items-center gap-1">Kategori <SortIcon field="category" /></span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Penulis</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center gap-1">Tanggal <SortIcon field="created_at" /></span>
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data artikel...</p>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Note className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada artikel"}</p>
                    </div>
                    {!search && filter === "all" && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#082b59] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1767b1]">
                        <Plus className="h-3.5 w-3.5" /> Buat Artikel Pertama
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
                          <img src={item.image_url} alt="" loading="lazy" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <FileText className="h-5 w-5 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.title}</p>
                          {item.excerpt && <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{item.excerpt}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        {item.category || "-"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                          <User className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="text-xs text-slate-500">{item.author_name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
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
                    <td className="hidden px-4 py-3.5 text-sm text-slate-500 lg:table-cell">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewItem(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Lihat">
                          <Eye className="h-4 w-4" />
                        </button>
                        {item.is_published && (
                          <a href={`/articles/${item.slug}`} target="_blank" rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Lihat di Website">
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        )}
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
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} artikel
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
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewItem(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {viewItem.image_url && (
              <div className="h-48 overflow-hidden rounded-t-2xl sm:h-64">
                <img src={viewItem.image_url} alt={viewItem.title} loading="lazy" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0d4a8a]/10">
                  <FileText className="h-5 w-5 text-[#0d4a8a]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-800 line-clamp-1">{viewItem.title}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      {viewItem.category || "-"}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${viewItem.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {viewItem.is_published ? "Publish" : "Draft"}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewItem(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
              <div className="mb-4 flex items-center gap-4 text-xs text-slate-500">
                <span>Oleh: {viewItem.author_name || "Tidak diketahui"}</span>
                <span>{viewItem.published_at ? new Date(viewItem.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</span>
              </div>
              {viewItem.excerpt && <p className="mb-4 text-sm text-slate-600 italic border-l-2 border-[#f4d21f] pl-3">{viewItem.excerpt}</p>}
              {looksLikeHtml(viewItem.content || "") ? (
                <div
                  className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitize(viewItem.content) }}
                />
              ) : (
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {viewItem.content || "Tidak ada konten"}
                </div>
              )}
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => { setViewItem(null); openEdit(viewItem); }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <PencilSimple className="h-4 w-4" /> Edit
              </button>
              {viewItem.is_published && (
                <a href={`/articles/${viewItem.slug}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1]">
                  <Eye className="h-4 w-4" /> Lihat di Website
                </a>
              )}
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
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus Artikel?</h3>
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
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus {selectedIds.size} Artikel?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Semua artikel yang dipilih akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setBulkDelete(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={handleBulkDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── UNSAVED CHANGES CONFIRM ─────────────────── */}
      {confirmClose && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mx-auto">
              <Warning className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Perubahan belum disimpan. Tutup tanpa menyimpan?</h3>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmClose(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={closeForm} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE/EDIT FORM PANEL ──────────────────── */}
      <SlideOver
        open={formOpen}
        onClose={requestClose}
        title={editItem ? "Edit Artikel" : "Buat Artikel Baru"}
        description={editItem ? "Perbarui informasi artikel" : "Isi form untuk menerbitkan artikel"}
        footer={
          <div className="flex w-full items-center justify-between">
            <button onClick={requestClose} disabled={formSaving}
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
                  {editItem ? "Simpan Perubahan" : form.is_published ? "Terbitkan" : "Simpan Draft"}
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
            <input type="text" value={form.title} onChange={(e) => handleTitleChange(e.target.value)}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${titleError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-[#1767b1] focus:ring-[#1767b1]/20"}`}
              placeholder="Judul artikel" />
            {titleError && <p className="mt-1 text-xs font-medium text-red-500">{titleError}</p>}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-700">Slug</label>
              {slugReadonly && (
                <button type="button" onClick={() => setSlugOverride(true)}
                  className="text-xs font-semibold text-[#1767b1] hover:underline">
                  Ubah slug
                </button>
              )}
            </div>
            <input type="text" value={form.slug} readOnly={slugReadonly}
              onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }}
              onBlur={() => { if (form.slug) setForm((f) => ({ ...f, slug: slugify(f.slug) })); }}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${slugReadonly ? "cursor-not-allowed bg-slate-50 text-slate-500" : "border-slate-200 focus:border-[#1767b1] focus:ring-[#1767b1]/20"}`}
              placeholder="otomatis dari judul" />
            {slugOverride && editItem?.is_published && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                <Warning className="h-3.5 w-3.5 shrink-0" /> Tautan lama akan mati
              </p>
            )}
            {form.slug && (
              <p className="mt-1.5 break-all text-xs text-slate-400">
                smpmuh4tanggul.sch.id/articles/<span className="font-medium text-slate-500">{form.slug}</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori</label>
            <div className="flex flex-wrap items-center gap-2">
              {categoryOptions.map((c) => (
                <button key={c} type="button"
                  onClick={() => { setForm((f) => ({ ...f, category: c })); setAddingCategory(false); }}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    form.category.trim().toLowerCase() === c.toLowerCase()
                      ? "border-[#1767b1] bg-[#1767b1]/10 text-[#1767b1] shadow-sm"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}>
                  {c}
                </button>
              ))}
              {!addingCategory && form.category.trim() &&
                !categoryOptions.some((c) => c.toLowerCase() === form.category.trim().toLowerCase()) && (
                <span className="rounded-lg border border-[#1767b1] bg-[#1767b1]/10 px-3 py-2 text-xs font-semibold text-[#1767b1]">
                  {form.category.trim()}
                </span>
              )}
              {addingCategory ? (
                <input
                  autoFocus
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  onBlur={() => {
                    setForm((f) => ({ ...f, category: normalizeCategory(f.category) }));
                    setAddingCategory(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                    if (e.key === "Escape") setAddingCategory(false);
                  }}
                  placeholder="Nama kategori baru"
                  className="w-44 rounded-lg border border-[#1767b1] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
                />
              ) : (
                <button type="button" onClick={() => setAddingCategory(true)}
                  className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-[#1767b1]/40 hover:text-[#1767b1]">
                  + Kategori baru
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Pilih kategori yang sudah ada, atau tambah baru — &ldquo;tips&rdquo; dan &ldquo;Tips&rdquo; tidak jadi dua kategori.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Gambar Sampul</label>
            <p className="mb-2 text-xs text-slate-400">Disarankan rasio 16:9 (mis. 1280×720) agar tidak terpotong. Bisa diklik, diseret-lepas, atau Ctrl+V dari clipboard.</p>
            {imageUploading && (
              <div className="mb-2 flex items-center gap-2 text-xs text-[#1767b1]">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1767b1] border-t-transparent" />
                Memproses gambar...
              </div>
            )}
            {imagePreview ? (
              <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200">
                <img src={imagePreview} alt="Preview" className="aspect-video w-full object-cover" />
                <div className="absolute right-2 top-2 flex items-center gap-1.5">
                  <label
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1.5 text-white transition-colors hover:bg-black/70"
                    title="Ganti gambar">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-[11px] font-semibold">Ganti</span>
                    <input id="cover-image-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  <button onClick={removeImage} title="Hapus gambar"
                    className="rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("border-[#1767b1]", "bg-[#1767b1]/5"); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("border-[#1767b1]", "bg-[#1767b1]/5"); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove("border-[#1767b1]", "bg-[#1767b1]/5");
                  const file = e.dataTransfer.files?.[0];
                  if (file) applyImageFile(file);
                }}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 transition-colors hover:border-[#1767b1]/40 hover:bg-slate-50">
                <ImageIcon className="h-8 w-8 text-slate-300" />
                <span className="text-xs text-slate-400">Klik, seret-lepas, atau Ctrl+V untuk upload gambar</span>
                <input id="cover-image-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-700">Ringkasan</label>
              <span className={`text-[11px] font-medium ${excerptOver ? "text-red-500" : "text-slate-400"}`}>
                {excerptLength}/{EXCERPT_MAX}
              </span>
            </div>
            <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 resize-none"
              placeholder="Ringkasan singkat artikel (opsional)" />
            {excerptOver && (
              <p className="mt-1 text-xs font-medium text-red-500">Melebihi {EXCERPT_MAX} karakter — disarankan maksimal {EXCERPT_MAX} karakter.</p>
            )}
          </div>

          {(colSupport.author_name || colSupport.editor_name) && (
            <div className={`grid gap-4 ${colSupport.author_name && colSupport.editor_name ? "grid-cols-2" : "grid-cols-1"}`}>
              {colSupport.author_name && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Penulis</label>
                  <input type="text" value={form.author_name}
                    onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
                    placeholder="Nama penulis (opsional)" />
                </div>
              )}
              {colSupport.editor_name && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Editor</label>
                  <input type="text" value={form.editor_name}
                    onChange={(e) => setForm({ ...form, editor_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
                    placeholder="Nama editor (opsional)" />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Konten</label>
            <RichTextEditor
              key={formKey}
              value={form.content}
              onChange={(val) => setForm((f) => ({ ...f, content: val }))}
            />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>{wordCount} kata · {readMinutes} menit baca</span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Terbitkan Sekarang</p>
                <p className="text-xs text-slate-400">{form.is_published ? "Artikel akan langsung tampil di website" : "Artikel disimpan sebagai draft"}</p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, is_published: !form.is_published })}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.is_published ? "bg-[#1767b1]" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_published ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
              <label className="whitespace-nowrap text-xs font-semibold text-slate-500">Tanggal Publish</label>
              <input type="datetime-local" value={form.published_at}
                onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20" />
              {form.published_at && (
                <button type="button" onClick={() => setForm({ ...form, published_at: "" })}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-600">
                  Reset
                </button>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Zona waktu WIB. Kosongkan untuk memakai waktu simpan otomatis saat terbit.
              Tanggal ini menentukan urutan &amp; tanggal tampil saja — <span className="font-semibold text-slate-500">bukan jadwal tayang</span> (sama seperti di form Berita).
            </p>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
