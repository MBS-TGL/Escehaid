"use client";

/**
 * Panel konten /program (izin `program:read`/`program:update`) — 3 section
 * sebagai tab: Pilar Al-Qur'an (`quran_pillars`), Blok Agenda
 * (`agenda_blocks`), Slot Jam (`agenda_slots`) — skema supabase/program.sql.
 *
 * Edit-only: baris terbatas (5/4/14) tanpa create/delete. Toggle & reorder
 * optimistic (rollback bila Supabase gagal); reorder kirim hanya baris yang
 * sort_order-nya berubah (pola ekskul) lalu revalidateProgram().
 * Slot diedit via DSL per baris: "Label" atau "Label | Senin,Kamis".
 */

import { useCallback, useEffect, useState } from "react";
import {
  getQuranPillarsAll,
  getAgendaBlocksAll,
  getAgendaSlotsAll,
  updateQuranPillar,
  updateAgendaBlock,
  updateAgendaSlot,
  reorderProgramRows,
  revalidateProgram,
} from "@/lib/queries";
import type { AgendaBlockRow, AgendaSlotRow, QuranPillarRow } from "@/lib/supabase";
import { BLOCKS, parseSlotItemsText, slotItemsToText } from "@/lib/data/mbs-schedule";
import { SlideOver, SkeletonBlock, Select } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { SortableList } from "@/components/admin/sortable/SortableList";
import { SortableRow } from "@/components/admin/sortable/SortableRow";
import { SortableGrip } from "@/components/admin/sortable/SortableGrip";
import { useReorder } from "@/lib/admin/useReorder";
import {
  BookOpen,
  PencilSimple,
  CheckCircle,
  XCircle,
  Checks,
  FloppyDisk,
  Warning,
} from "@/components/Icons";

type SectionTab = "pillars" | "blocks" | "slots";

const SECTION_TABS: { key: SectionTab; label: string; hint: string }[] = [
  { key: "pillars", label: "Pilar Al-Qur'an", hint: "5 kartu section Wafa" },
  { key: "blocks", label: "Blok Agenda", hint: "4 kartu ringkasan hari" },
  { key: "slots", label: "Slot Jam", hint: "14 slot kegiatan harian" },
];

type PillarForm = {
  kind: "pillars";
  id: string;
  number: string;
  title: string;
  description: string;
  timeLabel: string;
  target: string;
  isActive: boolean;
};

type BlockForm = {
  kind: "blocks";
  id: string;
  key: string;
  title: string;
  buttonText: string;
  summary: string;
  timeLabel: string;
  start: string;
  end: string;
  isActive: boolean;
};

type SlotForm = {
  kind: "slots";
  id: string;
  blockKey: string;
  start: string;
  end: string;
  itemsText: string;
  isActive: boolean;
};

type ProgramForm = PillarForm | BlockForm | SlotForm;

const HHMM = /^\d{1,2}:\d{2}$/;
const BLOCK_OPTIONS = BLOCKS.map((b) => ({ value: b.key, label: `${b.title} (${b.key})` }));

