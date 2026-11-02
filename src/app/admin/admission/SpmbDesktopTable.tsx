"use client";

import {
  Users,
  Eye,
  Warning,
  PencilSimple,
  Trash,
} from "@/components/Icons";
import { normalizeName, normalizeSchool } from "@/lib/format-name";
import { formatRelativeTime, daysSince, PENDING_SLA_DAYS } from "@/lib/admin-display";
import { spmbGenderLabel } from "@/lib/spmb-filter";
import { SPMB_DOCUMENT_KEYS } from "@/lib/spmb-registration";
import type { SpmbRegistration } from "@/lib/supabase";
import { DesktopPagination } from "@/components/admin/mobile";
import { statusConfig, pathLabels, pathColors, genderStyles } from "./shared";
import type { SortField, SortDir } from "./types";
import { ArrowUp, ArrowDown, SortAscending } from "@/components/Icons";

export interface SpmbDesktopTableProps {
  rows: SpmbRegistration[];
  loading: boolean;
  loadError: string;
  search: string;
  page: number;
  pageSize: number;
  total: number;
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  docSummary: Record<string, { total: number; verified: number; rejected: number; pending: number }>;
  sortField: SortField;
  sortDir: SortDir;
  canVerify: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onToggleSort: (f: SortField) => void;
  onDetail: (item: SpmbRegistration) => void;
  onEdit: (item: SpmbRegistration) => void;
  onDelete: (item: SpmbRegistration) => void;
  onSetStatus: (item: SpmbRegistration, s: "pending" | "accepted" | "rejected") => void;
  onRetry: () => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}

