"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  deleteTeacherBulk,
  uploadTeacherPhoto,
} from "@/lib/queries";
import { compressImage } from "@/lib/compress-image";
import type { Teacher } from "@/lib/supabase";
import { StatCard, StatCardRow, ConfirmModal, SlideOver } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import {
  Users,
  Plus,
  PencilSimple,
  Trash,
  Checks,
  FloppyDisk,
  MagnifyingGlass,
  X,
  CaretLeft,
  CaretRight,
  User,
  ImageSquare,
} from "@/components/Icons";

type FilterTab = "all" | "active" | "inactive";

const PAGE_SIZE = 10;

export default function AdminTeachersPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteItem, setDeleteItem] = useState<Teacher | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Teacher | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const data = await getAllTeachers();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
    compressImage(file).then((compressed) => {
      setFormPhotoFile(compressed);
      setFormPhotoPreview(URL.createObjectURL(compressed));
    });
  }

  async function handleSave() {
    if (!formName.trim()) { toast("Nama guru wajib diisi", "error"); return; }
    setFormSaving(true);

    if (editItem) {
      let photoUrl = editItem.photo_url;
      if (formPhotoFile) {
        const uploaded = await uploadTeacherPhoto(formPhotoFile, editItem.id);
        if (uploaded.url) photoUrl = uploaded.url;
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
        if (uploaded.url) photoUrl = uploaded.url;
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
    setSelectedIds(new Set());
    setBulkDelete(false);
    fetchItems();
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= items.length) return;
    const newOrder = [...items];
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    for (let i = 0; i < newOrder.length; i++) {
      await updateTeacher(newOrder[i].id, { sort_order: i });
    }
    fetchItems();
  }

  const activeCount = items.filter((i) => i.is_active).length;
  const inactiveCount = items.length - activeCount;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1767b1]/10">
            <Users className="h-5 w-5 text-[#1767b1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Guru & Staff</h1>
            <p className="text-sm text-slate-500">Kelola data guru dan tenaga kependidikan</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1767b1]">
          <Plus className="h-4 w-4" /> Tambah Guru
        </button>
      </div>

      {/* Stats */}
      <StatCardRow>
        <StatCard label="Total" value={items.length} variant="brand" />
        <StatCard label="Aktif" value={activeCount} variant="success" />
        <StatCard label="Nonaktif" value={inactiveCount} variant="warning" />
      </StatCardRow>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#082b59]/20 bg-[#082b59]/5 px-4 py-2.5">
          <Checks className="h-4 w-4 text-[#082b59]" />
          <span className="text-xs font-semibold text-[#082b59]">{selectedIds.size} dipilih</span>
          <button onClick={() => setBulkDelete(true)}
            className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">
            Hapus
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter + Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {([
              { key: "all", label: "Semua" },
              { key: "active", label: "Aktif" },
              { key: "inactive", label: "Nonaktif" },
            ] as const).map((tab) => (
              <button key={tab.key} onClick={() => { setFilter(tab.key); setPage(1); setSelectedIds(new Set()); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === tab.key ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari nama guru..."
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
                <th className="w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Urutan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Foto</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nama</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Jabatan</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data guru...</p>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada data guru"}</p>
                    </div>
                    {!search && filter === "all" && (
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#082b59] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1767b1]">
                        <Plus className="h-3.5 w-3.5" /> Tambah Guru Pertama
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
                    <td className="px-4 py-3.5">
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
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.name}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                            className="h-full w-full object-cover" />
                        ) : null}
                        <User className={`h-5 w-5 text-slate-300 ${item.photo_url ? "hidden" : ""}`} weight="light" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{item.position}</td>
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
                        <button onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                          <PencilSimple className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteItem(item)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
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
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} guru
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

      {/* Create/Edit SlideOver */}
      <SlideOver open={formOpen} onClose={() => !formSaving && setFormOpen(false)}
        title={editItem ? "Edit Guru" : "Tambah Guru Baru"}
        description={editItem ? "Perbarui data guru" : "Isi form untuk menambahkan guru"}
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
                  <img src={formPhotoPreview} alt="Preview"
                    onError={(e) => { setFormPhotoPreview(""); }}
                    className="h-full w-full object-cover" />
                ) : (
                  <User className="h-7 w-7 text-slate-300" weight="light" />
                )}
              </div>
              <div>
                <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
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
              placeholder="Contoh: Ahmad Fauzi, S.Pd"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Jabatan</label>
            <input type="text" value={formPosition} onChange={(e) => setFormPosition(e.target.value)}
              placeholder="Contoh: Guru Matematika"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20" />
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