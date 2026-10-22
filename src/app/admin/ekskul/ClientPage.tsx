"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  getEkskulListAll,
  createEkskul,
  updateEkskul,
  deleteEkskul,
  deleteEkskulBulk,
  uploadEkskulImage,
  revalidateEkskul,
} from "@/lib/queries";
import { slugifyEkskul, EKSKUL_DAYS, formatEkskulSchedule } from "@/app/ekskul-data";
import { PORTAL_ICONS, PORTAL_ICON_LABELS, PORTAL_ICON_SEARCH } from "@/lib/portal-theme";
import EkskulGlyph from "@/components/EkskulIcon";
import type { Ekskul } from "@/lib/supabase";
import { ConfirmModal, SlideOver, SkeletonBlock, Select } from "@/components/ui";
import { useFloatingPanel } from "@/components/ui/useFloatingPanel";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import {
  Trophy,
  Plus,
  PencilSimple,
  Trash,
  Checks,
  FloppyDisk,
  X,
  CaretLeft,
  CaretRight,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  ImageSquare,
  SquaresFour,
  CaretDown,
} from "@/components/Icons";
import {
  MobileFilterBar,
  MobilePagination,
  MobilePickButton,
  MobileListRow,
  MobileSelectBar,
  RowActionsMenu,
  StatusDot,
  QuietBadge,
  type RowAction,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";

type FilterTab = "all" | "active" | "inactive";

const PAGE_SIZE = 10;

/* Picker ikon ekskul ala portal (/admin/portal): trigger berisi tile preview
 * ikon + label, panel opsi di-portal ke body dengan position:fixed memakai
 * hook bersama `useFloatingPanel` (flip atas/bawah, re-posisi saat scroll
 * modal & resize) supaya tinggi SlideOver tidak berubah saat panel dibuka.
 * Opsi = registry penuh ikon portal (110 ikon, PORTAL_ICONS) + tile pertama
 * khusus "Otomatis (dari slug)" (nilai "") — tidak seperti portal yang balik
 * ke fallback tengah; ekskul butuh pilihan eksplisit karena ikon dirandom dari
 * slug bila dikosongkan. Pencarian selalu terlihat di kepala panel, grid ikon
 * men-scroll internal; tutup dengan klik di luar/Esc (Esc capture — SlideOver
 * di belakang tidak ikut tertutup); fokus kembali ke trigger, query di-reset. */
const PICKER_INPUT_CLS =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20";
const PICKER_TRIGGER_CLS = `${PICKER_INPUT_CLS} flex items-center justify-between gap-3 bg-white text-left`;
const PICKER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]";

const PICKER_ICON_NAMES = Object.keys(PORTAL_ICONS);

/** Label Indonesia untuk nilai kolom `icon` versi legacy (baris seed & data
 * lama memakai kunci lowercase; data baru memakai nama PascalCase portal). */
const EKSKUL_LEGACY_ICON_LABELS: Record<string, string> = {
  soccer: "Bola",
  pingpong: "Bulu tangkis",
  tent: "Tenda",
  target: "Target",
  microphone: "Mikrofon",
  trophy: "Trophy",
};

function ikonEkskulLabel(value: string): string {
  return PORTAL_ICON_LABELS[value] ?? EKSKUL_LEGACY_ICON_LABELS[value] ?? value;
}

/* Tile preview di trigger & tile "Otomatis" — kunci bisa legacy lowercase
 * maupun nama portal, jadi lewat EkskulGlyph (sudah menangani keduanya). */
function EkskulIconTileGlyph({
  iconKey,
  className,
}: {
  iconKey: string;
  className: string;
}) {
  if (!iconKey) return <SquaresFour className={className} />;
  return <EkskulGlyph iconKey={iconKey} className={className} />;
}

function EkskulIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { pos, reposition } = useFloatingPanel({
    triggerRef,
    open,
    onTriggerLost: () => setOpen(false),
    maxHeight: 360,
    minFit: 260,
  });

  // Buka → fokus ke pencarian; tutup → reset query + kembalikan fokus ke
  // trigger. wasOpen supaya fokus tidak "mencuri" saat komponen baru mount.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      searchRef.current?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      setQuery("");
      triggerRef.current?.focus();
    }
  }, [open]);

  // Tutup saat klik di luar trigger DAN di luar panel (portal-nya).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Esc → tutup panel saja; capture + stopPropagation mencegah SlideOver
  // di belakangnya ikut tertutup (sama seperti IconPicker portal).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  const q = query.trim().toLowerCase();
  const names = q
    ? PICKER_ICON_NAMES.filter((n) => PORTAL_ICON_SEARCH[n].includes(q))
    : PICKER_ICON_NAMES;

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!triggerRef.current) return;
    // Posisi dihitung dalam batch yang sama dengan setOpen — panel sudah
    // pada posisi benar sejak render pertama (tanpa frame kosong).
    reposition();
    setOpen(true);
  }

  function pick(key: string) {
    onChange(key);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={PICKER_TRIGGER_CLS}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e4ecf6] text-[var(--brand-accent)]">
            <EkskulIconTileGlyph iconKey={value} className="h-5 w-5" />
          </span>
          <span className="truncate">
            {value ? ikonEkskulLabel(value) : "Otomatis (dari slug)"}
          </span>
          {value ? <span className="truncate text-xs text-slate-400">{value}</span> : null}
        </span>
        <CaretDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              // Di atas overlay SlideOver (z-[9999]) karena panel di-portal keluar.
              zIndex: 10000,
            }}
            className="flex flex-col overflow-hidden rounded-xl border border-[#dce3ed] bg-white shadow-lg"
          >
            <div className="shrink-0 border-b border-slate-100 p-2">
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
                placeholder={`Cari ${PICKER_ICON_NAMES.length} ikon, mis. bola, musik, masjid`}
                aria-label="Cari ikon"
                className={PICKER_INPUT_CLS}
              />
            </div>
            {names.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Ikon tidak ditemukan</p>
            ) : (
              <div
                role="group"
                aria-label="Ikon ekskul"
                className="grid min-h-0 flex-1 grid-cols-6 gap-1 overflow-y-auto p-2"
              >
                {/* Tile pertama: "" = Otomatis (dari slug) */}
                <button
                  key="auto"
                  type="button"
                  aria-pressed={value === ""}
                  title="Otomatis (dari slug)"
                  onClick={() => pick("")}
                  className={`flex h-11 items-center justify-center rounded-lg transition-colors ${PICKER_FOCUS_RING} ${
                    value === ""
                      ? "bg-[#e4ecf6] text-[var(--brand-accent)] ring-2 ring-[var(--brand-primary)]"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <SquaresFour className="h-6 w-6" weight={value === "" ? "fill" : "regular"} />
                </button>
                {names.map((name) => {
                  const Icon = PORTAL_ICONS[name];
                  const selected = name === value;
                  const label = ikonEkskulLabel(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={selected}
                      aria-label={label}
                      title={label}
                      onClick={() => pick(name)}
                      className={`flex h-11 items-center justify-center rounded-lg transition-colors ${PICKER_FOCUS_RING} ${
                        selected
                          ? "bg-[#e4ecf6] text-[var(--brand-accent)] ring-2 ring-[var(--brand-primary)]"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-6 w-6" weight={selected ? "fill" : "regular"} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

export default function AdminEkskulPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy.ts/RLS (lihat PermissionsProvider).
  const permCreate = can("ekskul:create");
  const permUpdate = can("ekskul:update");
  const permDelete = can("ekskul:delete");
  const [items, setItems] = useState<Ekskul[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickMode, setPickMode] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Ekskul | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Ekskul | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // State form — slug otomatis dari nama; user bisa menimpa manual.
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSlugTouched, setFormSlugTouched] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formDay, setFormDay] = useState<string>("-1");
  const [formTime, setFormTime] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formCoach, setFormCoach] = useState("");
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formSort, setFormSort] = useState("");
  const [formActive, setFormActive] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getEkskulListAll();
      setItems(data);
    } catch (e) {
      // Query gagal → banner "Gagal memuat" + pesan (termasuk petunjuk
      // "jalankan supabase/ekskul.sql"), BUKAN daftar kosong palsu.
      setLoadError(e instanceof Error ? e.message : "Gagal memuat ekskul.");
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
    if (search) result = result.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
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
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelectedIds(s);
  }

  function enterPickMode(id?: string) {
    setPickMode(true);
    if (id) {
      const s = new Set(selectedIds);
      s.add(id);
      setSelectedIds(s);
    }
  }

  function exitPickMode() {
    setPickMode(false);
    setSelectedIds(new Set());
  }

  function nextSortOrder(): number {
    const max = items.reduce((acc, i) => Math.max(acc, i.sort_order || 0), 0);
    return max + 1;
  }

  function openCreate() {
    setEditItem(null);
    setFormName("");
    setFormSlug("");
    setFormSlugTouched(false);
    setFormDescription("");
    setFormIcon("");
    setFormDay("-1");
    setFormTime("");
    setFormNote("");
    setFormCoach("");
    setFormImageUrl(null);
    setImageFile(null);
    setFormSort(String(nextSortOrder()));
    setFormActive(true);
    setFormOpen(true);
  }

  function openEdit(item: Ekskul) {
    setEditItem(item);
    setFormName(item.name);
    setFormSlug(item.slug);
    setFormSlugTouched(false);
    setFormDescription(item.description || "");
    setFormIcon(item.icon || "");
    setFormDay(item.schedule_day === null || item.schedule_day === undefined ? "-1" : String(item.schedule_day));
    setFormTime(item.schedule_time ? item.schedule_time.slice(0, 5) : "");
    setFormNote(item.schedule_note || "");
    setFormCoach(item.coach || "");
    setFormImageUrl(item.image_url || null);
    setImageFile(null);
    setFormSort(String(item.sort_order ?? 0));
    setFormActive(item.is_active);
    setFormOpen(true);
  }

  async function handleSave() {
    const name = formName.trim();
    if (!name) {
      toast("Nama ekskul wajib diisi", "error");
      return;
    }
    if (formTime && !/^\d{1,2}:\d{2}$/.test(formTime)) {
      toast("Format jam tidak valid (mis. 08:00)", "error");
      return;
    }
    // Slug: bila user menimpa manual → pakai itu; selain itu slug otomatis
    // dari nama. Kosong setelah slugify = gagal validasi.
    const slug = slugifyEkskul(formSlugTouched ? formSlug : name);
    if (!slug) {
      toast("Slug wajib diisi (atau sesuaikan nama)", "error");
      return;
    }
    setFormSaving(true);
    const payload = {
      name,
      slug,
      description: formDescription.trim(),
      icon: formIcon,
      schedule_day: formDay === "-1" ? null : Number(formDay),
      schedule_time: formTime ? `${formTime}:00` : null,
      schedule_note: formNote.trim(),
      coach: formCoach.trim(),
      sort_order: Number(formSort) || 0,
      is_active: formActive,
    };

    try {
      if (editItem) {
        let imageUrl: string | null = formImageUrl;
        if (imageFile) {
          const uploaded = await uploadEkskulImage(imageFile, editItem.id);
          if (uploaded.error) {
            toast(uploaded.error, "error");
            setFormSaving(false);
            return;
          }
          imageUrl = uploaded.url;
        }
        const { error } = await updateEkskul(editItem.id, { ...payload, image_url: imageUrl || "" });
        if (error) {
          toast(error, "error");
          setFormSaving(false);
          return;
        }
      } else {
        // Ekskul baru: unggah pakai tempId agar gambar masuk folder ekskul
        // BARU (bukan menumpuk di folder tempId orang lain). Bila gagal,
        // tetap bersihkan sisa file yang sudah terunggah (best-effort).
        const tempId = "temp-" + Math.random().toString(36).slice(2);
        let imageUrl: string | null = null;
        if (imageFile) {
          const uploaded = await uploadEkskulImage(imageFile, tempId);
          if (uploaded.error) {
            toast("Ekskul gagal dibuat: " + uploaded.error, "error");
            setFormSaving(false);
            return;
          }
          imageUrl = uploaded.url;
        }
        const { error } = await createEkskul({ ...payload, image_url: imageUrl || "" });
        if (error) {
          toast(error, "error");
          setFormSaving(false);
          return;
        }
      }
      toast("Ekskul berhasil disimpan", "success");
      setFormOpen(false);
      await revalidateEkskul();
      await fetchItems();
    } finally {
      setFormSaving(false);
    }
  }

  async function handleToggle(item: Ekskul) {
    const { error } = await updateEkskul(item.id, { is_active: !item.is_active });
    if (error) {
      toast(`Gagal mengubah status: ${error}`, "error");
    } else {
      toast(`Ekskul ${!item.is_active ? "diaktifkan" : "dinonaktifkan"}`, "success");
    }
    fetchItems();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    const { error } = await deleteEkskul(deleteItem.id);
    if (error) {
      toast(`Gagal menghapus: ${error}`, "error");
    } else {
      toast("Ekskul berhasil dihapus", "success");
      await revalidateEkskul();
    }
    setDeleteItem(null);
    setSelectedIds((s) => {
      const n = new Set(s);
      n.delete(deleteItem.id);
      return n;
    });
    fetchItems();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await deleteEkskulBulk(ids);
    if (error) {
      toast(`Gagal menghapus: ${error}`, "error");
    } else {
      toast(`${ids.length} ekskul berhasil dihapus`, "success");
      await revalidateEkskul();
    }
    exitPickMode();
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
    // Penomoran ulang pada satu strip: urutan selalu 1..n tanpa gap.
    for (let i = 0; i < newOrder.length; i++) {
      await updateEkskul(newOrder[i].id, { sort_order: i + 1 });
    }
    toast("Urutan diperbarui", "success");
    fetchItems();
  }

  /** Simpan gambar yang dipilih di form (preview via object URL di input). */
  function onPickImage(file: File | null) {
    if (file && !file.type.startsWith("image/")) {
      toast("File harus gambar (JPG/PNG/WebP)", "error");
      return;
    }
    setImageFile(file);
    if (file) setFormImageUrl(URL.createObjectURL(file));
    else setFormImageUrl(null);
  }

  const activeCount = items.filter((i) => i.is_active).length;
  const inactiveCount = items.length - activeCount;

  const statusOptions = [
    { key: "all", label: "Semua", count: items.length },
    { key: "active", label: "Aktif", count: activeCount },
    { key: "inactive", label: "Nonaktif", count: inactiveCount },
  ];

  const inputCls =
    "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20";
  const labelCls = "mb-1.5 block text-sm font-semibold text-slate-700";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <Trophy className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Ekskul</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Ekstrakurikuler yang tampil di beranda &amp; profil
            </p>
          </div>
        </div>
        {permCreate && (
          <button
            onClick={openCreate}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)]"
          >
            <Plus className="h-4 w-4" /> Ekskul Baru
          </button>
        )}
      </div>

      {/* Stats */}
      <StatPillGroup>
        <StatPill icon={Trophy} label="Total" value={items.length} tone="neutral" />
        <StatPill icon={CheckCircle} label="Aktif" value={activeCount} tone="success" />
        <StatPill icon={XCircle} label="Nonaktif" value={inactiveCount} tone="danger" />
      </StatPillGroup>

      {/* Bulk actions — desktop */}
      {selectedIds.size > 0 && (
        <div className="mb-4 hidden flex-wrap items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex">
          <Checks className="h-4 w-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          {permDelete && (
            <button
              onClick={() => setBulkDelete(true)}
              aria-label={`Hapus ${selectedIds.size} ekskul terpilih`}
              className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
            >
              Hapus
            </button>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            aria-label="Hapus pilihan"
            title="Hapus pilihan"
            className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter + Search (desktop md+) */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari ekskul..."
          searchLabel="Cari ekskul"
          query={search}
          onQueryChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          filters={[
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => {
                setFilter(k as FilterTab);
                setPage(1);
                setSelectedIds(new Set());
              },
              menuLabel: "Filter status",
            },
          ]}
        />
      </div>

      {/* Toolbar mobile */}
      <MobileFilterBar
        placeholder="Cari ekskul…"
        searchLabel="Cari ekskul"
        query={search}
        onQueryChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => {
            setFilter(k as FilterTab);
            setPage(1);
            setSelectedIds(new Set());
          },
        }}
        action={<MobilePickButton onClick={() => setPickMode(true)} />}
        selectMode={pickMode}
        selectedCount={selectedIds.size}
        allSelected={allVisibleSelected}
        onSelectAllVisible={toggleSelectAll}
        onCancelSelect={exitPickMode}
      />

      {/* Tabel desktop (md+) */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                <th className="hidden w-10 px-4 py-3 sm:table-cell">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]"
                  />
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">No</th>
                <th className="hidden w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Urutan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ekskul</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Jadwal</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                      <p className="text-sm text-slate-500">Memuat data ekskul...</p>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                        <XCircle className="h-6 w-6 text-red-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Gagal memuat data</p>
                      <p className="mt-0.5 max-w-md text-xs text-slate-500">{loadError}</p>
                      <button onClick={() => fetchItems()} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                        Coba lagi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <Trophy className="h-8 w-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                        <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada ekskul"}</p>
                      </div>
                      {!search && filter === "all" && permCreate && (
                        <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                          <Plus className="h-3.5 w-3.5" /> Ekskul Pertama
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item, index) => (
                  <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[var(--brand-primary)]/[0.03]" : ""}`}>
                    <td className="hidden px-4 py-3.5 sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]"
                      />
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-400 sm:table-cell">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleReorder(item.id, "up")}
                          disabled={index === 0}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          aria-label={`Naikkan urutan ${item.name}`}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold text-slate-500 tabular-nums">{item.sort_order}</span>
                        <button
                          onClick={() => handleReorder(item.id, "down")}
                          disabled={index === paginated.length - 1}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          aria-label={`Turunkan urutan ${item.name}`}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            <Image src={item.image_url} alt={item.image_alt || item.name} fill sizes="40px" className="object-cover" />
                          </div>
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e4ecf6] text-[var(--brand-primary)]">
                            <EkskulGlyph slug={item.slug} iconKey={item.icon} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-700">{item.name}</span>
                          <span className="block truncate text-xs text-slate-400">/{item.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-slate-500">
                      {formatEkskulSchedule(item.schedule_day, item.schedule_time, item.schedule_note) || "—"}
                      {item.coach && <span className="block text-[11px] text-slate-400">Pembina: {item.coach}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={!permUpdate}
                        title={permUpdate ? "Klik untuk ubah status" : "Tidak berizin mengubah status"}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default disabled:opacity-70 ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {permUpdate && (
                          <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit">
                            <PencilSimple className="h-4 w-4" />
                          </button>
                        )}
                        {permDelete && (
                          <button onClick={() => setDeleteItem(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
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
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} ekskul
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[var(--brand-primary)] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Daftar mobile */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <div role="list" aria-label="Daftar ekskul">
          {loading ? (
            <div className="space-y-3 px-3 py-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-12 w-10 rounded-lg" />
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
              <p className="mt-0.5 max-w-xs text-xs text-slate-500">{loadError}</p>
              <button onClick={() => fetchItems()} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                Coba lagi
              </button>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Trophy className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada ekskul"}</p>
              </div>
              {!search && filter === "all" && permCreate && (
                <button onClick={openCreate} className="mt-1 flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                  <Plus className="h-3.5 w-3.5" /> Ekskul Pertama
                </button>
              )}
            </div>
          ) : (
            paginated.map((item, index) => (
              <EkskulMobileRow
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                selectMode={pickMode}
                onEnterPickMode={enterPickMode}
                onToggleSelect={toggleSelect}
                onEdit={openEdit}
                onDelete={setDeleteItem}
                onToggle={handleToggle}
                onReorder={handleReorder}
                canGoUp={index > 0}
                canGoDown={index < paginated.length - 1}
                canEdit={permUpdate}
                canDelete={permDelete}
                canToggle={permUpdate}
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
            itemLabel="ekskul"
          />
        )}
        {pickMode && <div className="h-24" aria-hidden="true" />}
      </div>

      {pickMode && (
        <MobileSelectBar
          count={selectedIds.size}
          onDelete={permDelete ? () => setBulkDelete(true) : undefined}
          onCancel={exitPickMode}
        />
      )}

      {/* Create/Edit SlideOver */}
      <SlideOver
        open={formOpen}
        onClose={() => !formSaving && setFormOpen(false)}
        title={editItem ? "Edit Ekskul" : "Ekskul Baru"}
        description={editItem ? "Perbarui data ekstrakurikuler" : "Isi form untuk menambah ekstrakurikuler"}
        footer={
          <div className="flex w-full items-center justify-between">
            <button onClick={() => setFormOpen(false)} disabled={formSaving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              Batal
            </button>
            <button onClick={handleSave} disabled={formSaving} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-70">
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
        }
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="ekskul-name" className={labelCls}>
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              id="ekskul-name"
              type="text"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                if (!formSlugTouched) setFormSlug(slugifyEkskul(e.target.value));
              }}
              placeholder="Contoh: Hizbul Wathan"
              autoComplete="off"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ekskul-slug" className={labelCls}>
              Slug (URL)
            </label>
            <input
              id="ekskul-slug"
              type="text"
              value={formSlug}
              onChange={(e) => {
                setFormSlugTouched(true);
                setFormSlug(e.target.value);
              }}
              placeholder="otomatis dari nama"
              autoComplete="off"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ekskul-description" className={labelCls}>
              Deskripsi singkat
            </label>
            <textarea
              id="ekskul-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              placeholder="Opsional — tampil di kartu beranda & profil"
              className={inputCls}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Hari"
              options={[{ value: "-1", label: "Belum ditetapkan" }, ...EKSKUL_DAYS.map((d, i) => ({ value: String(i), label: d }))]}
              value={formDay}
              onChange={setFormDay}
            />
            <div>
              <label htmlFor="ekskul-time" className={labelCls}>
                Jam
              </label>
              <input id="ekskul-time" type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor="ekskul-note" className={labelCls}>
              Catatan jadwal
            </label>
            <input
              id="ekskul-note"
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Opsional — mis. 2 minggu sekali"
              autoComplete="off"
              className={inputCls}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ekskul-coach" className={labelCls}>
                Pembina
              </label>
              <input
                id="ekskul-coach"
                type="text"
                value={formCoach}
                onChange={(e) => setFormCoach(e.target.value)}
                placeholder="Nama pembina (pisahkan koma bila lebih dari satu)"
                autoComplete="off"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="ekskul-sort" className={labelCls}>
                Urutan
              </label>
              <input
                id="ekskul-sort"
                type="number"
                value={formSort}
                onChange={(e) => setFormSort(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-400">Angka kecil tampil lebih dulu. Ekskul baru otomatis memakai urutan terbesar + 1.</p>
          <div>
            <label className={labelCls}>Ikon</label>
            <EkskulIconPicker value={formIcon} onChange={setFormIcon} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Gambar</span>
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {formImageUrl ? (
                  <Image src={formImageUrl} alt="Preview" fill sizes="80px" className="object-cover" unoptimized />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <ImageSquare className="h-6 w-6 text-slate-300" />
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Pilih gambar
                </button>
                {(imageFile || formImageUrl) && (
                  <button type="button" onClick={() => onPickImage(null)} className="w-fit text-xs font-semibold text-red-600 hover:underline">
                    Hapus gambar
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0] || null)}
            />
            {imageFile && <p className="mt-1.5 truncate text-xs text-slate-400">{imageFile.name}</p>}
          </div>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
            <span className="text-sm font-medium text-slate-700">Aktif (tampil di beranda &amp; profil)</span>
          </label>
        </div>
      </SlideOver>

      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Ekskul?"
        description={`"${deleteItem?.name}" akan dihapus permanen.`}
      />

      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Ekskul?`}
        description="Semua ekskul yang dipilih akan dihapus permanen."
      />
    </div>
  );
}

/**
 * Satu baris ekskul versi mobile (<md): [tile ikon + titik status]
 * [nama + slug + jadwal + badge Nonaktif] [menu ⋯: Edit, Nonaktifkan/Aktifkan,
 * Naik, Turun, Hapus]. Tap baris = Edit; long-press = mode pilih.
 */
function EkskulMobileRow({
  item,
  selected,
  selectMode,
  onEnterPickMode,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
  canGoUp,
  canGoDown,
  canEdit,
  canDelete,
  canToggle,
}: {
  item: Ekskul;
  selected: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (e: Ekskul) => void;
  onDelete: (e: Ekskul) => void;
  onToggle: (e: Ekskul) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  canGoUp: boolean;
  canGoDown: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canToggle: boolean;
}) {
  const schedule = formatEkskulSchedule(item.schedule_day, item.schedule_time, item.schedule_note);

  const actions: RowAction[] = [
    ...(canEdit ? [{ key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => onEdit(item) }] : []),
    ...(canToggle
      ? [
          {
            key: "toggle",
            label: item.is_active ? "Nonaktifkan" : "Aktifkan",
            icon: item.is_active ? <X className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
            run: () => onToggle(item),
          },
        ]
      : []),
    ...(canGoUp ? [{ key: "up", label: "Naik", icon: <ArrowUp className="h-4 w-4" />, run: () => onReorder(item.id, "up") }] : []),
    ...(canGoDown ? [{ key: "down", label: "Turun", icon: <ArrowDown className="h-4 w-4" />, run: () => onReorder(item.id, "down") }] : []),
    ...(canDelete ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) }] : []),
  ];

  return (
    <div role="listitem">
      <MobileListRow
        lead={
          selectMode ? (
            <span data-no-longpress="" onClick={(e) => e.stopPropagation()} className="flex h-10 w-10 shrink-0 items-center justify-center">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(item.id)}
                aria-label={`Pilih ${item.name}`}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              />
            </span>
          ) : (
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e4ecf6] text-[var(--brand-primary)]">
              {item.image_url ? (
                <Image src={item.image_url} alt={item.image_alt || item.name} width={48} height={48} sizes="48px" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <EkskulGlyph slug={item.slug} iconKey={item.icon} className="h-6 w-6" />
              )}
              <StatusDot tone={item.is_active ? "active" : "off"} label={item.is_active ? "Aktif" : "Nonaktif"} className="absolute bottom-0 right-0" />
            </span>
          )
        }
        title={item.name}
        badge={!item.is_active ? <QuietBadge>Nonaktif</QuietBadge> : undefined}
        subtitle={<span className="min-w-0 truncate">{schedule || `/${item.slug}`}</span>}
        actions={<RowActionsMenu label={item.name} actions={actions} disabled={selectMode} />}
        selected={selected}
        onClick={() => {
          if (selectMode) onToggleSelect(item.id);
          else onEdit(item);
        }}
        onLongPress={() => onEnterPickMode(item.id)}
      />
    </div>
  );
}
