"use client";

import { useAdminBottomBar } from "@/app/admin/AdminChrome";

import Image from "next/image";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getActivityListAll,
  createActivity,
  updateActivity,
  deleteActivity,
  deleteActivityBulk,
  togglePublishActivity,
  togglePublishActivityBulk,
  uploadActivityImage,
  revalidateActivities,
} from "@/lib/queries";
import {
  ACTIVITY_TYPES,
  activityTypeBadge,
  activityTypeLabel,
  formatActivityDateRange,
  toJakartaDateKey,
  todayInJakarta,
} from "@/lib/activity-types";
import { compressImage } from "@/lib/compress-image";
import { RichContent } from "@/components/RichContent";
import CoverImage from "@/components/CoverImage";
import { VideoProviderChip } from "@/components/admin/VideoUrlField";
import { Modal, ConfirmModal, SlideOver, RichTextEditor, SkeletonBlock } from "@/components/ui";
import AiFillPanel from "@/components/admin/AiFillPanel";
import type { RefineData } from "@/lib/queries/ai";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import type { Activity } from "@/lib/supabase";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { normalizeName } from "@/lib/format-name";
import {
  CalendarBlank,
  Eye,
  CheckCircle,
  Clock,
  X,
  XCircle,
  MapPin,
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
  Checks,
  Star,
  Copy,
  Phone,
  Tag,
  Users,
} from "@/components/Icons";
import { useToast } from "@/components/ui/Toast";
import {
  MobileFilterBar,
  MobilePagination,
  MobilePickButton,
  MobileListRow,
  MobileSelectBar,
  LongPressHint,
  SelectionMark,
  RowActionsMenu,
  MobileThumb,
  QuietBadge,
  type RowAction,
} from "@/components/admin/mobile";
import { DesktopPagination } from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";

// PAGE_SIZE moved to state

type SortField = "created_at" | "title" | "activity_date" | "activity_type";
type SortDir = "asc" | "desc";

interface FormData {
  title: string;
  description: string;
  content: string;
  activity_date: string;
  end_date: string;
  activity_type: string;
  activity_time: string;
  live_url: string;
  video_url: string;
  registration_url: string;
  contact_person: string;
  location: string;
  image_url: string;
  is_published: boolean;
  is_featured: boolean;
}

const emptyForm: FormData = {
  title: "",
  description: "",
  content: "",
  activity_date: todayInJakarta(),
  end_date: "",
  activity_type: "umum",
  activity_time: "",
  live_url: "",
  video_url: "",
  registration_url: "",
  contact_person: "",
  location: "",
  image_url: "",
  is_published: false,
  is_featured: false,
};

