"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  deleteTeacherBulk,
  uploadTeacherPhoto,
  reorderTeachers,
  revalidatePaths,
} from "@/lib/queries";
import { compressImage, TEACHER_PHOTO } from "@/lib/compress-image";
import type { Teacher } from "@/lib/supabase";
import { ConfirmModal, SlideOver, SkeletonBlock } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { normalizeName } from "@/lib/format-name";
import {
  Users,
  Plus,
  PencilSimple,
  Trash,
  Checks,
  FloppyDisk,
  X,
  User,
  CheckCircle,
  XCircle,
  Clock,
} from "@/components/Icons";
import {
  MobileFilterBar,
  MobilePickButton,
  MobileListRow,
  MobileSelectBar,
  LongPressHint,
  SelectionMark,
  RowActionsMenu,
  RowGrip,
  MobileThumb,
  QuietBadge,
  type RowAction,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";
import { SortableList } from "@/components/admin/sortable/SortableList";
import { SortableRow } from "@/components/admin/sortable/SortableRow";
import { SortableGrip } from "@/components/admin/sortable/SortableGrip";
import { useReorder } from "@/lib/admin/useReorder";

type FilterTab = "all" | "active" | "inactive";

/** URL foto + cache-buster. URL yang sudah punya query (`?v=<ts>` hasil unggahan)
 *  diteruskan dengan `&`, bukan `?` lagi — jangan bikin URL rusak `...?v=1?v=0`. */
function photoSrc(url: string, bust: number): string {
  return `${url}${url.includes("?") ? "&" : "?"}v=${bust || 0}`;
}

export default function AdminTeachersPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy.ts/RLS (lihat PermissionsProvider).
  const permCreate = can("guru:create");
  const permUpdate = can("guru:update");
  const permDelete = can("guru:delete");
  const permPublish = can("guru:publish");
  const [items, setItems] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile): checkbox menggantikan nomor, tap baris = toggle,
  // bar aksi massal sticky di bawah. Desktop tetap pakai checkbox tabel.
  const [pickMode, setPickMode] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Teacher | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Teacher | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [photoBust, setPhotoBust] = useState<Record<string, number>>({});

  const [formName, setFormName] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getAllTeachers();
      setItems(data);
    } catch {
      // Query gagal → tampil EmptyState "Gagal memuat", BUKAN daftar kosong palsu.
      setLoadError("Gagal memuat data guru.");
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
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.position.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filter, search]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  // Urutan hanya bermakna pada daftar penuh tanpa pencarian/filter/mode pilih.
  const dragDisabled = search.trim() !== "" || filter !== "all" || pickMode || !permUpdate;

  // Drag & drop urutan — optimistik via hook bersama (rollback + toast + revalidate).
  const onReorder = useReorder(items, setItems, {
    persist: reorderTeachers,
    onSuccess: () => { revalidatePaths(["/", "/profile"]).catch(() => {}); },
    label: "guru",
  });

  function toggleSelectAll() {
    if (allVisibleSelected) {
      const s = new Set(selectedIds);
      filtered.forEach((i) => s.delete(i.id));
      setSelectedIds(s);
    } else {
      const s = new Set(selectedIds);
      filtered.forEach((i) => s.add(i.id));
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
    setFormName("");
    setFormPosition("");
    setFormPhotoFile(null);
    setFormPhotoPreview("");
    setFormOpen(true);
  }

  function openEdit(item: Teacher) {
    setEditItem(item);
    setFormName(item.name);
    setFormPosition(item.position);
    setFormPhotoFile(null);
    setFormPhotoPreview(item.photo_url || "");
    setFormOpen(true);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, TEACHER_PHOTO)
      .then((compressed) => {
        setFormPhotoFile(compressed);
        setFormPhotoPreview(URL.createObjectURL(compressed));
      })
      .catch(() =>
        toast("Gagal memproses foto. Pastikan file tidak rusak dan berformat JPG/PNG/WebP.", "error")
      );
  }

  async function handleSave() {
    if (!formName.trim()) { toast("Nama guru wajib diisi", "error"); return; }
    setFormSaving(true);

    if (editItem) {
      let photoUrl = editItem.photo_url;
      if (formPhotoFile) {
        const uploaded = await uploadTeacherPhoto(formPhotoFile, editItem.id);
        if (!uploaded.url) {
          toast(uploaded.error || "Gagal mengunggah foto guru.", "error");
          setFormSaving(false);
          return;
        }
        photoUrl = uploaded.url;
        setPhotoBust((prev) => ({ ...prev, [editItem.id]: Date.now() }));
      }
      const { error } = await updateTeacher(editItem.id, {
        name: formName,
        position: formPosition,
        photo_url: photoUrl,
      });
      if (error) { toast(error, "error"); setFormSaving(false); return; }
      toast("Guru diperbarui", "success");
    } else {
      const tempId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
      let photoUrl = "";
      if (formPhotoFile) {
        const uploaded = await uploadTeacherPhoto(formPhotoFile, tempId);
        if (!uploaded.url) {
          toast(uploaded.error || "Gagal mengunggah foto guru.", "error");
          setFormSaving(false);
          return;
        }
        photoUrl = uploaded.url;
      }
      const { error } = await createTeacher({
        name: formName,
        position: formPosition,
        photo_url: photoUrl,
      });
      if (error) { toast(error, "error"); setFormSaving(false); return; }
      toast("Guru ditambahkan", "success");
    }
    setFormOpen(false);
    setFormSaving(false);
    fetchItems();
  }

  async function handleToggle(item: Teacher) {
    await updateTeacher(item.id, { is_active: !item.is_active });
    fetchItems();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    await deleteTeacher(deleteItem.id);
    toast("Guru dihapus", "success");
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchItems();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteTeacherBulk(ids);
    toast(`${ids.length} guru dihapus`, "success");
    exitPickMode();
    setBulkDelete(false);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10">
            <Users className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Guru & Staff</h1>
            <p className="text-sm text-slate-500">Kelola data guru dan tenaga kependidikan</p>
          </div>
        </div>
        {permCreate && (
          <button onClick={openCreate}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)]">
            <Plus className="h-4 w-4" /> Tambah Guru
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
          placeholder="Cari nama guru..."
          searchLabel="Cari guru"
          query={search}
          onQueryChange={(v) => { setSearch(v); }}
          filters={[
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => { setFilter(k as FilterTab); setSelectedIds(new Set()); },
              menuLabel: "Filter status",
            },
          ]}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian penuh + dropdown filter + Pilih */}
      <MobileFilterBar
        placeholder="Cari guru…"
        searchLabel="Cari guru"
        query={search}
        onQueryChange={(v) => { setSearch(v); }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => { setFilter(k as FilterTab); setSelectedIds(new Set()); },
        }}
        action={<MobilePickButton onClick={() => setPickMode(true)} />}
        selectMode={pickMode}
        selectedCount={selectedIds.size}
        allSelected={allVisibleSelected}
        onSelectAllVisible={toggleSelectAll}
      />

      {/* Tabel desktop (md+) — tampilan & perilaku sama seperti sebelumnya */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <SortableList ids={filtered.map((i) => i.id)} onReorder={onReorder}>
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                {/* hidden sm:table-cell — di bawah 640px sisa kolom cuma punya
                    ±328px. Checkbox & Urutan (handle drag ada di dalamnya)
                    adalah afordansi desktop. Sisa Nama · Jabatan · Status · Aksi. */}
                <th className="hidden w-12 px-2 py-3 text-center sm:table-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                </th>
                <th className="hidden w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Urutan</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Foto</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nama</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Jabatan</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data guru...</p>
                  </div>
                </td></tr>
              ) : loadError ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
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
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada data guru"}</p>
                    </div>
                    {!search && filter === "all" && permCreate && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                        <Plus className="h-3.5 w-3.5" /> Tambah Guru Pertama
                      </button>
                    )}
                  </div>
                </td></tr>
              ) : (
                filtered.map((item, index) => (
                  <SortableTeacherRow
                    key={item.id}
                    item={item}
                    index={index}
                    selected={selectedIds.has(item.id)}
                    dragDisabled={dragDisabled}
                    photoBust={photoBust}
                    onToggleSelect={toggleSelect}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={setDeleteItem}
                    canEdit={permUpdate}
                    canDelete={permDelete}
                    canToggle={permPublish}
                  />
                ))
              )}
              </tbody>
          </table>
          </SortableList>
        </div>
      </div>

      {/* Daftar mobile (<md) — baris ringkas tanpa scroll horizontal; semua
          fitur tetap ada: pilih (mode pilih), geser urutan (Naik/Turun di
          menu ⋯), edit & hapus via menu ⋯. */}
      <LongPressHint />
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <SortableList ids={filtered.map((i) => i.id)} onReorder={onReorder}>
        <div role="list" aria-label="Daftar guru">
          {loading ? (
            <div className="space-y-3 px-3 py-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-12 w-12 rounded-full" />
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
              <button onClick={() => fetchItems()} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                Coba lagi
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada data guru"}</p>
              </div>
              {!search && filter === "all" && permCreate && (
                <button onClick={openCreate} className="mt-1 flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                  <Plus className="h-3.5 w-3.5" /> Tambah Guru Pertama
                </button>
              )}
            </div>
          ) : (
            filtered.map((item, index) => (
              <TeacherMobileRow
                key={item.id}
                item={item}
                index={index}
                selected={selectedIds.has(item.id)}
                selectMode={pickMode}
                photoBust={photoBust}
                dragDisabled={dragDisabled}
                onEnterPickMode={enterPickMode}
                onToggleSelect={toggleSelect}
                onEdit={openEdit}
                onDelete={setDeleteItem}
                onToggle={handleToggle}
                canEdit={permUpdate}
                canDelete={permDelete}
                canToggle={permPublish}
              />
            ))
          )}
        </div>
        </SortableList>
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
        title={editItem ? "Edit Guru" : "Tambah Guru Baru"}
        description={editItem ? "Perbarui data guru" : "Isi form untuk menambahkan guru"}
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
                  Simpan
                </>
              )}
            </button>
          </div>
        }>
        <div className="space-y-5">
          {/* Photo upload */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Foto Profil</label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-200 bg-slate-50">
                {formPhotoPreview ? (
                  <Image src={formPhotoPreview} alt="Preview" width={80} height={80} unoptimized
                    onError={() => { setFormPhotoPreview(""); }}
                    className="h-full w-full object-cover" />
                ) : (
                  <User className="h-7 w-7 text-slate-300" weight="light" />
                )}
              </div>
              <div>
                <label className="min-h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                  Pilih Foto
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
                <p className="mt-1 text-[11px] text-slate-400">JPG/PNG, max 5MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama Lengkap <span className="text-red-500">*</span></label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="Contoh: Ahmad Fauzi, S.Pd" autoComplete="off"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Jabatan</label>
            <input type="text" value={formPosition} onChange={(e) => setFormPosition(e.target.value)}
              placeholder="Contoh: Guru Matematika" autoComplete="off"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20" />
          </div>
        </div>
      </SlideOver>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Guru?"
        description={`"${deleteItem?.name}" akan dihapus permanen.`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Guru?`}
        description="Semua data guru yang dipilih akan dihapus permanen."
      />
    </div>
  );
}

/**
 * Satu baris tabel guru: [checkbox] [grip urutan] [foto] [nama] [jabatan]
 * [status] [aksi]. Urutan diubah lewat drag grip — tidak ada lagi tombol
 * panah terpisah maupun kolom nomor sendiri.
 */
function SortableTeacherRow({
  item,
  index,
  selected,
  dragDisabled,
  photoBust,
  onToggleSelect,
  onToggle,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  canToggle,
}: {
  item: Teacher;
  index: number;
  selected: boolean;
  dragDisabled: boolean;
  photoBust: Record<string, number>;
  onToggleSelect: (id: string) => void;
  onToggle: (t: Teacher) => void;
  onEdit: (t: Teacher) => void;
  onDelete: (t: Teacher) => void;
  canEdit: boolean;
  canDelete: boolean;
  canToggle: boolean;
}) {
  return (
    <SortableRow id={item.id} disabled={dragDisabled}>
      {({ setNodeRef, style, isDragging, attributes, listeners }) => (
        <tr
          ref={setNodeRef}
          style={style}
          className={`relative transition-colors ${isDragging ? "bg-slate-50 opacity-70" : selected ? "bg-[var(--brand-primary)]/[0.03]" : "hover:bg-slate-50/80"}`}
        >
          <td className="hidden w-12 px-2 py-3.5 text-center sm:table-cell" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(item.id)}
              aria-label={`Pilih ${item.name}`}
              className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
          </td>
          <td className="hidden px-4 py-3.5 sm:table-cell">
            <SortableGrip index={index} label={item.name} disabled={dragDisabled} attributes={attributes} listeners={listeners} />
          </td>
          <td className="hidden px-4 py-3.5 sm:table-cell">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100">
              {item.photo_url ? (
                <Image src={photoSrc(item.photo_url, photoBust[item.id])} alt={item.name} width={40} height={40} loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                  className="h-full w-full object-cover" />
              ) : null}
              <User className={`h-5 w-5 text-slate-300 ${item.photo_url ? "hidden" : ""}`} weight="light" />
            </div>
          </td>
          <td className="px-4 py-3.5">
            <span className="text-sm font-medium text-slate-700">{normalizeName(item.name)}</span>
          </td>
          <td className="px-4 py-3.5 text-sm text-slate-500">{item.position}</td>
          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onToggle(item)} disabled={!canToggle}
              title={canToggle ? "Klik untuk ubah status" : "Tidak berizin mengubah status"}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default ${
                item.is_active
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
              }`}>
              {item.is_active ? "Aktif" : "Nonaktif"}
            </button>
          </td>
          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-1">
              {canEdit && (
                <button onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                  <PencilSimple className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(item)} aria-label={`Hapus ${item.name}`}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
                  <Trash className="h-4 w-4" />
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </SortableRow>
  );
}

