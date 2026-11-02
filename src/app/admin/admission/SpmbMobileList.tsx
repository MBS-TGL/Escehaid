"use client";

import {
  Users,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  PencilSimple,
  Trash,
  Warning,
} from "@/components/Icons";
import { normalizeName, normalizeSchool } from "@/lib/format-name";
import { formatRelativeTime, daysSince, PENDING_SLA_DAYS } from "@/lib/admin-display";
import { spmbGenderLabel } from "@/lib/spmb-filter";
import { SPMB_DOCUMENT_KEYS } from "@/lib/spmb-registration";
import type { SpmbRegistration } from "@/lib/supabase";
import {
  MobileListRow,
  MobilePagination,
  LongPressHint,
  SelectionMark,
  RowActionsMenu,
  StatusDot,
  QuietBadge,
  type RowAction,
} from "@/components/admin/mobile";
import { SkeletonBlock } from "@/components/ui";
import { statusConfig, pathLabels, DOT_TONE, pathColors, genderStyles } from "./shared";

export interface SpmbMobileListProps {
  rows: SpmbRegistration[];
  loading: boolean;
  loadError: string;
  search: string;
  page: number;
  pageSize: number;
  total: number;
  selectedIds: Set<string>;
  pickMode: boolean;
  docSummary: Record<string, { total: number; verified: number; rejected: number; pending: number }>;
  canEdit: boolean;
  canVerify: boolean;
  canDelete: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onDetail: (item: SpmbRegistration) => void;
  onEdit: (item: SpmbRegistration) => void;
  onDelete: (item: SpmbRegistration) => void;
  onSetStatus: (item: SpmbRegistration, s: "pending" | "accepted" | "rejected") => void;
  onRetry: () => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}

/** Daftar mobile (<md) — baris ringkas: avatar + titik status, nama,
    badge jalur + asal sekolah/email + tanggal. Tanpa scroll horizontal. */
export function SpmbMobileList(props: SpmbMobileListProps) {
  const {
    rows, loading, loadError, search, page, pageSize, total,
    selectedIds, pickMode, docSummary, canEdit, canVerify, canDelete,
    onEnterPickMode, onToggleSelect, onDetail, onEdit, onDelete, onSetStatus,
    onRetry, onPageChange, onPageSizeChange,
  } = props;

  return (
    <>
      <LongPressHint />
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <div role="list" aria-label="Daftar pendaftar SPMB">
          {loading ? (
            <div className="space-y-3 px-3 py-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-10 w-10 rounded-full" />
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
                <Warning className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Gagal memuat data</p>
              <p className="mt-0.5 max-w-md text-xs text-slate-500">{loadError}</p>
              <button onClick={onRetry} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                Coba lagi
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pendaftar SPMB"}</p>
              </div>
            </div>
          ) : (
            rows.map((item) => (
              <RegistrationMobileRow
                key={item.id}
                item={item}
                docSummary={docSummary[item.id]}
                selected={selectedIds.has(item.id)}
                selectMode={pickMode}
                onEnterPickMode={onEnterPickMode}
                onToggleSelect={onToggleSelect}
                onDetail={onDetail}
                onEditData={onEdit}
                onSetStatus={onSetStatus}
                onDelete={onDelete}
                canEdit={canEdit}
                canVerify={canVerify}
                canDelete={canDelete}
              />
            ))
          )}
        </div>
        {!loading && total > 0 && (
          <MobilePagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            total={total}
            from={(page - 1) * pageSize + 1}
            to={Math.min(page * pageSize, total)}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            itemLabel="pendaftar"
          />
        )}
      </div>
    </>
  );
}