export default function AdminActivitiesPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy.ts/RLS (lihat PermissionsProvider).
  const permCreate = can("kegiatan:create");
  const permUpdate = can("kegiatan:update");
  const permDelete = can("kegiatan:delete");
  const permPublish = can("kegiatan:publish");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile): checkbox menggantikan nomor, tap baris = toggle,
  // bar aksi massal sticky di bawah. Desktop tetap pakai checkbox tabel.
  const [pickMode, setPickMode] = useState(false);
  useAdminBottomBar(pickMode);

  // Modals
  const [viewItem, setViewItem] = useState<Activity | null>(null);
  const [deleteItem, setDeleteItem] = useState<Activity | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  // Terbitkan ke publik (dari menu ⋯ mobile) selalu lewat konfirmasi singkat.
  const [publishItem, setPublishItem] = useState<Activity | null>(null);

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Activity | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  // Terisi bila field diisi panel AI → kegiatan baru ditandai source="panel-ai".
  const [aiAssisted, setAiAssisted] = useState(false);

  // Fetch
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getActivityListAll();
      setActivities(data as Activity[]);
    } catch {
      // Query gagal → tampil EmptyState "Gagal memuat", BUKAN daftar kosong palsu.
      setLoadError("Gagal memuat kegiatan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchActivities();
    })().catch(() => {});
  }, [fetchActivities]);

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
    const result = activities.filter((item) => {
      const matchSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()) ||
        item.location?.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        (filter === "published" && item.is_published) ||
        (filter === "draft" && !item.is_published);
      const matchType = typeFilter === "all" || item.activity_type === typeFilter;
      return matchSearch && matchFilter && matchType;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "activity_type") cmp = (a.activity_type || "").localeCompare(b.activity_type || "");
      else if (sortField === "activity_date") cmp = new Date(a.activity_date || 0).getTime() - new Date(b.activity_date || 0).getTime();
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [activities, search, filter, typeFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: activities.length,
    published: activities.filter((a) => a.is_published).length,
    draft: activities.filter((a) => !a.is_published).length,
    // Akan datang = tayang & belum selesai (end_date bila ada, else mulai) hari ini WIB.
    upcoming: activities.filter((a) => {
      const k = toJakartaDateKey(a.end_date || a.activity_date);
      return a.is_published && k !== null && k >= todayInJakarta();
    }).length,
    thisMonth: activities.filter((a) => {
      const d = new Date(a.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  const allVisibleSelected = paginated.length > 0 && paginated.every((item) => selectedIds.has(item.id));

  // Opsi dropdown filter — dipakai toolbar desktop (FilterBar) & mobile
  // (MobileFilterBar) agar label & jumlah di kedua versi selalu seragam.
  const statusOptions = useMemo(
    () => [
      { key: "all", label: "Semua", count: activities.length },
      { key: "published", label: "Diterbitkan", count: stats.published },
      { key: "draft", label: "Draft", count: stats.draft },
    ],
    [activities.length, stats.published, stats.draft]
  );

  const typeOptions = useMemo(
    () => [
      { key: "all", label: "Semua Tipe" },
      ...Object.values(ACTIVITY_TYPES).map((cfg) => ({
        key: cfg.key,
        label: cfg.label,
        count: activities.filter((a) => a.activity_type === cfg.key).length,
      })),
    ],
    [activities]
  );

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
    setAiAssisted(false);
    setFormOpen(true);
  }

  function openEdit(item: Activity) {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description || "",
      content: item.content || "",
      activity_date: toJakartaDateKey(item.activity_date) ?? "",
      end_date: toJakartaDateKey(item.end_date) ?? "",
      activity_type: item.activity_type,
      activity_time: item.activity_time || "",
      live_url: item.live_url || "",
      video_url: item.video_url || "",
      registration_url: item.registration_url || "",
      contact_person: item.contact_person || "",
      location: item.location || "",
      image_url: item.image_url || "",
      is_published: item.is_published,
      is_featured: item.is_featured || false,
    });
    setImageFile(null);
    setImagePreview(item.image_url || "");
    setFormError("");
    setAiAssisted(false);
    setFormOpen(true);
  }

  // ── Panel isi-otomatis AI ──
  /** Isi form hasil AI (summary→description); tipe "umum" hasil fallback tidak menimpa pilihan user. */
  function applyAiFields(f: RefineData) {
    setForm((prev) => ({
      ...prev,
      title: f.title || prev.title,
      description: f.summary || prev.description,
      content: f.content || prev.content,
      activity_type: f.activity_type && f.activity_type !== "umum" ? f.activity_type : prev.activity_type,
      location: f.location || prev.location,
      activity_date: f.activity_date || prev.activity_date,
    }));
    setAiAssisted(true);
  }

  /** Undo: kembalikan field ke nilai sebelum ditimpa AI. */
  function restoreAiSnapshot(s: Record<string, string>) {
    setForm((prev) => ({
      ...prev,
      title: s.title ?? prev.title,
      description: s.description ?? prev.description,
      content: s.content ?? prev.content,
      activity_type: s.activity_type ?? prev.activity_type,
      location: s.location ?? prev.location,
      activity_date: s.activity_date ?? prev.activity_date,
    }));
    setAiAssisted(false);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch {
      toast("Gagal memproses gambar. Pastikan file tidak rusak dan berformat JPG/PNG/WebP.", "error");
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Judul wajib diisi."); return; }
    if (form.end_date && form.activity_date && form.end_date < form.activity_date) {
      setFormError("Tanggal selesai tidak boleh sebelum tanggal mulai."); return;
    }
    const invalidUrl = (v: string) => !!v.trim() && !/^https?:\/\/\S+/i.test(v.trim());
    if (invalidUrl(form.registration_url)) { setFormError("Tautan pendaftaran harus diawali http:// atau https://"); return; }
    if (invalidUrl(form.live_url)) { setFormError("Tautan siaran harus diawali http:// atau https://"); return; }
    if (invalidUrl(form.video_url)) { setFormError("Tautan video harus diawali http:// atau https://"); return; }
    setFormSaving(true);
    setFormError("");

    let imageUrl = form.image_url;
    if (imageFile) {
      const tempId = editItem?.id || (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
      const uploaded = await uploadActivityImage(imageFile, tempId);
      if (!uploaded.url) {
        setFormError(uploaded.error || "Gagal mengunggah gambar kegiatan.");
        setFormSaving(false);
        return;
      }
      imageUrl = uploaded.url;
    }

    if (editItem) {
      const { data, error } = await updateActivity(editItem.id, { ...form, image_url: imageUrl });
      if (error) { setFormError(error); setFormSaving(false); return; }
      toast("Kegiatan berhasil diperbarui", "success");
      // Revalidasi slug baru + slug lama bila slug berubah (URL lama ikut segar)
      const oldSlug = editItem.slug && data?.slug && editItem.slug !== data.slug ? editItem.slug : undefined;
      // Tunggu revalidasi selesai, lalu buka tab preview bila sudah dipublish
      await revalidateActivities(data?.slug, oldSlug).catch(() => {});
      if (form.is_published && data?.slug) {
        setTimeout(() => window.open(`/activities/${data.slug}`, "_blank"), 300);
      }
    } else {
      const { data, error } = await createActivity(
        aiAssisted
          ? { ...form, image_url: imageUrl, source: "panel-ai" }
          : { ...form, image_url: imageUrl }
      );
      if (error) { setFormError(error); setFormSaving(false); return; }
      toast("Kegiatan berhasil dibuat", "success");
      // Tunggu revalidasi selesai, lalu buka tab preview bila sudah dipublish
      await revalidateActivities(data?.slug).catch(() => {});
      if (form.is_published && data?.slug) {
        setTimeout(() => window.open(`/activities/${data.slug}`, "_blank"), 300);
      }
    }

    setFormOpen(false);
    setFormSaving(false);
    fetchActivities();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    const slug = deleteItem.slug;
    const { error } = await deleteActivity(deleteItem.id);
    if (error) { toast(`Gagal menghapus kegiatan: ${error}`, "error"); return; }
    toast("Kegiatan berhasil dihapus", "success");
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchActivities();
    revalidateActivities(slug).catch(() => {});
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    // Kumpulkan slug SEBELUM dihapus (untuk revalidasi)
    const slugs = ids.map(id => activities.find(a => a.id === id)?.slug).filter(Boolean) as string[];
    const { error } = await deleteActivityBulk(ids);
    if (error) { toast(`Gagal menghapus: ${error}`, "error"); return; }
    toast(`${ids.length} kegiatan berhasil dihapus`, "success");
    exitPickMode();
    setBulkDelete(false);
    fetchActivities();
    slugs.forEach(slug => revalidateActivities(slug).catch(() => {}));
  }

  async function handleBulkPublish(publish: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const slugs = ids.map(id => activities.find(a => a.id === id)?.slug).filter(Boolean) as string[];
    const { error } = await togglePublishActivityBulk(ids, publish);
    if (error) { toast(`Gagal mengubah status: ${error}`, "error"); return; }
    toast(`${ids.length} kegiatan ${publish ? "diterbitkan" : "draft"}`, "success");
    exitPickMode();
    fetchActivities();
    slugs.forEach(slug => revalidateActivities(slug).catch(() => {}));
  }

  async function handleTogglePublish(item: Activity) {
    const { error } = await togglePublishActivity(item.id, !item.is_published);
    if (error) { toast(`Gagal mengubah status: ${error}`, "error"); return; }
    toast(`Kegiatan ${!item.is_published ? "diterbitkan" : "draft"}`, "success");
    fetchActivities();
    revalidateActivities(item.slug).catch(() => {});
  }

  /* Menu ⋯ mobile: Terbitkan = konfirmasi singkat (publikasi ke publik),
     Jadikan Draft = langsung (menurunkan dari publik tidak berisiko). */
  function requestPublish(item: Activity) {
    if (item.is_published) {
      handleTogglePublish(item).catch(() => {});
    } else {
      setPublishItem(item);
    }
  }

  // Duplikat → salinan DRAFT (tanpa gambar; unggah ulang bila perlu), lalu buka editor.
  async function handleDuplicate(item: Activity) {
    const { data, error } = await createActivity({
      title: `${item.title} (Salinan)`,
      description: item.description || "",
      content: item.content || "",
      activity_date: toJakartaDateKey(item.activity_date) || todayInJakarta(),
      end_date: toJakartaDateKey(item.end_date),
      activity_type: item.activity_type,
      location: item.location || "",
      image_url: "",
      is_published: false,
      activity_time: item.activity_time || "",
      live_url: item.live_url || "",
      video_url: item.video_url || "",
      registration_url: item.registration_url || "",
      contact_person: item.contact_person || "",
      is_featured: false,
    });
    if (error) { toast(`Gagal menduplikat: ${error}`, "error"); return; }
    toast("Salinan dibuat sebagai draft — unggah gambar baru bila perlu", "success");
    fetchActivities();
    if (data) openEdit(data);
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <SortAscending className="h-3 w-3 text-slate-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-[var(--brand-accent)]" />
      : <ArrowDown className="h-3 w-3 text-[var(--brand-accent)]" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <CalendarBlank className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola Kegiatan</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">Kegiatan sekolah (kajian, peringatan, lomba, dll)</p>
          </div>
        </div>
        {permCreate && (
          <button onClick={openCreate} className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)]">
            <Plus className="h-4 w-4" /> Buat Baru
          </button>
        )}
      </div>

      {/* Stats — StatPillGroup: pill kompak satu baris */}
      <StatPillGroup>
        <StatPill icon={Users} label="Total" value={stats.total} tone="neutral" />
        <StatPill icon={CheckCircle} label="Diterbitkan" value={stats.published} tone="success" />
        <StatPill icon={Warning} label="Draft" value={stats.draft} tone="warning" />
        <StatPill icon={Star} label="Akan Datang" value={stats.upcoming} tone="purple" />
        <StatPill icon={CalendarBlank} label="Bulan Ini" value={stats.thisMonth} tone="info" />
      </StatPillGroup>

      {/* Bulk actions — desktop; mobile memakai bar sticky saat mode pilih */}
      {selectedIds.size > 0 && (
        <div className="mb-4 hidden items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex md:flex-nowrap md:overflow-x-auto">
          <Checks className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
          <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          {permPublish && (
            <>
              <button onClick={() => handleBulkPublish(true)} aria-label={`Terbitkan ${selectedIds.size} kegiatan terpilih`} className="whitespace-nowrap rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Publish</button>
              <button onClick={() => handleBulkPublish(false)} aria-label={`Kembalikan ${selectedIds.size} kegiatan ke draft`} className="whitespace-nowrap rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600">Unpublish</button>
            </>
          )}
          {permDelete && <button onClick={() => setBulkDelete(true)} aria-label={`Hapus ${selectedIds.size} kegiatan terpilih`} className="whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Hapus</button>}
          <button onClick={() => setSelectedIds(new Set())} aria-label="Hapus pilihan" title="Hapus pilihan" className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter + Search (desktop md+) — gaya Portal: pencarian di kiri,
          status & tipe sebagai pill dropdown berjumlah di kanan. */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari judul, lokasi..."
          searchLabel="Cari judul atau lokasi"
          query={search}
          onQueryChange={(v) => { setSearch(v); setPage(1); }}
          filters={[
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
              menuLabel: "Filter status",
            },
            {
              value: typeFilter,
              options: typeOptions,
              onChange: (k) => { setTypeFilter(k); setPage(1); setSelectedIds(new Set()); },
              menuLabel: "Filter tipe kegiatan",
              icon: <Tag className="h-4 w-4" />,
            },
          ]}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian + filter status + filter tipe + urut + Pilih */}
      <MobileFilterBar
        placeholder="Cari judul, lokasi…"
        searchLabel="Cari judul atau lokasi"
        query={search}
        onQueryChange={(v) => { setSearch(v); setPage(1); }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
        }}
        filter2={{
          value: typeFilter,
          options: typeOptions,
          onChange: (k) => { setTypeFilter(k); setPage(1); setSelectedIds(new Set()); },
        }}
        sort={{
          value: `${sortField}:${sortDir}`,
          options: [
            { key: "created_at:desc", label: "Terbaru" },
            { key: "created_at:asc", label: "Terlama" },
            { key: "title:asc", label: "Judul A–Z" },
            { key: "title:desc", label: "Judul Z–A" },
            { key: "activity_date:asc", label: "Terdekat" },
            { key: "activity_date:desc", label: "Terjauh" },
            { key: "activity_type:asc", label: "Tipe A–Z" },
          ],
          onChange: (k) => {
            const [f, d] = k.split(":");
            setSortField(f as SortField);
            setSortDir(d as SortDir);
          },
        }}
        action={(permPublish || permDelete) ? <MobilePickButton onClick={() => setPickMode(true)} /> : undefined}
        selectMode={pickMode}
        selectedCount={selectedIds.size}
        allSelected={allVisibleSelected}
        onSelectAllVisible={toggleSelectAll}
      />

      {/* Tabel desktop (md+) — tampilan & perilaku sama seperti sebelumnya */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1040px]">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                {/* hidden sm:table-cell — checkbox & No hanya untuk tablet/desktop; di
                bawah 640px sisa kolom biar lega, sama seperti
                agenda/teachers/users/announcements/facilities. */}
                <th className="hidden w-12 px-2 py-3 text-center md:table-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                </th>
                <th className="hidden w-10 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">No</th>
                <th className="w-[22%] cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none" onClick={() => toggleSort("title")}>
                  <span className="flex items-center gap-1">Judul {sortIcon("title")}</span>
                </th>
                <th className="hidden w-36 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("activity_type")}>
                  <span className="flex items-center justify-center gap-1">Tipe {sortIcon("activity_type")}</span>
                </th>
                <th className="hidden w-48 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("activity_date")}>
                  <span className="flex items-center justify-center gap-1">Tanggal {sortIcon("activity_date")}</span>
                </th>
                <th className="hidden w-44 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">Lokasi</th>
                <th className="w-24 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Status</th>
                <th className="w-28 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data kegiatan...</p>
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
                    <button onClick={() => fetchActivities()} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                      Coba lagi
                    </button>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <CalendarBlank className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {search || typeFilter !== "all" || filter !== "all" ? "Coba ubah kata kunci atau filter" : "Belum ada kegiatan"}
                      </p>
                    </div>
                    {!search && filter === "all" && typeFilter === "all" && permCreate && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                        <Plus className="h-3.5 w-3.5" /> Buat Kegiatan Pertama
                      </button>
                    )}
                  </div>
                </td></tr>
              ) : (
                paginated.map((item, index) => (
                  <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[var(--brand-primary)]/[0.03]" : ""}`}>
                    <td className="hidden w-12 px-2 py-3.5 text-center md:table-cell" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-400 sm:table-cell">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => setViewItem(item)}>
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <Image src={item.image_url} alt="" width={40} height={40} className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <CalendarBlank className="h-5 w-5 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                            {item.is_featured && (
                              <span className="shrink-0 text-[#f4d21f]" title="Kegiatan unggulan">
                                <Star className="h-3.5 w-3.5" weight="fill" />
                              </span>
                            )}
                            <span className="truncate" title={item.title}>{item.title}</span>
                          </p>
                          {item.description && <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-center sm:table-cell">
                      <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${activityTypeBadge(item.activity_type)}`}>
                        {activityTypeLabel(item.activity_type)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 text-center text-sm text-slate-500 md:table-cell whitespace-nowrap">
                      {formatActivityDateRange(item.activity_date, item.end_date) || "-"}
                      {item.activity_time && (
                        <p className="mt-0.5 text-[11px] text-slate-400">{item.activity_time}</p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3.5 text-left text-sm text-slate-500 lg:table-cell">
                      <p className="line-clamp-2 max-w-[200px]" title={item.location || undefined}>
                        {item.location || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {/* `title` di wrapper: tombol disabled ber-`pointer-events: none`
                          sehingga tooltip pada tombolnya tidak akan muncul. */}
                      <span title={permPublish ? undefined : "Tidak berizin menerbitkan"} className="inline-flex">
                      <button onClick={() => handleTogglePublish(item)} disabled={!permPublish}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          item.is_published
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        }`}>
                        {item.is_published ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {item.is_published ? "Publish" : "Draft"}
                      </button>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewItem(item)} aria-label={`Lihat ${item.title}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Lihat">
                          <Eye className="h-4 w-4" />
                        </button>
                        {permUpdate && (
                          <button onClick={() => openEdit(item)} aria-label={`Edit ${item.title}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                            <PencilSimple className="h-4 w-4" />
                          </button>
                        )}
                        {permCreate && (
                          <button onClick={() => handleDuplicate(item)} aria-label={`Duplikat ${item.title}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600" title="Duplikat (salinan draft)">
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        {permDelete && (
                          <button onClick={() => setDeleteItem(item)} aria-label={`Hapus ${item.title}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
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
            itemLabel="kegiatan"
          />
        )}

      </div>

      {/* Daftar mobile (<md) — baris ringkas tanpa scroll horizontal; semua
          fitur tetap ada: pilih (mode pilih), lihat, edit, duplikat & hapus
          via menu ⋯, Publish/Draft lewat menu ⋯ (bukan pill sekali ketuk). */}
      <LongPressHint />
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <div role="list" aria-label="Daftar kegiatan">
          {loading ? (
            <div className="space-y-3 px-3 py-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-12 w-12 rounded-lg" />
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
              <button onClick={() => fetchActivities()} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
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
                <p className="mt-1 text-xs text-slate-400">
                  {search || typeFilter !== "all" || filter !== "all" ? "Coba ubah kata kunci atau filter" : "Belum ada kegiatan"}
                </p>
              </div>
              {!search && filter === "all" && typeFilter === "all" && permCreate && (
                <button onClick={openCreate} className="mt-1 flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                  <Plus className="h-3.5 w-3.5" /> Buat Kegiatan Pertama
                </button>
              )}
            </div>
          ) : (
            paginated.map((item) => (
              <ActivityMobileRow
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                selectMode={pickMode}
                onEnterPickMode={enterPickMode}
                onToggleSelect={toggleSelect}
                onView={setViewItem}
                onEdit={openEdit}
                onDuplicate={handleDuplicate}
                onDelete={setDeleteItem}
                onPublish={requestPublish}
                canEdit={permUpdate}
                canDuplicate={permCreate}
                canDelete={permDelete}
                canPublish={permPublish}
              />
            ))
          )}
        </div>
        {!loading && filtered.length > 0 && (
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
            itemLabel="kegiatan"
          />
        )}
      </div>
      {pickMode && (
        <MobileSelectBar
          count={selectedIds.size}
          onDelete={permDelete ? () => setBulkDelete(true) : undefined}
          onCancel={exitPickMode}
        >
          {permPublish && (
            <button
              type="button"
              onClick={() => handleBulkPublish(true)}
              disabled={selectedIds.size === 0}
              className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
            >
              Terbitkan
            </button>
          )}
          {permPublish && (
            <button
              type="button"
              onClick={() => handleBulkPublish(false)}
              disabled={selectedIds.size === 0}
              className="min-h-10 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
            >
              Draft
            </button>
          )}
        </MobileSelectBar>
      )}

      {/* ── VIEW MODAL ──────────────────────────────── */}
      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.title}
        description={viewItem ? `${activityTypeLabel(viewItem.activity_type)} · ${viewItem.is_published ? "Published" : "Draft"}` : undefined}
        footer={
          <>
            {permUpdate && (
              <button onClick={() => { setViewItem(null); openEdit(viewItem!); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:flex-none">
                <PencilSimple className="h-4 w-4" /> Edit
              </button>
            )}
            {viewItem && (permCreate || permDelete) && (
              <div className="flex shrink-0 md:hidden">
                <RowActionsMenu
                  label={viewItem.title}
                  actions={[
                    ...(permCreate
                      ? [{ key: "duplicate", label: "Duplikat", icon: <Copy className="h-4 w-4" />, run: () => handleDuplicate(viewItem) } as RowAction]
                      : []),
                    ...(permDelete
                      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => { setViewItem(null); setDeleteItem(viewItem); } } as RowAction]
                      : []),
                  ]}
                />
              </div>
            )}
            {viewItem && viewItem.is_published ? (
              <a href={`/activities/${viewItem.slug}`} target="_blank" rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] md:flex-none">
                <Eye className="h-4 w-4" /> Lihat di Website
              </a>
            ) : (
              /* Draft tidak bisa diakses publik (filter is_published) → tombol nonaktif */
              <span aria-disabled="true" title="Terbitkan kegiatan dulu untuk melihatnya di website"
                className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400 md:flex-none">
                <Eye className="h-4 w-4" /> Pratinjau tidak tersedia untuk draft
              </span>
            )}
          </>
        }
      >
        {viewItem?.image_url && (
          <div className="mb-4 -mx-5 -mt-5 overflow-hidden md:-mx-6">
            {/* Rasio asli — poster portrait tampil utuh + latar blur */}
            <CoverImage src={viewItem.image_url} alt={viewItem.title} />
          </div>
        )}
        {viewItem && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {viewItem.location || "Lokasi tidak ditentukan"}
              </span>
              <span className="flex items-center gap-1">
                <CalendarBlank className="h-3.5 w-3.5" />
                {formatActivityDateRange(viewItem.activity_date, viewItem.end_date, { long: true }) || "-"}
              </span>
              {viewItem.activity_time && (
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{viewItem.activity_time}</span>
              )}
              {viewItem.video_url && (
                <VideoProviderChip url={viewItem.video_url} />
              )}
              {viewItem.is_featured && (
                <span className="flex items-center gap-1 font-semibold text-slate-600">
                  <Star className="h-3.5 w-3.5 text-[#f4d21f]" weight="fill" /> Unggulan
                </span>
              )}
            </div>
            {viewItem.contact_person && (
              <p className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
                <Phone className="h-3.5 w-3.5" /> {normalizeName(viewItem.contact_person)}
              </p>
            )}
            {viewItem.description && <p className="mb-4 text-sm text-slate-600 italic border-l-2 border-[#f4d21f] pl-3">{viewItem.description}</p>}
            <RichContent content={viewItem.content} emptyHint="Tidak ada konten" />
          </>
        )}
      </Modal>

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Kegiatan?"
        description={`"${deleteItem?.title}" dipindahkan ke Sampah — hilang permanen setelah 30 hari.`}
      />

      {/* ── PUBLISH CONFIRM (menu ⋯ mobile) ─────────── */}
      <ConfirmModal
        open={!!publishItem}
        onClose={() => setPublishItem(null)}
        onConfirm={() => {
          const it = publishItem;
          setPublishItem(null);
          if (it) handleTogglePublish(it).catch(() => {});
        }}
        title="Terbitkan Kegiatan?"
        description={`"${publishItem?.title}" akan tampil di website untuk publik.`}
        confirmLabel="Ya, Terbitkan"
        variant="warning"
      />

      {/* ── BULK DELETE CONFIRM ─────────────────────── */}
      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Kegiatan?`}
        description="Semua kegiatan yang dipilih dipindahkan ke Sampah — hilang permanen setelah 30 hari."
      />

      {/* ── CREATE/EDIT FORM PANEL ──────────────────── */}
      <SlideOver
        open={formOpen}
        onClose={() => !formSaving && setFormOpen(false)}
        title={editItem ? "Edit Kegiatan" : "Buat Kegiatan Baru"}
        description={editItem ? "Perbarui informasi kegiatan" : "Isi form untuk membuat kegiatan"}
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
          {/* Isi otomatis AI — tempel catatan mentah → field terisi; di mode
              edit tampil juga (nimpa isi lama setelah konfirmasi, ada Undo). */}
          <AiFillPanel
            target="activities"
            current={{
              title: form.title,
              description: form.description,
              content: form.content,
              activity_type: form.activity_type,
              location: form.location,
              activity_date: form.activity_date,
            }}
            hasContent={!!form.title.trim() || !!form.description.trim() || !!form.content.trim()}
            onApply={applyAiFields}
            onRestore={restoreAiSnapshot}
            disabled={formSaving}
          />
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Judul <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              placeholder="Judul kegiatan" />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tipe</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(ACTIVITY_TYPES).map((cfg) => (
                <button key={cfg.key} type="button" onClick={() => setForm({ ...form, activity_type: cfg.key })}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    form.activity_type === cfg.key
                      ? `${activityTypeBadge(cfg.key)} border-current shadow-sm`
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tanggal mulai + selesai (selesai opsional — kegiatan multi-hari) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tanggal Mulai</label>
              <input type="date" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tanggal Selesai <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <input type="date" value={form.end_date} min={form.activity_date || undefined}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
              <p className="mt-1 text-xs text-slate-400">Untuk kegiatan multi-hari; kosongkan bila sehari.</p>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Lokasi</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              placeholder="Contoh: Masjid Sekolah" />
          </div>

          {/* Waktu + Tautan Siaran (Fase 5 — kolom opsional) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Waktu <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <input type="text" value={form.activity_time} onChange={(e) => setForm({ ...form, activity_time: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
                placeholder="Contoh: 19.30 WIB - Selesai" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tautan Siaran Langsung <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <input type="url" value={form.live_url} onChange={(e) => setForm({ ...form, live_url: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
                placeholder="https://www.instagram.com/..." />
            </div>
          </div>

          {/* Link Video (opsional) — rekaman/reel; embed click-to-load di halaman publik */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Link Video <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <input type="url" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              placeholder="https://www.youtube.com/watch?v=… / https://www.instagram.com/reel/… / https://www.tiktok.com/@…" />
            <p className="mt-1 text-xs text-slate-400">Video dari YouTube, Instagram, atau TikTok — tidak membebani penyimpanan</p>
            {form.video_url.trim() && <VideoProviderChip url={form.video_url} className="mt-2" />}
          </div>

          {/* Pendaftaran + Kontak Panitia (Fase 6 — kolom opsional) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tautan Pendaftaran <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <input type="url" value={form.registration_url} onChange={(e) => setForm({ ...form, registration_url: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
                placeholder="https://forms.gle/..." />
              <p className="mt-1 text-xs text-slate-400">Menampilkan tombol kuning &quot;Daftar Sekarang&quot; di detail.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Kontak Panitia <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <input type="text" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
                placeholder="Contoh: Bu Siti — 0812-3456-7890" />
              <p className="mt-1 text-xs text-slate-400">Tampil di sidebar &quot;Info Kegiatan&quot;.</p>
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Gambar Sampul</label>
            {imagePreview ? (
              <div className="mb-3">
                <div className="relative overflow-hidden rounded-xl border border-slate-200">
                  <Image src={imagePreview} alt="Preview" width={640} height={160} sizes="100%" unoptimized className="h-40 w-full object-cover" />
                  <button onClick={() => { setImageFile(null); setImagePreview(""); setForm({ ...form, image_url: "" }); }}
                    className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("border-[var(--brand-accent)]", "bg-[var(--brand-accent)]/5"); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("border-[var(--brand-accent)]", "bg-[var(--brand-accent)]/5"); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove("border-[var(--brand-accent)]", "bg-[var(--brand-accent)]/5");
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
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 transition-colors hover:border-[var(--brand-accent)]/40 hover:bg-slate-50"
              >
                {imageUploading ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-accent)] border-t-transparent" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
                <span className="text-xs text-slate-400">
                  {imageUploading ? "Mengkompresi gambar..." : "Klik, seret & lepas, atau Ctrl+V untuk paste gambar"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20 resize-none"
              placeholder="Ringkasan singkat kegiatan (opsional)" />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Konten</label>
            <RichTextEditor value={form.content} onChange={(val) => setForm({ ...form, content: val })} />
          </div>

          {/* Publish toggle */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Terbitkan Sekarang</p>
                <p className="text-xs text-slate-400">{form.is_published ? "Kegiatan akan langsung tampil di website" : "Kegiatan disimpan sebagai draft"}</p>
              </div>
              <button type="button" disabled={!permPublish}
                onClick={() => setForm({ ...form, is_published: !form.is_published })}
                aria-label="Terbitkan sekarang"
                title={permPublish ? undefined : "Tidak berizin menerbitkan"}
                className={`relative h-6 w-11 rounded-full transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[""] disabled:cursor-not-allowed disabled:opacity-50 ${form.is_published ? "bg-[var(--brand-accent)]" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_published ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Featured / Unggulan toggle (Fase 6) */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Star className="h-4 w-4 text-[#f4d21f]" weight="fill" /> Jadikan Unggulan
                </p>
                <p className="text-xs text-slate-400">Kartu besar di atas /activities. Tanpa pin → otomatis kegiatan terdekat.</p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, is_featured: !form.is_featured })}
                aria-label="Jadikan kegiatan unggulan"
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[""] ${form.is_featured ? "bg-[#f4d21f]" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_featured ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}

