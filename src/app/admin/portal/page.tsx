"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  getPortalAppsAdmin,
  createPortalApp,
  updatePortalApp,
  deletePortalApp,
  reorderPortalApps,
  revalidatePortal,
} from "@/lib/queries";
import type { PortalAppAdmin, PortalAppInput } from "@/lib/queries";
import { StatCard, StatCardRow, ConfirmModal, SlideOver } from "@/components/ui";
import { useFloatingPanel } from "@/components/ui/useFloatingPanel";
import { useToast } from "@/components/ui/Toast";
import { SquaresFour, Plus, FloppyDisk, Info, MagnifyingGlass, ArrowSquareOut, Checks, CheckSquare } from "@/components/Icons";
import {
  PORTAL_ICONS,
  PORTAL_ICON_LABELS,
  PORTAL_ICON_SEARCH,
  PORTAL_COLORS,
  resolvePortalColor,
  normalizeHex,
} from "@/lib/portal-theme";
import { StatusControl, statusOf, flagsOf, STATUS_META, type PortalStatus } from "./StatusControl";
import { FilterBar, type PortalFilter } from "./FilterBar";
import { SortableRow, PORTAL_GRID } from "./SortableRow";

const ICON_NAMES = Object.keys(PORTAL_ICONS);
const COLOR_KEYS = Object.keys(PORTAL_COLORS);

const EMPTY_FORM: PortalAppInput = {
  label: "",
  description: "",
  href: "",
  icon: "SquaresFour",
  color: "navy",
  // Link kosong → otomatis bukan link luar (lihat autoExternal).
  is_external: false,
  is_coming_soon: false,
  is_active: true,
  sort_order: 0,
};

