"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getFacilityListAll,
  createFacility,
  updateFacility,
  deleteFacility,
  deleteFacilityBulk,
  uploadFacilityImage,
  reorderFacilities,
  revalidateFacilities,
} from "@/lib/queries";
import { compressImage } from "@/lib/compress-image";
import { Modal, ConfirmModal, SlideOver, SkeletonBlock } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import type { Facility } from "@/lib/supabase";
import {
  ImageSquare,
  Eye,
  CheckCircle,
  Clock,
  X,
  FileText,
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
  DotsSixVertical,
  Copy,
  ArrowSquareOut,
  Info,
  Users,
  Building,
  XCircle,
} from "@/components/Icons";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import {
  MobileFilterBar,
  MobilePagination,
  MobilePickButton,
  MobileListRow,
  MobileSelectBar,
  RowActionsMenu,
  RowGrip,
  MobileThumb,
  QuietBadge,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";

const PAGE_SIZE = 10;

/** Kunci sumbu X saat drag mobile — baris hanya boleh bergeser vertikal. */
const lockY: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type SortField = "created_at" | "name" | "sort_order";
type SortDir = "asc" | "desc";

interface FormData {
  name: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm: FormData = {
  name: "",
  description: "",
  image_url: "",
  sort_order: 0,
  is_active: true,
};

export default function AdminFacilitiesPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy.ts/RLS (lihat PermissionsProvider).
  const permCreate = can("fasilitas:create");
  const permUpdate = can("fasilitas:update");
  const permDelete = can("fasilitas:delete");
  const permPublish = can("fasilitas:publish");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("sort_order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile): checkbox menggantikan handle, tap baris = toggle,
  // bar aksi massal sticky di bawah. Desktop tetap pakai checkbox tabel.
  const [pickMode, setPickMode] = useState(false);

  // Modals
  const [viewItem, setViewItem] = useState<Facility | null>(null);
  const [deleteItem, setDeleteItem] = useState<Facility | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  // Form panel
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Facility | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  // Bagian "Lanjutan" (input Urutan) — bisa dilipat
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Ref input file gambar — area unggah dipicu lewat klik/keyboard, bukan
  // hanya drag & drop (dulu klik area tidak membuka pemilih berkas).
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Sensor drag: pointer untuk seret, keyboard untuk aksesibilitas
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch
  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getFacilityListAll();
      setFacilities(data as Facility[]);
    } catch {
      // Query gagal → tampil EmptyState "Gagal memuat", BUKAN daftar kosong palsu.
      setLoadError("Gagal memuat fasilitas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchFacilities();
    })().catch(() => {});
  }, [fetchFacilities]);

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
    const result = facilities.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        (filter === "active" && item.is_active) ||
        (filter === "inactive" && !item.is_active);
      return matchSearch && matchFilter;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "sort_order") cmp = (a.sort_order || 0) - (b.sort_order || 0);
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [facilities, search, filter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Urutan hanya bermakna pada daftar penuh tanpa pencarian/filter dan saat
  // diurutkan menurut sort_order (pola sama dengan Kelola Portal).
  const dragDisabled =
    search.trim() !== "" ||
    filter !== "all" ||
    sortField !== "sort_order" ||
    sortDir !== "asc";

  const stats = {
    total: facilities.length,
    active: facilities.filter((f) => f.is_active).length,
    inactive: facilities.filter((f) => !f.is_active).length,
    withImage: facilities.filter((f) => f.image_url).length,
  };

  // Opsi dropdown status — dipakai toolbar desktop & mobile agar seragam.
  const statusOptions = [
    { key: "all", label: "Semua", count: stats.total },
    { key: "active", label: "Aktif", count: stats.active },
    { key: "inactive", label: "Nonaktif", count: stats.inactive },
  ];

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
    // Urutan default = sort_order terbesar + 10, supaya selalu masuk terakhir
    const maxOrder = facilities.reduce((m, f) => Math.max(m, f.sort_order || 0), 0);
    setForm({ ...emptyForm, sort_order: maxOrder + 10 });
    setImageFile(null);
    setImagePreview("");
    setFormError("");
    setAdvancedOpen(false);
    setFormOpen(true);
  }

  function openEdit(item: Facility) {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      image_url: item.image_url || "",
      sort_order: item.sort_order || 0,
      is_active: item.is_active,
    });
    setImageFile(null);
    setImagePreview(item.image_url || "");
    setFormError("");
    setAdvancedOpen(false);
    setFormOpen(true);
  }

  // ── Duplikat: buka form baru terisi salinan (belum disimpan), pola admin berita ──
  async function openDuplicate(item: Facility) {
    const maxOrder = facilities.reduce((m, f) => Math.max(m, f.sort_order || 0), 0);
    setViewItem(null);
    setEditItem(null);
    setForm({
      name: `${item.name} (Salinan)`,
      description: item.description || "",
      image_url: item.image_url || "",
      sort_order: maxOrder + 10,
      is_active: item.is_active,
    });
    setImagePreview(item.image_url || "");
    setImageFile(null);
    setFormError("");
    setAdvancedOpen(false);
    setFormOpen(true);

    // Salin gambar: unduh ulang jadi File agar ikut terunggah ke folder
    // fasilitas BARU (bukan menumpuk di folder lama). Bila gagal, tetap
    // pakai URL asli — salinan tetap bisa disimpan tanpa gambar baru.
    if (item.image_url) {
      try {
        const res = await fetch(item.image_url);
        const blob = await res.blob();
        if (blob.type.startsWith("image/") && blob.size > 0) {
          setImageFile(new File([blob], "gambar-salinan", { type: blob.type }));
        }
      } catch { /* fallback: pakai URL asli */ }
    }
  }

  // ── Drag & drop: simpan urutan baru ke kolom sort_order ──
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const previous = facilities;
    const oldIndex = filtered.findIndex((i) => i.id === active.id);
    const newIndex = filtered.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(filtered, oldIndex, newIndex).map((it, idx) => ({
      ...it,
      sort_order: idx + 1,
    }));
    setFacilities(reordered);

    reorderFacilities(reordered.map((it) => ({ id: it.id, sort_order: it.sort_order })))
      .then(({ error }) => {
        if (error) {
          setFacilities(previous);
          toast(`Gagal menyimpan urutan: ${error}`, "error");
          return;
        }
        toast("Urutan diperbarui", "success");
        revalidateFacilities().catch(() => {});
      });
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
    if (!form.name.trim()) { setFormError("Nama wajib diisi."); return; }
    setFormSaving(true);
    setFormError("");

    let imageUrl = form.image_url;
    if (imageFile) {
      const tempId = editItem?.id || (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
      const uploaded = await uploadFacilityImage(imageFile, tempId);
      if (!uploaded.url) {
        setFormError(uploaded.error || "Gagal mengunggah gambar fasilitas.");
        setFormSaving(false);
        return;
      }
      imageUrl = uploaded.url;
    }

    if (editItem) {
      const { error } = await updateFacility(editItem.id, { ...form, image_url: imageUrl || null });
      if (error) { setFormError(error); setFormSaving(false); return; }
      toast("Fasilitas berhasil diperbarui", "success");
    } else {
      const { error } = await createFacility({ ...form, image_url: imageUrl || null });
      if (error) { setFormError(error); setFormSaving(false); return; }
      toast("Fasilitas berhasil dibuat", "success");
    }

    // Segarkan ISR "/" dan "/profile" (fire-and-forget, pola sama dgn news)
    revalidateFacilities().catch(() => {});

    setFormOpen(false);
    setFormSaving(false);
    fetchFacilities();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    const { error } = await deleteFacility(deleteItem.id);
    if (error) {
      // Jangan tutup modal & jangan tampilkan sukses — biarkan bisa dicoba ulang
      toast(`Gagal menghapus: ${error}`, "error");
      return;
    }
    revalidateFacilities().catch(() => {});
    toast("Fasilitas berhasil dihapus", "success");
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchFacilities();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await deleteFacilityBulk(ids);
    if (error) {
      toast(`Gagal menghapus: ${error}`, "error");
      return;
    }
    revalidateFacilities().catch(() => {});
    toast(`${ids.length} fasilitas berhasil dihapus`, "success");
    exitPickMode();
    setBulkDelete(false);
    fetchFacilities();
  }

  async function handleToggleActive(item: Facility) {
    const next = !item.is_active;
    const { error } = await updateFacility(item.id, { is_active: next });
    if (error) {
      toast(`Gagal mengubah status: ${error}`, "error");
      return;
    }
    revalidateFacilities().catch(() => {});
    toast(`Fasilitas ${next ? "diaktifkan" : "dinonaktifkan"}`, "success");
    fetchFacilities();
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10">
            <ImageSquare className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola Fasilitas</h1>
            <p className="text-sm text-slate-500">Fasilitas sekolah (ruang kelas, lab, masjid, dll)</p>
          </div>
        </div>
        {/* Tombol header — SATU baris di semua ukuran layar: mobile keduanya
            berbagi lebar baris (flex-1, auto-fit), ≥sm lebar mengikuti konten. */}
        <div className="flex gap-2 sm:items-center">
          <a
            href="/profile#fasilitas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-primary)] sm:flex-none sm:px-4 md:py-2.5"
          >
            <ArrowSquareOut className="h-4 w-4 shrink-0" />
            <span className="truncate">Lihat di website</span>
          </a>
          {permCreate && (
            <button onClick={openCreate}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-3 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] sm:flex-none sm:px-4 md:py-2.5">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">Buat Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats — StatPillGroup: pill kompak satu baris */}
      <StatPillGroup>
        <StatPill icon={Users} label="Total" value={stats.total} tone="neutral" />
        <StatPill icon={CheckCircle} label="Aktif" value={stats.active} tone="success" />
        <StatPill icon={XCircle} label="Nonaktif" value={stats.inactive} tone="danger" />
        <StatPill icon={Building} label="Bergambar" value={stats.withImage} tone="info" />
      </StatPillGroup>

      {/* Bulk actions — desktop; mobile memakai bar sticky saat mode pilih */}
      {selectedIds.size > 0 && (
        <div className="mb-4 hidden flex-wrap items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex">
          <Checks className="h-4 w-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          {permDelete && <button onClick={() => setBulkDelete(true)} className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Hapus</button>}
          <button onClick={() => setSelectedIds(new Set())} aria-label="Hapus pilihan" title="Hapus pilihan" className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter + Search (desktop md+) — gaya Portal: pencarian di kiri,
          status sebagai pill dropdown berjumlah di kanan. */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari nama fasilitas..."
          searchLabel="Cari fasilitas"
          query={search}
          onQueryChange={(v) => { setSearch(v); setPage(1); }}
          filters={[
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
              menuLabel: "Filter status",
            },
          ]}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian penuh + dropdown filter/urut + Pilih */}
      <MobileFilterBar
        placeholder="Cari fasilitas…"
        searchLabel="Cari fasilitas"
        query={search}
        onQueryChange={(v) => { setSearch(v); setPage(1); }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
        }}
        sort={{
          value: `${sortField}:${sortDir}`,
          options: [
            { key: "sort_order:asc", label: "Urutan tampil" },
            { key: "name:asc", label: "Nama A–Z" },
            { key: "name:desc", label: "Nama Z–A" },
            { key: "created_at:desc", label: "Terbaru" },
          ],
          onChange: (k) => {
            const [f, d] = k.split(":");
            setSortField(f as SortField);
            setSortDir(d as SortDir);
          },
        }}
        action={<MobilePickButton onClick={() => setPickMode(true)} />}
        selectMode={pickMode}
        selectedCount={selectedIds.size}
        allSelected={allVisibleSelected}
        onSelectAllVisible={toggleSelectAll}
        onCancelSelect={exitPickMode}
      />
      {dragDisabled && (
        <p className="-mt-2 mb-3 flex items-start gap-1.5 text-[11px] text-slate-400 md:hidden">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          Urutan hanya bisa diubah saat menampilkan &quot;Semua&quot; tanpa pencarian dan diurut
          &quot;Urutan tampil&quot;.
        </p>
      )}

      {/* Tabel desktop (md+) — tampilan & perilaku sama seperti sebelumnya */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={paginated.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="overflow-x-auto">
              <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                {/* hidden sm:table-cell — di bawah 640px sisa kolom cuma punya
                    ±328px. Checkbox & Urutan (handle drag ada di dalamnya) adalah
                    afordansi desktop, sama seperti agenda/teachers/users/announcements.
                    Di ponsel tersisa Nama · Status · Aksi. */}
                <th className="hidden w-10 px-4 py-3 sm:table-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                </th>
                <th className="w-[30%] cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center gap-1">Nama {sortIcon("name")}</span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Deskripsi</th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none sm:table-cell" onClick={() => toggleSort("sort_order")}>
                  <span className="flex items-center justify-center gap-1">Urutan {sortIcon("sort_order")}</span>
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data fasilitas...</p>
                  </div>
                </td></tr>
              ) : loadError ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                      <XCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Gagal memuat data</p>
                    <p className="mt-0.5 text-xs text-slate-500">{loadError}</p>
                    <button onClick={() => fetchFacilities()} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                      Coba lagi
                    </button>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <ImageSquare className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada fasilitas"}</p>
                    </div>
                    {!search && filter === "all" && permCreate && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                        <Plus className="h-3.5 w-3.5" /> Tambah Fasilitas Pertama
                      </button>
                    )}
                  </div>
                </td></tr>
              ) : (
                paginated.map((item) => (
                  <SortableFacilityRow
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    dragDisabled={dragDisabled}
                    onToggleSelect={toggleSelect}
                    onView={setViewItem}
                    onEdit={openEdit}
                    onDelete={setDeleteItem}
                    onDuplicate={openDuplicate}
                    onToggleActive={handleToggleActive}
                    canEdit={permUpdate}
                    canDelete={permDelete}
                    canCreate={permCreate}
                    canToggle={permPublish}
                  />
                ))
              )}
            </tbody>
              </table>
            </div>
          </SortableContext>
        </DndContext>
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} fasilitas
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
          fitur tetap ada: pilih (mode pilih), urut (dropdown toolbar), aksi
          via menu ⋯, dan geser urutan lewat handle di kiri.
          Kartu: rounded-2xl border slate-200/70 (tanpa bayangan tebal);
          pemisah baris = border-t tiap baris (MobileListRow), tanpa divide-y
          agar garis tidak dobel. */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <DndContext
          sensors={sensors}
          modifiers={[lockY]}
          autoScroll={{ threshold: { x: 0, y: 0.08 }, acceleration: 4 }}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={paginated.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div role="list" aria-label="Daftar fasilitas">
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
                  <button onClick={() => fetchFacilities()} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                    Coba lagi
                  </button>
                </div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <ImageSquare className="h-7 w-7 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                    <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada fasilitas"}</p>
                  </div>
                  {!search && filter === "all" && permCreate && (
                    <button onClick={openCreate} className="mt-1 flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                      <Plus className="h-3.5 w-3.5" /> Tambah Fasilitas Pertama
                    </button>
                  )}
                </div>
              ) : (
                paginated.map((item) => (
                  <FacilityMobileRow
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    dragDisabled={dragDisabled}
                    selectMode={pickMode}
                    onEnterPickMode={enterPickMode}
                    onToggleSelect={toggleSelect}
                    onView={setViewItem}
                    onEdit={openEdit}
                    onDelete={setDeleteItem}
                    onDuplicate={openDuplicate}
                    onToggleActive={handleToggleActive}
                    canEdit={permUpdate}
                    canDelete={permDelete}
                    canCreate={permCreate}
                    canToggle={permPublish}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
        {!loading && filtered.length > 0 && (
          <MobilePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            from={(page - 1) * PAGE_SIZE + 1}
            to={Math.min(page * PAGE_SIZE, filtered.length)}
            onPageChange={setPage}
            itemLabel="fasilitas"
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

      {/* ── VIEW MODAL ──────────────────────────────── */}
      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.name}
        description={viewItem ? `${viewItem.is_active ? "Aktif" : "Nonaktif"} · Urutan: ${viewItem.sort_order || 0}` : undefined}
        footer={
          <div className="flex w-full items-center gap-2 md:w-auto">
            {permUpdate && (
              <button onClick={() => { setViewItem(null); openEdit(viewItem!); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:flex-none">
                <PencilSimple className="h-4 w-4" /> Edit
              </button>
            )}
            {viewItem && (permCreate || permDelete) && (
              <div className="flex shrink-0 md:hidden">
                <RowActionsMenu
                  label={viewItem.name}
                  actions={[
                    ...(permCreate
                      ? [{ key: "duplicate", label: "Duplikat", icon: <Copy className="h-4 w-4" />, run: () => openDuplicate(viewItem) }]
                      : []),
                    ...(permDelete
                      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => { setViewItem(null); setDeleteItem(viewItem); } }]
                      : []),
                  ]}
                />
              </div>
            )}
          </div>
        }
      >
        {viewItem?.image_url && (
          <div className="mb-4 -mx-5 -mt-5 overflow-hidden md:-mx-6">
            <Image src={viewItem.image_url} alt={viewItem.name} width={640} height={360} sizes="100%" loading="lazy" className="aspect-video w-full object-cover" />
          </div>
        )}
        {viewItem && (
          <>
            {viewItem.description && <p className="mb-4 text-sm text-slate-600 italic border-l-2 border-[#f4d21f] pl-3">{viewItem.description}</p>}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Urutan: {viewItem.sort_order || 0}</span>
              <span>Status: {viewItem.is_active ? "Aktif" : "Nonaktif"}</span>
            </div>
          </>
        )}
      </Modal>

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Fasilitas?"
        description={`"${deleteItem?.name}" akan dihapus permanen.`}
      />

      {/* ── BULK DELETE CONFIRM ─────────────────────── */}
      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Fasilitas?`}
        description="Semua fasilitas yang dipilih akan dihapus permanen."
      />

      {/* ── CREATE/EDIT FORM PANEL ──────────────────── */}
      <SlideOver
        open={formOpen}
        onClose={() => !formSaving && setFormOpen(false)}
        title={editItem ? "Edit Fasilitas" : "Buat Fasilitas Baru"}
        description={editItem ? "Perbarui informasi fasilitas" : "Isi form untuk menambah fasilitas"}
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
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              placeholder="Nama fasilitas" />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
            <div className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-2">
              <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })}
                aria-pressed={form.is_active}
                className={`relative h-6 w-11 rounded-full transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[""] ${form.is_active ? "bg-[var(--brand-accent)]" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_active ? "left-[22px]" : "left-0.5"}`} />
              </button>
              <span className="text-sm text-slate-700">{form.is_active ? "Aktif" : "Nonaktif"}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
              placeholder="Deskripsi singkat fasilitas (opsional)" />
          </div>

          {/* Image */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Gambar</label>
            {imagePreview ? (
              <div className="mb-3">
                <div className="relative overflow-hidden rounded-xl border border-slate-200">
                  <Image src={imagePreview} alt="Preview" width={640} height={160} sizes="100%" unoptimized className="h-40 w-full object-cover" />
                  <button onClick={() => { setImageFile(null); setImagePreview(""); setForm({ ...form, image_url: "" }); }}
                    aria-label="Hapus gambar"
                    className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70 md:h-7 md:w-7 md:p-1.5">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                aria-label="Unggah gambar fasilitas"
                onClick={() => imageInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    imageInputRef.current?.click();
                  }
                }}
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
                className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 text-center transition-colors hover:border-[var(--brand-accent)]/40 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              >
                {imageUploading ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-accent)] border-t-transparent" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
                <span className="text-xs text-slate-400">
                  {imageUploading ? "Mengkompresi gambar..." : "Ketuk untuk memilih gambar, seret & lepas, atau Ctrl+V untuk paste"}
                </span>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={handleImageChange} />
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Disarankan rasio 4:3 (mis. 1200×900), foto asli, minimal 1200 piksel lebar
            </p>
          </div>

          {/* Lanjutan — bisa dilipat */}
          <div className="rounded-xl border border-slate-200">
            <button type="button" onClick={() => setAdvancedOpen((o) => !o)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                Lanjutan
              </span>
              <CaretRight className={`h-4 w-4 text-slate-400 transition-transform ${advancedOpen ? "rotate-90" : ""}`} />
            </button>
            {advancedOpen && (
              <div className="border-t border-slate-100 px-4 py-4">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Urutan</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
                  placeholder="0" />
                <p className="mt-1.5 text-xs text-slate-400">Angka kecil tampil lebih dulu. Fasilitas baru otomatis memakai urutan terbesar + 10.</p>
              </div>
            )}
          </div>
        </div>
      </SlideOver>
    </div>
  );
}

/**
 * Satu baris tabel fasilitas. Sengaja dipisah dari komponen utama:
 * `useSortable` harus dipanggil per baris, dan komponen yang didefinisikan
 * di dalam render akan dibuat ulang tiap update → drag terputus.
 *
 * Handle ditempatkan di sel "Urutan" — persis pola Kelola Portal.
 */
function SortableFacilityRow({
  item,
  selected,
  dragDisabled,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  canEdit,
  canDelete,
  canCreate,
  canToggle,
}: {
  item: Facility;
  selected: boolean;
  dragDisabled: boolean;
  onToggleSelect: (id: string) => void;
  onView: (f: Facility) => void;
  onEdit: (f: Facility) => void;
  onDelete: (f: Facility) => void;
  onDuplicate: (f: Facility) => void;
  onToggleActive: (f: Facility) => void;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  canToggle: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: dragDisabled });

  const handle = (
    <button
      type="button"
      {...attributes}
      {...(dragDisabled ? {} : listeners)}
      disabled={dragDisabled}
      aria-label={`Ubah urutan ${item.name}`}
      title={
        dragDisabled
          ? "Urutan hanya bisa diubah saat menampilkan Semua, tanpa pencarian, dan diurutkan menurut Urutan"
          : "Seret untuk mengubah urutan"
      }
      className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${
        dragDisabled
          ? "cursor-not-allowed text-slate-200"
          : "cursor-grab text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
      }`}
    >
      <DotsSixVertical className="h-4 w-4" />
    </button>
  );

  // Chip peringatan: fasilitas tampil di website tapi tidak punya gambar
  const missingImage = item.is_active && !item.image_url;

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`group transition-colors hover:bg-slate-50/80 ${selected ? "bg-[var(--brand-primary)]/[0.03]" : ""} ${isDragging ? "opacity-70" : ""}`}
    >
      {/* hidden sm:table-cell — pasangan dari <th> di atas */}
      <td className="hidden px-4 py-3.5 sm:table-cell" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(item.id)}
          aria-label={`Pilih ${item.name}`}
          className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
      </td>

      <td className="px-4 py-3.5 cursor-pointer" onClick={() => onView(item)}>
        <div className="flex items-center gap-3">
          {item.image_url ? (
            <Image src={item.image_url} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <ImageSquare className="h-5 w-5 text-slate-300" />
            </div>
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium text-[var(--brand-primary)]">{item.name}</span>
            {missingImage && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <Warning className="h-3 w-3" /> Tanpa gambar
              </span>
            )}
          </span>
        </div>
      </td>

      <td className="hidden px-4 py-3.5 text-left text-sm text-slate-500 md:table-cell">
        <span className="line-clamp-1">{item.description || "-"}</span>
      </td>

      {/* hidden sm:table-cell — pasangan <th> Urutan; handle drag ikut
          tersembunyi (geser urutan tetap bisa lewat tablet/desktop). */}
      <td className="hidden px-4 py-3.5 text-center sm:table-cell" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1">
          {handle}
          <span className="text-sm tabular-nums text-slate-500">{item.sort_order || 0}</span>
        </div>
      </td>

      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onToggleActive(item)} disabled={!canToggle}
          title={item.is_active ? (canToggle ? "Klik untuk menonaktifkan" : "Tidak berizin mengubah status") : (canToggle ? "Klik untuk mengaktifkan" : "Tidak berizin mengubah status")}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default disabled:opacity-70 ${
            item.is_active
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
          }`}>
          {item.is_active ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {item.is_active ? "Aktif" : "Nonaktif"}
        </button>
      </td>

      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1">
          {/* Lihat & Duplikat hidden di bawah sm — 4 tombol (±124px) + Status
              (±78px) membuat kolom Nama tinggal ±62px dan terpotong. Lihat
              tetap bisa dengan mengetuk nama baris (onClick onView).
              (Tampilan ini hanya dipakai di md+; di bawah md memakai
              FacilityMobileRow dengan menu ⋯ — lihat bawah.) */}
          <button onClick={() => onView(item)} className="hidden rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:flex" title="Lihat" aria-label={`Lihat ${item.name}`}>
            <Eye className="h-4 w-4" />
          </button>
          {canEdit && (
            <button onClick={() => onEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit" aria-label={`Edit ${item.name}`}>
              <PencilSimple className="h-4 w-4" />
            </button>
          )}
          {canCreate && (
            <button onClick={() => onDuplicate(item)} className="hidden rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[var(--brand-primary)] sm:flex" title="Duplikat" aria-label={`Duplikat ${item.name}`}>
              <Copy className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus" aria-label={`Hapus ${item.name}`}>
              <Trash className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Satu baris fasilitas versi mobile (< md) — dipisah dari baris tabel karena
 * `useSortable` harus dipanggil per baris, dan dua varian (tabel desktop +
 * daftar) memakai DndContext TERPISAH: mendaftarkan id sortable yang sama di
 * dua tempat membuat context hanya melacak satu node (node tersembunyi
 * display:none berukuran nol → drag rusak di layar yang satunya).
 *
 * Anatomi baris (putaran 2): [grip 30px] [thumb 56px + titik status] [nama
 * 15px line-clamp-2 + badge "Nonaktif" + deskripsi 2 baris] [⋯ 36×44].
 * Status aktif/nonaktif lewat menu ⋯ ("Nonaktifkan"/"Aktifkan") — tidak ada
 * pill yang bisa diketuk sekali langsung menyimpan. Tap baris = Lihat;
 * long-press = masuk mode pilih; di mode pilih checkbox menggantikan grip.
 */
function FacilityMobileRow({
  item,
  selected,
  dragDisabled,
  selectMode,
  onEnterPickMode,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  canEdit,
  canDelete,
  canCreate,
  canToggle,
}: {
  item: Facility;
  selected: boolean;
  dragDisabled: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onView: (f: Facility) => void;
  onEdit: (f: Facility) => void;
  onDelete: (f: Facility) => void;
  onDuplicate: (f: Facility) => void;
  onToggleActive: (f: Facility) => void;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  canToggle: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: dragDisabled || selectMode });

  // Grip urutan — kolom tampilan 30px (nomor = sort_order), area sentuh
  // penuh tinggi baris & >= 44px lebar (RowGrip bersama, touch-none).
  const mobileHandle = (
    <RowGrip
      index={0}
      number={item.sort_order || 0}
      label={item.name}
      disabled={dragDisabled}
      attributes={attributes}
      listeners={dragDisabled ? {} : listeners}
    />
  );

  // Chip peringatan: fasilitas tampil di website tapi tidak punya gambar —
  // versi baris mobile berupa ikon kecil (bukan chip lebar).
  const missingImage = item.is_active && !item.image_url;

  return (
    <div
      ref={setNodeRef}
      role="listitem"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      // `relative` supaya zIndex saat drag berlaku — baris yang diseret tidak
      // tertutup baris tetangga yang ikut bergeser.
      className={`relative ${isDragging ? "bg-slate-50 opacity-70" : ""}`}
    >
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
                aria-label={`Pilih ${item.name}`}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              />
            </span>
          ) : (
            mobileHandle
          )
        }
        thumb={
          <MobileThumb
            src={item.image_url}
            tint="sky"
            status={{
              tone: item.is_active ? "active" : "off",
              label: item.is_active ? "Aktif" : "Nonaktif",
            }}
          />
        }
        title={item.name}
        badge={!item.is_active ? <QuietBadge>Nonaktif</QuietBadge> : undefined}
        subtitle={
          <>
            {item.description && (
              <span className="min-w-0" title={item.description}>
                {item.description}
              </span>
            )}
            {missingImage && (
              <span
                title="Tanpa gambar"
                className="inline-flex shrink-0 items-center text-amber-500"
              >
                <Warning className="h-3 w-3" />
                <span className="sr-only">Tanpa gambar</span>
              </span>
            )}
          </>
        }
        actions={
          <RowActionsMenu
            label={item.name}
            disabled={selectMode}
            actions={[
              { key: "view", label: "Lihat", icon: <Eye className="h-4 w-4" />, run: () => onView(item) },
              ...(canEdit
                ? [{ key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => onEdit(item) }]
                : []),
              ...(canCreate
                ? [{ key: "duplicate", label: "Duplikat", icon: <Copy className="h-4 w-4" />, run: () => onDuplicate(item) }]
                : []),
              ...(canToggle
                ? [{
                    key: "toggle",
                    label: item.is_active ? "Nonaktifkan" : "Aktifkan",
                    icon: item.is_active ? <Clock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
                    run: () => onToggleActive(item),
                  }]
                : []),
              ...(canDelete
                ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) }]
                : []),
            ]}
          />
        }
        selected={selected}
        onClick={() => {
          if (selectMode) onToggleSelect(item.id);
          else onView(item);
        }}
        onLongPress={() => onEnterPickMode(item.id)}
      />
    </div>
  );
}
