"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  reorderFaqs,
  revalidatePaths,
} from "@/lib/queries";
import type { Faq, FaqScope } from "@/lib/queries";
import { ConfirmModal, SlideOver, SkeletonBlock } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { formatRelativeTime } from "@/lib/admin-display";
import {
  ChatCircle,
  Plus,
  PencilSimple,
  Trash,
  CheckCircle,
  XCircle,
  MapPin,
  DotsSixVertical,
} from "@/components/Icons";
import {
  MobileFilterBar,
  MobileListRow,
  RowActionsMenu,
  RowGrip,
  StatusDot,
  QuietBadge,
  type RowAction,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";
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

type FilterTab = "all" | "active" | "inactive";

const SCOPE_META: Record<FaqScope, { label: string; hint: string }> = {
  home: { label: "Beranda", hint: "tampil di bagian akhir halaman depan website" },
  spmb: { label: "SPMB", hint: "tampil di halaman Pendaftaran (SPMB)" },
};

interface FormState {
  question: string;
  answer: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { question: "", answer: "", is_active: true };

/** Drag hanya gerak vertikal — mencegah baris "melayang" menyamping. */
const lockY: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export default function FaqClientPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  // Gate UI aksi — penegakan sesungguhnya di RLS.
  const permCreate = can("faq:create");
  const permUpdate = can("faq:update");
  const permDelete = can("faq:delete");

  const [scope, setScope] = useState<FaqScope>("home");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Faq | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async (s: FaqScope) => {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await getFaqs(s));
    } catch (e) {
      // Query gagal → tampil empty-state "Gagal memuat", BUKAN daftar kosong palsu.
      setLoadError(e instanceof Error ? e.message : "Gagal memuat FAQ.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchItems(scope);
    })().catch(() => {});
  }, [scope, fetchItems]);

  // Mutasi sukses → segarkan ISR halaman publik pemakai FAQ.
  const revalidateFaq = useCallback(() => {
    revalidatePaths(["/", "/admission"]).catch(() => {});
  }, []);

  const activeCount = items.filter((f) => f.is_active).length;
  const inactiveCount = items.length - activeCount;

  // Urutan hanya bermakna pada daftar penuh tanpa pencarian/filter (pola
  // Portal): drag dinonaktifkan selama salah satunya aktif.
  const listFiltered = search.trim() !== "" || filter !== "all";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((f) => {
      if (filter === "active" && !f.is_active) return false;
      if (filter === "inactive" && f.is_active) return false;
      if (!q) return true;
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    });
  }, [items, filter, search]);

  const scopeOptions = (["home", "spmb"] as FaqScope[]).map((k) => ({
    key: k,
    label: SCOPE_META[k].label,
  }));
  const statusOptions = [
    { key: "all", label: "Semua", count: items.length },
    { key: "active", label: "Aktif", count: activeCount },
    { key: "inactive", label: "Nonaktif", count: inactiveCount },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(item: Faq) {
    setEditItem(item);
    setForm({ question: item.question, answer: item.answer, is_active: item.is_active });
    setFormOpen(true);
  }

  async function handleSave() {
    const question = form.question.trim();
    const answer = form.answer.trim();
    if (!question || !answer) {
      toast("Pertanyaan dan jawaban wajib diisi.", "error");
      return;
    }
    setFormSaving(true);
    const res = editItem
      ? await updateFaq(editItem.id, { question, answer, is_active: form.is_active })
      : await createFaq({ scope, question, answer, is_active: form.is_active });
    setFormSaving(false);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    setFormOpen(false);
    toast(editItem ? "FAQ diperbarui." : "FAQ ditambahkan.", "success");
    revalidateFaq();
    fetchItems(scope);
  }

  async function handleToggle(item: Faq) {
    const res = await updateFaq(item.id, { is_active: !item.is_active });
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    revalidateFaq();
    fetchItems(scope);
  }

  /** Drag & drop selesai — urutan dihitung ulang (1, 2, 3, ...) lalu disimpan
   *  optimistis; gagal → rollback + toast (pola Portal). */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const previous = items;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({
      ...it,
      sort_order: idx + 1,
    }));
    setItems(reordered);

    reorderFaqs(reordered.map((it) => ({ id: it.id, sort_order: it.sort_order })))
      .then(({ error }) => {
        if (error) {
          setItems(previous);
          toast(`Gagal menyimpan urutan: ${error}`, "error");
          return;
        }
        toast("Urutan diperbarui", "success");
        revalidateFaq();
      });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteFaq(deleteTarget.id);
    setDeleting(false);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    setDeleteTarget(null);
    toast("FAQ dihapus.", "success");
    revalidateFaq();
    fetchItems(scope);
  }

  const dndProps = {
    sensors,
    modifiers: [lockY] as Modifier[],
    collisionDetection: closestCenter,
    onDragEnd: handleDragEnd,
    autoScroll: { threshold: { x: 0, y: 0.08 }, acceleration: 4 },
  };

  const emptyBody = (colSpan: number) => (
    <>
      {loading ? (
        <tr><td colSpan={colSpan} className="px-4 py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
            <p className="text-sm text-slate-500">Memuat data FAQ...</p>
          </div>
        </td></tr>
      ) : loadError ? (
        <tr><td colSpan={colSpan} className="px-4 py-16 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Gagal memuat data</p>
            <p className="mt-0.5 text-xs text-slate-500">{loadError}</p>
            <button onClick={() => fetchItems(scope)} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
              Coba lagi
            </button>
          </div>
        </td></tr>
      ) : filtered.length === 0 ? (
        <tr><td colSpan={colSpan} className="px-4 py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ChatCircle className="h-8 w-8 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
              <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : `Belum ada FAQ ${SCOPE_META[scope].label}`}</p>
            </div>
            {!search && filter === "all" && permCreate && (
              <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                <Plus className="h-3.5 w-3.5" /> Buat FAQ Pertama
              </button>
            )}
          </div>
        </td></tr>
      ) : null}
    </>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <ChatCircle className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">FAQ</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Kelola pertanyaan yang sering diajukan
            </p>
          </div>
        </div>
        {permCreate && (
          <button onClick={openCreate}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)]">
            <Plus className="h-4 w-4" /> Tambah FAQ
          </button>
        )}
      </div>

      {/* Stats — pill kompak satu baris */}
      <StatPillGroup>
        <StatPill icon={ChatCircle} label="Total" value={items.length} tone="neutral" />
        <StatPill icon={CheckCircle} label="Aktif" value={activeCount} tone="success" />
        <StatPill icon={XCircle} label="Nonaktif" value={inactiveCount} tone="danger" />
      </StatPillGroup>

      {/* Filter + pencarian (desktop md+) */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari pertanyaan atau jawaban..."
          searchLabel="Cari FAQ"
          query={search}
          onQueryChange={setSearch}
          filters={[
            {
              value: scope,
              options: scopeOptions,
              onChange: (k) => { setScope(k as FaqScope); setSearch(""); setFilter("all"); },
              menuLabel: "Lokasi tampil",
              // MapPin, bukan Funnel default — ini pemilih lokasi, bukan
              // filter konten; mencegah terbaca sebagai sort/filter.
              icon: <MapPin className="h-4 w-4" />,
            },
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => setFilter(k as FilterTab),
              menuLabel: "Filter status",
            },
          ]}
        />
      </div>

      {/* Toolbar mobile (<md) */}
      <MobileFilterBar
        placeholder="Cari pertanyaan atau jawaban…"
        searchLabel="Cari FAQ"
        query={search}
        onQueryChange={setSearch}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => setFilter(k as FilterTab),
        }}
        filter2={{
          value: scope,
          options: scopeOptions,
          onChange: (k) => { setScope(k as FaqScope); setSearch(""); setFilter("all"); },
          icon: <MapPin className="h-4 w-4" />,
        }}
      />

      {/* Tabel desktop (md+) — baris sortable (drag grip di kolom Urutan) */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                <th className="w-16 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Urutan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pertanyaan</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">Diubah</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <DndContext {...dndProps}>
              <SortableContext items={filtered.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-slate-100">
                  {loading || loadError || filtered.length === 0 ? emptyBody(5) : filtered.map((item, index) => (
                    <SortableTr
                      key={item.id}
                      item={item}
                      index={index}
                      dragDisabled={listFiltered || !permUpdate}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onToggle={handleToggle}
                      canUpdate={permUpdate}
                      canDelete={permDelete}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      </div>

      {/* Daftar mobile (<md) — baris sortable via RowGrip */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <DndContext {...dndProps}>
          <SortableContext items={filtered.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div role="list" aria-label="Daftar FAQ" className="divide-y divide-slate-100">
              {loading ? (
                <div className="space-y-3 px-3 py-4" aria-hidden="true">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="space-y-1.5">
                      <SkeletonBlock className="h-3.5 w-3/4 rounded" />
                      <SkeletonBlock className="h-3 w-1/3 rounded" />
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
                  <button onClick={() => fetchItems(scope)} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                    Coba lagi
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <ChatCircle className="h-7 w-7 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                    <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : `Belum ada FAQ ${SCOPE_META[scope].label}`}</p>
                  </div>
                  {!search && filter === "all" && permCreate && (
                    <button onClick={openCreate} className="mt-1 flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                      <Plus className="h-3.5 w-3.5" /> Buat FAQ Pertama
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((item, index) => (
                  <SortableMobileRow
                    key={item.id}
                    item={item}
                    index={index}
                    dragDisabled={listFiltered || !permUpdate}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onToggle={handleToggle}
                    canUpdate={permUpdate}
                    canDelete={permDelete}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Form tambah/edit */}
      <SlideOver
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editItem ? "Edit FAQ" : "Tambah FAQ"}
        description={`FAQ ini akan ${SCOPE_META[scope].hint}`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setFormOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={formSaving}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-accent)] disabled:opacity-60"
            >
              {formSaving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pertanyaan</label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              rows={2}
              placeholder="Pertanyaan yang sering diajukan…"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jawaban</label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              rows={6}
              placeholder="Jawaban lengkap yang tampil di halaman publik…"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded accent-[var(--brand-primary)]"
            />
            <span className="text-sm text-slate-700">
              Aktif <span className="text-slate-400">— hanya FAQ aktif yang tampil di halaman publik</span>
            </span>
          </label>
        </div>
      </SlideOver>

      {/* Konfirmasi hapus */}
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus FAQ?"
        description={deleteTarget?.question}
        message="FAQ akan dihapus permanen dari database."
        loading={deleting}
      />
    </div>
  );
}

function useSortableStyle(id: string, disabled: boolean) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return {
    attributes,
    listeners,
    setNodeRef,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10 : undefined,
    },
    isDragging,
  };
}

function GripHandle({
  index,
  label,
  disabled,
  attributes,
  listeners,
}: {
  index: number;
  label: string;
  disabled: boolean;
  attributes: React.ButtonHTMLAttributes<HTMLButtonElement>;
  listeners: Record<string, unknown> | undefined;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        {...attributes}
        {...(disabled ? {} : listeners)}
        disabled={disabled}
        aria-label={`Ubah urutan ${label}`}
        title={
          disabled
            ? "Urutan hanya bisa diubah saat menampilkan Semua tanpa pencarian"
            : "Tarik untuk mengubah urutan (atau tekan Space, lalu panah)"
        }
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${disabled
            ? "cursor-not-allowed text-slate-300"
            : "cursor-grab text-slate-400 hover:bg-[var(--brand-accent)]/10 hover:text-[var(--brand-primary)] active:cursor-grabbing"
          }`}
      >
        <DotsSixVertical className="h-4 w-4" />
      </button>
      <span className="w-5 text-center text-xs font-semibold tabular-nums text-slate-500">{index + 1}</span>
    </div>
  );
}

function SortableTr({
  item,
  index,
  dragDisabled,
  onEdit,
  onDelete,
  onToggle,
  canUpdate,
  canDelete,
}: {
  item: Faq;
  index: number;
  dragDisabled: boolean;
  onEdit: (item: Faq) => void;
  onDelete: (item: Faq) => void;
  onToggle: (item: Faq) => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, style, isDragging } = useSortableStyle(item.id, dragDisabled);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`relative transition-colors ${isDragging ? "bg-slate-50 opacity-70" : "hover:bg-slate-50/80"}`}
    >
      <td className="px-4 py-3.5">
        <GripHandle index={index} label={item.question.slice(0, 30)} disabled={dragDisabled} attributes={attributes} listeners={listeners} />
      </td>
      <td className="max-w-md px-4 py-3.5">
        <p className="text-sm font-medium text-slate-700">{item.question}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400" title={item.answer}>{item.answer}</p>
      </td>
      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onToggle(item)} disabled={!canUpdate}
          title={canUpdate ? "Klik untuk ubah status" : "Tidak berizin mengubah status"}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default ${item.is_active
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
            } disabled:opacity-70`}>
          {item.is_active ? "Aktif" : "Nonaktif"}
        </button>
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3.5 text-center text-sm text-slate-500 lg:table-cell" title={new Date(item.updated_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}>
        {formatRelativeTime(item.updated_at)}
      </td>
      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1">
          {canUpdate && (
            <button onClick={() => onEdit(item)} aria-label={`Edit FAQ ${item.question.slice(0, 30)}`}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
              <PencilSimple className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(item)} aria-label={`Hapus FAQ ${item.question.slice(0, 30)}`}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
              <Trash className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function SortableMobileRow({
  item,
  index,
  dragDisabled,
  onEdit,
  onDelete,
  onToggle,
  canUpdate,
  canDelete,
}: {
  item: Faq;
  index: number;
  dragDisabled: boolean;
  onEdit: (item: Faq) => void;
  onDelete: (item: Faq) => void;
  onToggle: (item: Faq) => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, style, isDragging } = useSortableStyle(item.id, dragDisabled);

  const actions: RowAction[] = [
    ...(canUpdate
      ? [
          { key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => onEdit(item) },
          { key: "toggle", label: item.is_active ? "Nonaktifkan" : "Aktifkan", icon: <CheckCircle className="h-4 w-4" />, run: () => onToggle(item) },
        ]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) }]
      : []),
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      className={`relative transition-colors ${isDragging ? "bg-slate-50 opacity-70" : ""}`}
    >
      <MobileListRow
        lead={
          <RowGrip
            index={index}
            label={item.question.slice(0, 30)}
            disabled={dragDisabled}
            attributes={attributes}
            listeners={dragDisabled ? {} : listeners}
          />
        }
        thumb={
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e4ecf6]">
            <ChatCircle className="h-5 w-5 text-[var(--brand-accent)]" />
            <StatusDot
              tone={item.is_active ? "active" : "off"}
              label={item.is_active ? "Aktif" : "Nonaktif"}
              className="absolute -bottom-1 -right-1"
            />
          </span>
        }
        title={<span className="break-words">{item.question}</span>}
        badge={!item.is_active ? <QuietBadge>Nonaktif</QuietBadge> : undefined}
        subtitle={
          <span className="min-w-0 truncate" title={new Date(item.updated_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}>
            {formatRelativeTime(item.updated_at)}
          </span>
        }
        actions={<RowActionsMenu label={`FAQ ${item.question.slice(0, 30)}`} actions={actions} />}
        onClick={() => onEdit(item)}
      />
    </div>
  );
}