/** Tabel daftar pendaftar desktop (md+) — tampilan & perilaku sama seperti sebelumnya. */
export function SpmbDesktopTable(props: SpmbDesktopTableProps) {
  const {
    rows, loading, loadError, search, page, pageSize, total,
    selectedIds, allVisibleSelected, docSummary, sortField, sortDir,
    canVerify, canEdit, canDelete,
    onToggleSelectAll, onToggleSelect, onToggleSort,
    onDetail, onEdit, onDelete, onSetStatus, onRetry,
    onPageChange, onPageSizeChange,
  } = props;

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <SortAscending className="h-3 w-3 text-slate-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-[var(--brand-accent)]" />
      : <ArrowDown className="h-3 w-3 text-[var(--brand-accent)]" />;
  };

  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200/80 bg-slate-50/80">
            <tr>
              <th className="hidden w-12 px-2 py-3 text-center md:table-cell">
                <input type="checkbox" checked={allVisibleSelected} onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">No</th>
              <th className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none" onClick={() => onToggleSort("full_name")}>
                <span className="flex items-center gap-1">Nama {sortIcon("full_name")}</span>
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none" onClick={() => onToggleSort("gender")}>
                <span className="flex items-center gap-1">L/P {sortIcon("gender")}</span>
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Asal Sekolah</th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none" onClick={() => onToggleSort("registration_path")}>
                <span className="flex items-center gap-1">Jalur {sortIcon("registration_path")}</span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none" onClick={() => onToggleSort("status")}>
                <span className="flex items-center gap-1">Status {sortIcon("status")}</span>
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell cursor-pointer select-none" onClick={() => onToggleSort("created_at")}>
                <span className="flex items-center gap-1">Tanggal {sortIcon("created_at")}</span>
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                  <p className="text-sm text-slate-500">Memuat data pendaftar...</p>
                </div>
              </td></tr>
            ) : loadError ? (
              <tr><td colSpan={9} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                    <Warning className="h-6 w-6 text-red-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Gagal memuat data</p>
                  <p className="mt-0.5 max-w-md text-xs text-slate-500">{loadError}</p>
                  <button onClick={onRetry} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                    Coba lagi
                  </button>
                </div>
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Users className="h-8 w-8 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                    <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pendaftar SPMB"}</p>
                  </div>
                </div>
              </td></tr>
            ) : (
              rows.map((item, index) => {
                const st = statusConfig[item.status] || statusConfig.pending;
                const StatusIcon = st.icon;
                // Nama & asal sekolah judul dinormalisasi untuk tampilan — data DB tidak diubah saat render.
                const name = normalizeName(item.full_name);
                const pendingDays = item.status === "pending" ? daysSince(item.created_at) : 0;
                const late = pendingDays >= PENDING_SLA_DAYS;
                const ds = docSummary[item.id];
                return (
                  <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[var(--brand-primary)]/[0.03]" : ""}`}>
                    <td className="hidden w-12 px-2 py-3.5 text-center md:table-cell" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => onToggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-400 sm:table-cell">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => onDetail(item)}>
                      <p className="text-sm font-medium text-slate-800">{name}</p>
                      {(item.documents?.input_source === "admin" || item.documents?.input_source === "import" || item.documents?.program) && (
                        <p className="mt-0.5 flex flex-wrap gap-1">
                          {item.documents?.input_source === "admin" && (
                            <span className="inline-block rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500" title="Ditambahkan manual oleh admin">
                              Manual
                            </span>
                          )}
                          {item.documents?.input_source === "import" && (
                            <span className="ml-1.5 inline-block rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-slate-500" title="Diimpor massal dari ekspor Google Form">
                              Impor
                            </span>
                          )}
                          {item.documents?.program && (
                            <span
                              title="Pilihan program"
                              className="inline-block whitespace-nowrap rounded-md border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]"
                            >
                              {item.documents.program}
                            </span>
                          )}
                        </p>
                      )}
                      {ds && ds.total > 0 && (
                        <p className={`mt-0.5 text-[11px] font-medium ${ds.rejected > 0 ? "text-red-600" : ds.verified === SPMB_DOCUMENT_KEYS.length ? "text-emerald-600" : "text-slate-400"}`}>
                          Berkas {ds.verified}/{SPMB_DOCUMENT_KEYS.length}
                          {ds.rejected > 0 && ` · ${ds.rejected} ditolak`}
                          {(ds.pending ?? 0) > 0 && ` · ${ds.pending} menunggu`}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold ${genderStyles[item.gender] || "border-slate-200 bg-slate-100 text-slate-600"}`}>
                        {spmbGenderLabel(item.gender)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-600 md:table-cell">{normalizeSchool(item.previous_school) || "-"}</td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${pathColors[item.registration_path] || "bg-slate-100 text-slate-600"}`}>
                        {pathLabels[item.registration_path] || item.registration_path}
                      </span>
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      {canVerify ? (
                        <button
                          onClick={() => onSetStatus(item, item.status === "rejected" ? "pending" : item.status === "pending" ? "accepted" : "rejected")}
                          title={item.status === "rejected" ? "Kembalikan ke Menunggu" : "Ubah status (dengan konfirmasi)"}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${st.bg} ${st.color} hover:opacity-80`}>
                          <StatusIcon className="h-3 w-3" />
                          {st.label}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.bg} ${st.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {st.label}
                        </span>
                      )}
                    </td>
                    <td
                      className="hidden whitespace-nowrap px-4 py-3.5 text-sm text-slate-500 lg:table-cell"
                      title={new Date(item.created_at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                    >
                      {formatRelativeTime(item.created_at)}
                      {late && (
                        <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-amber-700" title={`Menunggu ${pendingDays} hari`}>
                          Lewat {PENDING_SLA_DAYS} hari
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onDetail(item)} aria-label={`Lihat detail ${name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Detail">
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEdit && (
                          <button onClick={() => onEdit(item)} aria-label={`Edit data ${name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit Data">
                            <PencilSimple className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => onDelete(item)} aria-label={`Hapus pendaftaran ${name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
                            <Trash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {!loading && total > 0 && (
        <DesktopPagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          total={total}
          from={(page - 1) * pageSize + 1}
          to={Math.min(page * pageSize, total)}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel="pendaftar"
        />
      )}
    </div>
  );
}
