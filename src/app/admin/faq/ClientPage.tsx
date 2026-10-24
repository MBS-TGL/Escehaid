"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
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
  CaretLeft,
  CaretRight,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  MapPin,
} from "@/components/Icons";
import {
  MobileFilterBar,
  MobilePagination,
  MobileListRow,
  RowActionsMenu,
  StatusDot,
  QuietBadge,
  type RowAction,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";

type FilterTab = "all" | "active" | "inactive";

const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Faq | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);

  const [deleteItem, setDeleteItem] = useState<Faq | null>(null);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((f) => {
      if (filter === "active" && !f.is_active) return false;
      if (filter === "inactive" && f.is_active) return false;
      if (!q) return true;
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    });
  }, [items, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const scopeOptions = (["home", "spmb"] as FaqScope[]).map((k) => ({
    key: k,
    label: SCOPE_META[k].label,
  }));
  const statusOptions = [
    { key: "all", label: "Semua", count: items.length },
    { key: "active", label: "Aktif", count: activeCount },
    { key: "inactive", label: "Nonaktif", count: inactiveCount },
  ];

  function resetList() {
    setPage(1);
    setSearch("");
    setFilter("all");
  }

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

  async function handleReorder(id: string, dir: "up" | "down") {
    const idx = items.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const dirStep = dir === "up" ? -1 : 1;
    const swapWith = items[idx + dirStep];
    if (!swapWith) return;
    // Tukar sort_order kedua baris; bila sama (mis. 0/0), paksa nilai berbeda.
    const a = items[idx].sort_order;
    const b = swapWith.sort_order;
    const [na, nb] = a === b ? [a + dirStep, a] : [b, a];
    const r1 = await updateFaq(items[idx].id, { sort_order: na });
    const r2 = await updateFaq(swapWith.id, { sort_order: nb });
    if (r1.error || r2.error) {
      toast(r1.error || r2.error || "Gagal mengubah urutan.", "error");
      return;
    }
    revalidateFaq();
    fetchItems(scope);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    const res = await deleteFaq(deleteItem.id);
    setDeleting(false);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    setDeleteItem(null);
    toast("FAQ dihapus.", "success");
    revalidateFaq();
    fetchItems(scope);
  }

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
          onQueryChange={(v) => { setSearch(v); setPage(1); }}
          filters={[
            {
              value: scope,
              options: scopeOptions,
              onChange: (k) => { setScope(k as FaqScope); resetList(); },
              menuLabel: "Lokasi tampil",
              // MapPin, bukan Funnel default — ini pemilih lokasi, bukan
              // filter konten; mencegah terbaca sebagai sort/filter.
              icon: <MapPin className="h-4 w-4" />,
            },
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => { setFilter(k as FilterTab); setPage(1); },
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
        onQueryChange={(v) => { setSearch(v); setPage(1); }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => { setFilter(k as FilterTab); setPage(1); },
        }}
        filter2={{
          value: scope,
          options: scopeOptions,
          onChange: (k) => { setScope(k as FaqScope); resetList(); },
          icon: <MapPin className="h-4 w-4" />,
        }}
      />

      {/* Tabel desktop (md+) */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">No</th>
                <th className="hidden w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Urutan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pertanyaan</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="hidden px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">Diubah</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data FAQ...</p>
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
                    <button onClick={() => fetchItems(scope)} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                      Coba lagi
                    </button>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
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
              ) : (
                paginated.map((item, index) => (
                  <tr key={item.id} className="group transition-colors hover:bg-slate-50/80">
                    <td className="hidden px-4 py-3.5 text-sm text-slate-400 sm:table-cell">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleReorder(item.id, "up")} disabled={index === 0}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30" title="Naik">
                          <ArrowUp className="h-3 w-3" weight="bold" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold text-slate-500">{item.sort_order}</span>
                        <button onClick={() => handleReorder(item.id, "down")} disabled={index === paginated.length - 1}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30" title="Turun">
                          <ArrowDown className="h-3 w-3" weight="bold" />
                        </button>
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-3.5">
                      <p className="text-sm font-medium text-slate-700">{item.question}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-400" title={item.answer}>{item.answer}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleToggle(item)} disabled={!permUpdate}
                        title={permUpdate ? "Klik untuk ubah status" : "Tidak berizin mengubah status"}
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
                        {permUpdate && (
                          <button onClick={() => openEdit(item)} aria-label={`Edit FAQ ${item.question.slice(0, 30)}`}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                            <PencilSimple className="h-4 w-4" />
                          </button>
                        )}
                        {permDelete && (
                          <button onClick={() => setDeleteItem(item)} aria-label={`Hapus FAQ ${item.question.slice(0, 30)}`}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
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
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} FAQ
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[var(--brand-primary)] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Daftar mobile (<md) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <div role="list" aria-label="Daftar FAQ">
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
          ) : paginated.length === 0 ? (
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
            paginated.map((item, index) => (
              <FaqMobileRow
                key={item.id}
                item={item}
                index={(page - 1) * PAGE_SIZE + index}
                onEdit={openEdit}
                onDelete={setDeleteItem}
                onToggle={handleToggle}
                onReorder={handleReorder}
                canGoUp={index > 0}
                canGoDown={index < paginated.length - 1}
                canEdit={permUpdate}
                canDelete={permDelete}
              />
            ))
          )}
        </div>
        {!loading && filtered.length > 0 && (
          <MobilePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            from={(page - 1) * PAGE_SIZE + 1}
            to={Math.min(page * PAGE_SIZE, filtered.length)}
            onPageChange={setPage}
            itemLabel="FAQ"
          />
        )}
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
        open={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus FAQ?"
        description={deleteItem?.question}
        message="FAQ akan dihapus permanen dari database."
        loading={deleting}
      />
    </div>
  );
}

function FaqMobileRow({
  item,
  index,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
  canGoUp,
  canGoDown,
  canEdit,
  canDelete,
}: {
  item: Faq;
  index: number;
  onEdit: (item: Faq) => void;
  onDelete: (item: Faq) => void;
  onToggle: (item: Faq) => void;
  onReorder: (id: string, dir: "up" | "down") => void;
  canGoUp: boolean;
  canGoDown: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const actions: RowAction[] = [
    ...(canEdit
      ? [
          { key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => onEdit(item) },
          { key: "toggle", label: item.is_active ? "Nonaktifkan" : "Aktifkan", icon: <CheckCircle className="h-4 w-4" />, run: () => onToggle(item) },
        ]
      : []),
    ...(canGoUp
      ? [{ key: "up", label: "Naik", icon: <ArrowUp className="h-4 w-4" />, run: () => onReorder(item.id, "up") }]
      : []),
    ...(canGoDown
      ? [{ key: "down", label: "Turun", icon: <ArrowDown className="h-4 w-4" />, run: () => onReorder(item.id, "down") }]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) }]
      : []),
  ];

  return (
    <div role="listitem">
      <MobileListRow
        lead={
          <span className="flex h-10 w-10 shrink-0 items-center justify-center text-[11px] font-semibold tabular-nums text-[#64748b]">
            {index + 1}
          </span>
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