/**
 * Satu baris guru versi mobile (<md): [grip urutan] [avatar bulat + titik
 * status] [nama + jabatan + badge "Nonaktif"] [menu ⋯: Edit,
 * Nonaktifkan/Aktifkan, Hapus]. Tap baris = Edit; long-press = mode pilih;
 * di mode pilih checkbox menggantikan grip dan tap baris = toggle centang.
 * Geser urutan lewat grip (drag) — bukan lagi menu ⋯.
 */
function TeacherMobileRow({
  item,
  index,
  selected,
  selectMode,
  photoBust,
  dragDisabled,
  onEnterPickMode,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggle,
  canEdit,
  canDelete,
  canToggle,
}: {
  item: Teacher;
  index: number;
  selected: boolean;
  selectMode: boolean;
  photoBust: Record<string, number>;
  dragDisabled: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (t: Teacher) => void;
  onDelete: (t: Teacher) => void;
  onToggle: (t: Teacher) => void;
  canEdit: boolean;
  canDelete: boolean;
  canToggle: boolean;
}) {
  const actions: RowAction[] = [
    ...(canEdit
      ? [{ key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => onEdit(item) } as RowAction]
      : []),
    ...(canToggle
      ? [{
          key: "toggle",
          label: item.is_active ? "Nonaktifkan" : "Aktifkan",
          icon: item.is_active ? <Clock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
          run: () => onToggle(item),
        } as RowAction]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) } as RowAction]
      : []),
  ];

  return (
    <SortableRow id={item.id} disabled={dragDisabled}>
      {({ setNodeRef, style, isDragging, attributes, listeners }) => (
        <div
          ref={setNodeRef}
          style={style}
          role="listitem"
          className={`relative transition-colors ${isDragging ? "bg-slate-50 opacity-70" : ""}`}
        >
          <MobileListRow
            lead={
              selectMode ? (
                <SelectionMark selected={selected} />
              ) : (
                <RowGrip
                  index={index}
                  label={item.name}
                  disabled={dragDisabled}
                  attributes={attributes}
                  listeners={dragDisabled ? {} : listeners}
                />
              )
            }
            thumb={
              <MobileThumb
                src={item.photo_url ? photoSrc(item.photo_url, photoBust[item.id]) : null}
                shape="circle"
                icon={<User className="h-6 w-6" weight="light" />}
                status={{
                  tone: item.is_active ? "active" : "off",
                  label: item.is_active ? "Aktif" : "Nonaktif",
                }}
              />
            }
            title={normalizeName(item.name)}
            badge={!item.is_active ? <QuietBadge>Nonaktif</QuietBadge> : undefined}
            subtitle={
              item.position ? (
                <span className="min-w-0 truncate" title={item.position}>
                  {item.position}
                </span>
              ) : undefined
            }
            actions={<RowActionsMenu label={item.name} actions={actions} disabled={selectMode} />}
            selected={selected}
            selectionMode={selectMode}
            onClick={() => {
              if (selectMode) onToggleSelect(item.id);
              else onEdit(item);
            }}
            onLongPress={() => onEnterPickMode(item.id)}
          />
        </div>
      )}
    </SortableRow>
  );
}