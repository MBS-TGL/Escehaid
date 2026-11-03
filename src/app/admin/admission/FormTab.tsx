"use client";

import {
  Plus,
  FileText,
  ArrowUp,
  ArrowDown,
  PencilSimple,
  Trash,
} from "@/components/Icons";
import { spmbFieldNeedsOptions } from "@/lib/queries";
import { fieldTypeLabel } from "./shared";
import type { SpmbFormField } from "@/lib/supabase";

/** Tab Formulir — sumber pendaftaran + builder pertanyaan tambahan. */
export function FormTab({
  regMode,
  regModeSaving,
  regUrl,
  formFields,
  fieldMax,
  onOpenGoogleModal,
  onChangeRegMode,
  onAddField,
  onEditField,
  onToggleField,
  onMoveField,
  onDeleteField,
}: {
  regMode: "google_form" | "internal";
  regModeSaving: boolean;
  regUrl: string;
  formFields: SpmbFormField[];
  fieldMax: number;
  onOpenGoogleModal: () => void;
  onChangeRegMode: (mode: "google_form" | "internal") => void;
  onAddField: () => void;
  onEditField: (f: SpmbFormField) => void;
  onToggleField: (f: SpmbFormField) => void;
  onMoveField: (index: number, dir: -1 | 1) => void;
  onDeleteField: (f: SpmbFormField) => void;
}) {
  return (
    <>
      {/* ── SUMBER PENDAFTARAN (MODE REGISTRASI) ─────────── */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--brand-primary)]">Sumber Pendaftaran</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Pilih tujuan tombol Daftar di website. Klik Google Form untuk mengatur link formulir; mode ini juga mengalihkan halaman form bawaan ke Google Form.
          </p>
          {regMode === "google_form" && (
            <p className="mt-1 truncate text-[11px] text-slate-400" title={regUrl}>{regUrl}</p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={onOpenGoogleModal} disabled={regModeSaving}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${regMode === "google_form" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
            Google Form
          </button>
          <button onClick={() => onChangeRegMode("internal")} disabled={regModeSaving}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${regMode === "internal" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
            Form Internal
          </button>
        </div>
      </div>

      {/* ── BUILDER PERTANYAAN TAMBAHAN (ALA GOOGLE FORM) ── */}
      <div className="mb-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--brand-primary)]">Pertanyaan Tambahan Formulir</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Susun pertanyaan custom untuk form pendaftaran (seperti Google Form). Pertanyaan aktif tampil
              sebagai langkah &ldquo;Pertanyaan Tambahan&rdquo; di halaman pendaftaran.
            </p>
          </div>
          <button onClick={onAddField} disabled={formFields.length >= fieldMax}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]">
            <Plus className="h-4 w-4" />
            Tambah Pertanyaan
          </button>
        </div>

        {formFields.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
            <FileText className="h-7 w-7 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Belum ada pertanyaan tambahan</p>
            <p className="max-w-md text-xs text-slate-400">
              Formulir pendaftar memakai langkah bawaan (Program, Data Siswa, Data Orang Tua, Upload Berkas).
              Klik &ldquo;Tambah Pertanyaan&rdquo; untuk membuat pertanyaan pertama.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200/80">
            {formFields.map((f, i) => (
              <li key={f.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[11px] font-bold text-[var(--brand-primary)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-sm font-semibold ${f.active ? "text-slate-800" : "text-slate-400"}`}>
                      {f.label}
                    </span>
                    <span className="rounded-full border border-[var(--brand-accent)]/20 bg-[var(--brand-accent)]/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-accent)]">
                      {fieldTypeLabel(f.type)}
                    </span>
                    {f.required && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Wajib
                      </span>
                    )}
                    {!f.active && (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  {spmbFieldNeedsOptions(f.type) && !!f.options?.length && (
                    <p className="mt-0.5 truncate text-xs text-slate-400" title={f.options.join(", ")}>
                      Opsi: {f.options.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <button onClick={() => onToggleField(f)}
                    title={f.active ? "Sembunyikan dari form" : "Tampilkan di form"}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${f.active ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                    <span className={`relative inline-block h-4 w-7 rounded-full transition-colors ${f.active ? "bg-emerald-500" : "bg-slate-300"}`}>
                      <span className={`absolute left-0.5 top-1 h-2 w-2 rounded-full bg-white transition-transform ${f.active ? "translate-x-3" : ""}`} />
                    </span>
                    {f.active ? "Tampil" : "Sembunyi"}
                  </button>
                  <button onClick={() => onMoveField(i, -1)} disabled={i === 0} title="Naik"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => onMoveField(i, 1)} disabled={i === formFields.length - 1} title="Turun"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => onEditField(f)} title="Edit"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                    <PencilSimple className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDeleteField(f)} title="Hapus"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
