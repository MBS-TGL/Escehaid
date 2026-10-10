"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PortalAppAdmin } from "@/lib/queries";
import {
  ArrowSquareOut,
  Copy,
  DotsSixVertical,
  DotsThreeVertical,
  PencilSimple,
  SquaresFour,
  Trash,
  Warning,
} from "@/components/Icons";
import {
  PORTAL_ICONS,
  PORTAL_ICON_LABELS,
  resolvePortalColor,
} from "@/lib/portal-theme";
import { useFloatingPanel } from "@/components/ui/useFloatingPanel";
import { StatusPill, statusOf, type PortalStatus } from "./StatusControl";

/**
 * Kolom grid desktop (dipakai header di page.tsx supaya sejajar):
 * [checkbox | urutan | aplikasi | link | ikon/warna | status | aksi]
 * — kolom "No" dihapus karena duplikat dengan "Urutan".
 *
 * Pembagian ruang (bar = batas bawah, fr = bagian ruang sisa):
 *   Aplikasi   200px / 1.6fr — kolom paling lebar; label + deskripsi, keduanya
 *                              truncate + title (full text saat hover).
 *   Link       140px / 1fr   — path utuh / domain; cukup lega supaya tidak
 *                              mudah terpotong.
 *   Ikon/Warna 80px (fix)    — cukup untuk tile chip ±28px dengan ruang
 *                              bernapas; nama ikon & warna tetap di tooltip title.
 *   Status     160px (fix)   — muat badge terpanjang ("Segera hadir") + chevron.
 *   Aksi       112px (fix)   — 3 tombol ikon: edit, duplikat, hapus.
 *
 * `minmax` dipakai agar di layar sempit kolom tidak menyusut di bawah kebutuhan
 * isinya; kelebihan ruang baru dibagi menurut fr. Kolom berisi teks wajib punya
 * wrapper `min-w-0` agar `truncate` bekerja di dalam grid.
 *
 * Total minimum = 796px (kolom) + 72px (6 × gap-3) + 32px (px-4) = ±900px —
 * titik munculnya scroll horizontal (overflow-x-auto di page.tsx); sudah
 * diukur pada viewport 800px.
 */
export const PORTAL_GRID =
  "md:grid-cols-[40px_64px_minmax(200px,1.6fr)_minmax(140px,1fr)_80px_160px_112px]";

/**
 * Tile ikon aplikasi — dipakai kolom "Ikon / Warna" desktop (sm, 28px) dan
 * baris mobile (lg, 40px). Warna pekat di atas latar pucat diambil dari
 * resolvePortalColor (preset navy dsb. atau hex kustom → kelas + style).
 */
function ThemeChip({
  icon,
  color,
  size = "sm",
}: {
  icon: string;
  color: string;
  size?: "sm" | "lg";
}) {
  const Icon = PORTAL_ICONS[icon] ?? SquaresFour;
  const rc = resolvePortalColor(color);
  const name = `${PORTAL_ICON_LABELS[icon] ?? icon} · ${rc.label}`;
  return (
    <span
      title={name}
      className={`flex shrink-0 items-center justify-center ${
        size === "lg" ? "h-10 w-10 rounded-xl" : "h-7 w-7 rounded-lg"
      } ${rc.tileClass}`}
      style={rc.tileStyle}
    >
      <Icon className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} weight="fill" />
      <span className="sr-only">{name}</span>
    </span>
  );
}

/** Tampilkan alamat singkat: path utuh untuk internal, domain untuk link luar.
 *  Link kosong atau "#" → "—" (hanya untuk sel desktop; baris mobile tidak
 *  menampilkan placeholder: subteks memakai link bila ada, deskripsi bila tidak). */
function shortHref(href: string): string {
  const h = href.trim();
  if (!h || h === "#") return "—";
  if (h.startsWith("/")) return h;
  try {
    return new URL(h).hostname.replace(/^www\./, "");
  } catch {
    return h;
  }
}

