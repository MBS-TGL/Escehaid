"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getPortalAppsAdmin,
  createPortalApp,
  updatePortalApp,
  deletePortalApp,
  revalidatePortal,
} from "@/lib/queries";
import type { PortalAppAdmin, PortalAppInput } from "@/lib/queries";
import { StatCard, StatCardRow, ConfirmModal, SlideOver } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import {
  SquaresFour,
  Plus,
  PencilSimple,
  Trash,
  FloppyDisk,
} from "@/components/Icons";
import {
  PORTAL_ICONS,
  PORTAL_ICON_LABELS,
  PORTAL_COLORS,
  resolvePortalColor,
  normalizeHex,
} from "@/lib/portal-theme";

const ICON_NAMES = Object.keys(PORTAL_ICONS);
const COLOR_KEYS = Object.keys(PORTAL_COLORS);

const EMPTY_FORM: PortalAppInput = {
  label: "",
  description: "",
  href: "",
  icon: "SquaresFour",
  color: "navy",
  is_external: true,
  is_coming_soon: false,
  is_active: true,
  sort_order: 0,
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20";

function resolveIcon(name: string) {
  return PORTAL_ICONS[name] ?? SquaresFour;
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]";
const triggerClass = `${inputClass} flex items-center justify-between gap-3 bg-white text-left`;
const popoverClass =
  "absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-lg";

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

/** Buka/tutup dropdown; tutup saat klik di luar atau tekan Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return { open, setOpen, ref };
}

function ThemeChip({ icon, color }: { icon: string; color: string }) {
  const Icon = resolveIcon(icon);
  const rc = resolvePortalColor(color);
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-lg ${rc.tileClass}`}
        style={rc.tileStyle}
      >
        <Icon className="h-4 w-4" weight="fill" />
      </span>
      {PORTAL_ICON_LABELS[icon] ?? icon} · {rc.label}
    </span>
  );
}

function TilePreview({
  label,
  description,
  icon,
  color,
  soon,
}: {
  label: string;
  description: string;
  icon: string;
  color: string;
  soon: boolean;
}) {
  const Icon = resolveIcon(icon);
  const rc = resolvePortalColor(color);
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
      <p className="mb-3 text-xs font-semibold text-slate-500">Pratinjau di halaman portal</p>
      <div
        className={`mx-auto flex w-36 flex-col items-center gap-1.5 rounded-2xl border border-[#dce3ed] bg-white px-2 py-4 text-center ${soon ? "opacity-60" : ""
          }`}
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${rc.tileClass}`}
          style={rc.tileStyle}
        >
          <Icon className="h-6 w-6" weight="fill" />
        </span>
        <span className="break-words text-sm font-semibold text-slate-800">
          {label.trim() || "Nama aplikasi"}
        </span>
        <span className="line-clamp-2 text-[11px] leading-tight text-slate-500">
          {soon ? "Segera hadir" : description.trim() || "Deskripsi singkat"}
        </span>
      </div>
    </div>
  );
}

function IconPicker({
  value,
  color,
  onChange,
}: {
  value: string;
  color: string;
  onChange: (name: string) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const rc = resolvePortalColor(color);
  const Current = resolveIcon(value);

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setQuery("");
  }, [open]);

  const q = query.trim().toLowerCase();
  const names = q
    ? ICON_NAMES.filter(
      (n) => n.toLowerCase().includes(q) || (PORTAL_ICON_LABELS[n] ?? "").toLowerCase().includes(q),
    )
    : ICON_NAMES;

  function pick(name: string) {
    onChange(name);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={triggerClass}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${rc.tileClass}`}
            style={rc.tileStyle}
          >
            <Current className="h-5 w-5" weight="fill" />
          </span>
          <span className="truncate">{PORTAL_ICON_LABELS[value] ?? value}</span>
          <span className="truncate text-xs text-slate-400">{value}</span>
        </span>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div className={popoverClass}>
          <div className="border-b border-slate-100 p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (names[0]) pick(names[0]);
                }
              }}
              placeholder="Cari ikon, mis. buku atau kalender"
              aria-label="Cari ikon"
              className={inputClass}
            />
          </div>
          {names.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Ikon tidak ditemukan</p>
          ) : (
            <div
              role="listbox"
              aria-label="Ikon"
              className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto p-2"
            >
              {names.map((name) => {
                const Icon = PORTAL_ICONS[name];
                const selected = name === value;
                const label = PORTAL_ICON_LABELS[name] ?? name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-label={label}
                    title={label}
                    onClick={() => pick(name)}
                    style={selected ? rc.tileStyle : undefined}
                    className={`flex h-11 items-center justify-center rounded-lg transition-colors ${focusRing} ${selected
                        ? `${rc.tileClass} ring-2 ring-[#082b59]`
                        : "text-slate-500 hover:bg-slate-100"
                      }`}
                  >
                    <Icon className="h-6 w-6" weight={selected ? "fill" : "regular"} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const { open, setOpen, ref } = usePopover();
  const rc = resolvePortalColor(value);
  const [draft, setDraft] = useState("");

  // Sinkronkan kotak hex dengan nilai saat ini (kosong bila memakai preset).
  useEffect(() => {
    setDraft(PORTAL_COLORS[value] ? "" : normalizeHex(value) ?? "");
  }, [value]);

  function commitDraft() {
    const hex = normalizeHex(draft);
    if (hex) onChange(hex);
    else setDraft(PORTAL_COLORS[value] ? "" : normalizeHex(value) ?? "");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={triggerClass}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={`h-6 w-6 shrink-0 rounded-full ${rc.dotClass}`} style={rc.dotStyle} />
          <span className="truncate">{rc.label}</span>
        </span>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div className={`${popoverClass} p-3`}>
          <div role="listbox" aria-label="Warna preset" className="grid grid-cols-6 gap-2.5">
            {COLOR_KEYS.map((key) => {
              const c = PORTAL_COLORS[key];
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`h-9 w-9 justify-self-center rounded-full ring-2 ring-offset-2 transition-shadow ${focusRing} ${selected ? "ring-[#082b59]" : "ring-transparent hover:ring-slate-200"
                    }`}
                >
                  <span className={`flex h-full w-full items-center justify-center rounded-full ${c.dot}`}>
                    {selected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">Warna kustom</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pilih warna kustom"
                value={normalizeHex(value) ?? "#7c3aed"}
                onChange={(e) => onChange(e.target.value.toLowerCase())}
                className={`h-10 w-12 shrink-0 cursor-pointer rounded-lg border bg-white p-1 ${rc.custom ? "border-[#082b59] ring-2 ring-[#082b59]/30" : "border-slate-200"
                  }`}
              />
              <input
                type="text"
                value={draft}
                maxLength={7}
                placeholder="#7c3aed"
                aria-label="Kode warna hex"
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft(v);
                  if (/^#?[0-9a-f]{6}$/i.test(v.trim())) onChange(normalizeHex(v) as string);
                }}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitDraft();
                  }
                }}
                className={inputClass}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Pilih dari kotak warna atau ketik kode hex, mis. #7c3aed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ app }: { app: PortalAppAdmin }) {
  if (!app.is_active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
        Nonaktif
      </span>
    );
  }
  if (app.is_coming_soon) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        Segera Hadir
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      Aktif
    </span>
  );
}

export default function AdminPortalPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<PortalAppAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteItem, setDeleteItem] = useState<PortalAppAdmin | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PortalAppAdmin | null>(null);
  const [form, setForm] = useState<PortalAppInput>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const data = await getPortalAppsAdmin();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(item: PortalAppAdmin) {
    setEditItem(item);
    setForm({
      label: item.label,
      description: item.description,
      href: item.href,
      icon: item.icon,
      color: item.color,
      is_external: item.is_external,
      is_coming_soon: item.is_coming_soon,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.label.trim()) { toast("Nama aplikasi wajib diisi", "error"); return; }
    if (!form.href.trim()) { toast("URL/link wajib diisi", "error"); return; }
    setFormSaving(true);
    const input: PortalAppInput = { ...form, sort_order: Number(form.sort_order) || 0 };
    const { error } = editItem
      ? await updatePortalApp(editItem.id, input)
      : await createPortalApp(input);
    if (error) { toast(error, "error"); setFormSaving(false); return; }
    toast(editItem ? "Aplikasi diperbarui" : "Aplikasi ditambahkan", "success");
    setFormOpen(false);
    setFormSaving(false);
    revalidatePortal().catch(() => { });
    fetchItems();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    const { error } = await deletePortalApp(deleteItem.id);
    if (error) { toast(error, "error"); return; }
    toast("Aplikasi dihapus", "success");
    setDeleteItem(null);
    revalidatePortal().catch(() => { });
    fetchItems();
  }

  const activeCount = items.filter((i) => i.is_active).length;
  const soonCount = items.filter((i) => i.is_active && i.is_coming_soon).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1767b1]/10">
            <SquaresFour className="h-5 w-5 text-[#1767b1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola Portal</h1>
            <p className="text-sm text-slate-500">Kelola aplikasi yang tampil di halaman /portal</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1767b1]">
          <Plus className="h-4 w-4" /> Tambah Aplikasi
        </button>
      </div>

      {/* Stats */}
      <StatCardRow>
        <StatCard label="Total" value={items.length} variant="brand" />
        <StatCard label="Aktif" value={activeCount} variant="success" />
        <StatCard label="Segera Hadir" value={soonCount} variant="warning" />
      </StatCardRow>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">No</th>
                <th className="w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Urutan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aplikasi</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Link</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ikon / Warna</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data aplikasi portal...</p>
                  </div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <SquaresFour className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">Belum ada aplikasi di portal</p>
                    </div>
                    <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#082b59] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1767b1]">
                      <Plus className="h-3.5 w-3.5" /> Tambah Aplikasi Pertama
                    </button>
                  </div>
                </td></tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id} className="group transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 text-sm text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-500">{item.sort_order}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      {item.description && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{item.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block max-w-[180px] truncate text-xs text-slate-500">
                        {item.href}
                        {item.is_external && <span className="ml-1 text-slate-400">(luar)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      <ThemeChip icon={item.icon} color={item.color} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge app={item} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
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
      </div>

      {/* Create/Edit SlideOver */}
      <SlideOver open={formOpen} onClose={() => !formSaving && setFormOpen(false)}
        title={editItem ? "Edit Aplikasi" : "Tambah Aplikasi"}
        description={editItem ? "Perbarui data aplikasi portal" : "Isi form untuk menambahkan aplikasi"}
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
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama Aplikasi <span className="text-red-500">*</span></label>
            <input type="text" value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Contoh: E-Learning"
              className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi</label>
            <textarea rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Keterangan singkat yang tampil di bawah nama aplikasi"
              className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">URL / Link <span className="text-red-500">*</span></label>
            <input type="text" value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
              placeholder="/news atau https://..."
              className={inputClass} />
            <p className="mt-1.5 text-xs text-slate-400">Halaman tujuan; walaupun &quot;Segera Hadir&quot; aktif, kolom ini tetap wajib diisi (boleh &quot;#&quot;).</p>
          </div>
          <TilePreview
            label={form.label}
            description={form.description}
            icon={form.icon}
            color={form.color}
            soon={form.is_coming_soon}
          />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ikon</label>
            <IconPicker value={form.icon} color={form.color}
              onChange={(name) => setForm({ ...form, icon: name })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Warna</label>
            <ColorPicker value={form.color}
              onChange={(key) => setForm({ ...form, color: key })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Urutan Tampil</label>
            <input type="number" value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              className={inputClass} />
            <p className="mt-1.5 text-xs text-slate-400">Angka kecil tampil lebih dulu.</p>
          </div>
          <div className="space-y-2.5">
            {([
              { key: "is_active" as const, label: "Aktif (tampil di halaman portal)" },
              { key: "is_coming_soon" as const, label: "Segera hadir (tile ditandai akan datang)" },
              { key: "is_external" as const, label: "Buka di tab baru (link luar)" },
            ]).map((opt) => (
              <label key={opt.key} className="flex items-center gap-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={form[opt.key]}
                  onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-[#082b59] focus:ring-[#1767b1]" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </SlideOver>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Aplikasi?"
        description={`"${deleteItem?.label}" akan dihapus permanen dari portal.`}
      />
    </div>
  );
}