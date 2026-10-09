"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PortalAppAdmin } from "@/lib/queries";
import {
  ArrowSquareOut,
  Copy,
  DotsSixVertical,
  PencilSimple,
  SquaresFour,
  Trash,
} from "@/components/Icons";
import {
  PORTAL_ICONS,
  PORTAL_ICON_LABELS,
  resolvePortalColor,
} from "@/lib/portal-theme";
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

function ThemeChip({ icon, color }: { icon: string; color: string }) {
  const Icon = PORTAL_ICONS[icon] ?? SquaresFour;
  const rc = resolvePortalColor(color);
  const name = `${PORTAL_ICON_LABELS[icon] ?? icon} · ${rc.label}`;
  return (
    <span
      title={name}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${rc.tileClass}`}
      style={rc.tileStyle}
    >
      <Icon className="h-4 w-4" weight="fill" />
      <span className="sr-only">{name}</span>
    </span>
  );
}

/** Tampilkan alamat singkat: path utuh untuk internal, domain untuk link luar.
 *  Link kosong atau "#" → "—" (tampil abu-abu di sel). */
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

type RowProps = {
  item: PortalAppAdmin;
  /** Posisi tampil (0-based) — angka "Urutan" dihitung dari posisi, bukan
   *  nilai sort_order mentah, supaya tidak pernah melompat saat ada baris
   *  terfilter atau celah sort_order lama di DB. */
  index: number;
  /** Drag nonaktif saat pencarian/filter aktif — urutan hanya bermakna pada daftar penuh. */
  dragDisabled: boolean;
  selected: boolean;
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
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onSetStatus,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: dragDisabled });

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

  const handle = (
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
          {handle}
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

      {/* ── Mobile: kartu ringkas ────────────────────────────── */}
      <div className="flex flex-col gap-2 px-4 py-3 md:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1.5">
            <span className="mt-1.5 shrink-0">
              <RowCheckbox item={item} selected={selected} onSelect={onSelect} />
            </span>
            {handle}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700">{item.label}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                <span className={`truncate ${noLink ? "text-slate-400" : ""}`}>{shortHref(item.href)}</span>
                {item.is_external && (
                  <span
                    title="Link luar — dibuka di tab baru"
                    className="inline-flex shrink-0 items-center"
                  >
                    <ArrowSquareOut className="h-3 w-3" />
                    <span className="sr-only">link luar, buka di tab baru</span>
                  </span>
                )}
              </p>
              <LinkWarnings item={item} />
            </div>
          </div>
          {actions}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">{statusControl}</div>
          <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
            Urutan {index + 1}
          </span>
        </div>
      </div>
    </div>
  );
}