/** Is_external dihitung otomatis dari awalan URL: http(s):// → tab baru. */
function autoExternal(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

/* Mode "Buka di tab baru" di bagian Lanjutan — dimodelkan dari kolom
 * `is_external` (boolean) + `extManual` yang dihitung saat load
 * (`stored !== autoExternal(href)`), jadi TANPA kolom baru di DB.
 * "auto" = ikut awalan href; dua lainnya = timpaan manual. Batas inherent:
 * timpaan manual yang kebetulan sama dengan nilai auto terbaca kembali
 * sebagai "Otomatis" (tidak bisa dibedakan dari penyimpanan). */
type TabMode = "auto" | "newtab" | "sametab";
const TAB_MODES: TabMode[] = ["auto", "newtab", "sametab"];
const TAB_MODE_LABEL: Record<TabMode, string> = {
  auto: "Otomatis",
  newtab: "Tab baru",
  sametab: "Tab yang sama",
};
/** Ringkasan header akordeon (saat tertutup): "Tab baru: otomatis|ya|tidak". */
const TAB_MODE_SUMMARY: Record<TabMode, string> = {
  auto: "otomatis",
  newtab: "ya",
  sametab: "tidak",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]";
const triggerClass = `${inputClass} flex items-center justify-between gap-3 bg-white text-left`;

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

/**
 * Pratinjau tile pada form — sengaja ditiru dari `AppTile` di `src/app/portal/page.tsx`
 * (border #dce3ed, radius 2xl, ikon 48px, teks 14px/11px) supaya yang dilihat di form
 * sama persis dengan yang muncul di halaman publik.
 *
 * Kini satu tile saja (petak tetangga / ubin bayangan kedua dihapus) dan mengikuti status:
 *   live   → normal
 *   soon   → penanda persis seperti portal publik (opacity-60 + aria-disabled + "Segera hadir")
 *   hidden → redup + label kecil "Tidak tampil di portal"
 * Ikon/warna selalu dari pilihan form, termasuk warna kustom via resolvePortalColor().
 */
function TilePreview({
  label,
  description,
  icon,
  color,
  status,
}: {
  label: string;
  description: string;
  icon: string;
  color: string;
  status: PortalStatus;
}) {
  const Icon = PORTAL_ICONS[icon] ?? SquaresFour;
  const rc = resolvePortalColor(color);
  const soon = status === "soon";
  const hidden = status === "hidden";

  return (
    <div className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm">
      {/* Kepala — meniru judul bagian di /portal */}
      <div className="flex items-center justify-between gap-2 border-b border-[#e7ecf3] px-3.5 py-2 md:py-2.5">
        <span className="truncate text-[13px] font-bold text-[#082b59]">Aplikasi Sekolah</span>
        <span className="shrink-0 rounded-full bg-[#f4d21f]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#082b59]">
          Pratinjau
        </span>
      </div>

      {/* Latar sama dengan halaman portal (body bg-gray-50); satu tile
          terpusat, ukuran ringkas di layar kecil. */}
      <div className="bg-gray-50 p-2.5 md:p-3">
        <div
          aria-disabled={soon || hidden ? "true" : undefined}
          className={`mx-auto flex w-full max-w-[240px] flex-col items-center gap-1.5 rounded-2xl border border-[#dce3ed] bg-white px-2 py-3 text-center md:max-w-[320px] md:py-4 ${soon ? "opacity-60" : hidden ? "opacity-40" : ""
            }`}
        >
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${rc.tileClass}`}
            style={rc.tileStyle}
          >
            <Icon className="h-6 w-6" weight="fill" />
          </span>
          <span className="w-full break-words text-sm font-semibold leading-snug text-slate-800">
            {label.trim() || "Nama aplikasi"}
          </span>
          {hidden ? (
            <span className="w-full text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Tidak tampil di portal
            </span>
          ) : (
            <span className="line-clamp-2 w-full text-[11px] leading-tight text-slate-500">
              {soon ? "Segera hadir" : description.trim() || "Deskripsi singkat"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Pemilih ikon form — panelnya kini di-portal ke document.body dengan
 * position:fixed memakai hook bersama `useFloatingPanel` (flip atas/bawah,
 * re-posisi saat scroll modal & resize, maxHeight 360/minFit 260 karena
 * berisi grid). Dulu panel inline → tinggi modal bertambah + scrollbar saat
 * dibuka; kini trigger tetap di alur layout sehingga tinggi modal tidak
 * berubah. Pencarian selalu terlihat di kepala panel, grid ikon men-scroll
 * internal; tutup dengan klik di luar/Esc (Esc capture — modal di belakang
 * tidak ikut tertutup), fokus kembali ke trigger, query di-reset.
 */
function IconPicker({
  value,
  color,
  onChange,
}: {
  value: string;
  color: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rc = resolvePortalColor(color);
  const Current = PORTAL_ICONS[value] ?? SquaresFour;

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

  // Esc → tutup panel saja; capture + stopPropagation mencegah Modal di
  // belakangnya ikut tertutup (sama seperti usePopover lama).
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
  const names = q ? ICON_NAMES.filter((n) => PORTAL_ICON_SEARCH[n].includes(q)) : ICON_NAMES;

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!triggerRef.current) return;
    // Hitung posisi dalam batch yang sama dengan setOpen — panel sudah pada
    // posisi benar sejak render pertama (tanpa frame kosong).
    reposition();
    setOpen(true);
  }

  function pick(name: string) {
    onChange(name);
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
              // Di atas overlay Modal (z-[9999]) karena panel di-portal keluar.
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
                placeholder={`Cari ${ICON_NAMES.length} ikon, mis. uang, buku, masjid`}
                aria-label="Cari ikon"
                className={inputClass}
              />
            </div>
            {names.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Ikon tidak ditemukan</p>
            ) : (
              <div
                role="group"
                aria-label="Ikon"
                className="grid min-h-0 flex-1 grid-cols-6 gap-1 overflow-y-auto p-2"
              >
                {names.map((name) => {
                  const Icon = PORTAL_ICONS[name];
                  const selected = name === value;
                  const label = PORTAL_ICON_LABELS[name] ?? name;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={selected}
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
          </div>,
          document.body
        )}
    </div>
  );
}

/**
 * Pemilih warna form — panelnya kini di-portal ke document.body dengan
 * position:fixed memakai hook bersama `useFloatingPanel` (flip atas/bawah,
 * maxHeight 320 / minFit 280 karena berisi swatch + warna kustom).
 * Dulu panel inline (usePopover) → tinggi modal bertambah saat dibuka;
 * kini trigger tetap di alur layout sehingga tinggi modal tidak berubah.
 * Hex diterima "#abc"/"aabbcc" → normalisasi "#aabbcc" huruf kecil; nilai
 * tidak valid hanya menampilkan pesan error — panel tetap terbuka dan
 * nilai terakhir yang valid tidak ditimpa. Esc (capture) hanya menutup
 * panel; fokus kembali ke trigger.
 */
function ColorPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [hexError, setHexError] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedSwatchRef = useRef<HTMLButtonElement>(null);
  const hexInputRef = useRef<HTMLInputElement>(null);
  const rc = resolvePortalColor(value);

  const { pos, reposition } = useFloatingPanel({
    triggerRef,
    open,
    onTriggerLost: () => setOpen(false),
    maxHeight: 320,
    minFit: 280,
  });

  // Sinkronkan kotak hex dengan nilai saat ini (kosong bila memakai preset) —
  // pola "adjust state during render" supaya tidak perlu effect. Nilai berubah
  // dari luar (klik swatch / color picker native) juga membersihkan error.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(PORTAL_COLORS[value] ? "" : normalizeHex(value) ?? "");
    setHexError(false);
  }

  // Panel dibuka → reset draft & error sekali di awal (pola adjust-state).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDraft(PORTAL_COLORS[value] ? "" : normalizeHex(value) ?? "");
      setHexError(false);
    }
  }

  // Buka → fokus ke swatch terpilih (bila warna kustom: kotak hex); tutup →
  // kembalikan fokus ke trigger. wasOpen supaya fokus tidak "mencuri" saat mount.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      (selectedSwatchRef.current ?? hexInputRef.current)?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  // Tutup saat klik di luar trigger DAN di luar panel (portal-nya). Interaksi
  // dengan color picker native tidak memicu ini (elemen ada di dalam panel).
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

  // Esc → tutup panel saja; capture + stopPropagation mencegah Modal di
  // belakangnya ikut tertutup (Modal menangani Esc di window/bubble).
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

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!triggerRef.current) return;
    // Hitung posisi dalam batch yang sama dengan setOpen (tanpa frame kosong).
    reposition();
    setOpen(true);
  }

  // Saat mengetik: hex 6-digit utuh diterapkan langsung; 3 digit ("#abc")
  // menunggu blur/Enter agar input tidak melompat mengembang di tengah mengetik.
  function onHexInput(v: string) {
    setDraft(v);
    const t = v.trim();
    if (t === "") {
      setHexError(false);
      return;
    }
    const hex = normalizeHex(t);
    if (hex && /^#?[0-9a-f]{6}$/i.test(t)) {
      onChange(hex);
      setHexError(false);
    } else {
      // Error hanya bila mustahil jadi valid (karakter di luar hex / >6 digit);
      // input yang masih bisa dilanjutkan ("12345") belum ditandai.
      setHexError(!/^#?[0-9a-f]{0,6}$/i.test(t));
    }
  }

  // Blur/Enter: hex valid → terapkan & tampilkan normalisasi; kosong →
  // kembalikan ke nilai saat ini; tidak valid → error, nilai TIDAK ditimpa.
  function commitDraft() {
    const t = draft.trim();
    if (t === "") {
      setDraft(PORTAL_COLORS[value] ? "" : normalizeHex(value) ?? "");
      setHexError(false);
      return;
    }
    const hex = normalizeHex(t);
    if (hex) {
      onChange(hex);
      setDraft(hex);
      setHexError(false);
    } else {
      setHexError(true);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={triggerClass}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={`h-6 w-6 shrink-0 rounded-full ${rc.dotClass}`} style={rc.dotStyle} />
          <span className="truncate">{rc.label}</span>
        </span>
        <ChevronDown open={open} />
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
              // Di atas overlay Modal (z-[9999]) karena panel di-portal keluar.
              zIndex: 10000,
            }}
            className="flex flex-col overflow-hidden rounded-xl border border-[#dce3ed] bg-white shadow-lg"
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div role="group" aria-label="Warna preset" className="grid grid-cols-6 gap-2.5">
                {COLOR_KEYS.map((key) => {
                  const c = PORTAL_COLORS[key];
                  const selected = key === value;
                  return (
                    <button
                      key={key}
                      type="button"
                      ref={selected ? selectedSwatchRef : undefined}
                      aria-pressed={selected}
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
                    ref={hexInputRef}
                    type="text"
                    value={draft}
                    maxLength={7}
                    placeholder="#7c3aed"
                    aria-label="Kode warna hex"
                    aria-invalid={hexError}
                    onChange={(e) => onHexInput(e.target.value)}
                    onBlur={commitDraft}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitDraft();
                      }
                    }}
                    className={`${inputClass} ${hexError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                </div>
                {hexError && (
                  <p role="alert" className="mt-1.5 text-xs text-red-500">
                    Kode hex tidak valid — gunakan format #abc atau #aabbcc.
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-400">
                  Pilih dari kotak warna atau ketik kode hex, mis. #7c3aed.
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function AdminPortalPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<PortalAppAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteItem, setDeleteItem] = useState<PortalAppAdmin | null>(null);
  // Item yang akan diduplikat — duplikasi menulis langsung ke server, jadi
  // sama seperti hapus: minta konfirmasi dulu (dialog varian warning/kuning).
  const [duplicateItem, setDuplicateItem] = useState<PortalAppAdmin | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PortalAppAdmin | null>(null);
  const [form, setForm] = useState<PortalAppInput>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // Pengguna menimpa nilai is_external otomatis di bagian "Lanjutan".
  const [extManual, setExtManual] = useState(false);
  // Bagian "Lanjutan" form (urutan tampil + buka di tab baru).
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Ref isi akordeon Lanjutan & field urutannya — untuk scrollIntoView saat
  // akordeon dibuka, dan fokus otomatis saat validasi di area itu gagal.
  const advancedContentRef = useRef<HTMLDivElement>(null);
  const sortOrderRef = useRef<HTMLInputElement>(null);

  // Buka "Lanjutan" → pastikan isi akordeon terlihat di viewport modal (tidak
  // tertutup footer). Tunggu selesai animasi grid 0fr→1fr (~200ms) agar tinggi
  // sudah final; hormati prefers-reduced-motion (langsung, tanpa smooth).
  useEffect(() => {
    if (!advancedOpen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => {
      advancedContentRef.current?.scrollIntoView({
        block: "nearest",
        behavior: reduce ? "auto" : "smooth",
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [advancedOpen]);

  // Pilihan baris untuk aksi massal
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  // Mode pilih (mobile): checkbox menggantikan handle, tap baris = toggle,
  // bar aksi massal sticky di bawah. Desktop tetap pakai checkbox tabel.
  const [pickMode, setPickMode] = useState(false);

  // Filter & pencarian
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PortalFilter>("all");

  // Nilai awal form saat dibuka — untuk deteksi "perubahan belum disimpan"
  const [initialForm, setInitialForm] = useState<PortalAppInput>(EMPTY_FORM);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const data = await getPortalAppsAdmin();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchItems();
    })().catch(() => {});
  }, [fetchItems]);

  function openCreate() {
    const maxSort = items.reduce((max, i) => Math.max(max, i.sort_order), 0);
    const next: PortalAppInput = { ...EMPTY_FORM, sort_order: maxSort + 1 };
    setEditItem(null);
    setForm(next);
    setInitialForm(next);
    setExtManual(false);
    setAdvancedOpen(false);
    setFormOpen(true);
  }

  function openEdit(item: PortalAppAdmin) {
    const next: PortalAppInput = {
      label: item.label,
      description: item.description,
      href: item.href,
      icon: item.icon,
      color: item.color,
      is_external: item.is_external,
      is_coming_soon: item.is_coming_soon,
      is_active: item.is_active,
      sort_order: item.sort_order,
    };
    setEditItem(item);
    setForm(next);
    setInitialForm(next);
    // Nilai tersimpan dianggap "manual" hanya bila berbeda dari hitungan otomatis.
    setExtManual(next.is_external !== autoExternal(next.href));
    setAdvancedOpen(false);
    setFormOpen(true);
  }

  /** Is_external dihitung otomatis dari awalan URL, kecuali sudah ditimpa manual. */
  function onHrefChange(value: string) {
    setForm((f) => ({
      ...f,
      href: value,
      is_external: extManual ? f.is_external : autoExternal(value),
    }));
  }

  /** Mode segmented "Buka di tab baru" — turunan dari extManual + is_external. */
  const tabMode: TabMode = !extManual ? "auto" : form.is_external ? "newtab" : "sametab";

  /** Pilih mode tab; "auto" kembali mengikuti awalan href yang sedang diketik. */
  function setTabMode(mode: TabMode) {
    if (mode === "auto") {
      setExtManual(false);
      setForm((f) => ({ ...f, is_external: autoExternal(f.href) }));
    } else {
      setExtManual(true);
      setForm((f) => ({ ...f, is_external: mode === "newtab" }));
    }
  }

  const dirty =
    formOpen && JSON.stringify(form) !== JSON.stringify(initialForm);

  /** Tutup form; bila ada perubahan belum disimpan, minta konfirmasi dulu. */
  function requestCloseForm() {
    if (formSaving) return;
    if (dirty) setConfirmClose(true);
    else setFormOpen(false);
  }

  async function handleSave() {
    if (formSaving) return;
    if (!form.label.trim()) { toast("Nama aplikasi wajib diisi", "error"); return; }

    const status = statusOf(form);
    let href = form.href.trim();
    // Status "Segera hadir" boleh tanpa URL — disimpan sebagai "#".
    if (!href && status === "soon") href = "#";
    if (!href) { toast("URL/link wajib diisi", "error"); return; }
    if (!/^(\/|#|https?:\/\/)/i.test(href)) {
      toast("URL tidak valid — harus diawali “/”, “#”, atau http(s)://", "error");
      return;
    }
    // Validasi field bagian "Lanjutan" → buka akordeon + fokus ke fieldnya.
    if (!Number.isFinite(Number(form.sort_order))) {
      toast("Urutan tampil harus berupa angka", "error");
      setAdvancedOpen(true);
      requestAnimationFrame(() => sortOrderRef.current?.focus());
      return;
    }

    setFormSaving(true);
    const input: PortalAppInput = {
      ...form,
      href,
      is_external: extManual ? form.is_external : autoExternal(href),
      sort_order: Number(form.sort_order) || 0,
    };
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

  // Pintasan Ctrl/Cmd+S untuk simpan selama form terbuka
  const saveRef = useRef<() => void>(() => { });
  useEffect(() => {
    saveRef.current = handleSave;
  });
  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  async function handleDelete() {
    if (!deleteItem) return;
    const { error } = await deletePortalApp(deleteItem.id);
    if (error) { toast(error, "error"); return; }
    toast("Aplikasi dihapus", "success");
    setDeleteItem(null);
    revalidatePortal().catch(() => { });
    fetchItems();
  }

  /** Duplikat: salinan disembunyikan, diletakkan paling akhir. */
  async function handleDuplicate(item: PortalAppAdmin) {
    const maxSort = items.reduce((max, i) => Math.max(max, i.sort_order), 0);
    const input: PortalAppInput = {
      label: `${item.label} (salinan)`,
      description: item.description,
      href: item.href,
      icon: item.icon,
      color: item.color,
      is_external: item.is_external,
      // Salinan selalu "Disembunyikan" (flagsOf("hidden")) — jangan menyalin
      // is_coming_soon sumber, agar tidak lahir kombinasi tidak valid.
      ...flagsOf("hidden"),
      sort_order: maxSort + 1,
    };
    const { error } = await createPortalApp(input);
    if (error) { toast(error, "error"); return; } // dialog tetap terbuka
    toast("Aplikasi diduplikat", "success");
    setDuplicateItem(null);
    revalidatePortal().catch(() => { });
    fetchItems();
  }

  /**
   * Ubah status (tiga keadaan) dengan optimisme lokal — rollback + toast error
   * bila ada yang gagal ke server. `targets` boleh lebih dari satu (aksi massal).
   * Mengembalikan true bila semua berhasil (dipakai untuk keluar dari mode
   * pilih mobile setelah aksi massal sukses).
   */
  async function applyStatus(targets: PortalAppAdmin[], status: PortalStatus): Promise<boolean> {
    if (targets.length === 0) return false;
    const previous = items;
    const flags = flagsOf(status);
    const ids = new Set(targets.map((t) => t.id));
    setItems((cur) => cur.map((i) => (ids.has(i.id) ? { ...i, ...flags } : i)));

    const results = await Promise.all(targets.map((t) => updatePortalApp(t.id, flags)));
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      setItems(previous);
      toast(`Gagal memperbarui status: ${failed.error}`, "error");
      return false;
    }
    const many = targets.length > 1;
    toast(
      many
        ? `${targets.length} aplikasi → ${STATUS_META[status].label}`
        : `Status diubah menjadi ${STATUS_META[status].label}`,
      "success"
    );
    revalidatePortal().catch(() => { });
    return true;
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Drag & drop selesai — urutan dihitung ulang (1, 2, 3, ...) lalu disimpan. */
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

    reorderPortalApps(reordered.map((it) => ({ id: it.id, sort_order: it.sort_order })))
      .then(({ error }) => {
        if (error) {
          setItems(previous);
          toast(`Gagal menyimpan urutan: ${error}`, "error");
          return;
        }
        toast("Urutan diperbarui", "success");
        revalidatePortal().catch(() => { });
      });
  }

  // Tiga keadaan yang saling menutup: Tayang + Segera Hadir + Disembunyikan
  // selalu berjumlah sama dengan Total (kombinasi tidak valid ikut "hidden").
  const counts = useMemo(() => {
    const active = items.filter((i) => i.is_active && !i.is_coming_soon).length;
    const soon = items.filter((i) => i.is_active && i.is_coming_soon).length;
    const inactive = items.filter((i) => !i.is_active).length;
    return { all: items.length, active, soon, inactive };
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchQuery =
        !q ||
        item.label.toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q);
      const matchFilter =
        filter === "all" ? true
          : filter === "active" ? item.is_active && !item.is_coming_soon
            : filter === "soon" ? item.is_active && item.is_coming_soon
              : !item.is_active;
      return matchQuery && matchFilter;
    });
  }, [items, query, filter]);

  // Urutan hanya bermakna pada daftar penuh tanpa pencarian.
  const dragDisabled = query.trim() !== "" || filter !== "all";

  // ── Seleksi baris untuk aksi massal ──────────────────────────────
  const selectedItems = useMemo(
    () => visible.filter((it) => selected.has(it.id)),
    [visible, selected]
  );
  const allVisibleSelected = visible.length > 0 && visible.every((it) => selected.has(it.id));
  const someVisibleSelected = !allVisibleSelected && visible.some((it) => selected.has(it.id));

  // Indeterminate tidak bisa lewat JSX — set langsung ke DOM (bukan setState).
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const it of visible) {
        if (checked) next.add(it.id);
        else next.delete(it.id);
      }
      return next;
    });
  }

  // ── Mode pilih (mobile) ─────────────────────────────────────
  /** Masuk mode pilih; bila `id` diisi (long-press), baris itu langsung tercentang. */
  function enterPickMode(id?: string) {
    setPickMode(true);
    if (id) toggleOne(id, true);
  }

  /** Keluar mode pilih dan hapus semua centang. */
  function exitPickMode() {
    setPickMode(false);
    setSelected(new Set());
  }

  /** Aksi massal dari bar sticky mobile — keluar mode pilih bila sukses. */
  async function bulkSetStatus(status: PortalStatus) {
    const ok = await applyStatus(selectedItems, status);
    if (ok) exitPickMode();
  }

  /** Hapus massal baris yang terpilih. */
  async function handleBulkDelete() {
    const targets = selectedItems;
    setConfirmBulkDelete(false);
    if (targets.length === 0) return;
    const results = await Promise.all(targets.map((t) => deletePortalApp(t.id)));
    const failed = results.find((r) => r.error);
    if (failed?.error) { toast(`Gagal menghapus: ${failed.error}`, "error"); return; }
    toast(`${targets.length} aplikasi dihapus`, "success");
    setSelected(new Set());
    setPickMode(false);
    revalidatePortal().catch(() => { });
    fetchItems();
  }

  const statFilters: { key: PortalFilter; label: string; value: number; variant: "brand" | "success" | "warning" | "info" }[] = [
    { key: "all", label: "Total", value: counts.all, variant: "brand" },
    { key: "active", label: "Tayang", value: counts.active, variant: "success" },
    { key: "soon", label: "Segera Hadir", value: counts.soon, variant: "warning" },
    { key: "inactive", label: "Disembunyikan", value: counts.inactive, variant: "info" },
  ];

  const formStatus = statusOf(form);

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
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/portal"
            target="_blank"
            rel="noopener noreferrer"
            title="Buka /portal di tab baru"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-[#1767b1]/40 hover:text-[#082b59]"
          >
            <ArrowSquareOut className="h-4 w-4" /> Lihat di portal
          </a>
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1767b1]">
            <Plus className="h-4 w-4" /> Tambah Aplikasi
          </button>
        </div>
      </div>

      {/* Stats — kartu bisa diklik sebagai filter.
          Tanda important di border-[#082b59]! bukan gaya: keduanya sama-sama
          arbitrary value berjenis border-color, sehingga pemenangnya ditentukan
          urutan stylesheet. Tanpa important, border bawaan StatCard
          (border-[#dce3ed]) menang dan border navy kartu aktif tidak pernah
          terpasang — yang tersisa hanya ring-nya. */}
      <StatCardRow>
        {statFilters.map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => setFilter(stat.key)}
            aria-pressed={filter === stat.key}
            title={`Tampilkan: ${stat.label}`}
            className="w-full rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
          >
            <StatCard
              label={stat.label}
              value={stat.value}
              variant={stat.variant}
              className={
                filter === stat.key ? "border-[#082b59]! ring-2 ring-[#082b59]/30" : ""
              }
            />
          </button>
        ))}
      </StatCardRow>

      {/* Toolbar — mode pilih (mobile) menggantikan baris pencarian/filter;
          desktop tetap memakai FilterBar + checkbox tabel seperti semula. */}
      {pickMode && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#1767b1]/30 bg-[#1767b1]/5 px-3 py-2.5 md:hidden">
          <span
            aria-live="polite"
            className="flex items-center gap-1.5 text-sm font-semibold text-[#082b59]"
          >
            <Checks className="h-4 w-4" />
            {selected.size} dipilih
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAllVisible(true)}
              disabled={visible.length === 0}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[#1767b1]/40 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pilih semua
            </button>
            <button
              type="button"
              onClick={exitPickMode}
              className="rounded-lg px-2 text-xs font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-slate-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
      <div className={pickMode ? "hidden md:block" : ""}>
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
          counts={counts}
          action={
            <button
              type="button"
              onClick={() => enterPickMode()}
              aria-label="Masuk mode pilih"
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 pl-2.5 pr-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#1767b1]/40 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] md:hidden"
            >
              <CheckSquare className="h-4 w-4 shrink-0 text-[#1767b1]" />
              Pilih
            </button>
          }
        />
      </div>
      {dragDisabled && (
        <p className="-mt-2 mb-3 flex items-start gap-1.5 text-[11px] text-slate-400">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          Menampilkan {visible.length} dari {counts.all} aplikasi — drag dinonaktifkan saat
          pencarian/filter aktif; tampilkan &quot;Semua&quot; tanpa pencarian untuk mengubah urutan.
        </p>
      )}

      {/* Bar aksi massal inline — desktop saja; mobile memakai bar sticky
          di bawah saat mode pilih. */}
      {selectedItems.length > 0 && (
        <div className="mb-3 hidden flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#1767b1]/30 bg-[#1767b1]/5 px-3.5 py-3 md:flex">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#082b59]">
            <Checks className="h-4 w-4" />
            {selectedItems.length} aplikasi dipilih
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {([
              { status: "live" as PortalStatus, label: "Tayangkan" },
              { status: "soon" as PortalStatus, label: "Segera hadir" },
              { status: "hidden" as PortalStatus, label: "Sembunyikan" },
            ]).map((act) => (
              <button
                key={act.status}
                type="button"
                onClick={() => applyStatus(selectedItems, act.status)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[#1767b1]/40 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
              >
                {act.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setConfirmBulkDelete(true)}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="px-1 text-xs font-semibold text-slate-400 underline-offset-2 transition-colors hover:text-slate-600 hover:underline"
            >
              Bersihkan
            </button>
          </div>
        </div>
      )}

      {/* Table — overflow-x-auto karena jumlah minimum kolom (±900px) melebihi
          breakpoint md (768px); tanpa ini kolom Aksi terpotong, bukan bisa digeser.
          pb saat mode pilih supaya bar sticky mobile tidak menutup baris terakhir. */}
      <div
        className={`overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm ${
          pickMode ? "pb-20 md:pb-0" : ""
        }`}
      >
        <div role="table" aria-label="Daftar aplikasi portal">
          {/* Header (desktop) */}
          <div
            role="rowgroup"
            className={`hidden border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 md:grid ${PORTAL_GRID} md:items-center md:gap-3`}
          >
            <div role="columnheader" className="flex justify-center">
              <input
                type="checkbox"
                ref={selectAllRef}
                checked={allVisibleSelected}
                onChange={(e) => toggleAllVisible(e.target.checked)}
                disabled={visible.length === 0}
                aria-label="Pilih semua aplikasi yang tampil"
                className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#1767b1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:cursor-not-allowed"
              />
            </div>
            <div role="columnheader" className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Urutan</div>
            <div role="columnheader" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aplikasi</div>
            <div role="columnheader" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Link</div>
            <div role="columnheader" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ikon / Warna</div>
            {/* Rata kiri — selaras dengan sel Status di baris (default kiri)
                dan header "Ikon / Warna" di sebelahnya. */}
            <div role="columnheader" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</div>
            <div role="columnheader" className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={visible.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div role="rowgroup" className="divide-y divide-slate-100">
                {loading ? (
                  <div className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
                      <p className="text-sm text-slate-500">Memuat data aplikasi portal...</p>
                    </div>
                  </div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <SquaresFour className="h-8 w-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Belum ada aplikasi portal</p>
                        <p className="mt-1 text-xs text-slate-400">Tambahkan aplikasi pertama agar tampil di halaman /portal</p>
                      </div>
                      <button onClick={openCreate} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#082b59] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1767b1]">
                        <Plus className="h-3.5 w-3.5" /> Tambah Aplikasi Pertama
                      </button>
                    </div>
                  </div>
                ) : visible.length === 0 ? (
                  <div className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <MagnifyingGlass className="h-8 w-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Hasil tidak ditemukan</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Tidak ada aplikasi yang cocok dengan pencarian/filter saat ini
                        </p>
                      </div>
                      <button
                        onClick={() => { setQuery(""); setFilter("all"); }}
                        className="mt-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#1767b1]/40 hover:text-[#082b59]"
                      >
                        Reset filter & pencarian
                      </button>
                    </div>
                  </div>
                ) : (
                  visible.map((item, index) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      index={index}
                      dragDisabled={dragDisabled}
                      selected={selected.has(item.id)}
                      selectMode={pickMode}
                      onEnterPickMode={enterPickMode}
                      onSelect={toggleOne}
                      onEdit={openEdit}
                      onDelete={setDeleteItem}
                      onDuplicate={(item) => setDuplicateItem(item)}
                      onSetStatus={async (it, status) => {
                        await applyStatus([it], status);
                      }}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Bar aksi massal sticky (mobile, mode pilih) — safe-area-inset-bottom
          diperhitungkan; daftar diberi pb-20 supaya baris terakhir tidak
          tertutup. Aksi nonaktif bila n = 0. */}
      {pickMode && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1767b1]/20 bg-white/95 backdrop-blur-md md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center gap-2 px-4 py-3">
            {([
              { status: "live" as PortalStatus, label: "Tayangkan" },
              { status: "hidden" as PortalStatus, label: "Sembunyikan" },
            ]).map((act) => (
              <button
                key={act.status}
                type="button"
                onClick={() => bulkSetStatus(act.status)}
                disabled={selectedItems.length === 0}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#1767b1]/40 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {act.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={selectedItems.length === 0}
              className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hapus
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit SlideOver */}
      <SlideOver open={formOpen} onClose={requestCloseForm}
        wrapperClassName="md:max-w-4xl"
        maxHeight="calc(100vh - 3rem)"
        title={editItem ? "Edit Aplikasi" : "Tambah Aplikasi"}
        description={editItem ? "Perbarui data aplikasi portal" : "Isi form untuk menambahkan aplikasi"}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <button onClick={requestCloseForm} disabled={formSaving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              Batal
            </button>
            <span className="hidden text-xs text-slate-400 md:block">
              Ctrl + S untuk menyimpan
            </span>
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
        {/* md+: dua kolom seimbang — kiri "Informasi" (form), kanan "Tampilan"
            (pratinjau, Ikon, Warna) — lalu satu baris penuh "Lanjutan" di
            bawahnya (md:col-span-2). Di bawah md pembungkus kolom jadi
            display:contents sehingga satu kolom datar berurutan:
            Pratinjau (sticky) → Informasi → Ikon → Warna → Lanjutan. */}
        <div className="flex min-w-0 flex-col gap-5 md:grid md:grid-cols-2 md:items-start md:gap-x-6">
          <div className="contents min-w-0 md:block">
            <div className="min-w-0 order-2 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Informasi
              </p>
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
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
                <StatusControl
                  value={formStatus}
                  onChange={(status) => setForm((f) => ({ ...f, ...flagsOf(status) }))}
                  label="Status tampilan aplikasi"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  URL / Link {formStatus !== "soon" && <span className="text-red-500">*</span>}
                </label>
                <input type="text" value={form.href}
                  onChange={(e) => onHrefChange(e.target.value)}
                  placeholder="/news atau https://..."
                  className={inputClass} />
                <p className="mt-1.5 text-xs text-slate-400">
                  Harus diawali &quot;/&quot;, &quot;#&quot;, atau http(s)://.
                  {formStatus === "soon"
                    ? " Boleh dikosongkan — akan disimpan sebagai “#”."
                    : " Kolom ini wajib diisi untuk status ini."}
                </p>
              </div>
            </div>
          </div>

          <div className="contents min-w-0 md:block">
            <div className="order-1 sticky top-0 z-10 -mx-1 min-w-0 bg-white px-1 pb-3 pt-1 shadow-[0_8px_16px_-12px_rgba(15,23,42,0.5)] md:static md:mx-0 md:p-0 md:shadow-none">
              <p className="mb-2 hidden text-xs font-bold uppercase tracking-wider text-slate-400 md:block">
                Tampilan
              </p>
              <TilePreview
                label={form.label}
                description={form.description}
                icon={form.icon}
                color={form.color}
                status={formStatus}
              />
            </div>
            <div className="min-w-0 order-3 space-y-3 md:mt-3">
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
            </div>
          </div>

          {/* Lanjutan — baris full-width di bawah kedua kolom (B1). Konten
              selalu ter-mount (state & validasi tidak hilang) tapi saat
              tertutup dibuat 0fr + inert sehingga keluar dari tab order;
              header menampilkan ringkasan nilai + aria-expanded/controls. */}
          <div className="min-w-0 order-4 md:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                aria-expanded={advancedOpen}
                aria-controls="lanjutan-panel"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">Lanjutan</span>
                  <span className="truncate font-normal text-slate-400">— urutan tampil &amp; perilaku link</span>
                  <span className="hidden shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-normal text-slate-500 sm:inline">
                    Urutan {form.sort_order || 0} · Tab baru: {TAB_MODE_SUMMARY[tabMode]}
                  </span>
                </span>
                <ChevronDown open={advancedOpen} />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${advancedOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    id="lanjutan-panel"
                    ref={advancedContentRef}
                    inert={!advancedOpen}
                    className="grid gap-4 border-t border-slate-200 px-4 py-4 md:grid-cols-2"
                  >
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Urutan Tampil</label>
                      <input ref={sortOrderRef} type="number" value={form.sort_order}
                        onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                        className={inputClass} />
                      <p className="mt-1.5 text-xs text-slate-400" title="Bisa juga diubah dengan drag & drop di tabel.">
                        Angka kecil tampil lebih dulu. Default: urutan terbesar + 1.
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Buka di tab baru (link luar)</label>
                      <div role="group" aria-label="Buka di tab baru" className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                        {TAB_MODES.map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            aria-pressed={tabMode === mode}
                            onClick={() => setTabMode(mode)}
                            className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${focusRing} ${tabMode === mode
                                ? "bg-[#1767b1] text-white shadow-sm"
                                : "text-slate-500 hover:bg-slate-100"
                              }`}
                          >
                            {TAB_MODE_LABEL[mode]}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400" title="Ubah pilihan di atas untuk menimpa nilai otomatis.">
                        Otomatis: link http(s):// buka di tab baru, &quot;/&quot; atau &quot;#&quot; di tab yang sama.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SlideOver>

      {/* Konfirmasi tutup form tanpa simpan */}
      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => { setConfirmClose(false); setFormOpen(false); }}
        title="Perubahan belum disimpan?"
        description="Tutup form tanpa menyimpan perubahan?"
        confirmLabel="Tutup Tanpa Simpan"
        variant="warning"
      />

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Aplikasi?"
        description={`"${deleteItem?.label}" akan dihapus permanen dari portal.`}
      />

      {/* Konfirmasi hapus massal */}
      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedItems.length} Aplikasi?`}
        description={`${selectedItems.length} aplikasi yang dipilih akan dihapus permanen dari portal.`}
        confirmLabel={`Hapus ${selectedItems.length} Aplikasi`}
      />

      {/* Konfirmasi duplikasi — varian warning (kuning), bukan merah:
          duplikat menulis data baru, tetapi tidak menghilangkan apa pun. */}
      <ConfirmModal
        open={!!duplicateItem}
        onClose={() => setDuplicateItem(null)}
        onConfirm={() => {
          if (duplicateItem) handleDuplicate(duplicateItem);
        }}
        title="Duplikat Aplikasi?"
        description={`Salinan "${duplicateItem?.label}" akan dibuat dengan status Disembunyikan.`}
        confirmLabel="Duplikat"
        variant="warning"
      />
    </div>
  );
}
