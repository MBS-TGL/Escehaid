"use client";

import {
  Checks,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Compass,
  CalendarBlank,
} from "@/components/Icons";
import { MobileSelectBar } from "@/components/admin/mobile";

/**
 * Bar aksi massal desktop — tampil saat ada yang dipilih.
 * Mobile memakai MobileSelectBar saat mode pilih.
 */
export function SpmbBulkBar({
  count,
  canVerify,
  canDelete,
  bulkPendingSaving,
  onAccept,
  onReject,
  onMoveWave,
  onMovePath,
  onSetPending,
  onScheduleInterview,
  onDelete,
  onClear,
}: {
  count: number;
  canVerify: boolean;
  canDelete: boolean;
  bulkPendingSaving: boolean;
  onAccept: () => void;
  onReject: () => void;
  onMoveWave: () => void;
  onMovePath: () => void;
  onSetPending: () => void;
  onScheduleInterview: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="mb-4 hidden items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex md:flex-nowrap md:overflow-x-auto">
      <Checks className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
      <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-[var(--brand-primary)]">{count} dipilih</span>
      {canVerify && (
        <>
          <button onClick={onAccept} aria-label={`Terima ${count} pendaftar terpilih`} className="whitespace-nowrap rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Terima</button>
          <button onClick={onReject} aria-label={`Tolak ${count} pendaftar terpilih`} className="whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Tolak</button>
          <button onClick={onScheduleInterview} aria-label={`Jadwalkan wawancara ${count} pendaftar terpilih`} className="whitespace-nowrap rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-50">Wawancara</button>
          <button onClick={onMoveWave} aria-label={`Pindahkan ${count} pendaftar terpilih ke gelombang lain`} className="whitespace-nowrap rounded-lg border border-[var(--brand-primary)]/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5">Pindah gelombang</button>
          <button onClick={onMovePath} aria-label={`Ubah jalur ${count} pendaftar terpilih`} className="whitespace-nowrap rounded-lg border border-[var(--brand-primary)]/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5">Jalur</button>
          <button onClick={onSetPending} disabled={bulkPendingSaving} aria-label={`Kembalikan ${count} pendaftar terpilih ke Menunggu`} className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Menunggu</button>
        </>
      )}
      {canDelete && (
        <button onClick={onDelete} aria-label={`Hapus ${count} pendaftar terpilih`} className="whitespace-nowrap rounded-lg bg-slate-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700">Hapus</button>
      )}
      <button onClick={onClear} aria-label="Batalkan pilihan" title="Batalkan pilihan" className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
    </div>
  );
}

/** Bar aksi massal mobile — menggantikan bottom nav selama mode pilih. */
export function SpmbMobileBulkBar({
  count,
  canVerify,
  canDelete,
  bulkPendingSaving,
  onAccept,
  onReject,
  onMoveWave,
  onMovePath,
  onSetPending,
  onScheduleInterview,
  onDelete,
  onCancel,
}: {
  count: number;
  canVerify: boolean;
  canDelete: boolean;
  bulkPendingSaving: boolean;
  onAccept: () => void;
  onReject: () => void;
  onMoveWave: () => void;
  onMovePath: () => void;
  onSetPending: () => void;
  onScheduleInterview: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <MobileSelectBar
      count={count}
      onDelete={canDelete ? onDelete : undefined}
      deleteIconOnly
      onCancel={onCancel}
    >
      {canVerify && (
        <>
          <button
            type="button"
            onClick={onAccept}
            disabled={count === 0}
            aria-label="Terima pendaftar terpilih"
            title="Terima terpilih"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            <CheckCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={count === 0}
            aria-label="Tolak pendaftar terpilih"
            title="Tolak terpilih"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            <XCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onScheduleInterview}
            disabled={count === 0}
            aria-label="Jadwalkan wawancara pendaftar terpilih"
            title="Jadwalkan wawancara"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-200 bg-white text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            <CalendarBlank className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onMoveWave}
            disabled={count === 0}
            aria-label="Pindahkan pendaftar terpilih ke gelombang lain"
            title="Ubah gelombang"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--brand-primary)]/30 bg-white text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)]/5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            <CalendarBlank className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onMovePath}
            disabled={count === 0}
            aria-label="Ubah jalur pendaftar terpilih"
            title="Ubah jalur"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--brand-primary)]/30 bg-white text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)]/5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            <Compass className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onSetPending}
            disabled={count === 0 || bulkPendingSaving}
            aria-label="Kembalikan pendaftar terpilih ke Menunggu"
            title="Kembalikan ke status Menunggu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            <Clock className="h-5 w-5" />
          </button>
        </>
      )}
    </MobileSelectBar>
  );
}