export default function AdminProgramPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  const permRead = can("program:read");
  const permUpdate = can("program:update");

  const [pillars, setPillars] = useState<QuranPillarRow[]>([]);
  const [blocks, setBlocks] = useState<AgendaBlockRow[]>([]);
  const [slotRows, setSlotRows] = useState<AgendaSlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<SectionTab>("pillars");

  const [form, setForm] = useState<ProgramForm | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [p, b, s] = await Promise.all([
        getQuranPillarsAll(),
        getAgendaBlocksAll(),
        getAgendaSlotsAll(),
      ]);
      setPillars(p);
      setBlocks(b);
      setSlotRows(s);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal memuat konten program.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchAll();
    })().catch(() => {});
  }, [fetchAll]);

  function rowsFor(kind: SectionTab) {
    return kind === "pillars" ? pillars : kind === "blocks" ? blocks : slotRows;
  }

  // ── Form edit ───────────────────────────────────────────────────────────────
  function openEdit(kind: SectionTab, id: string) {
    if (kind === "pillars") {
      const r = pillars.find((x) => x.id === id);
      if (!r) return;
      setForm({
        kind,
        id,
        number: r.number,
        title: r.title,
        description: r.description,
        timeLabel: r.time_label,
        target: r.target,
        isActive: r.is_active,
      });
    } else if (kind === "blocks") {
      const r = blocks.find((x) => x.id === id);
      if (!r) return;
      setForm({
        kind,
        id,
        key: r.key,
        title: r.title,
        buttonText: r.button_text,
        summary: r.summary,
        timeLabel: r.time_label,
        start: r.start_time,
        end: r.end_time,
        isActive: r.is_active,
      });
    } else {
      const r = slotRows.find((x) => x.id === id);
      if (!r) return;
      setForm({
        kind,
        id,
        blockKey: r.block_key,
        start: r.start_time,
        end: r.end_time,
        itemsText: slotItemsToText(r.items),
        isActive: r.is_active,
      });
    }
  }

  async function handleSave() {
    if (!form || !permUpdate || saving) return;
    setSaving(true);
    try {
      if (form.kind === "pillars") {
        const number = form.number.trim();
        const title = form.title.trim();
        if (!number) return void toast("Nomor urut wajib diisi", "error");
        if (pillars.some((r) => r.number === number && r.id !== form.id)) {
          return void toast(`Nomor "${number}" sudah dipakai pilar lain`, "error");
        }
        if (!title) return void toast("Judul wajib diisi", "error");
        const patch = {
          number,
          title,
          description: form.description.trim(),
          time_label: form.timeLabel.trim(),
          target: form.target.trim(),
          is_active: form.isActive,
        };
        const { error } = await updateQuranPillar(form.id, patch);
        if (error) return void toast(`Gagal menyimpan: ${error}`, "error");
        setPillars((rows) => rows.map((r) => (r.id === form.id ? { ...r, ...patch } : r)));
      } else if (form.kind === "blocks") {
        const title = form.title.trim();
        if (!title) return void toast("Judul wajib diisi", "error");
        const start = form.start.trim();
        const end = form.end.trim();
        if (!HHMM.test(start) || !HHMM.test(end)) {
          return void toast("Jam mulai & selesai wajib (format HH:MM, mis. 03:00)", "error");
        }
        const patch = {
          title,
          button_text: form.buttonText.trim(),
          summary: form.summary.trim(),
          time_label: form.timeLabel.trim(),
          start_time: start,
          end_time: end,
          is_active: form.isActive,
        };
        const { error } = await updateAgendaBlock(form.id, patch);
        if (error) return void toast(`Gagal menyimpan: ${error}`, "error");
        setBlocks((rows) => rows.map((r) => (r.id === form.id ? { ...r, ...patch } : r)));
      } else {
        const start = form.start.trim();
        const end = form.end.trim();
        if (!HHMM.test(start) || !HHMM.test(end)) {
          return void toast("Jam mulai & selesai wajib (format HH:MM, mis. 07:00)", "error");
        }
        const parsed = parseSlotItemsText(form.itemsText);
        if (parsed.errors.length > 0) {
          return void toast(parsed.errors[0].message, "error");
        }
        if (!parsed.list.length) return void toast("Slot harus punya minimal satu item", "error");
        const patch = {
          block_key: form.blockKey,
          start_time: start,
          end_time: end,
          items: parsed.list,
          is_active: form.isActive,
        };
        const { error } = await updateAgendaSlot(form.id, patch);
        if (error) return void toast(`Gagal menyimpan: ${error}`, "error");
        setSlotRows((rows) =>
          rows.map((r) => (r.id === form.id ? { ...r, ...patch, items: parsed.list } : r))
        );
      }
      toast("Konten program berhasil disimpan", "success");
      setForm(null);
      revalidateProgram().catch(() => {});
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle status (optimistic, rollback) ────────────────────────────────────
  async function toggleGeneric<T extends { id: string; is_active: boolean }>(
    list: T[],
    setRows: (updater: (rows: T[]) => T[]) => void,
    update: (id: string, patch: { is_active: boolean }) => Promise<{ error?: string }>,
    id: string,
    next: boolean
  ) {
    if (!permUpdate) return;
    const prev = list.find((r) => r.id === id)?.is_active;
    setRows((rows) => rows.map((r) => (r.id === id ? { ...r, is_active: next } : r)));
    const { error } = await update(id, { is_active: next });
    if (error) {
      setRows((rows) =>
        rows.map((r) => (r.id === id ? { ...r, is_active: prev ?? !next } : r))
      );
      toast(`Gagal mengubah status: ${error}`, "error");
      return;
    }
    toast(next ? "Konten ditampilkan di publik" : "Konten disembunyikan", "success");
    revalidateProgram().catch(() => {});
  }

  async function handleToggle(kind: SectionTab, id: string, next: boolean) {
    if (kind === "pillars") {
      await toggleGeneric(pillars, setPillars, updateQuranPillar, id, next);
    } else if (kind === "blocks") {
      await toggleGeneric(blocks, setBlocks, updateAgendaBlock, id, next);
    } else {
      await toggleGeneric(slotRows, setSlotRows, updateAgendaSlot, id, next);
    }
  }

  // ── Drag & drop urutan (optimistik, rollback + toast + revalidate) ─────────
  const dragDisabled = !permUpdate;
  const reorderOptions = { onSuccess: () => { revalidateProgram().catch(() => {}); } };
  const onReorderPillars = useReorder(pillars, setPillars, {
    persist: (rows) => reorderProgramRows("quran_pillars", rows),
    label: "pilar",
    ...reorderOptions,
  });
  const onReorderBlocks = useReorder(blocks, setBlocks, {
    persist: (rows) => reorderProgramRows("agenda_blocks", rows),
    label: "blok agenda",
    ...reorderOptions,
  });
  const onReorderSlots = useReorder(slotRows, setSlotRows, {
    persist: (rows) => reorderProgramRows("agenda_slots", rows),
    label: "slot jam",
    ...reorderOptions,
  });

  if (!permRead) return <EmptyPerms />;

  const inputCls =
    "w-full rounded-xl border border-[#dce3ed] bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20";
  const labelCls = "mb-1.5 block text-sm font-semibold text-slate-700";
  const meta = form ? SECTION_TABS.find((s) => s.key === form.kind)! : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
          <BookOpen className="h-5 w-5 text-[var(--brand-accent)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Program</h1>
          <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
            Konten halaman publik /program — pilar Wafa, blok &amp; slot agenda
          </p>
        </div>
      </div>

      {/* Tab section */}
      <div className="mb-6 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-[#dce3ed] bg-slate-50 p-1">
        {SECTION_TABS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(s.key)}
            title={s.hint}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${
              tab === s.key
                ? "bg-[var(--brand-primary)] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s.label}
            <span className={tab === s.key ? "ml-1.5 opacity-70" : "ml-1.5 text-slate-400"}>
              {rowsFor(s.key).length || ""}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonBlock key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <Warning className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-sm font-medium text-slate-600">Gagal memuat data program</p>
          <p className="mt-0.5 max-w-md text-xs text-slate-500">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchAll()}
            className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]"
          >
            Coba lagi
          </button>
        </div>
      ) : tab === "pillars" ? (
        <ListShell empty="Belum ada pilar Al-Qur'an." ids={pillars.map((r) => r.id)} onReorder={onReorderPillars}>
          {pillars.map((row, idx) => (
            <ProgramCard
              key={row.id}
              id={row.id}
              index={idx}
              label={row.title}
              dragDisabled={dragDisabled}
              actions={
                <>
                  <ToggleBadge
                    active={row.is_active}
                    interactive={permUpdate}
                    label={row.title}
                    onToggle={() => handleToggle("pillars", row.id, !row.is_active)}
                  />
                  <EditBtn show={permUpdate} onClick={() => openEdit("pillars", row.id)} />
                </>
              }
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-lg font-black tabular-nums text-white">
                {row.number}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[var(--brand-primary)]">{row.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{row.description}</p>
                <p className="mt-1 text-[13px] font-semibold tabular-nums text-[var(--brand-primary)]">
                  {row.time_label}
                </p>
                {row.target && <p className="text-[13px] text-slate-500">{row.target}</p>}
              </div>
            </ProgramCard>
          ))}
        </ListShell>
      ) : tab === "blocks" ? (
        <ListShell empty="Belum ada blok agenda." ids={blocks.map((r) => r.id)} onReorder={onReorderBlocks}>
          {blocks.map((row, idx) => (
            <ProgramCard
              key={row.id}
              id={row.id}
              index={idx}
              label={row.title}
              dragDisabled={dragDisabled}
              actions={
                <>
                  <ToggleBadge
                    active={row.is_active}
                    interactive={permUpdate}
                    label={row.title}
                    onToggle={() => handleToggle("blocks", row.id, !row.is_active)}
                  />
                  <EditBtn show={permUpdate} onClick={() => openEdit("blocks", row.id)} />
                </>
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-[var(--brand-primary)]">{row.title}</h3>
                  <code className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                    {row.key}
                  </code>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{row.summary}</p>
                <p className="mt-1 text-[13px] font-semibold tabular-nums text-[var(--brand-primary)]">
                  {row.time_label || `${row.start_time}–${row.end_time}`}
                </p>
                {row.button_text && (
                  <p className="mt-1 text-[13px] text-slate-500">Chip: {row.button_text}</p>
                )}
              </div>
            </ProgramCard>
          ))}
        </ListShell>
      ) : (
        <ListShell empty="Belum ada slot jam." ids={slotRows.map((r) => r.id)} onReorder={onReorderSlots}>
          {slotRows.map((row, idx) => (
            <ProgramCard
              key={row.id}
              id={row.id}
              index={idx}
              label={`Slot ${row.start_time}`}
              dragDisabled={dragDisabled}
              actions={
                <>
                  <ToggleBadge
                    active={row.is_active}
                    interactive={permUpdate}
                    label={`slot ${row.id}`}
                    onToggle={() => handleToggle("slots", row.id, !row.is_active)}
                  />
                  <EditBtn show={permUpdate} onClick={() => openEdit("slots", row.id)} />
                </>
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[var(--brand-primary)]/10 px-2 py-0.5 text-xs font-bold tabular-nums text-[var(--brand-primary)]">
                    {row.start_time.replace(":", ".")}–{row.end_time.replace(":", ".")}
                  </span>
                  <span className="text-[13px] font-semibold text-slate-700">
                    {BLOCKS.find((b) => b.key === row.block_key)?.title ?? row.block_key}
                  </span>
                  <code className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                    {row.id}
                  </code>
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {row.items.map((item) => (
                    <li
                      key={item.label}
                      className="rounded-lg border border-[#e5ebf2] bg-white px-2.5 py-1 text-[13px] font-medium text-slate-700"
                    >
                      {item.label}
                      {item.days?.length ? (
                        <span className="ml-1 text-[11px] text-slate-400">
                          {item.days.join(", ")}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </ProgramCard>
          ))}
        </ListShell>
      )}

      {/* Form SlideOver */}
      <SlideOver
        open={form !== null}
        onClose={() => !saving && setForm(null)}
        title={meta ? `Edit ${meta.label}` : ""}
        description={meta?.hint}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={!!form?.isActive}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, isActive: e.target.checked } : f))
                }
                disabled={!permUpdate || saving}
                className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]"
              />
              <span className="text-sm font-medium text-slate-700">Tampilkan di publik</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={saving}
                className="min-h-11 rounded-xl border border-[#dce3ed] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !permUpdate}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-60"
              >
                <FloppyDisk className="h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        }
      >
        {form?.kind === "pillars" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div>
                <label className={labelCls} htmlFor="pillar-number">
                  Nomor
                </label>
                <input
                  id="pillar-number"
                  type="text"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="01"
                  autoComplete="off"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-400">Dua digit, unik (mis. 01)</p>
              </div>
              <div>
                <label className={labelCls} htmlFor="pillar-title">
                  Judul
                </label>
                <input
                  id="pillar-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="pillar-desc">
                Deskripsi
              </label>
              <textarea
                id="pillar-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pillar-time">
                Waktu (label)
              </label>
              <input
                id="pillar-time"
                type="text"
                value={form.timeLabel}
                onChange={(e) => setForm({ ...form, timeLabel: e.target.value })}
                placeholder="Senin–Jumat · 07.30–08.10 WIB"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pillar-target">
                Target tambahan (opsional)
              </label>
              <input
                id="pillar-target"
                type="text"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-400">Kosong → tidak dirender di kartu publik</p>
            </div>
          </div>
        )}

        {form?.kind === "blocks" && (
          <div className="space-y-4">
            <div>
              <span className={labelCls}>Kunci (dipakai kode)</span>
              <p className="rounded-xl border border-[#dce3ed] bg-slate-50 px-4 py-2.5 font-mono text-sm text-slate-600">
                {form.key}
              </p>
              <p className="mt-1 text-xs text-slate-400">Tidak bisa diubah</p>
            </div>
            <div>
              <label className={labelCls} htmlFor="block-title">
                Judul
              </label>
              <input
                id="block-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="block-button">
                  Chip opsional
                </label>
                <input
                  id="block-button"
                  type="text"
                  value={form.buttonText}
                  onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                  placeholder="Dini Hari & Subuh"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="block-timelabel">
                  Label jam
                </label>
                <input
                  id="block-timelabel"
                  type="text"
                  value={form.timeLabel}
                  onChange={(e) => setForm({ ...form, timeLabel: e.target.value })}
                  placeholder="03.00-06.30 WIB"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="block-start">
                  Jam mulai
                </label>
                <input
                  id="block-start"
                  type="time"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="block-end">
                  Jam selesai
                </label>
                <input
                  id="block-end"
                  type="time"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Boleh kurang dari mulai (lintas tengah malam)
                </p>
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="block-summary">
                Ringkasan
              </label>
              <textarea
                id="block-summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={4}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {form?.kind === "slots" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="slot-start">
                  Jam mulai
                </label>
                <input
                  id="slot-start"
                  type="time"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="slot-end">
                  Jam selesai
                </label>
                <input
                  id="slot-end"
                  type="time"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Boleh kurang dari mulai (mis. 21:00 → 03:00)
                </p>
              </div>
            </div>
            <Select
              label="Blok pemilik"
              options={BLOCK_OPTIONS}
              value={form.blockKey}
              onChange={(v) => setForm({ ...form, blockKey: v })}
            />
            <div>
              <label className={labelCls} htmlFor="slot-items">
                Item kegiatan
              </label>
              <textarea
                id="slot-items"
                value={form.itemsText}
                onChange={(e) => setForm({ ...form, itemsText: e.target.value })}
                rows={8}
                placeholder={"Shalat Subuh\nSahur | Senin,Kamis"}
                className={`${inputCls} font-mono text-[13px]`}
              />
              <p className="mt-1 text-xs text-slate-400">
                Satu item per baris: <code className="font-mono">Label | Senin,Kamis</code>.
                Tanpa &quot;|&quot; = setiap hari. Hari: Senin..Ahad.
              </p>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

/* ── Sub-komponen daftar (desktop & mobile sama — data kecil, tanpa tabel) ── */

function ListShell({
  children,
  empty,
  ids,
  onReorder,
}: {
  children: React.ReactNode;
  empty: string;
  ids: string[];
  onReorder: (from: number, to: number) => void;
}) {
  const rows = Array.isArray(children) ? children : [children];
  if (rows.filter(Boolean).length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dce3ed] bg-white px-4 py-10 text-center text-sm text-slate-500">
        {empty}
      </div>
    );
  }
  return (
    <SortableList ids={ids} onReorder={onReorder}>
      <div className="grid gap-3">{children}</div>
    </SortableList>
  );
}

