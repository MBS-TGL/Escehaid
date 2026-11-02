"use client";

import {
  CheckCircle,
  XCircle,
  Warning,
  GraduationCap,
  CalendarBlank as CalendarIcon,
} from "@/components/Icons";
import { normalizeName } from "@/lib/format-name";
import type { SpmbRegistration, SpmbWave } from "@/lib/supabase";
import type { RegistrationPath } from "@/lib/queries";

export interface SpmbModalsProps {
  deleteItem: SpmbRegistration | null;
  bulkDelete: boolean;
  bulkPathOpen: boolean;
  bulkPath: RegistrationPath | "";
  bulkPathSaving: boolean;
  bulkWaveOpen: boolean;
  bulkWaveId: string;
  bulkWaveSaving: boolean;
  confirmAction: { id: string; status: "accepted" | "rejected" } | null;
  selectedCount: number;
  waves: SpmbWave[];
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  onCloseBulkDelete: () => void;
  onConfirmBulkDelete: () => void;
  onCloseBulkPath: () => void;
  onBulkPathChange: (p: RegistrationPath | "") => void;
  onConfirmBulkPath: () => void;
  onCloseBulkWave: () => void;
  onBulkWaveChange: (id: string) => void;
  onConfirmBulkWave: () => void;
  onCloseConfirm: () => void;
  onConfirmStatus: () => void;
}

/** Kumpulan modal konfirmasi modul SPMB (hapus, bulk path/wave, status). */
export function SpmbModals(props: SpmbModalsProps) {
  const {
    deleteItem, bulkDelete, bulkPathOpen, bulkPath, bulkPathSaving,
    bulkWaveOpen, bulkWaveId, bulkWaveSaving, confirmAction,
    selectedCount, waves,
    onCloseDelete, onConfirmDelete, onCloseBulkDelete, onConfirmBulkDelete,
    onCloseBulkPath, onBulkPathChange, onConfirmBulkPath,
    onCloseBulkWave, onBulkWaveChange, onConfirmBulkWave,
    onCloseConfirm, onConfirmStatus,
  } = props;

  return (
    <>
      {/* ── DELETE CONFIRM ──────────────────────────── */}
      {deleteItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCloseDelete}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus Pendaftar?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">&ldquo;{normalizeName(deleteItem.full_name)}&rdquo; akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={onCloseDelete} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={onConfirmDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK MOVE PATH MODAL ────────────────────── */}
      {bulkPathOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !bulkPathSaving && onCloseBulkPath()}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 mx-auto">
              <GraduationCap className="h-6 w-6 text-[var(--brand-primary)]" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Ubah Jalur {selectedCount} Pendaftar?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Pilih jalur pendaftaran untuk pendaftar terpilih.</p>
            <select
              value={bulkPath}
              onChange={(e) => onBulkPathChange(e.target.value as RegistrationPath | "")}
              disabled={bulkPathSaving}
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
            >
              <option value="">Pilih jalur…</option>
              <option value="reguler">Reguler</option>
              <option value="prestasi">Prestasi</option>
              <option value="beasiswa">Beasiswa</option>
            </select>
            <div className="mt-6 flex gap-3">
              <button onClick={onCloseBulkPath} disabled={bulkPathSaving} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Batal</button>
              <button onClick={onConfirmBulkPath} disabled={bulkPathSaving || !bulkPath} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-50">
                {bulkPathSaving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Ubah Jalur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK MOVE WAVE MODAL ────────────────────── */}
      {bulkWaveOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !bulkWaveSaving && onCloseBulkWave()}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 mx-auto">
              <CalendarIcon className="h-6 w-6 text-[var(--brand-primary)]" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Pindah {selectedCount} Pendaftar?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Pilih gelombang tujuan untuk pendaftar terpilih.</p>
            <select
              value={bulkWaveId}
              onChange={(e) => onBulkWaveChange(e.target.value)}
              disabled={bulkWaveSaving}
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base md:text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
            >
              <option value="">Tanpa gelombang</option>
              {waves.map((w) => (
                <option key={w.id} value={w.id}>{w.name}{w.is_published ? "" : " (draf)"}</option>
              ))}
            </select>
            <div className="mt-6 flex gap-3">
              <button onClick={onCloseBulkWave} disabled={bulkWaveSaving} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Batal</button>
              <button onClick={onConfirmBulkWave} disabled={bulkWaveSaving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-50">
                {bulkWaveSaving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Pindahkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK DELETE CONFIRM ─────────────────────── */}
      {bulkDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCloseBulkDelete}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus {selectedCount} Pendaftar?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Semua pendaftar yang dipilih akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={onCloseBulkDelete} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={onConfirmBulkDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS CONFIRM MODAL ────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCloseConfirm}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full mx-auto ${confirmAction.status === "accepted" ? "bg-emerald-100" : "bg-red-100"}`}>
              {confirmAction.status === "accepted" ? (
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">
              {confirmAction.id === "bulk"
                ? `${confirmAction.status === "accepted" ? "Terima" : "Tolak"} ${selectedCount} Pendaftar?`
                : confirmAction.status === "accepted" ? "Terima Pendaftar?" : "Tolak Pendaftar?"}
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              {confirmAction.status === "accepted"
                ? "Pendaftar akan diterima sebagai calon siswa baru."
                : "Pendaftar akan ditolak."}
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={onCloseConfirm} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button
                onClick={onConfirmStatus}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white ${confirmAction.status === "accepted" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                Ya, {confirmAction.status === "accepted" ? "Terima" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
