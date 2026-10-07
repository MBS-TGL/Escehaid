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
import { StatusSwitch } from "./StatusSwitch";

/** Kolom grid desktop (dipakai header di page.tsx supaya sejajar). */
export const PORTAL_GRID =
  "md:grid-cols-[52px_56px_minmax(150px,1.6fr)_minmax(110px,1fr)_132px_168px_108px]";

function ThemeChip({ icon, color }: { icon: string; color: string }) {
  const Icon = PORTAL_ICONS[icon] ?? SquaresFour;
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

/** Badge peringatan: aplikasi aktif (bukan segera hadir) tanpa link valid. */
function MissingLinkBadge() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      Link belum diisi
    </span>
  );
}

type RowProps = {
  item: PortalAppAdmin;
  /** Nomor urut tampil (posisi dalam daftar yang sedang ditampilkan). */
  index: number;
  /** Drag nonaktif saat pencarian/filter aktif — urutan hanya bermakna pada daftar penuh. */
  dragDisabled: boolean;
  onEdit: (item: PortalAppAdmin) => void;
  onDelete: (item: PortalAppAdmin) => void;
  onDuplicate: (item: PortalAppAdmin) => void;
  onToggleActive: (item: PortalAppAdmin, value: boolean) => void;
  onToggleSoon: (item: PortalAppAdmin, value: boolean) => void;
};

export function SortableRow({
  item,
  index,
  dragDisabled,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  onToggleSoon,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const href = item.href.trim();
  const missingLink = item.is_active && !item.is_coming_soon && (href === "" || href === "#");

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
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] ${
        dragDisabled
          ? "cursor-not-allowed text-slate-300"
          : "cursor-grab text-slate-400 hover:bg-[#1767b1]/10 hover:text-[#082b59] active:cursor-grabbing"
      }`}
    >
      <DotsSixVertical className="h-4 w-4" />
    </button>
  );

  const statusControls = (align: string) => (
    <div className={`flex flex-wrap items-center gap-1.5 ${align}`}>
      <span className="flex items-center gap-1.5">
        <StatusSwitch
          size="sm"
          checked={item.is_active}
          onChange={(v) => onToggleActive(item, v)}
          label={`${item.is_active ? "Nonaktifkan" : "Aktifkan"} ${item.label}`}
        />
        <span
          className={`text-[11px] font-semibold ${item.is_active ? "text-emerald-600" : "text-slate-400"}`}
        >
          {item.is_active ? "Aktif" : "Nonaktif"}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={item.is_coming_soon}
        aria-label={`Tandai ${item.label} segera hadir`}
        onClick={() => onToggleSoon(item, !item.is_coming_soon)}
        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] ${
          item.is_coming_soon
            ? "border-amber-300 bg-amber-100 text-amber-700"
            : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:text-amber-600"
        }`}
        title={item.is_coming_soon ? "Klik untuk melepas tanda" : "Tandai segera hadir"}
      >
        Segera Hadir
      </button>
    </div>
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
        <div role="cell" className="flex items-center gap-0.5">
          {handle}
          <span className="text-xs tabular-nums text-slate-400">{index + 1}</span>
        </div>
        <div role="cell" className="text-center text-xs font-semibold tabular-nums text-slate-500">
          {item.sort_order}
        </div>
        <div role="cell" className="min-w-0">
          <span className="block truncate text-sm font-medium text-slate-700">{item.label}</span>
          {item.description && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{item.description}</p>
          )}
        </div>
        <div role="cell" className="min-w-0">
          <span className="flex max-w-[180px] items-center gap-1 truncate text-xs text-slate-500">
            <span className="truncate">{item.href || "—"}</span>
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
          {missingLink && <MissingLinkBadge />}
        </div>
        <div role="cell" className="text-xs text-slate-500">
          <ThemeChip icon={item.icon} color={item.color} />
        </div>
        <div role="cell" className="flex justify-center">
          {statusControls("")}
        </div>
        <div role="cell" className="flex justify-end">
          {actions}
        </div>
      </div>

      {/* ── Mobile: kartu ringkas ────────────────────────────── */}
      <div className="flex flex-col gap-2 px-4 py-3 md:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1">
            {handle}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700">{item.label}</p>
              {item.href && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                  <span className="truncate">{item.href}</span>
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
              )}
              {missingLink && <MissingLinkBadge />}
            </div>
          </div>
          {actions}
        </div>
        <div className="flex items-center justify-between gap-2">
          {statusControls("")}
          <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
            Urutan {item.sort_order}
          </span>
        </div>
      </div>
    </div>
  );
}
