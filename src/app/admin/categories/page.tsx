"use client";

import { useEffect, useState } from "react";
import {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/queries";
import type { Category } from "@/lib/queries";
import { ConfirmModal, SlideOver } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import {
  Plus,
  PencilSimple,
  Trash,
  Tag,
  SortAscending,
} from "@/components/Icons";

const typeLabels: Record<string, string> = {
  berita: "Berita",
  artikel: "Artikel",
  kegiatan: "Kegiatan",
};

const typeColors: Record<string, string> = {
  berita: "bg-blue-50 text-blue-700 border-blue-200",
  artikel: "bg-emerald-50 text-emerald-700 border-emerald-200",
  kegiatan: "bg-purple-50 text-purple-700 border-purple-200",
};

interface FormData {
  name: string;
  slug: string;
  type: string;
  color: string;
  sort_order: number;
}

const emptyForm: FormData = {
  name: "",
  slug: "",
  type: "berita",
  color: "#1767b1",
  sort_order: 0,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    const data = await getCategoryList();
    setCategories(data);
    setLoading(false);
  }

  const filtered = filter === "all" ? categories : categories.filter((c) => c.type === filter);

  function openCreate() {
    setForm({ ...emptyForm, sort_order: categories.length + 1 });
    setEditId(null);
    setSlideOpen(true);
  }

  function openEdit(cat: Category) {
    setForm({
      name: cat.name,
      slug: cat.slug,
      type: cat.type,
      color: cat.color,
      sort_order: cat.sort_order,
    });
    setEditId(cat.id);
    setSlideOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast("Nama kategori wajib diisi", "error");
      return;
    }
    setSaving(true);
    const slug = form.slug || slugify(form.name);
    if (editId) {
      const result = await updateCategory(editId, { ...form, slug });
      if (result.error) toast(result.error, "error");
      else toast("Kategori berhasil diupdate", "success");
    } else {
      const result = await createCategory({ ...form, slug });
      if (result.error) toast(result.error, "error");
      else toast("Kategori berhasil ditambahkan", "success");
    }
    setSlideOpen(false);
    setSaving(false);
    await loadCategories();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteCategory(deleteTarget.id);
    if (result.error) toast(result.error, "error");
    else toast("Kategori berhasil dihapus", "success");
    setDeleteTarget(null);
    await loadCategories();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kelola Kategori</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tambah, edit, atau hapus kategori untuk berita, artikel, dan kegiatan.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#082b59]/20 transition-all hover:bg-[#1767b1] hover:shadow-lg"
        >
          <Plus className="h-4 w-4" /> Tambah Kategori
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2">
        {["all", "berita", "artikel", "kegiatan"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === t
                ? "bg-[#082b59] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t === "all" ? "Semua" : typeLabels[t]} ({t === "all" ? categories.length : categories.filter((c) => c.type === t).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nama</th>
                <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Slug</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tipe</th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Warna</th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Urutan</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Memuat data...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Tag className="mx-auto h-8 w-8 text-slate-200" />
                    <p className="mt-2 text-sm text-slate-400">Belum ada kategori</p>
                  </td>
                </tr>
              ) : (
                filtered.map((cat) => (
                  <tr key={cat.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-slate-800">{cat.name}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{cat.slug}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${typeColors[cat.type] || "bg-slate-100 text-slate-600"}`}>
                        {typeLabels[cat.type] || cat.type}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="h-4 w-4 rounded border border-slate-200" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs text-slate-400">{cat.color}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-center text-slate-500 md:table-cell">{cat.sort_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(cat)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                          <PencilSimple className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(cat)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
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
      </div>

      {/* SlideOver Form */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editId ? "Edit Kategori" : "Tambah Kategori"}
      >
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-colors focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
              placeholder="Contoh: Berita Terbaru"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-colors focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
              placeholder="berita-terbaru"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipe *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-colors focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
            >
              <option value="berita">Berita</option>
              <option value="artikel">Artikel</option>
              <option value="kegiatan">Kegiatan</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Warna</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm transition-colors focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Urutan</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-colors focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setSlideOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#082b59] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1767b1] disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : editId ? "Update" : "Simpan"}
            </button>
          </div>
        </div>
      </SlideOver>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kategori"
        message={`Yakin ingin menghapus kategori "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}
