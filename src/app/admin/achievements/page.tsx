"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  getAchievementList,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  deleteAchievementBulk,
  uploadAchievementImage,
  revalidateAchievements,
} from "@/lib/queries";
import { StatCard, StatCardRow, SlideOver, ConfirmModal } from "@/components/ui";
import type { Achievement } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { compressImage } from "@/lib/compress-image";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LEVELS,
  achievementCategoryMeta,
  achievementLevelLabel,
  capitalizeCategory,
} from "@/lib/site-config";
import {
  Trophy,
  MagnifyingGlass,
  Eye,
  X,
  Medal,
  CaretLeft,
  CaretRight,
  CaretDown,
  Plus,
  PencilSimple,
  Trash,
  Warning,
  Image as ImageIcon,
  FloppyDisk,
  ArrowUp,
  ArrowDown,
  SortAscending,
  Checks,
  Star,
  Files,
  Users,
  Megaphone,
} from "@/components/Icons";

const PAGE_SIZE = 10;
/** Batas unggulan aktif (Tahap 3.6). */
const MAX_FEATURED = 6;

type SortField = "created_at" | "title" | "category" | "year";
type SortDir = "asc" | "desc";

/** Warna/label kategori dari konstanta bersama; tak dikenal → abu-abu + capitalize. */
function catMeta(key?: string | null) {
  return achievementCategoryMeta(key) || {
    key: key || "",
    label: capitalizeCategory(key || "-"),
    color: "bg-slate-100 text-slate-600",
    icon: Trophy,
  };
}

/** Label tingkat dari data; di luar daftar → capitalize. */
function levelLabel(value?: string | null): string {
  return achievementLevelLabel(value) || capitalizeCategory(value || "");
}

interface FormData {
  title: string;
  description: string;
  category: string;
  /** Disimpan sebagai string supaya bisa dikosongkan saat mengetik. */
  year: string;
  image_url: string;
  rank_label: string;
  level: string;
  participants: string;
  organizer: string;
  image_alt: string;
  is_featured: boolean;
}

const emptyForm: FormData = {
  title: "",
  description: "",
  category: "akademik",
  year: String(new Date().getFullYear()),
  image_url: "",
  rank_label: "",
  level: "",
  participants: "",
  organizer: "",
  image_alt: "",
  is_featured: false,
};

