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
  uploadNewsAttachment,
  checkAttachment,
  attachmentKind,
  revalidateNews,
  cleanupNewsImageFolder,
  newsHasScheduledColumns,
  slugify,
} from "@/lib/queries";
import { compressImage } from "@/lib/compress-image";
import { sanitize } from "@/lib/sanitize";
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
  Paperclip,
  Download,
  BookmarkSimple,
  Files,
  Desktop,
  DeviceMobile,
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
  slug: string;
  summary: string;
  content: string;
  category: string;
  image_url: string;
  cover_image_position: string;
  writer_name: string;
  editor_name: string;
  image_alt: string;
  is_pinned: boolean;
  published_at: string;
  expires_at: string;
  is_published: boolean;
  attachment_url: string;
  attachment_name: string;
}

const emptyForm: FormData = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  category: "berita",
  image_url: "",
  cover_image_position: "center",
  writer_name: "",
  editor_name: "",
  image_alt: "",
  is_pinned: false,
  published_at: "",
  expires_at: "",
  is_published: false,
  attachment_url: "",
  attachment_name: "",
};

const ATTACHMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.odt,.txt,.zip";

/** Domain pratinjau URL/OG — sama dengan BASE_URL di src/app/sitemap.ts. */
const SITE_URL = "https://www.smpmuh4tanggul.sch.id";
const MAX_PINNED = 3;
const AUTOSAVE_DELAY_MS = 5000;

// ── Status tayang (badge daftar) ────────────────────────────────
type NewsStatus = "draft" | "scheduled" | "live" | "expired";

function newsStatus(item: News): NewsStatus {
  if (!item.is_published) return "draft";
  if (item.expires_at && new Date(item.expires_at).getTime() <= Date.now()) return "expired";
  if (item.published_at && new Date(item.published_at).getTime() > Date.now()) return "scheduled";
  return "live";
}

const STATUS_TEXT: Record<NewsStatus, string> = {
  draft: "Draft",
  scheduled: "Terjadwal",
  live: "Terbit",
  expired: "Kedaluwarsa",
};

const STATUS_BADGE_CLS: Record<NewsStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200",
  scheduled: "bg-[#f4d21f]/20 text-[#7a6600] border border-[#f4d21f] hover:bg-[#f4d21f]/30",
  live: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
  expired: "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100",
};

// ── WIB (UTC+7) ⇄ UTC untuk Tanggal Publish & Tampil sampai ────
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

// ── Autosave draft lokal ────────────────────────────────────────
function autosaveKey(edit: News | null): string {
  return edit ? `news:edit:${edit.id}` : "news:new";
}