/** Kartu section yang bisa diseret — grip urutan dirender di kolom aksi. */
function ProgramCard({
  id,
  index,
  label,
  dragDisabled,
  actions,
  children,
}: {
  id: string;
  index: number;
  label: string;
  dragDisabled: boolean;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SortableRow id={id} disabled={dragDisabled}>
      {({ setNodeRef, style, isDragging, attributes, listeners }) => (
        <div
          ref={setNodeRef}
          style={style}
          className={`relative rounded-2xl transition-colors ${isDragging ? "bg-slate-50 opacity-70" : ""}`}
        >
          <CardShell
            actions={
              <>
                <SortableGrip index={index} label={label} disabled={dragDisabled} attributes={attributes} listeners={listeners} />
                {actions}
              </>
            }
          >
            {children}
          </CardShell>
        </div>
      )}
    </SortableRow>
  );
}

function CardShell({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:gap-4 sm:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-4">{children}</div>
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-col sm:items-end">
        {actions}
      </div>
    </div>
  );
}

function ToggleBadge({
  active,
  interactive,
  label,
  onToggle,
}: {
  active: boolean;
  interactive: boolean;
  label: string;
  onToggle: () => void;
}) {
  const style = active
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-slate-200 bg-slate-100 text-slate-500";
  const cls = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style} ${
    interactive ? "cursor-pointer transition-colors hover:opacity-80" : ""
  }`;
  const inner = (
    <>
      {active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {active ? "Tampil" : "Tidak tampil"}
    </>
  );
  if (!interactive) return <span className={cls}>{inner}</span>;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Ubah status ${label}: sekarang ${active ? "aktif" : "nonaktif"}`}
      title={`Klik untuk ubah status — ${label}`}
      className={cls}
    >
      {inner}
    </button>
  );
}

function EditBtn({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title="Edit"
      aria-label="Edit"
      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
    >
      <PencilSimple className="h-4 w-4" />
    </button>
  );
}


function EmptyPerms() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-16 text-center">
      <Checks className="h-7 w-7 text-slate-300" />
      <p className="text-sm font-medium text-slate-600">
        Anda tidak punya izin membaca modul Program.
      </p>
    </div>
  );
}