/**
 * Satu baris kegiatan versi mobile (<md): [thumb 56px + titik status] [badge
 * tipe + judul + tanggal·lokasi + badge "Draft"] [menu ⋯: Lihat, Edit,
 * Terbitkan/Jadikan Draft, Duplikat, Hapus]. Terbitkan minta konfirmasi
 * singkat; tidak ada pill Publish/Draft sekali ketuk. Tap baris = modal
 * lihat (padanan klik kolom Judul di desktop); long-press = mode pilih; di
 * mode pilih checkbox menggantikan thumb dan tap baris = toggle centang.
 * Tidak ada geser urutan — halaman ini memakai sortir kolom, dipindahkan ke
 * dropdown "Urut" di toolbar mobile.
 */
function ActivityMobileRow({
  item,
  selected,
  selectMode,
  onEnterPickMode,
  onToggleSelect,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onPublish,
  canEdit,
  canDuplicate,
  canDelete,
  canPublish,
}: {
  item: Activity;
  selected: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onView: (a: Activity) => void;
  onEdit: (a: Activity) => void;
  onDuplicate: (a: Activity) => void;
  onDelete: (a: Activity) => void;
  onPublish: (a: Activity) => void;
  canEdit: boolean;
  canDuplicate: boolean;
  canDelete: boolean;
  canPublish: boolean;
}) {
  const startKey = toJakartaDateKey(item.activity_date);
  const scheduled =
    item.is_published && startKey !== null && startKey > todayInJakarta();

  const actions: RowAction[] = [
    { key: "view", label: "Lihat", icon: <Eye className="h-4 w-4" />, run: () => onView(item) },
    ...(canEdit
      ? [{ key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => onEdit(item) } as RowAction]
      : []),
    ...(canPublish
      ? [{
          key: "publish",
          label: item.is_published ? "Jadikan Draft" : "Terbitkan",
          icon: item.is_published ? <Clock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
          run: () => onPublish(item),
        } as RowAction]
      : []),
    ...(canDuplicate
      ? [{ key: "duplicate", label: "Duplikat", icon: <Copy className="h-4 w-4" />, run: () => onDuplicate(item) } as RowAction]
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
            <SelectionMark selected={selected} />
          ) : undefined
        }
        thumb={
          <MobileThumb
            src={item.image_url}
            tint="sky"
            icon={<CalendarBlank className="h-5 w-5" />}
            status={
              !item.is_published
                ? { tone: "off", label: "Draft" }
                : scheduled
                  ? { tone: "pending", label: "Terjadwal" }
                  : { tone: "active", label: "Terbit" }
            }
          />
        }
        title={
          item.is_featured ? (
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 shrink-0 text-[#f4d21f]" weight="fill" />
              <span className="min-w-0">{item.title}</span>
            </span>
          ) : (
            item.title
          )
        }
        badge={!item.is_published ? <QuietBadge>Draft</QuietBadge> : undefined}
        subtitle={
          <>
            <span className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${activityTypeBadge(item.activity_type)}`}>
              {activityTypeLabel(item.activity_type)}
            </span>
            <span className="min-w-0 truncate">
              {formatActivityDateRange(item.activity_date, item.end_date) || "Tanpa tanggal"}
              {item.location ? ` · ${item.location}` : ""}
            </span>
          </>
        }
        actions={<RowActionsMenu label={item.title} actions={actions} disabled={selectMode} />}
        selected={selected}
        selectionMode={selectMode}
        onClick={() => {
          if (selectMode) onToggleSelect(item.id);
          else onView(item);
        }}
        onLongPress={() => onEnterPickMode(item.id)}
      />
    </div>
  );
}
