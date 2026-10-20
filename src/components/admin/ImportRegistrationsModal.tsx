"use client";

/**
 * Modal "Import Pendaftar" (/admin/admission): baca file ekspor Google Form
 * (.xlsx sheet "Form Responses 1" / .csv) → pratinjau per baris dengan
 * badge Siap/Peringatan/Duplikat/Error + edit field bermasalah → insert
 * massal satu per satu dengan progres. Logika pemetaan & validasi ada di
 * lib/spmb-import.ts; pembaca file di lib/spmb-import-file.ts.
 */

import { useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  CheckCircle, FileText, Info, Upload, Warning, XCircle,
} from "@/components/Icons";
import { adminCreateRegistration } from "@/lib/queries/registrations";
import { readSpreadsheetFile } from "@/lib/spmb-import-file";
import { normalizeName } from "@/lib/format-name";
import {
  STATUS_LABEL, FIELD_LABELS, buildImportPayload, buildImportResult, detectDuplicates, rowStatus,
  updateRowField, type ImportResult, type ImportRow, type RawKey,
} from "@/lib/spmb-import";
import type { SpmbRegistration } from "@/lib/supabase";

type Step = "pick" | "preview" | "running" | "done";

const STATUS_STYLE: Record<string, string> = {
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  duplicate: "bg-violet-50 text-violet-700 border-violet-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

/** Field yang boleh diedit langsung di preview (perbaikan cepat tanpa ulang file). */
const EDIT_FIELDS: { key: RawKey; label: string; type: "text" | "select" }[] = [
  { key: "birth", label: "Tempat, Tanggal Lahir", type: "text" },
  { key: "gender", label: "Jenis Kelamin", type: "select" },
  { key: "nik", label: "NIK", type: "text" },
  { key: "nisn", label: "NISN", type: "text" },
  { key: "phone", label: "No. HP/WA", type: "text" },
];

export function ImportRegistrationsModal({
  open, onClose, existing, onImported,
}: {
  open: boolean;
  onClose: () => void;
  /** Pendaftar tersimpan — dipakai deteksi duplikat vs database. */
  existing: SpmbRegistration[];
  /** Dipanggil setelah import selesai (refresh daftar). */
  onImported: () => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });

  const statusCount = useMemo(() => {
    const c = { ready: 0, warning: 0, duplicate: 0, error: 0 };
    for (const r of rows) c[rowStatus(r)]++;
    return c;
  }, [rows]);
  const selectedCount = rows.filter((r) => r.include).length;

  function reset() {
    setStep("pick");
    setFileName("");
    setError(null);
    setResult(null);
    setRows([]);
    setProgress({ done: 0, total: 0, failed: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    if (step === "running") return; // jangan tutup saat proses insert
    if (step === "done") onImported();
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setParsing(true);
    setError(null);
    setFileName(file.name);
    try {
      const table = await readSpreadsheetFile(file);
      const res = buildImportResult(table, existing);
      if (res.rows.length === 0) {
        setError(
          res.skipped > 0
            ? `Tidak ada baris pendaftar yang bisa dibaca (${res.skipped} baris dilewati karena NAMA LENGKAP kosong).`
            : "File terbaca tetapi tidak berisi baris data."
        );
        return;
      }
      setResult(res);
      setRows(res.rows);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "File tidak bisa dibaca.");
      setFileName("");
    } finally {
      setParsing(false);
    }
  }

  function toggleRow(index: number) {
    setRows((prev) => prev.map((r) => (r.index === index ? { ...r, include: !r.include } : r)));
  }

  function editField(index: number, field: RawKey, value: string) {
    setRows((prev) => {
      // Edit bisa mengubah NIK/nama → deteksi duplikat dijalankan ulang.
      const next = prev.map((r) => {
        if (r.index !== index) return r;
        const edited = updateRowField(r, field, value);
        edited.include = r.include && rowStatus(edited) !== "error";
        return edited;
      });
      detectDuplicates(next, existing);
      // Baris yang kini jadi duplikat otomatis tidak dicentang (default aman).
      return next.map((r) => ({
        ...r,
        include: r.include && rowStatus(r) !== "error" && !r.duplicateOf,
      }));
    });
  }

  async function handleImport() {
    const chosen = rows.filter((r) => r.include);
    if (chosen.length === 0) return;
    setStep("running");
    setProgress({ done: 0, total: chosen.length, failed: 0 });

    let failed = 0;
    for (let i = 0; i < chosen.length; i++) {
      const res = await adminCreateRegistration(buildImportPayload(chosen[i]));
      if (!res.success) {
        failed++;
        console.warn(`Import baris ${chosen[i].index} (${chosen[i].data.full_name}) gagal:`, res.error);
      }
      setProgress({ done: i + 1, total: chosen.length, failed });
    }
    setStep("done");
    const ok = chosen.length - failed;
    toast(
      failed > 0
        ? `${ok} pendaftar berhasil diimpor, ${failed} gagal (lihat konsol browser).`
        : `${ok} pendaftar berhasil diimpor.`,
      failed > 0 ? "error" : "success"
    );
  }

  /* ── Tahap 1: pilih file ─────────────────────────────────── */
  if (step === "pick" || step === "running") {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Import Pendaftar"
        description="Massal dari ekspor Google Form (.xlsx / .csv)"
        size="lg"
        footer={
          step === "pick" ? (
            <button onClick={handleClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Batal
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
              Mengimpor {progress.done}/{progress.total}{progress.failed > 0 ? ` (${progress.failed} gagal)` : ""}…
            </div>
          )
        }
      >
        {step === "pick" ? (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center transition-colors hover:border-[var(--brand-accent)] hover:bg-[var(--brand-primary)]/[0.03] disabled:opacity-60"
            >
              {parsing ? (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
              ) : (
                <Upload className="h-6 w-6 text-[var(--brand-accent)]" />
              )}
              <span className="text-sm font-semibold text-slate-700">
                {parsing ? "Membaca file…" : fileName || "Klik untuk memilih file"}
              </span>
              <span className="text-xs text-slate-500">Format .xlsx (sheet &ldquo;Form Responses 1&rdquo;) atau .csv</span>
            </button>

            <div className="flex gap-2 rounded-xl bg-[var(--brand-primary)]/5 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
              <ul className="space-y-1 text-xs text-slate-600">
                <li>Hanya sheet <b>Form Responses 1</b> yang dibaca — sheet lain diabaikan.</li>
                <li>Baris tanpa NAMA LENGKAP (mis. baris &ldquo;INDENT&rdquo;) otomatis dilewati.</li>
                <li>Status default <b>Menunggu</b> dan tanpa gelombang — ubah setelah import bila perlu.</li>
                <li>Baris duplikat (NIK/nama sama) atau bermasalah tidak ikut diimpor kecuali Anda mencentangnya.</li>
              </ul>
            </div>

            {error && (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <p className="text-sm text-slate-600">
              Menyimpan <b>{progress.total}</b> pendaftar dari &ldquo;{fileName}&rdquo;…
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </Modal>
    );
  }

  /* ── Tahap 3: selesai ────────────────────────────────────── */
  if (step === "done") {
    const ok = progress.total - progress.failed;
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Import Selesai"
        size="md"
        footer={
          <button onClick={handleClose} className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]">
            Selesai
          </button>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${progress.failed > 0 ? "bg-amber-100" : "bg-emerald-100"}`}>
            {progress.failed > 0
              ? <Warning className="h-7 w-7 text-amber-600" />
              : <CheckCircle className="h-7 w-7 text-emerald-600" />}
          </div>
          <p className="text-sm text-slate-700">
            <b>{ok}</b> pendaftar berhasil diimpor
            {progress.failed > 0 && <>, <b className="text-red-600">{progress.failed}</b> gagal (detail di konsol browser)</>}.
          </p>
          <p className="text-xs text-slate-500">Semua berstatus &ldquo;Menunggu&rdquo; tanpa gelombang — kelola lewat tabel Pendaftar.</p>
        </div>
      </Modal>
    );
  }

  /* ── Tahap 2: pratinjau ──────────────────────────────────── */
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Pratinjau Import"
      description={`"${fileName}" — ${rows.length} baris terbaca${result && result.skipped > 0 ? `, ${result.skipped} baris tanpa nama dilewati` : ""}`}
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button onClick={reset} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Ganti File
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{selectedCount} dari {rows.length} baris dipilih</span>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import {selectedCount} Pendaftar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Ringkasan status */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(statusCount) as (keyof typeof statusCount)[]).map((k) => (
            <span key={k} className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[k]}`}>
              {statusCount[k]} {STATUS_LABEL[k]}
            </span>
          ))}
          <button
            onClick={() => setRows((prev) => prev.map((r) => ({ ...r, include: rowStatus(r) === "ready" || rowStatus(r) === "warning" })))}
            className="ml-auto rounded-lg border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Pilih semua siap
          </button>
          <button
            onClick={() => setRows((prev) => prev.map((r) => ({ ...r, include: false })))}
            className="rounded-lg border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Kosongkan
          </button>
        </div>

        {/* Kolom tanpa padanan field */}
        {result && result.unmapped.length > 0 && (
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              Kolom tanpa padanan field (nilainya <b>tidak diimpor</b>): {result.unmapped.join(", ")}.
              Beri tahu admin sistem bila kolom ini perlu dimigrasikan.
            </p>
          </div>
        )}

        {/* Pemetaan kolom — buka bila ada nilai yang "terbaca dari kolom lain"
            supaya salah-kunci langsung terlihat (field ← judul kolom sumber). */}
        {result && result.mapping.length > 0 && (
          <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <summary className="cursor-pointer select-none text-xs font-semibold text-slate-600">
              Pemetaan kolom — {result.mapping.length} dipetakan
              {result.unmapped.length > 0 ? `, ${result.unmapped.length} tanpa padanan` : ""}
            </summary>
            <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {result.mapping.map((m) => (
                <li key={m.key} className="min-w-0 truncate text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{FIELD_LABELS[m.key]}</span>
                  {" ← "}
                  {m.header}
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Daftar baris */}
        <div className="max-h-[52vh] space-y-2 overflow-y-auto rounded-xl border border-slate-100 p-2">
          {rows.map((row) => {
            const status = rowStatus(row);
            const editableIssues = new Set(row.issues.map((i) => i.field));
            // Judul tampilan dinormalisasi — file tidak diubah saat preview.
            const displayName = normalizeName(row.data.full_name);
            return (
              <div key={row.index} className={`rounded-xl border p-3 transition-colors ${row.include ? "border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/[0.03]" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={row.include}
                    disabled={status === "error"}
                    onChange={() => toggleRow(row.index)}
                    aria-label={`Pilih baris ${row.index} (${displayName})`}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-[var(--brand-accent)] disabled:opacity-40"
                  />
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{displayName}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                      {row.data.program && <span className="text-[11px] text-slate-500">{row.data.program}</span>}
                      {status === "error" && (
                        <span className="text-[11px] text-red-500">— tidak bisa dipilih sampai diperbaiki</span>
                      )}
                    </div>
                    {row.duplicateOf && (
                      <p className="mt-0.5 text-[11px] text-violet-600">Duplikat dari {row.duplicateOf}</p>
                    )}
                    {row.issues.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {row.issues.map((issue, i) => (
                          <li key={i} className={`flex items-start gap-1.5 text-[11px] ${issue.level === "error" ? "text-red-600" : "text-amber-600"}`}>
                            {issue.level === "error"
                              ? <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                              : <Warning className="mt-0.5 h-3 w-3 shrink-0" />}
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Edit cepat field bermasalah */}
                    {EDIT_FIELDS.filter((f) => editableIssues.has(f.key)).length > 0 && (
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {EDIT_FIELDS.filter((f) => editableIssues.has(f.key)).map((f) => (
                          <label key={f.key} className="block">
                            <span className="mb-0.5 block text-[10px] font-semibold text-slate-500">{f.label}</span>
                            {f.type === "select" ? (
                              <select
                                value={row.raw.gender ?? ""}
                                onChange={(e) => editField(row.index, f.key, e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[var(--brand-accent)]"
                              >
                                <option value="">— pilih —</option>
                                <option value="Laki - Laki">Laki - Laki</option>
                                <option value="Perempuan">Perempuan</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={row.raw[f.key] ?? ""}
                                onChange={(e) => editField(row.index, f.key, e.target.value)}
                                placeholder={f.key === "birth" ? "JEMBER, 24 Juli 2014" : ""}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[var(--brand-accent)]"
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