function formatSavedAt(ts: number): string {
  return new Date(ts).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/** "2026-10-06T14:30" (nilai input WIB) → "6 Oktober 2026, 14:30". */
function formatWibInput(value: string): string {
  if (!value) return "";
  const [datePart, timePart = ""] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return value;
  const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${d} ${bulan[m - 1]} ${y}, ${timePart.replace(":", ".")}`;
}

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
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Form tahap 2: slug, autosave, pratinjau, pin, kolom tahap 1
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugUnlocked, setSlugUnlocked] = useState(false);
  const [baseline, setBaseline] = useState<string>("");
  const [pendingDraft, setPendingDraft] = useState<{ key: string; savedAt: number; data: FormData } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [colSupport, setColSupport] = useState(false);

  // Probe kolom tahap 1 (image_alt/is_pinned/expires_at) — sekali per muat halaman
  useEffect(() => {
    let alive = true;
    newsHasScheduledColumns()
      .then((ok) => { if (alive) setColSupport(ok); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const isFormDirty = formOpen && baseline !== "" && JSON.stringify(form) !== baseline;
  // Slug dikunci bila berita sudah pernah terbit (diungkai manual lewat tombol)
  const slugLocked = editItem !== null && editItem.is_published && !slugUnlocked;

  // Autosave: debounce 5 detik setelah ada perubahan (hanya field teks)
  useEffect(() => {
    if (!formOpen || !isFormDirty) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(autosaveKey(editItem), JSON.stringify({ form, savedAt: Date.now() }));
      } catch { /* storage penuh/diizinkan — abaikan */ }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [formOpen, isFormDirty, form, editItem]);

  // Fetch
  const fetchNews = useCallback(async () => {
    setLoading(true);
    const data = await getNewsListAll();
    setNews(data as News[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  // Paste image handler — kompres seperti handleImageChange
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
            setImageUploading(true);
            try {
              const compressed = await compressImage(file);
              setImageFile(compressed);
              setImagePreview(URL.createObjectURL(compressed));
            } finally {
              setImageUploading(false);
            }
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
  function checkPendingDraft(edit: News | null) {
    const key = autosaveKey(edit);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.form && typeof parsed.form === "object") {
          setPendingDraft({ key, savedAt: parsed.savedAt || 0, data: parsed.form });
          return;
        }
      }
    } catch { /* draft rusak → abaikan */ }
    setPendingDraft(null);
  }

  function openCreate() {
    const next = { ...emptyForm };
    setEditItem(null);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setImageFile(null);
    setImagePreview("");
    setAttachmentFile(null);
    setFormError("");
    setSlugTouched(false);
    setSlugUnlocked(false);
    checkPendingDraft(null);
    setFormOpen(true);
  }

  function openEdit(item: News) {
    const next: FormData = {
      title: item.title,
      slug: item.slug || "",
      summary: item.summary || "",
      content: item.content || "",
      category: item.category,
      image_url: item.image_url || "",
      cover_image_position: item.cover_image_position || "center",
      writer_name: item.writer_name || "",
      editor_name: item.editor_name || "",
      image_alt: item.image_alt || "",
      is_pinned: !!item.is_pinned,
      published_at: utcToWibInput(item.published_at),
      expires_at: utcToWibInput(item.expires_at),
      is_published: item.is_published,
      attachment_url: item.attachment_url || "",
      attachment_name: item.attachment_name || "",
    };
    setEditItem(item);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setImageFile(null);
    setImagePreview(item.image_url || "");
    setAttachmentFile(null);
    setFormError("");
    setSlugTouched(false);
    setSlugUnlocked(false);
    checkPendingDraft(item);
    setFormOpen(true);
  }

  // ── Autosave: pulihkan / buang draft lokal ──
  function restoreDraft() {
    if (!pendingDraft) return;
    const restored = { ...emptyForm };
    (Object.keys(emptyForm) as (keyof FormData)[]).forEach((k) => {
      const v = (pendingDraft.data as unknown as Record<string, unknown>)[k];
      if (v !== undefined) (restored as unknown as Record<string, unknown>)[k] = v;
    });
    setForm(restored);
    setImagePreview(restored.image_url || "");
    setPendingDraft(null);
  }

  function discardDraft() {
    if (!pendingDraft) return;
    try { localStorage.removeItem(pendingDraft.key); } catch { /* noop */ }
    setPendingDraft(null);
  }

  function closeForm() {
    setFormOpen(false);
    setPendingDraft(null);
  }

  /** Batal / X / Esc — bila form berubah, minta konfirmasi dulu. */
  function requestClose() {
    if (formSaving) return;
    if (isFormDirty) { setConfirmClose(true); return; }
    closeForm();
  }

  // ── Sematan (maksimal 3 aktif) ──
  function countActivePins(excludeId?: string): number {
    return news.filter(
      (n) =>
        n.id !== excludeId &&
        n.is_pinned &&
        (!n.expires_at || new Date(n.expires_at).getTime() > Date.now())
    ).length;
  }

  function togglePin() {
    if (!form.is_pinned && countActivePins(editItem?.id) >= MAX_PINNED) {
      toast(`Maksimal ${MAX_PINNED} berita disematkan aktif. Lepas sematan lain terlebih dahulu.`, "error");
      return;
    }
    setForm((f) => ({ ...f, is_pinned: !f.is_pinned }));
  }

  // ── Duplikat: buka form baru terisi salinan (belum disimpan) ──
  async function openDuplicate(item: News) {
    const copied: FormData = {
      ...emptyForm,
      title: `${item.title} (Salinan)`,
      summary: item.summary || "",
      content: item.content || "",
      category: item.category,
      image_url: item.image_url || "",
      cover_image_position: item.cover_image_position || "center",
      writer_name: item.writer_name || "",
      editor_name: item.editor_name || "",
      image_alt: item.image_alt || "",
    };
    copied.slug = slugify(copied.title);
    setViewItem(null);
    setEditItem(null);
    setForm(copied);
    setBaseline(JSON.stringify(copied));
    setImagePreview(copied.image_url || "");
    setImageFile(null);
    setAttachmentFile(null);
    setFormError("");
    setSlugTouched(false);
    setSlugUnlocked(false);
    checkPendingDraft(null);
    setFormOpen(true);

    // Salin sampul: unduh ulang jadi File agar ikut terunggah ke folder
    // berita baru. Bila gagal, tetap pakai URL asli (lihat laporan).
    if (copied.image_url) {
      try {
        const res = await fetch(copied.image_url);
        const blob = await res.blob();
        if (blob.type.startsWith("image/") && blob.size > 0) {
          setImageFile(new File([blob], "cover-salinan", { type: blob.type }));
        }
      } catch { /* fallback: pakai URL asli */ }
    }
  }

  function saveLabel(): string {
    if (editItem) return "Simpan Perubahan";
    if (!form.is_published) return "Simpan Draft";
    const utc = wibInputToUtc(form.published_at);
    return utc && new Date(utc).getTime() > Date.now() ? "Jadwalkan" : "Terbitkan";
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

  async function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // izinkan memilih file yang sama lagi
    if (!file) return;
    const invalid = checkAttachment(file);
    if (invalid) { setFormError(invalid); return; }
    setFormError("");
    setAttachmentFile(file);
  }

  function removeAttachment() {
    setAttachmentFile(null);
    setForm((f) => ({ ...f, attachment_url: "", attachment_name: "" }));
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Judul wajib diisi."); return; }
    if (attachmentFile) {
      const invalid = checkAttachment(attachmentFile);
      if (invalid) { setFormError(invalid); return; }
    }
    const publishedUtc = wibInputToUtc(form.published_at);
    const expiresUtc = wibInputToUtc(form.expires_at);
    if (publishedUtc && expiresUtc && new Date(expiresUtc).getTime() <= new Date(publishedUtc).getTime()) {
      setFormError("Tampil sampai harus setelah Tanggal Publish.");
      return;
    }
    if (form.is_pinned && countActivePins(editItem?.id) >= MAX_PINNED) {
      setFormError(`Maksimal ${MAX_PINNED} berita disematkan aktif. Lepas sematan lain terlebih dahulu.`);
      return;
    }
    setFormSaving(true);
    setFormError("");

    // ── Upload gambar baru jika ada ──
    let imageUrl = form.image_url;
    const oldImageUrl = editItem?.image_url || "";
    if (imageFile) {
      const tempId = editItem?.id || (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
      const uploaded = await uploadNewsImage(imageFile, tempId);
      if (!uploaded.url) {
        setFormError(uploaded.error || "Gagal mengunggah gambar sampul.");
        setFormSaving(false);
        return;
      }
      imageUrl = uploaded.url;
    }

    // Terbit tanpa tanggal → stempel sekarang; draft tanpa tanggal → null
    const finalPublished = publishedUtc || (form.is_published ? new Date().toISOString() : null);
    const rowPayload = {
      ...form,
      slug: form.slug.trim() ? slugify(form.slug) : "",
      image_url: imageUrl || null,
      image_alt: form.image_alt.trim(),
      published_at: finalPublished,
      expires_at: expiresUtc || null,
    };

    // ── Simpan baris berita ──
    let newsId = editItem?.id || "";
    let savedSlug = "";
    if (editItem) {
      const { data, error } = await updateNews(editItem.id, rowPayload);
      if (error) { setFormError(error); setFormSaving(false); return; }
      savedSlug = data?.slug || rowPayload.slug || editItem.slug;

      // Hapus file lama di storage jika gambar diganti atau dikosongkan
      // Gunakan folder-based cleanup: list semua file di news/<id>/, hapus semua kecuali keepUrl
      cleanupNewsImageFolder(editItem.id, imageUrl || null).catch(() => {});
    } else {
      const { data, error } = await createNews(rowPayload);
      if (error) { setFormError(error); setFormSaving(false); return; }
      newsId = data?.id || "";
      savedSlug = data?.slug || "";
    }

    // ── Upload lampiran bila ada ──
    let attachmentError = "";
    if (attachmentFile && newsId) {
      const uploaded = await uploadNewsAttachment(attachmentFile, newsId);
      if (uploaded.url) {
        const { error } = await updateNews(newsId, {
          attachment_url: uploaded.url,
          attachment_name: attachmentFile.name,
        });
        if (error) attachmentError = error;
      } else {
        attachmentError = uploaded.error || "Gagal mengunggah lampiran.";
      }
    }

    if (attachmentError) {
      toast(`Berita tersimpan, tapi lampiran gagal: ${attachmentError}`, "error");
    } else {
      const successMsg = editItem
        ? "Berita berhasil diperbarui"
        : !form.is_published
          ? "Berita disimpan sebagai draft"
          : finalPublished && new Date(finalPublished).getTime() > Date.now()
            ? "Berita berhasil dijadwalkan"
            : "Berita berhasil diterbitkan";
      toast(successMsg, "success");
    }

    // Draft lokal tidak diperlukan lagi setelah tersimpan
    try { localStorage.removeItem(autosaveKey(editItem)); } catch { /* noop */ }
    setPendingDraft(null);
    setFormOpen(false);
    setFormSaving(false);
    fetchNews();

    // Revalidate cache: /, /news, /news/<slug> (slug lama bila slug berubah)
    const oldSlug = editItem && editItem.slug !== savedSlug ? editItem.slug : undefined;
    revalidateNews(savedSlug, oldSlug).catch(() => {});
  }

  async function handleDelete() {
    if (!deleteItem) return;
    const slug = deleteItem.slug;
    await deleteNews(deleteItem.id);
    toast("Berita berhasil dihapus", "success");
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchNews();
    revalidateNews(slug).catch(() => {});
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    // kumpulkan slug sebelum dihapus
    const slugs = ids.map(id => news.find(n => n.id === id)?.slug).filter(Boolean) as string[];
    await deleteNewsBulk(ids);
    toast(`${ids.length} berita berhasil dihapus`, "success");
    setSelectedIds(new Set());
    setBulkDelete(false);
    fetchNews();
    slugs.forEach(slug => revalidateNews(slug).catch(() => {}));
  }

  async function handleBulkPublish(publish: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const slugs = ids.map(id => news.find(n => n.id === id)?.slug).filter(Boolean) as string[];
    await togglePublishNewsBulk(ids, publish);
    toast(`${ids.length} berita ${publish ? "diterbitkan" : "draft"}`, "success");
    setSelectedIds(new Set());
    fetchNews();
    slugs.forEach(slug => revalidateNews(slug).catch(() => {}));
  }

  async function handleTogglePublish(item: News) {
    await togglePublishNews(item.id, !item.is_published);
    toast(`Berita ${!item.is_published ? "diterbitkan" : "draft"}`, "success");
    fetchNews();
    revalidateNews(item.slug).catch(() => {});
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
                          <img src={item.image_url} alt="" loading="lazy" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <FileText className="h-5 w-5 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">
                            {item.title}
                            {item.is_pinned && (
                              <BookmarkSimple weight="fill" className="ml-1.5 inline h-3.5 w-3.5 -translate-y-px text-[#f4d21f]" aria-label="Disematkan" />
                            )}
                            {item.attachment_url && (
                              <Paperclip className="ml-1.5 inline h-3.5 w-3.5 -translate-y-px text-[#1767b1]" aria-label="Ada lampiran" />
                            )}
                          </p>
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
                        title={item.is_published ? "Jadikan draft" : "Terbitkan sekarang"}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${STATUS_BADGE_CLS[newsStatus(item)]}`}>
                        {newsStatus(item) === "live" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : newsStatus(item) === "expired" ? (
                          <Warning className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {newsStatus(item) === "scheduled" && item.published_at
                          ? `Terjadwal · ${new Date(item.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                          : STATUS_TEXT[newsStatus(item)]}
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
                        <button onClick={() => openDuplicate(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-purple-50 hover:text-purple-600" title="Duplikat">
                          <Files className="h-4 w-4" />
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
        description={viewItem ? `${categoryConfig[viewItem.category]?.label || viewItem.category} · ${STATUS_TEXT[newsStatus(viewItem)]}` : undefined}
        footer={
          <>
            <div className="flex items-center gap-2">
              <button onClick={() => { const v = viewItem; setViewItem(null); if (v) openDuplicate(v); }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Files className="h-4 w-4" /> Duplikat
              </button>
              <button onClick={() => { setViewItem(null); openEdit(viewItem!); }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <PencilSimple className="h-4 w-4" /> Edit
              </button>
            </div>
            {viewItem && newsStatus(viewItem) === "live" ? (
              <a href={`/news/${viewItem.slug}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1]">
                <Eye className="h-4 w-4" /> Lihat di Website
              </a>
            ) : viewItem ? (
              <span className="self-center text-xs font-semibold text-slate-400">
                {newsStatus(viewItem) === "scheduled"
                  ? "Belum tayang — dijadwalkan"
                  : newsStatus(viewItem) === "expired"
                    ? "Masa tampil sudah berakhir"
                    : "Draft — belum tayang di website"}
              </span>
            ) : null}
          </>
        }
      >
        {viewItem?.image_url && (
          <div className="mb-4 -mx-6 -mt-5 overflow-hidden">
            <img src={viewItem.image_url} alt={viewItem.image_alt || viewItem.title} loading="lazy" className="h-48 w-full object-cover sm:h-64" />
          </div>
        )}
        {viewItem && (
          <>
            <div className="mb-4 flex items-center gap-4 text-xs text-slate-500">
              <span>Oleh: {(viewItem as any).author_name || "Tidak diketahui"}</span>
              <span>{viewItem.published_at ? new Date(viewItem.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</span>
            </div>
            {viewItem.summary && <p className="mb-4 text-sm text-slate-600 italic border-l-2 border-[#f4d21f] pl-3">{viewItem.summary}</p>}
            {viewItem.attachment_url && (
              <a
                href={viewItem.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 flex items-center gap-3 rounded-xl border border-[#1767b1]/20 bg-[#082b59]/5 px-4 py-3 transition-colors hover:bg-[#082b59]/10"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#082b59]/10 text-[10px] font-black text-[#082b59]">
                  {attachmentKind(viewItem.attachment_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-700">{viewItem.attachment_name || "Lampiran"}</span>
                  <span className="block text-[11px] text-slate-400">Klik untuk membuka atau mengunduh</span>
                </span>
                <Download className="h-4 w-4 flex-shrink-0 text-[#1767b1]" />
              </a>
            )}
            <div
              className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitize(viewItem.content || "Tidak ada konten") }}
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
        onClose={requestClose}
        title={editItem ? "Edit Berita" : "Buat Berita Baru"}
        description={editItem ? "Perbarui informasi berita" : "Isi form untuk menerbitkan berita"}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <button onClick={requestClose} disabled={formSaving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              Batal
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setPreviewOpen(true)} disabled={formSaving}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                <Eye className="h-4 w-4" /> Pratinjau
              </button>
              <button onClick={handleSave} disabled={formSaving}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1] disabled:opacity-70">
                {formSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <FloppyDisk className="h-4 w-4" />
                    {saveLabel()}
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        {pendingDraft && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="flex-1">Ada draft yang belum disimpan ({formatSavedAt(pendingDraft.savedAt)}). Lanjutkan?</span>
            <button type="button" onClick={restoreDraft}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
              Lanjutkan
            </button>
            <button type="button" onClick={discardDraft}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
              Buang
            </button>
          </div>
        )}
        {formError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <Warning className="h-4 w-4 shrink-0" /> {formError}
          </div>
        )}

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Judul <span className="text-red-500">*</span></label>
            <input type="text" value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                // Slug otomatis dari judul selama belum diedit manual (mode buat baru)
                setForm((prev) => ({
                  ...prev,
                  title,
                  slug: !editItem && !slugTouched ? slugify(title) : prev.slug,
                }));
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
              placeholder="Judul berita" />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Slug</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.slug}
                readOnly={slugLocked}
                onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }}
                onBlur={() => { if (form.slug) setForm((f) => ({ ...f, slug: slugify(f.slug) })); }}
                className={`w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 ${slugLocked ? "bg-slate-50 text-slate-500" : ""}`}
                placeholder="otomatis dari judul"
              />
              {slugLocked && (
                <button type="button" onClick={() => setSlugUnlocked(true)}
                  className="shrink-0 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                  Ubah slug
                </button>
              )}
            </div>
            {editItem?.is_published && (
              <p className="mt-1.5 text-xs text-amber-600">
                Tautan lama akan mati — tidak ada redirect otomatis.
              </p>
            )}
            <p className="mt-1 break-all text-xs text-slate-400">
              {SITE_URL}/news/<span className={form.slug ? "text-slate-500" : "text-slate-300"}>{form.slug || "…"}</span>
            </p>
          </div>

          {/* Pratinjau kartu saat dibagikan */}
          <SharePreviewCard form={form} imagePreview={imagePreview} />

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
              <label
                htmlFor="cover-image-input"
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
                <input id="cover-image-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Disarankan rasio 16:9 (mis. 1280×720) agar tidak terpotong.
            </p>
            {colSupport && (
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Teks alternatif gambar</label>
                <input
                  type="text"
                  maxLength={125}
                  value={form.image_alt}
                  onChange={(e) => setForm({ ...form, image_alt: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
                  placeholder="Deskripsi singkat isi gambar"
                />
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">Untuk poster yang berisi teks, tuliskan isi pentingnya di sini.</p>
                  <span className={`text-[11px] ${form.image_alt.length >= 125 ? "text-amber-600" : "text-slate-400"}`}>
                    {form.image_alt.length}/125
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Attachment (lampiran file) */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Lampiran File</label>
            <p className="mb-2 text-xs text-slate-400">
              Opsional — dokumen pendukung, mis. surat pengumuman (PDF/Word/Excel/TXT/ZIP, maks 10 MB).
            </p>
            {attachmentFile || form.attachment_url ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#082b59]/10 text-[10px] font-black text-[#082b59]">
                  {attachmentKind(attachmentFile?.name || form.attachment_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {attachmentFile ? attachmentFile.name : form.attachment_name || "Lampiran"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {attachmentFile
                      ? `${Math.max(1, Math.round(attachmentFile.size / 1024))} KB · akan diunggah saat disimpan`
                      : "Tersimpan · klik Ganti untuk mengganti"}
                  </p>
                </div>
                <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                  Ganti
                  <input type="file" accept={ATTACHMENT_ACCEPT} className="hidden" onChange={handleAttachmentChange} />
                </label>
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Hapus lampiran"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-5 transition-colors hover:border-[#1767b1]/40 hover:bg-slate-50">
                <Paperclip className="h-7 w-7 text-slate-300" />
                <span className="text-center text-xs text-slate-400">
                  Klik untuk memilih file lampiran
                </span>
                <input type="file" accept={ATTACHMENT_ACCEPT} className="hidden" onChange={handleAttachmentChange} />
              </label>
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

          {/* Publish toggle + Date + Sematan + Masa tampil */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Terbitkan</p>
                <p className="text-xs text-slate-400">
                  {!form.is_published
                    ? "Berita disimpan sebagai draft"
                    : wibInputToUtc(form.published_at) && new Date(wibInputToUtc(form.published_at)!).getTime() > Date.now()
                      ? "Belum tampil — menunggu jadwal tayang"
                      : "Berita akan langsung tampil di website"}
                </p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, is_published: !form.is_published })}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.is_published ? "bg-[#1767b1]" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_published ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Tanggal Publish (WIB)</label>
              <input type="datetime-local" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20" />
              {form.published_at && (
                <button type="button" onClick={() => setForm({ ...form, published_at: "" })}
                  className="text-[11px] text-slate-400 hover:text-slate-600">Reset</button>
              )}
            </div>
            {form.is_published && wibInputToUtc(form.published_at) && new Date(wibInputToUtc(form.published_at)!).getTime() > Date.now() && (
              <p className="flex items-center gap-1.5 rounded-lg border border-[#f4d21f]/50 bg-[#f4d21f]/15 px-2.5 py-1.5 text-xs font-medium text-[#7a6600]">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Akan tayang otomatis pada {formatWibInput(form.published_at)} WIB
              </p>
            )}
            {colSupport && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <BookmarkSimple weight="fill" className="h-4 w-4 text-[#f4d21f]" /> Sematkan di atas
                    </p>
                    <p className="text-xs text-slate-400">Tampil lebih awal di /news &amp; beranda (maks {MAX_PINNED} aktif).</p>
                  </div>
                  <button type="button" onClick={togglePin}
                    aria-pressed={form.is_pinned}
                    className={`relative h-6 w-11 rounded-full transition-colors ${form.is_pinned ? "bg-[#1767b1]" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_pinned ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Tampil sampai (WIB)</label>
                  <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20" />
                  {form.expires_at && (
                    <button type="button" onClick={() => setForm({ ...form, expires_at: "" })}
                      className="text-[11px] text-slate-400 hover:text-slate-600">Reset</button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">Opsional — berita berhenti tampil otomatis setelah waktu ini.</p>
              </div>
            )}
          </div>
        </div>
      </SlideOver>

      {/* ── KONFIRMASI TUTUP TANPA SIMPAN ───────────── */}
      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => {
          // "Tutup tanpa menyimpan" → buang juga draft autosave lokal
          try { localStorage.removeItem(autosaveKey(editItem)); } catch { /* noop */ }
          setConfirmClose(false);
          closeForm();
        }}
        title="Perubahan belum disimpan?"
        description="Tutup tanpa menyimpan?"
        confirmLabel="Tutup Tanpa Simpan"
        variant="warning"
      />

      {/* ── PRATINJAU (draft/terjadwal) — tanpa route baru ── */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size={previewDevice === "mobile" ? "sm" : "xl"}
        title="Pratinjau Berita"
        description="Tampilan seperti halaman publik — berlaku untuk draft & terjadwal"
        footer={
          <>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
              <button type="button" onClick={() => setPreviewDevice("desktop")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${previewDevice === "desktop" ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <Desktop className="h-3.5 w-3.5" /> Desktop
              </button>
              <button type="button" onClick={() => setPreviewDevice("mobile")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${previewDevice === "mobile" ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <DeviceMobile className="h-3.5 w-3.5" /> Mobile
              </button>
            </div>
            <button onClick={() => setPreviewOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Tutup
            </button>
          </>
        }
      >
        <div className={previewDevice === "mobile" ? "mx-auto max-w-sm" : "mx-auto max-w-3xl"}>
          {/* Meta — kategori, tanggal, penulis (seperti halaman detail publik) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${categoryConfig[form.category]?.color || "bg-slate-100 text-slate-600 border-slate-200"}`}>
              {categoryConfig[form.category]?.label || form.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              {form.published_at ? formatWibInput(form.published_at) : "-"}
            </span>
            {form.writer_name && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <User className="h-3 w-3" /> {form.writer_name}
                <span className="text-[11px] text-slate-300">Penulis</span>
              </span>
            )}
            {form.editor_name && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <User className="h-3 w-3" /> {form.editor_name}
                <span className="text-[11px] text-slate-300">Editor</span>
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-black leading-snug text-[#082b59]">
            {form.title || "Tanpa judul"}
          </h1>
          {imagePreview && (
            <div className="mt-4 w-full overflow-hidden rounded-2xl shadow-md aspect-[1200/630]">
              <img src={imagePreview} alt={form.image_alt || form.title || "Sampul"}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: form.cover_image_position === "top" ? "center 20%" : form.cover_image_position === "bottom" ? "center 80%" : "center center",
                }} />
            </div>
          )}
          {form.summary && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <BookmarkSimple className="mt-0.5 h-4 w-4 shrink-0 text-[#f4d21f]" />
                <p className="text-sm font-medium leading-relaxed text-slate-600">{form.summary}</p>
              </div>
            </div>
          )}
          {/* Konten — kelas prose DISALIN VERBATIM dari /news/[slug] + sanitize() */}
          <div
            className="prose prose-lg prose-slate max-w-none
              prose-headings:text-[#082b59] prose-headings:font-extrabold prose-headings:scroll-mt-24
              prose-p:text-gray-700 prose-p:leading-[1.75] prose-p:my-4
              prose-a:text-[#1767b1] prose-a:no-underline prose-a:font-medium hover:prose-a:underline
              prose-strong:text-[#082b59] prose-strong:font-bold
              prose-em:text-slate-600
              prose-img:rounded-2xl prose-img:shadow-md prose-img:my-8
              prose-blockquote:border-l-4 prose-blockquote:border-[#f4d21f] prose-blockquote:bg-gradient-to-r prose-blockquote:from-amber-50 prose-blockquote:to-transparent prose-blockquote:py-4 prose-blockquote:pr-6 prose-blockquote:pl-6 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-slate-600
              prose-li:text-gray-700 prose-li:leading-[1.7] prose-li:my-1 [&_li>p]:my-0
              prose-ol:my-4 prose-ol:pl-6 prose-ul:my-4 prose-ul:pl-6
              prose-code:text-[#1767b1] prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-[#082b59] prose-pre:text-white prose-pre:rounded-xl prose-pre:border prose-pre:border-slate-700
              prose-hr:border-slate-200 prose-hr:my-12
              prose-table:text-sm prose-table:border-collapse
              prose-th:bg-slate-50 prose-th:text-left prose-th:font-semibold prose-th:px-4 prose-th:py-3 prose-th:border prose-th:border-slate-200
              prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-slate-200"
            dangerouslySetInnerHTML={{ __html: sanitize(form.content || "<p>Konten belum tersedia.</p>") }}
          />
        </div>
      </Modal>
    </div>
  );
}

/** Kartu "Pratinjau saat dibagikan" — ikuti isi form secara langsung. */
function SharePreviewCard({ form, imagePreview }: { form: FormData; imagePreview: string }) {
  const domain = SITE_URL.replace(/^https?:\/\//, "");
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        Pratinjau saat dibagikan
      </label>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {imagePreview ? (
          <div className="relative w-full bg-slate-100 aspect-[1.91/1]">
            <img
              src={imagePreview}
              alt={form.image_alt || form.title || "Pratinjau sampul"}
              className="h-full w-full object-cover"
              style={{
                objectPosition: form.cover_image_position === "top" ? "center 20%" : form.cover_image_position === "bottom" ? "center 80%" : "center center",
              }}
            />
          </div>
        ) : (
          <div className="flex w-full items-center justify-center bg-gradient-to-br from-[#082b59] to-[#1767b1] aspect-[1.91/1]">
            <ImageIcon className="h-10 w-10 text-white/25" />
          </div>
        )}
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">{domain}</p>
          <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-800">
            {form.title || "Judul berita tampil di sini"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
            {form.summary || "Ringkasan berita tampil di sini…"}
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">Kartu tautan di WhatsApp / Facebook.</p>
    </div>
  );
}
