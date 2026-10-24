"use client";

import { useState } from "react";
import type { BackupManifest } from "@/lib/queries/backup";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { Database, CheckCircle, XCircle, Clock, ArrowsCounterClockwise } from "@/components/Icons";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });
}

/** Badge umur backup terakhir: hijau ≤7 hari, kuning ≤14, merah >14. */
function umurBackup(lastRunIso: string) {
  const hari = Math.floor((Date.now() - new Date(lastRunIso).getTime()) / 86400_000);
  if (hari <= 7) return { tone: "hijau", label: `${hari} hari lalu — sehat` };
  if (hari <= 14) return { tone: "kuning", label: `${hari} hari lalu — perlu dicek` };
  return { tone: "merah", label: `${hari} hari lalu — segera backup!` };
}

export default function BackupClientPage({ manifest }: { manifest: BackupManifest | null }) {
  const { can } = usePermissions();
  const { toast } = useToast();
  const canTrigger = can("backup:update");
  const [triggering, setTriggering] = useState(false);

  const last = manifest?.backups?.[manifest.backups.length - 1] ?? null;
  const umur = manifest ? umurBackup(manifest.last_run) : null;

  async function handleTrigger() {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/backup/trigger", { method: "POST" });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || body.error) {
        toast(body.error || `Gagal memicu backup (${res.status}).`, "error");
        return;
      }
      toast("Backup dipicu — berjalan di GitHub Actions (±2-5 menit).", "success");
    } catch {
      toast("Gagal menghubungi server.", "error");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <Database className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Cadangan</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Backup database otomatis tiap hari 02:30 WIB → Cloudflare R2 (bucket privat)
            </p>
          </div>
        </div>
        {canTrigger && (
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] disabled:opacity-60"
          >
            <ArrowsCounterClockwise className="h-4 w-4" /> {triggering ? "Memicu…" : "Backup sekarang"}
          </button>
        )}
      </div>

      {/* Status terakhir */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Backup terakhir</p>
          {manifest && last ? (
            <>
              <p className="mt-1.5 text-sm font-semibold text-slate-800">{formatTanggal(manifest.last_run)}</p>
              {umur && (
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    umur.tone === "hijau"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : umur.tone === "kuning"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-red-200 bg-red-50 text-red-600"
                  }`}
                >
                  {umur.tone === "hijau" ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {umur.label}
                </span>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-sm text-slate-500">Belum pernah ada backup</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ukuran terakhir</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-800">{last ? formatBytes(last.bytes) : "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tersimpan (rotasi 30 hari)</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-800">{manifest?.backups.length ?? 0} berkas</p>
        </div>
      </div>

      {/* Riwayat */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Riwayat backup</h2>
        </div>
        {!manifest || manifest.backups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Database className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Belum ada riwayat backup</p>
            <p className="max-w-md text-xs text-slate-400">
              Pastikan secrets GitHub terisi (lihat header .github/workflows/backup.yml) — backup pertama akan
              berjalan pada jadwal berikutnya, atau picu manual dengan tombol di atas.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tanggal</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Berkas</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ukuran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...manifest.backups].reverse().map((b) => (
                <tr key={b.key} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600" title={b.date}>
                    {formatTanggal(b.date + "T00:00:00Z")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.key}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-600">{formatBytes(b.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Runbook ringkas */}
      <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Clock className="h-4 w-4 text-slate-400" /> Cara restore (ringkas)
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-slate-500">
          <li>Unduh berkas backup terbaru dari bucket R2 privat (<code className="rounded bg-slate-100 px-1">backups/</code>) lalu ekstrak <code className="rounded bg-slate-100 px-1">supabase_backup/</code>.</li>
          <li>Ikuti langkah di <code className="rounded bg-slate-100 px-1">docs/BACKUP.md</code> (restore schema → data → auth → verifikasi).</li>
          <li>Setelah restore, jalankan ulang SQL migrasi terbaru yang belum termasuk dalam backup.</li>
        </ol>
      </div>
    </div>
  );
}
