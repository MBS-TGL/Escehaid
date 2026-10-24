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
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import {
  ChatCircle,
  Plus,
  PencilSimple,
  Trash,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  FloppyDisk,
  X,
} from "@/components/Icons";

const SCOPES: { key: FaqScope; label: string; hint: string }[] = [
  { key: "home", label: "Beranda", hint: "Section FAQ di beranda (+ JSON-LD FAQPage)" },
  { key: "spmb", label: "SPMB", hint: "FAQ halaman /admission (+ JSON-LD FAQPage)" },
];

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
  const canCreate = can("faq:create");
  const canUpdate = can("faq:update");
  const canDelete = can("faq:delete");

  const [scope, setScope] = useState<FaqScope>("home");
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
      setLoadError(e instanceof Error ? e.message : "Gagal memuat FAQ. Periksa koneksi lalu coba lagi.");
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [items, search]);

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

  async function handleToggleActive(item: Faq) {
    const res = await updateFaq(item.id, { is_active: !item.is_active });
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    revalidateFaq();
    fetchItems(scope);
  }

  async function handleMove(item: Faq, dir: -1 | 1) {
    const idx = items.findIndex((f) => f.id === item.id);
    const swapWith = items[idx + dir];
    if (!swapWith) return;
    // Tukar sort_order kedua baris; bila sama (0/0), paksa nilai berbeda.
    const a = item.sort_order;
    const b = swapWith.sort_order;
    const [na, nb] = a === b ? [dir === 1 ? a + 1 : a - 1, a] : [b, a];
    const r1 = await updateFaq(item.id, { sort_order: na });
    const r2 = await updateFaq(swapWith.id, { sort_order: nb });
    if (r1.error || r2.error) {
      toast(r1.error || r2.error || "Gagal mengubah urutan.", "error");
      return;
    }
    revalidateFaq();
    fetchItems(scope);
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

  const activeScope = SCOPES.find((s) => s.key === scope)!;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <ChatCircle className="h-6 w-6 text-[var(--brand-primary)]" weight="fill" />
            FAQ — Tanya Jawab
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            FAQ {activeScope.label}: {activeScope.hint}. Urutan kecil tampil lebih dulu.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent)]"
          >
            <Plus className="h-4 w-4" weight="bold" /> Tambah FAQ
          </button>
        )}
      </div>

      {/* Tab scope */}
      <div className="mt-5 flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              scope === s.key
                ? "bg-[var(--brand-primary)] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Pencarian */}
      <div className="mt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari pertanyaan atau jawaban…"
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[var(--brand-primary)] focus:outline-none"
        />
      </div>

      {/* Daftar */}
      <div className="mt-5 space-y-3">
        {loading ? (
          <>
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-20 w-full" />
          </>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{loadError}</p>
            <button
              onClick={() => fetchItems(scope)}
              className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Coba lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-500">
              {search ? "Tidak ada FAQ yang cocok dengan pencarian." : "Belum ada FAQ pada scope ini."}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Selama tabel kosong, halaman publik memakai fallback statis dari kode.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
            >
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <button
                  onClick={() => handleMove(item, -1)}
                  disabled={!canUpdate}
                  title="Naik"
                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" weight="bold" />
                </button>
                <span className="text-[10px] font-bold tabular-nums text-slate-400">{item.sort_order}</span>
                <button
                  onClick={() => handleMove(item, 1)}
                  disabled={!canUpdate}
                  title="Turun"
                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" weight="bold" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{item.question}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{item.answer}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {canUpdate && (
                  <button
                    onClick={() => handleToggleActive(item)}
                    title={item.is_active ? "Aktif — klik untuk nonaktifkan" : "Nonaktif — klik untuk aktifkan"}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                      item.is_active
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {item.is_active ? <CheckCircle className="h-3.5 w-3.5" weight="fill" /> : <XCircle className="h-3.5 w-3.5" weight="fill" />}
                    {item.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                )}
                {canUpdate && (
                  <button
                    onClick={() => openEdit(item)}
                    title="Edit"
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[var(--brand-primary)]"
                  >
                    <PencilSimple className="h-4 w-4" weight="bold" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setDeleteTarget(item)}
                    title="Hapus"
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash className="h-4 w-4" weight="bold" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form tambah/edit */}
      <SlideOver
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editItem ? "Edit FAQ" : "Tambah FAQ"}
        description={`Scope: ${activeScope.label} — ${activeScope.hint}`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setFormOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" /> Batal
            </button>
            <button
              onClick={handleSave}
              disabled={formSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent)] disabled:opacity-60"
            >
              <FloppyDisk className="h-4 w-4" weight="bold" /> {formSaving ? "Menyimpan…" : "Simpan"}
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
              className="h-4 w-4 accent-[var(--brand-primary)]"
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