/** Chip peringatan link: "Link kosong" (saat Tayang) atau "Link tidak valid". */
function LinkWarnings({ item }: { item: PortalAppAdmin }) {
  const href = item.href.trim();
  const kosong = href === "" || href === "#";
  const tidakValid = href !== "" && !/^(\/|#|https?:\/\/)/i.test(href);

  if (statusOf(item) === "live" && kosong) {
    return (
      <span className="mt-1 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        Link kosong
      </span>
    );
  }
  if (tidakValid) {
    return (
      <span className="mt-1 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
        Link tidak valid
      </span>
    );
  }
  return null;
}

/** Teks peringatan ringkas untuk baris mobile (ikon kecil + title; tidak
 *  menambah tinggi baris). null bila tidak ada peringatan. */
function mobileWarn(item: PortalAppAdmin): { text: string; danger: boolean } | null {
  const href = item.href.trim();
  const kosong = href === "" || href === "#";
  const tidakValid = href !== "" && !/^(\/|#|https?:\/\/)/i.test(href);
  if (statusOf(item) === "live" && kosong) return { text: "Link kosong", danger: false };
  if (tidakValid) return { text: "Link tidak valid", danger: true };
  return null;
}

function RowCheckbox({
  item,
  selected,
  onSelect,
}: {
  item: PortalAppAdmin;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={selected}
      onChange={(e) => onSelect(item.id, e.target.checked)}
      aria-label={`Pilih ${item.label}`}
      className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-[#1767b1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
    />
  );
}

/** Lebar minimum menu ⋯ (trigger hanya 40px). */
const MENU_MIN_W = 200;

/**
 * Tombol ⋯ baris mobile + menu aksi floating (Edit / Duplikat / Buka link /
 * Hapus). Menu di-portal ke document.body dengan position:fixed memakai
 * useFloatingPanel (flip atas/bawah, re-posisi saat scroll/resize) — pola
 * sama dengan Select/IconPicker/ColorPicker dan FilterBar.
 *
 * Menu di-flip horizontal ke kanan (menempel tepi kanan trigger) lalu di-clamp
 * ke viewport, supaya tidak keluar layar di baris paling kanan/bawah.
 * Item menu min-h-11 (44px) sebagai target ketuk; Esc/klik luar menutup +
 * fokus kembali ke tombol; panah/Home/End berpindah antar opsi.
 */
function RowActionsMenu({
  item,
  onEdit,
  onDuplicate,
  onDelete,
  disabled = false,
}: {
  item: PortalAppAdmin;
  onEdit: (item: PortalAppAdmin) => void;
  onDuplicate: (item: PortalAppAdmin) => void;
  onDelete: (item: PortalAppAdmin) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const { pos, reposition } = useFloatingPanel({
    triggerRef,
    open,
    maxHeight: 260,
    minFit: 200,
    gap: 6,
  });

  const href = item.href.trim();
  const hasLink = href !== "" && href !== "#";

  // Buka → fokus opsi pertama; tutup → kembalikan fokus ke tombol ⋯.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  // Klik di luar trigger & menu (portal) → tutup.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Esc → tutup; capture + stopPropagation agar Modal/panel di belakangnya
  // (mis. SlideOver edit yang kebetulan terbuka) tidak ikut tertutup.
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
    reposition();
    setOpen(true);
  }

  // Panah atas-bawah / Home / End berpindah antar opsi menu.
  function onMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % items.length;
    else next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  const entries: { key: string; label: string; icon: ReactNode; danger?: boolean; run: () => void }[] =
    [
      { key: "edit", label: "Edit", icon: <PencilSimple className="h-4 w-4" />, run: () => onEdit(item) },
      {
        key: "duplicate",
        label: "Duplikat",
        icon: <Copy className="h-4 w-4" />,
        run: () => onDuplicate(item),
      },
      ...(hasLink
        ? [
            {
              key: "link",
              label: "Buka link",
              icon: <ArrowSquareOut className="h-4 w-4" />,
              run: () => window.open(href, "_blank", "noopener,noreferrer"),
            },
          ]
        : []),
      {
        key: "delete",
        label: "Hapus",
        icon: <Trash className="h-4 w-4" />,
        danger: true,
        run: () => onDelete(item),
      },
    ];

  // Flip horizontal: rapatkan tepi kanan menu ke tepi kanan trigger, clamp ke
  // viewport. clientWidth = ICB (viewport minus scrollbar) supaya tidak meleset.
  const menuW = Math.max(MENU_MIN_W, pos?.width ?? MENU_MIN_W);
  const vw = typeof document !== "undefined" ? document.documentElement.clientWidth : 0;
  const menuLeft =
    pos && vw ? Math.max(8, Math.min(pos.left + pos.width - menuW, vw - menuW - 8)) : 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        data-no-longpress=""
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Aksi untuk ${item.label}`}
        onClick={(e) => {
          // Jangan bocor ke onRowClick baris (tap ⋯ = buka menu, bukan form Edit).
          e.stopPropagation();
          toggle();
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <DotsThreeVertical className="h-5 w-5" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Aksi untuk ${item.label}`}
            onKeyDown={onMenuKeyDown}
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: menuLeft,
              width: menuW,
              maxHeight: pos.maxHeight,
              zIndex: 10000,
            }}
            className="overflow-y-auto rounded-xl border border-[#dce3ed] bg-white p-1.5 shadow-xl shadow-slate-900/10"
          >
            {entries.map((it) => (
              <button
                key={it.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.run();
                }}
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1767b1] ${
                  it.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="shrink-0">{it.icon}</span>
                <span className="min-w-0 flex-1 truncate">{it.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

/** Durasi tekan lama (ms) untuk masuk mode pilih langsung dari baris. */
const LONG_PRESS_MS = 500;
/** Ambang gerak (px) yang membatalkan long-press (pengguna menggeser/scroll). */
const LONG_PRESS_SLOP = 10;

type RowProps = {
  item: PortalAppAdmin;
  /** Posisi tampil (0-based) — angka "Urutan" dihitung dari posisi, bukan
   *  nilai sort_order mentah, supaya tidak pernah melompat saat ada baris
   *  terfilter atau celah sort_order lama di DB. */
  index: number;
  /** Drag nonaktif saat pencarian/filter aktif — urutan hanya bermakna pada daftar penuh. */
  dragDisabled: boolean;
  selected: boolean;
  /** Mode pilih (mobile): checkbox menggantikan handle, tap baris = toggle,
   *  drag nonaktif, tombol ⋯ dinonaktifkan. */
  selectMode: boolean;
  /** Long-press baris mobile → masuk mode pilih + centang baris ini. */
  onEnterPickMode: (id: string) => void;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (item: PortalAppAdmin) => void;
  onDelete: (item: PortalAppAdmin) => void;
  onDuplicate: (item: PortalAppAdmin) => void;
  onSetStatus: (item: PortalAppAdmin, status: PortalStatus) => Promise<void> | void;
};

export function SortableRow({
  item,
  index,
  dragDisabled,
  selected,
  selectMode,
  onEnterPickMode,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onSetStatus,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: dragDisabled || selectMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const statusControl = (
    <StatusPill
      value={statusOf(item)}
      onChange={(status) => onSetStatus(item, status)}
      label={`Status ${item.label}`}
    />
  );

  /** Link kosong/"#" → tanda "—" berwarna abu di sel Link. */
  const noLink = !item.href.trim() || item.href.trim() === "#";

  /** Handle desktop (28px) — nomor urutan tetap di kolom terpisah di sebelahnya. */
  const desktopHandle = (
    <button
      type="button"
      {...attributes}
      {...(dragDisabled ? {} : listeners)}
      disabled={dragDisabled}
      aria-label={`Ubah urutan ${item.label}`}
      title={
        dragDisabled
          ? "Urutan hanya bisa diubah saat menampilkan Semua tanpa pencarian"
          : "Tarik untuk mengubah urutan (atau tekan Space, lalu panah)"
      }
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] ${
        dragDisabled
          ? "cursor-not-allowed text-slate-300"
          : "cursor-grab text-slate-400 hover:bg-[#1767b1]/10 hover:text-[#082b59] active:cursor-grabbing"
      }`}
    >
      <DotsSixVertical className="h-4 w-4" />
    </button>
  );

  /** Handle mobile (40px) — nomor urutan (11px) menempel di dalam handle
   *  sehingga teks "Urutan N" tidak diperlukan lagi dan tinggi baris tidak
   *  bertambah. `touch-action: none` hanya di sini: drag bisa dimulai dari
   *  handle tanpa membajak scroll vertikal halaman di area baris lainnya. */
  const mobileHandle = (
    <button
      type="button"
      {...attributes}
      {...(dragDisabled ? {} : listeners)}
      disabled={dragDisabled}
      data-no-longpress=""
      aria-label={`Ubah urutan ${item.label} — posisi ${index + 1}`}
      title={
        dragDisabled
          ? "Hapus filter untuk mengubah urutan"
          : "Tarik untuk mengubah urutan (tekan Space, lalu panah)"
      }
      onClick={(e) => e.stopPropagation()}
      style={{ touchAction: "none" }}
      className={`flex h-10 w-10 shrink-0 touch-none flex-col items-center justify-center gap-0.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] ${
        dragDisabled
          ? "cursor-not-allowed text-slate-300"
          : "cursor-grab text-slate-400 hover:bg-[#1767b1]/10 hover:text-[#082b59] active:cursor-grabbing"
      }`}
    >
      <DotsSixVertical className="h-4 w-4" />
      <span className="text-[11px] font-semibold leading-none tabular-nums text-slate-400">
        {index + 1}
      </span>
    </button>
  );

  const actions = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onEdit(item)}
        aria-label={`Edit ${item.label}`}
        title="Edit"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
      >
        <PencilSimple className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDuplicate(item)}
        aria-label={`Duplikat ${item.label}`}
        title="Duplikat"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
      >
        <Copy className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label={`Hapus ${item.label}`}
        title="Hapus"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
      >
        <Trash className="h-4 w-4" />
      </button>
    </div>
  );

  // ── Long-press (mobile): tekan lama di baris → mode pilih + centang baris.
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const pressXY = useRef<{ x: number; y: number } | null>(null);

  function cancelPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }
  // Bersihkan timer saat baris lepas dari DOM (mis. baris terhapus).
  useEffect(
    () => () => {
      if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    },
    []
  );

  function onPointerDownRow(e: ReactPointerEvent<HTMLDivElement>) {
    if (selectMode) return;
    // Mulai hanya dari area non-interaktif (bukan handle/chip/status/⋯).
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-longpress]")) return;
    pressXY.current = { x: e.clientX, y: e.clientY };
    longPressFired.current = false;
    cancelPress();
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      longPressFired.current = true;
      onEnterPickMode(item.id);
    }, LONG_PRESS_MS);
  }

  function onPointerMoveRow(e: ReactPointerEvent<HTMLDivElement>) {
    const p = pressXY.current;
    if (!p || pressTimer.current === null) return;
    if (Math.abs(e.clientX - p.x) > LONG_PRESS_SLOP || Math.abs(e.clientY - p.y) > LONG_PRESS_SLOP) {
      cancelPress();
    }
  }

  /** Tap baris: mode pilih → toggle centang; selain itu → buka form edit.
   *  Klik yang lahir dari long-press dibuang (baris sudah tercentang otomatis). */
  function onRowClick() {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (selectMode) onSelect(item.id, !selected);
    else onEdit(item);
  }

  // Subteks mobile: link bila ada, deskripsi bila tidak — tanpa placeholder "—".
  const href = item.href.trim();
  const hasLink = href !== "" && href !== "#";
  const subtext = hasLink ? shortHref(item.href) : item.description || "";
  const warn = mobileWarn(item);

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="row"
      className={`group transition-colors ${
        isDragging ? "bg-slate-50 opacity-70" : "hover:bg-slate-50/80"
      }`}
    >
      {/* ── Desktop: baris tabel ─────────────────────────────── */}
      <div className={`hidden px-4 py-3.5 md:grid ${PORTAL_GRID} md:items-center md:gap-3`}>
        <div role="cell" className="flex justify-center">
          <RowCheckbox item={item} selected={selected} onSelect={onSelect} />
        </div>
        <div role="cell" className="flex items-center gap-0.5">
          {desktopHandle}
          <span className="text-xs font-semibold tabular-nums text-slate-500">
            {index + 1}
          </span>
        </div>
        <div role="cell" className="min-w-0">
          <span
            className="block truncate text-sm font-medium text-slate-700"
            title={item.label}
          >
            {item.label}
          </span>
          {item.description && (
            <p className="mt-0.5 truncate text-xs text-slate-400" title={item.description}>
              {item.description}
            </p>
          )}
        </div>
        <div role="cell" className="min-w-0">
          <span className="flex items-center gap-1 truncate text-xs text-slate-500">
            <span
              className={`truncate ${noLink ? "text-slate-400" : ""}`}
              title={item.href.trim() || undefined}
            >
              {shortHref(item.href)}
            </span>
            {item.is_external && (
              <span
                title="Link luar — dibuka di tab baru"
                className="inline-flex shrink-0 items-center"
              >
                <ArrowSquareOut className="h-3.5 w-3.5 text-slate-400" />
                <span className="sr-only">link luar, buka di tab baru</span>
              </span>
            )}
          </span>
          <LinkWarnings item={item} />
        </div>
        <div role="cell" className="text-xs text-slate-500">
          <ThemeChip icon={item.icon} color={item.color} />
        </div>
        <div role="cell">{statusControl}</div>
        <div role="cell" className="flex justify-end">
          {actions}
        </div>
      </div>

      {/* ── Mobile: satu baris ringkas ─────────────────────────
          [handle/checkbox 40px] [tile ikon 40px] [nama+subteks] [chip status] [⋯ 40px]
          — satu baris penuh, tanpa "Urutan N" (nomor di dalam handle), tanpa
          ikon aksi terpisah (pindah ke menu ⋯). Tap baris = edit; di mode
          pilih, checkbox menggantikan handle di slot yang sama (lebar baris
          tidak berubah) dan tap baris = toggle centang. */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 md:hidden"
        onClick={onRowClick}
        onPointerDown={onPointerDownRow}
        onPointerMove={onPointerMoveRow}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
      >
        {selectMode ? (
          <span
            data-no-longpress=""
            onClick={(e) => e.stopPropagation()}
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(item.id, e.target.checked)}
              aria-label={`Pilih ${item.label}`}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-[#1767b1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
            />
          </span>
        ) : (
          mobileHandle
        )}

        <ThemeChip icon={item.icon} color={item.color} size="lg" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight text-slate-700" title={item.label}>
            {item.label}
          </p>
          {subtext && (
            <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-400" title={subtext}>
              {subtext}
              {hasLink && item.is_external && (
                <ArrowSquareOut className="ml-0.5 inline h-3 w-3 align-[-1px]" />
              )}
              {warn && (
                <span
                  title={warn.text}
                  className={`ml-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center align-[-2px] ${
                    warn.danger ? "text-red-500" : "text-amber-500"
                  }`}
                >
                  <Warning className="h-3 w-3" />
                  <span className="sr-only">{warn.text}</span>
                </span>
              )}
            </p>
          )}
        </div>

        <span
          data-no-longpress=""
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <StatusPill
            value={statusOf(item)}
            onChange={(status) => onSetStatus(item, status)}
            label={`Status ${item.label}`}
            compact
            disabled={selectMode}
          />
        </span>

        <RowActionsMenu
          item={item}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          disabled={selectMode}
        />
      </div>
    </div>
  );
}
