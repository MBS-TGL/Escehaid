"use client";

import {
  Plus,
  Warning,
  CalendarBlank,
  CheckCircle,
  PencilSimple,
  Trash,
} from "@/components/Icons";
import { SortableList } from "@/components/admin/sortable/SortableList";
import { SortableRow } from "@/components/admin/sortable/SortableRow";
import { SortableGrip } from "@/components/admin/sortable/SortableGrip";
import { getWaveStatus } from "@/lib/queries";
import { waveStatusConfig } from "./shared";
import type { SpmbWave } from "@/lib/supabase";

/** Format "YYYY-MM-DD" → "20 Okt 2026" (id-ID), tanpa geser zona waktu. */
function formatWaveDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Tab Gelombang — toolbar + daftar sortable + badge status/publikasi. */
export function WavesTab({
  waves,
  wavesLoading,
  wavesError,
  dragDisabled,
  permUpdate,
  permVerify,
  onReorderWaves,
  onAdd,
  onEdit,
  onToggleWave,
  onDelete,
  onPublishResult,
}: {
  waves: SpmbWave[];
  wavesLoading: boolean;
  wavesError: string | null;
  dragDisabled: boolean;
  permUpdate: boolean;
  permVerify: boolean;
  onReorderWaves: (from: number, to: number) => void;
  onAdd: () => void;
  onEdit: (w: SpmbWave) => void;
  onToggleWave: (w: SpmbWave) => void;
  onDelete: (w: SpmbWave) => void;
  onPublishResult: (w: SpmbWave) => void;
}) {
  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Atur gelombang pendaftaran yang tampil di halaman Penerimaan Santri Baru.
        </p>
        {permUpdate && (
          <button onClick={onAdd}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)] sm:min-h-0">
            <Plus className="h-4 w-4" />
            Tambah Gelombang
          </button>
        )}
      </div>

      {/* Error memuat data */}
      {wavesError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <Warning className="h-4 w-4 shrink-0" />
          {wavesError}
        </div>
      )}

      {/* Daftar gelombang */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {wavesLoading ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
            <p className="text-sm text-slate-500">Memuat data gelombang...</p>
          </div>
        ) : waves.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <CalendarBlank className="h-8 w-8 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Belum ada gelombang pendaftaran</p>
              <p className="mt-1 text-xs text-slate-400">Klik &ldquo;Tambah Gelombang&rdquo; untuk membuat gelombang pertama.</p>
            </div>
          </div>
        ) : (
          <SortableList ids={waves.map((w) => w.id)} onReorder={onReorderWaves}>
          <ul className="divide-y divide-slate-100">
            {waves.map((w, index) => {
              const st = waveStatusConfig[getWaveStatus(w)] || waveStatusConfig.upcoming;
              return (
                <SortableRow key={w.id} id={w.id} disabled={dragDisabled}>
                  {({ setNodeRef, style, isDragging, attributes, listeners }) => (
                    <li
                      ref={setNodeRef}
                      style={style}
                      className={`flex flex-wrap items-start gap-3 p-4 transition-colors sm:flex-nowrap sm:items-center ${isDragging ? "bg-slate-50 opacity-70" : ""}`}
                    >
                      <SortableGrip
                        index={index}
                        label={w.name}
                        disabled={dragDisabled}
                        attributes={attributes}
                        listeners={listeners}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{w.name}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                          {!w.is_published && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              Disembunyikan
                            </span>
                          )}
                          {w.result_published_at && (
                            <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                              Hasil Ditayangkan
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarBlank className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {formatWaveDate(w.start_date)} &ndash; {formatWaveDate(w.end_date)}
                        </p>
                        {w.note && <p className="mt-1 text-xs text-slate-400">{w.note}</p>}
                      </div>

                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                        {permUpdate && (
                          <button onClick={() => onToggleWave(w)}
                            title={w.is_published ? "Sembunyikan dari website" : "Tampilkan di website"}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${w.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                            <span className={`relative inline-block h-4 w-7 rounded-full transition-colors ${w.is_published ? "bg-emerald-500" : "bg-slate-300"}`}>
                              <span className={`absolute left-0.5 top-1 h-2 w-2 rounded-full bg-white transition-transform ${w.is_published ? "translate-x-3" : ""}`} />
                            </span>
                            {w.is_published ? "Tampil" : "Sembunyi"}
                          </button>
                        )}
                        {permVerify && (
                          <button onClick={() => onPublishResult(w)}
                            title={w.result_published_at ? "Tarik hasil seleksi dari publik" : "Publikasikan hasil seleksi gelombang ini"}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${w.result_published_at ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            {w.result_published_at ? "Hasil: Tayang" : "Hasil: Belum"}
                          </button>
                        )}
                        {permUpdate && (
                          <>
                            <button onClick={() => onEdit(w)} title="Edit Gelombang"
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                              <PencilSimple className="h-4 w-4" />
                            </button>
                            <button onClick={() => onDelete(w)} title="Hapus"
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                              <Trash className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  )}
                </SortableRow>
              );
            })}
          </ul>
          </SortableList>
        )}
      </div>
    </>
  );
}