function RegistrationMobileRow({
  item,
  docSummary,
  selected,
  selectMode,
  onEnterPickMode,
  onToggleSelect,
  onDetail,
  onEditData,
  onSetStatus,
  onDelete,
  canEdit = true,
  canVerify = true,
  canDelete = true,
}: {
  item: SpmbRegistration;
  /** Agregat verifikasi berkas registrasi ini (badge kecil). */
  docSummary?: { total: number; verified: number; rejected: number; pending: number };
  selected: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onDetail: (r: SpmbRegistration) => void;
  onEditData: (r: SpmbRegistration) => void;
  onSetStatus: (r: SpmbRegistration, s: "pending" | "accepted" | "rejected") => void;
  onDelete: (r: SpmbRegistration) => void;
  /** `spmb:update` — edit data pendaftar. */
  canEdit?: boolean;
  /** `spmb:verify` — ubah status pendaftar. */
  canVerify?: boolean;
  /** `spmb:delete` — hapus pendaftar. */
  canDelete?: boolean;
}) {
  const st = statusConfig[item.status] || statusConfig.pending;
  const StatusIcon = st.icon;
  // Nama & asal sekolah judul dinormalisasi hanya untuk tampilan.
  const name = normalizeName(item.full_name);
  const school = normalizeSchool(item.previous_school);
  const pendingDays = item.status === "pending" ? daysSince(item.created_at) : 0;
  const late = pendingDays >= PENDING_SLA_DAYS;
  const actions: RowAction[] = [
    { key: "detail", label: "Detail", icon: <Eye className="h-4 w-4" />, run: () => onDetail(item) },
    ...(canEdit
      ? [{ key: "edit", label: "Edit Data", icon: <PencilSimple className="h-4 w-4" />, run: () => onEditData(item) } as RowAction]
      : []),
    ...(canVerify && item.status !== "pending"
      ? [{
          key: "pending",
          label: "Jadikan Menunggu",
          icon: <Clock className="h-4 w-4" />,
          run: () => onSetStatus(item, "pending"),
        }]
      : []),
    ...(canVerify && item.status !== "accepted"
      ? [{
          key: "accept",
          label: "Terima",
          icon: <CheckCircle className="h-4 w-4" />,
          run: () => onSetStatus(item, "accepted"),
        }]
      : []),
    ...(canVerify && item.status !== "rejected"
      ? [{
          key: "reject",
          label: "Tolak",
          icon: <XCircle className="h-4 w-4" />,
          run: () => onSetStatus(item, "rejected"),
        }]
      : []),
    ...(item.phone
      ? [{
          key: "call",
          label: "Telepon",
          icon: <Phone className="h-4 w-4" />,
          run: () => { window.location.href = `tel:${item.phone?.replace(/[^0-9]/g, "")}`; },
        }]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) } as RowAction]
      : []),
  ];

  const hasAnomalyBadges =
    late ||
    item.documents?.input_source === "admin" ||
    item.documents?.input_source === "import" ||
    (docSummary && docSummary.total > 0);

  return (
    <div role="listitem">
      <MobileListRow
        lead={
          selectMode ? (
            <SelectionMark selected={selected} />
          ) : (
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[11px] font-bold text-[var(--brand-primary)]">
                {name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
              <StatusDot
                tone={DOT_TONE[item.status] ?? "pending"}
                label={st.label}
                className="absolute bottom-0 right-0"
              />
            </span>
          )
        }
        title={name}
        badge={
          hasAnomalyBadges ? (
            <>
              {late && (
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  Lewat {PENDING_SLA_DAYS} hari
                </span>
              )}
              {docSummary && docSummary.total > 0 && (
                <span
                  className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                    docSummary.rejected > 0
                      ? "border-red-200 bg-red-50 text-red-600"
                      : docSummary.verified === SPMB_DOCUMENT_KEYS.length
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                  title={
                    docSummary.rejected > 0
                      ? `${docSummary.rejected} berkas ditolak`
                      : docSummary.verified === SPMB_DOCUMENT_KEYS.length
                        ? "Semua berkas terverifikasi"
                        : `${docSummary.verified}/${SPMB_DOCUMENT_KEYS.length} berkas terverifikasi`
                  }
                >
                  Berkas {docSummary.verified}/{SPMB_DOCUMENT_KEYS.length}
                </span>
              )}
              {item.documents?.input_source === "admin" && <QuietBadge>Manual</QuietBadge>}
              {item.documents?.input_source === "import" && <QuietBadge>Impor</QuietBadge>}
            </>
          ) : undefined
        }
        subtitle={
          <>
            <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${pathColors[item.registration_path] || "bg-slate-100 text-slate-600"}`}>
              {pathLabels[item.registration_path] || item.registration_path}
            </span>
            {item.documents?.program && (
              <span
                title="Pilihan program"
                className="inline-flex shrink-0 items-center rounded-md border border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/5 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]"
              >
                {item.documents.program}
              </span>
            )}
            <span className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${genderStyles[item.gender] || "border-slate-200 bg-slate-100 text-slate-600"}`}>
              {spmbGenderLabel(item.gender)}
            </span>
            {(school || item.email) && (
              <span className="min-w-0 truncate">{school || item.email}</span>
            )}
            <span
              className="shrink-0 whitespace-nowrap"
              title={new Date(item.created_at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
            >
              {formatRelativeTime(item.created_at)}
            </span>
          </>
        }
        status={
          canVerify ? (
            <button
              type="button"
              onClick={() => {
                if (item.status === "rejected") onSetStatus(item, "pending");
                else onSetStatus(item, item.status === "pending" ? "accepted" : "rejected");
              }}
              title={item.status === "rejected" ? "Kembalikan ke Menunggu" : "Ubah status (konfirmasi)"}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${st.bg} ${st.color} hover:opacity-85 active:scale-95`}
            >
              <StatusIcon className="h-3 w-3" />
              <span>{st.label}</span>
            </button>
          ) : (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.bg} ${st.color}`}>
              <StatusIcon className="h-3 w-3" />
              <span>{st.label}</span>
            </span>
          )
        }
        actions={<RowActionsMenu label={name} actions={actions} disabled={selectMode} />}
        selected={selected}
        selectionMode={selectMode}
        onClick={() => {
          if (selectMode) onToggleSelect(item.id);
          else onDetail(item);
        }}
        onLongPress={() => onEnterPickMode(item.id)}
      />
    </div>
  );
}
