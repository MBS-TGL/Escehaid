"use client";

import { useMemo, useState } from "react";
import { Copy, Download, UserPlus, Warning, X } from "@/components/Icons";
import { buildCsv } from "@/lib/csv";
import { parseBulkInviteCsv } from "@/lib/users-bulk-invite";
import { useToast } from "@/components/ui/Toast";

export interface BulkInviteCreated {
  fullName: string;
  email: string;
  roleKey: string;
  inviteLink: string | null;
}

export interface BulkInviteOutcome {
  success: boolean;
  error?: string;
  created: BulkInviteCreated[];
  failed: Array<{ email: string; error: string }>;
}

/**
 * Modal "Undang Massal" — unggah/tempel CSV, pratinjau validasi, lalu buat akun.
 *
 * Validasi klien memakai parser yang sama dengan server (`users-bulk-invite`).
 * Hasil akhir menampilkan tautan undangan per akun yang bisa diunduh CSV atau
 * disalin — karena panel tidak mengirim email undangan.
 */
export function BulkInviteModal({
  onClose,
  onSubmit,
  onDone,
}: {
  onClose: () => void;
  onSubmit: (rows: ReturnType<typeof parseBulkInviteCsv>["rows"]) => Promise<BulkInviteOutcome>;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<BulkInviteCreated[] | null>(null);
  const [failed, setFailed] = useState<Array<{ email: string; error: string }>>([]);

  const parsed = useMemo(() => parseBulkInviteCsv(text), [text]);

  function downloadTemplate() {
    const csv = buildCsv(
      ["Nama", "Email", "Peran"],
      [["Contoh Nama", "contoh@sekolah.sch.id", "OPERATOR_KONTEN"]]
    );
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-undangan-pengguna.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setCreated(null);
    setFailed([]);
    setText(await file.text());
  }

  async function handleSubmit() {
    if (parsed.rows.length === 0) return;
    setSaving(true);
    const res = await onSubmit(parsed.rows);
    setSaving(false);
    if (!res.success) {
      toast(res.error ?? "Gagal mengundang pengguna.", "error");
      return;
    }
    setCreated(res.created);
    setFailed(res.failed);
    onDone();
    toast(
      `${res.created.length} pengguna dibuat${res.failed.length ? `, ${res.failed.length} gagal` : ""}.`,
      res.failed.length ? "info" : "success"
    );
  }

  function downloadResults() {
    if (!created) return;
    const csv = buildCsv(
      ["Nama", "Email", "Peran", "Tautan Undangan"],
      created.map((c) => [c.fullName, c.email, c.roleKey, c.inviteLink ?? ""])
    );
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tautan-undangan-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyAll() {
    if (!created) return;
    const body = created
      .filter((c) => c.inviteLink)
      .map((c) => `${c.fullName} <${c.email}>: ${c.inviteLink}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(body);
      toast("Semua tautan disalin.", "success");
    } catch {
      toast("Gagal menyalin. Gunakan unduh CSV.", "error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Undang Massal dari CSV</h3>
            <p className="text-sm text-slate-500">
              Kolom wajib: <strong>Nama</strong>, <strong>Email</strong>,{" "}
              <strong>Peran</strong>. Maksimal 50 baris per proses.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {created ? (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700">
                <p className="font-semibold">{created.length} akun berhasil dibuat.</p>
                <p className="mt-1 text-xs">
                  Panel tidak mengirim email. Unduh CSV lalu bagikan tautan undangan
                  (berlaku sekali, ±1 jam).
                </p>
              </div>

              {failed.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <Warning className="h-3.5 w-3.5" /> {failed.length} gagal
                  </p>
                  <ul className="space-y-1 text-xs text-amber-800">
                    {failed.map((f) => (
                      <li key={f.email}>
                        <span className="font-mono">{f.email}</span> — {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Peran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {created.map((c) => (
                      <tr key={c.email}>
                        <td className="px-3 py-2">{c.fullName}</td>
                        <td className="px-3 py-2 text-slate-500">{c.email}</td>
                        <td className="px-3 py-2 text-slate-500">{c.roleKey}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">
                    Berkas CSV
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => void handleFile(e.target.files?.[0])}
                    className="w-full cursor-pointer rounded-xl border border-[#dce3ed] bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Template
                </button>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">
                  Atau tempel isi CSV
                </span>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setFileName("");
                  }}
                  rows={6}
                  placeholder={"Nama,Email,Peran\nSiti,siti@sekolah.id,OPERATOR_KONTEN"}
                  className="w-full rounded-xl border border-[#dce3ed] bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/10"
                />
                {fileName && (
                  <p className="mt-1 text-[11px] text-slate-400">Dimuat dari: {fileName}</p>
                )}
              </label>

              {text.trim() !== "" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                      {parsed.rows.length} siap diundang
                    </span>
                    {parsed.issues.length > 0 && (
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                        {parsed.issues.length} baris bermasalah
                      </span>
                    )}
                  </div>

                  {parsed.issues.length > 0 && (
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <ul className="space-y-1 text-xs text-amber-800">
                        {parsed.issues.map((i) => (
                          <li key={`${i.line}-${i.message}`}>
                            <span className="font-semibold">Baris {i.line}:</span> {i.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsed.rows.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Nama</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Peran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsed.rows.map((r) => (
                            <tr key={r.email}>
                              <td className="px-3 py-2">{r.fullName}</td>
                              <td className="px-3 py-2 text-slate-500">{r.email}</td>
                              <td className="px-3 py-2 text-slate-500">{r.roleKey}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          {created ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={copyAll}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" /> Salin Semua
              </button>
              <button
                type="button"
                onClick={downloadResults}
                className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]"
              >
                <Download className="h-4 w-4" /> Unduh CSV
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                data-solid
                data-busy={saving ? "" : undefined}
                type="button"
                disabled={saving || parsed.rows.length === 0}
                onClick={() => void handleSubmit()}
                className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]"
              >
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Undang {parsed.rows.length || ""}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
