"use client";

import { useRouter } from "next/navigation";
import type { SqlMigrationStatus } from "@/lib/queries/sql-status";
import { Code, CheckCircle, XCircle, ArrowsCounterClockwise } from "@/components/Icons";

/**
 * Status migrasi SQL — daftar file SQL di repo + apakah EFEKnya sudah ada
 * di database (diprobe via kolom/tabel/permission/RPC). Menghilangkan
 * tebak-tebakan "sudah belum SQL ini dijalankan?".
 */
export default function SqlStatusClientPage({ statuses }: { statuses: SqlMigrationStatus[] }) {
  const router = useRouter();
  const applied = statuses.filter((s) => s.applied).length;
  const pending = statuses.length - applied;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <Code className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Migrasi SQL</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Status file SQL di repo — sudah/belum efeknya ada di database
            </p>
          </div>
        </div>
        <button
          onClick={() => router.refresh()}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowsCounterClockwise className="h-4 w-4" /> Muat ulang
        </button>
      </div>

      {/* Ringkasan */}
      <div
        className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border p-4 ${
          pending === 0
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        {pending === 0 ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle className="h-4 w-4" /> Semua {statuses.length} migrasi sudah dijalankan.
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <XCircle className="h-4 w-4" /> {pending} dari {statuses.length} migrasi belum dijalankan —
            jalankan file terkait di Supabase → SQL Editor (idempoten, aman diulang).
          </p>
        )}
      </div>

      {/* Daftar */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b border-slate-200/80 bg-slate-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">File</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Isi</th>
              <th className="w-32 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {statuses.map((s) => (
              <tr key={s.file} className="transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-3.5">
                  <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                    {s.file}
                  </code>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{s.description}</td>
                <td className="px-4 py-3.5 text-center">
                  {s.applied ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle className="h-3 w-3" /> Sudah
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      <XCircle className="h-3 w-3" /> Belum
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Status dicek dengan membuktikan efek file di database (kolom/tabel/permission/RPC) — bukan
        membaca riwayat eksekusi. Semua file bersifat idempoten: menjalankan ulang tidak merusak.
      </p>
    </div>
  );
}