export default function AdminAchievementsPage() {
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [yearFilter, setYearFilter] = useState("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [viewItem, setViewItem] = useState<Achievement | null>(null);
  const [deleteItem, setDeleteItem] = useState<Achievement | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Achievement | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  /** Kondisi awal form — dasar dirty-check konfirmasi Batal. */
  const [initialForm, setInitialForm] = useState<FormData>(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [yearError, setYearError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);

  const fetchAchievements = useCallback(async () => {
    const data = await getAchievementList();
    setAchievements(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchAchievements();
    })().catch(() => {});
  }, [fetchAchievements]);

  const categories = useMemo(() => [...new Set(achievements.map((a) => a.category))], [achievements]);

  /** Tahun yang benar-benar ada di data (tanpa hardcode) — untuk filter Tahap 3.5. */
  const availableYears = useMemo(
    () => [...new Set(achievements.map((a) => a.year).filter(Boolean))].sort((a, b) => b - a),
    [achievements]
  );

  /** Saran peringkat dari nilai yang pernah dipakai — untuk datalist. */
  const rankSuggestions = useMemo(
    () => [...new Set(achievements.map((a) => a.rank_label).filter(Boolean))] as string[],
    [achievements]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = achievements.filter((item) => {
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.participants || "").toLowerCase().includes(q) ||
        (item.organizer || "").toLowerCase().includes(q) ||
        (item.rank_label || "").toLowerCase().includes(q);
      const matchCategory = filter === "all" || item.category === filter;
      const matchYear = yearFilter === "all" || String(item.year) === yearFilter;
      return matchSearch && matchCategory && matchYear;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "category") cmp = (a.category || "").localeCompare(b.category || "");
      else if (sortField === "year") cmp = (a.year || 0) - (b.year || 0);
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [achievements, search, filter, yearFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: achievements.length,
    thisYear: achievements.filter((a) => a.year === new Date().getFullYear()).length,
    categories: categories.length,
    featured: achievements.filter((a) => a.is_featured).length,
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

  /* ── Pratinjau gambar & revoke object URL ───────────────────── */
  const isDirty =
    JSON.stringify(form) !== JSON.stringify(initialForm) || imageFile !== null;

  /** URL blob yang sedang tampil — ref supaya handler lama (paste) tak memakai nilai basi. */
  const previewRef = useRef("");
  useEffect(() => { previewRef.current = imagePreview; }, [imagePreview]);

  /** Revoke object URL lama saat gambar diganti atau form ditutup. */
  function revokePreview() {
    const url = previewRef.current;
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    previewRef.current = "";
  }

  /** Klik / seret-lepas / Ctrl+V → kompres dulu (pola form berita) lalu tampilkan. */
  async function applyImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageUploading(true);
    try {
      const compressed = await compressImage(file);
      revokePreview();
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch {
      toast("Gagal memproses gambar", "error");
    } finally {
      setImageUploading(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) applyImageFile(file);
  }

  // Paste gambar (Ctrl+V) — aktif hanya selama form terbuka, sama seperti form berita
  useEffect(() => {
    if (!formOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { e.preventDefault(); applyImageFile(file); break; }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [formOpen]);

  /** Jumlah unggulan selain item ini — validasi batas maks 6. */
  function countFeatured(excludeId?: string): number {
    return achievements.filter((a) => a.id !== excludeId && a.is_featured).length;
  }

  function toggleFeatured() {
    if (!form.is_featured && countFeatured(editItem?.id) >= MAX_FEATURED) {
      toast(`Maksimal ${MAX_FEATURED} prestasi unggulan. Lepas unggulan lain terlebih dahulu.`, "error");
      return;
    }
    setForm((f) => ({ ...f, is_featured: !f.is_featured }));
  }

  function closeForm() {
    revokePreview();
    setConfirmClose(false);
    setFormOpen(false);
    setImagePreview("");
    setImageFile(null);
    setFormError("");
    setYearError("");
  }

  function requestClose() {
    if (formSaving) return;
    if (isDirty) { setConfirmClose(true); return; }
    closeForm();
  }

  function openCreate() {
    setEditItem(null);
    setForm(emptyForm);
    setInitialForm(emptyForm);
    revokePreview();
    setImageFile(null);
    setImagePreview("");
    setFormError("");
    setYearError("");
    setConfirmClose(false);
    setFormOpen(true);
  }

  function openEdit(item: Achievement) {
    const next: FormData = {
      title: item.title,
      description: item.description || "",
      category: item.category || "akademik",
      // year disimpan sebagai string supaya bisa dikosongkan saat mengetik
      year: item.year ? String(item.year) : "",
      image_url: item.image_url || "",
      rank_label: item.rank_label || "",
      level: item.level || "",
      participants: item.participants || "",
      organizer: item.organizer || "",
      image_alt: item.image_alt || "",
      is_featured: !!item.is_featured,
    };
    setEditItem(item);
    setForm(next);
    setInitialForm(next);
    revokePreview();
    setImageFile(null);
    setImagePreview(item.image_url || "");
    setFormError("");
    setYearError("");
    setConfirmClose(false);
    setFormOpen(true);
  }

  /** Duplikat: buka form baru terisi salinan — belum disimpan sampai ditekan Simpan. */
  function openDuplicate(item: Achievement) {
    const copied: FormData = {
      ...emptyForm,
      title: `${item.title} (Salinan)`,
      description: item.description || "",
      category: item.category || "akademik",
      year: item.year ? String(item.year) : emptyForm.year,
      image_url: item.image_url || "",
      rank_label: item.rank_label || "",
      level: item.level || "",
      participants: item.participants || "",
      organizer: item.organizer || "",
      image_alt: item.image_alt || "",
      is_featured: false,
    };
    setViewItem(null);
    setEditItem(null);
    setForm(copied);
    setInitialForm(copied);
    revokePreview();
    setImageFile(null);
    setImagePreview(copied.image_url || "");
    setFormError("");
    setYearError("");
    setConfirmClose(false);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Judul wajib diisi."); return; }

    // Tahun: string di state, divalidasi & dikonversi ke number saat simpan
    const yearRaw = form.year.trim();
    const yearNum = Number(yearRaw);
    if (!yearRaw || !Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
      setYearError("Tahun harus bilangan bulat 2000–2100.");
      return;
    }
    setYearError("");

    if (form.is_featured && countFeatured(editItem?.id) >= MAX_FEATURED) {
      setFormError(`Maksimal ${MAX_FEATURED} prestasi unggulan. Lepas unggulan lain terlebih dahulu.`);
      return;
    }

    setFormSaving(true);
    setFormError("");

    let imageUrl = form.image_url;
    if (imageFile) {
      const tempId = editItem?.id || (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
      const uploaded = await uploadAchievementImage(imageFile, tempId);
      if (!uploaded.url) {
        setFormError(uploaded.error || "Gagal mengunggah gambar prestasi.");
        setFormSaving(false);
        return;
      }
      imageUrl = uploaded.url;
    }

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      year: yearNum,
      image_url: imageUrl,
      rank_label: form.rank_label.trim() || null,
      level: form.level.trim() || null,
      participants: form.participants.trim() || null,
      organizer: form.organizer.trim() || null,
      image_alt: form.image_alt.trim() || null,
      is_featured: form.is_featured,
    };

    if (editItem) {
      const { error } = await updateAchievement(editItem.id, payload);
      if (error) { setFormError(error); setFormSaving(false); toast(error, "error"); return; }
    } else {
      const { error } = await createAchievement(payload);
      if (error) { setFormError(error); setFormSaving(false); toast(error, "error"); return; }
    }

    // Tahap 5 — halaman prestasi + beranda
    revalidateAchievements().catch(() => {});
    toast(editItem ? "Prestasi berhasil diperbarui" : "Prestasi berhasil ditambahkan", "success");
    closeForm();
    setFormSaving(false);
    fetchAchievements();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      const { error } = await deleteAchievement(deleteItem.id);
      if (error) { toast(error, "error"); return; }
      toast("Prestasi berhasil dihapus", "success");
      setDeleteItem(null);
      setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
      revalidateAchievements().catch(() => {});
      fetchAchievements();
    } catch {
      toast("Gagal menghapus prestasi", "error");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const { error } = await deleteAchievementBulk(ids);
      if (error) { toast(error, "error"); return; }
      toast(`${ids.length} prestasi berhasil dihapus`, "success");
      setSelectedIds(new Set());
      setBulkDelete(false);
      revalidateAchievements().catch(() => {});
      fetchAchievements();
    } catch {
      toast("Gagal menghapus prestasi", "error");
    }
  }

  const sortIcon = (field: SortField) => {
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4d21f]/10">
            <Trophy className="h-5 w-5 text-[#f4d21f]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola Prestasi</h1>
            <p className="text-sm text-slate-500">Pencapaian siswa dan sekolah</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1767b1]">
          <Plus className="h-4 w-4" /> Tambah Prestasi
        </button>
      </div>

      {/* Stats */}
      <StatCardRow>
        <StatCard label="Total" value={stats.total} variant="brand" />
        <StatCard label="Tahun Ini" value={stats.thisYear} variant="success" />
        <StatCard label="Kategori" value={stats.categories} variant="purple" />
        <StatCard label="Unggulan" value={stats.featured} variant="warning" />
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
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button onClick={() => { setFilter("all"); setPage(1); setSelectedIds(new Set()); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === "all" ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Semua
          </button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => { setFilter(cat); setPage(1); setSelectedIds(new Set()); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === cat ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {catMeta(cat).label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari judul, peraih, penyelenggara, peringkat..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 sm:w-72"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          {availableYears.length > 0 && (
            <div className="relative">
              <select value={yearFilter}
                onChange={(e) => { setYearFilter(e.target.value); setPage(1); setSelectedIds(new Set()); }}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-700 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 sm:w-40">
                <option value="all">Semua Tahun</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
              <CaretDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          )}
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
                  <span className="flex items-center gap-1">Judul {sortIcon("title")}</span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("category")}>
                  <span className="flex items-center gap-1">Kategori {sortIcon("category")}</span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("year")}>
                  <span className="flex items-center gap-1">Tahun {sortIcon("year")}</span>
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data prestasi...</p>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Trophy className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada prestasi"}</p>
                    </div>
                    {!search && filter === "all" && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#082b59] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1767b1]">
                        <Plus className="h-3.5 w-3.5" /> Tambah Prestasi Pertama
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
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#f4d21f]/10">
                            <Medal className="h-5 w-5 text-[#f4d21f]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                            <span className="line-clamp-1">{item.title}</span>
                            {item.is_featured && (
                              <Star weight="fill" className="h-3.5 w-3.5 shrink-0 text-[#f4d21f]" aria-label="Unggulan" />
                            )}
                          </p>
                          {(item.rank_label || item.level) && (
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {item.rank_label && (
                                <span className="rounded-md bg-[#f4d21f]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#7a6600]">
                                  {item.rank_label}
                                </span>
                              )}
                              {item.level && (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {levelLabel(item.level)}
                                </span>
                              )}
                            </div>
                          )}
                          {item.description && <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${catMeta(item.category).color}`}>
                        {catMeta(item.category).label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-500 sm:table-cell">{item.year}</td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
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
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} prestasi
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4d21f]/10">
                  <Medal className="h-5 w-5 text-[#f4d21f]" />
                </div>
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    {viewItem.title}
                    {viewItem.is_featured && <Star weight="fill" className="h-4 w-4 text-[#f4d21f]" aria-label="Unggulan" />}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${catMeta(viewItem.category).color}`}>
                      {catMeta(viewItem.category).label}
                    </span>
                    {viewItem.rank_label && (
                      <span className="inline-block rounded-md bg-[#f4d21f]/20 px-2 py-0.5 text-[10px] font-bold text-[#7a6600]">
                        {viewItem.rank_label}
                      </span>
                    )}
                    {viewItem.level && (
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {levelLabel(viewItem.level)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewItem(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {viewItem.image_url && (
              <div className="mb-4 overflow-hidden rounded-xl">
                <img src={viewItem.image_url} alt={viewItem.image_alt || viewItem.title} loading="lazy" className="h-40 w-full object-cover" />
              </div>
            )}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Tahun</span>
                <span className="font-medium text-slate-800">{viewItem.year}</span>
              </div>
              {viewItem.participants && (
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="shrink-0 text-slate-500">Peraih</span>
                  <span className="text-right font-medium text-slate-800">{viewItem.participants}</span>
                </div>
              )}
              {viewItem.organizer && (
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="shrink-0 text-slate-500">Penyelenggara</span>
                  <span className="text-right font-medium text-slate-800">{viewItem.organizer}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Unggulan</span>
                <span className="font-medium text-slate-800">{viewItem.is_featured ? "Ya" : "Tidak"}</span>
              </div>
              {viewItem.image_alt && (
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Teks alternatif gambar</span>
                  <p className="mt-1 text-slate-700">{viewItem.image_alt}</p>
                </div>
              )}
              <div className="border-b border-slate-100 pb-2">
                <span className="text-slate-500">Deskripsi</span>
                <p className="mt-1 text-slate-700">{viewItem.description || "Tidak ada deskripsi"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => openDuplicate(viewItem)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Files className="h-4 w-4" /> Duplikat
              </button>
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
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus Prestasi?</h3>
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
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus {selectedIds.size} Prestasi?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Semua prestasi yang dipilih akan dihapus permanen.</p>
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
        onClose={requestClose}
        title={editItem ? "Edit Prestasi" : "Tambah Prestasi Baru"}
        description={editItem ? "Perbarui informasi prestasi" : "Isi form untuk menambahkan prestasi"}
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
          {/* Judul */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Judul <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
              placeholder="Judul prestasi" />
          </div>

          {/* Peringkat + Tingkat */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Peringkat</label>
              <input type="text" list="rank-suggestions" maxLength={60}
                value={form.rank_label}
                onChange={(e) => setForm({ ...form, rank_label: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
                placeholder="mis. Juara 1, Medali Emas" />
              <datalist id="rank-suggestions">
                {rankSuggestions.map((r) => <option key={r} value={r} />)}
              </datalist>
              <p className="mt-1 text-xs text-slate-400">Opsional — peringkat atau medali.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tingkat</label>
              <div className="flex flex-wrap gap-2">
                {ACHIEVEMENT_LEVELS.map((lvl) => (
                  <button key={lvl} type="button"
                    onClick={() => setForm({ ...form, level: form.level === lvl ? "" : lvl })}
                    aria-pressed={form.level === lvl}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                      form.level === lvl
                        ? "border-[#f4d21f] bg-[#f4d21f]/20 text-[#7a6600] shadow-sm"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}>
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">Klik sekali lagi untuk mengosongkan.</p>
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENT_CATEGORIES.map((cfg) => (
                <button key={cfg.key} type="button" onClick={() => setForm({ ...form, category: cfg.key })}
                  aria-pressed={form.category === cfg.key}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    form.category === cfg.key
                      ? `${cfg.color} border-current shadow-sm`
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tahun */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tahun</label>
            <input type="number" inputMode="numeric" value={form.year} min={2000} max={2100}
              onChange={(e) => { setForm({ ...form, year: e.target.value }); if (yearError) setYearError(""); }}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                yearError
                  ? "border-red-300 text-red-700 focus:border-red-400 focus:ring-red-100"
                  : "border-slate-200 focus:border-[#1767b1] focus:ring-[#1767b1]/20"
              }`}
              placeholder="mis. 2026" />
            {yearError && <p className="mt-1 text-xs font-medium text-red-600">{yearError}</p>}
          </div>

          {/* Peraih */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Peraih</label>
            <input type="text" value={form.participants}
              onChange={(e) => setForm({ ...form, participants: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
              placeholder="mis. Ahmad Fauzi, Budi Santoso" />
            <p className="mt-1 text-xs text-slate-400">Pisahkan dengan koma bila lebih dari satu.</p>
          </div>

          {/* Penyelenggara / Lomba */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Penyelenggara / Lomba</label>
            <input type="text" value={form.organizer}
              onChange={(e) => setForm({ ...form, organizer: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
              placeholder="mis. FLS2N tingkat kabupaten" />
          </div>

          {/* Gambar — pola dropzone form berita (klik, seret-lepas, Ctrl+V) */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Gambar</label>
            {imagePreview ? (
              <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200">
                <img src={imagePreview} alt={form.image_alt || "Pratinjau gambar"} className="h-40 w-full object-cover" />
                <button onClick={() => { revokePreview(); setImageFile(null); setImagePreview(""); setForm({ ...form, image_url: "" }); }}
                  className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="achievement-image-input"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("border-[#1767b1]", "bg-[#1767b1]/5"); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("border-[#1767b1]", "bg-[#1767b1]/5"); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove("border-[#1767b1]", "bg-[#1767b1]/5");
                  const file = e.dataTransfer.files?.[0];
                  if (file) await applyImageFile(file);
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
                <input id="achievement-image-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
            <p className="mt-2 text-xs text-slate-400">Disarankan rasio 16:9 (mis. 1280x720) agar tidak terpotong.</p>
          </div>

          {/* Teks alternatif gambar */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Teks alternatif gambar</label>
            <input type="text" maxLength={125} value={form.image_alt}
              onChange={(e) => setForm({ ...form, image_alt: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
              placeholder="Deskripsi singkat isi gambar" />
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">Untuk poster yang berisi teks, tuliskan isi pentingnya di sini.</p>
              <span className={`text-[11px] ${form.image_alt.length >= 125 ? "text-amber-600" : "text-slate-400"}`}>
                {form.image_alt.length}/125
              </span>
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 resize-none"
              placeholder="Deskripsi prestasi (opsional)" />
            <p className="mt-1 text-right text-[11px] text-slate-400">{form.description.length} karakter</p>
          </div>

          {/* Unggulan */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Star weight="fill" className="h-4 w-4 text-[#f4d21f]" /> Tampilkan sebagai unggulan
              </p>
              <p className="text-xs text-slate-400">
                Tampil di bagian Unggulan paling atas halaman prestasi (maks {MAX_FEATURED} aktif).
              </p>
            </div>
            <button type="button" onClick={toggleFeatured} aria-pressed={form.is_featured}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_featured ? "bg-[#1767b1]" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_featured ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </SlideOver>

      {/* ── KONFIRMASI TUTUP TANPA SIMPAN ───────────── */}
      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => { setConfirmClose(false); closeForm(); }}
        title="Perubahan belum disimpan?"
        description="Tutup tanpa menyimpan?"
        confirmLabel="Tutup Tanpa Simpan"
        variant="warning"
      />
    </div>
  );
}
