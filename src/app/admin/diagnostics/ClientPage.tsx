"use client";

import Link from "next/link";
import type { Diagnostics } from "@/lib/queries/diagnostics";
import { Heartbeat, CheckCircle, XCircle, ArrowSquareOut } from "@/components/Icons";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Titik status: hijau/merah/kuning. */
function Dot({ tone }: { tone: "ok" | "fail" | "warn" }) {
  const cls = tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-red-500";
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} />;
}

function SectionCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {desc && <p className="mt-0.5 text-xs text-slate-400">{desc}</p>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
      {children}
    </div>
  );
}

export default function DiagnosticsClientPage({ data }: { data: Diagnostics }) {
  const overallTone =
    data.overall === "hijau"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : data.overall === "kuning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-600";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <Heartbeat className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Diagnostik</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Status sistem: database, storage, environment, deploy & backup
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide ${overallTone}`}>
          {data.overall === "hijau" ? "Semua sehat" : data.overall === "kuning" ? "Ada yang perlu dicek" : "Ada masalah"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Database */}
        <SectionCard title="Database" desc={`Latensi koneksi: ${data.dbLatencyMs !== null ? `${data.dbLatencyMs} ms` : "—"}`}>
          <div className="max-h-80 overflow-y-auto">
            {data.tables.map((t) => (
              <Row key={t.table}>
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                  <Dot tone={t.ok ? "ok" : "fail"} />
                  <span className="truncate" title={t.table}>{t.label}</span>
                  <span className="font-mono text-[10px] text-slate-400">{t.table}</span>
                </span>
                {t.ok ? (
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">{t.count} baris</span>
                ) : (
                  <span className="max-w-[55%] shrink-0 truncate text-xs text-red-500" title={t.error}>belum ada?</span>
                )}
              </Row>
            ))}
          </div>
        </SectionCard>

        {/* Probe migrasi */}
        <SectionCard title="Migrasi SQL / fitur" desc="belum = SQL migrasi belum dijalankan (fitur memakai fallback)">
          {data.probes.map((p) => (
            <Row key={p.name}>
              <span className="flex min-w-0 items-center gap-2">
                <Dot tone={p.ok ? "ok" : "warn"} />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs font-semibold text-slate-700">{p.name}</span>
                  <span className="block text-xs text-slate-400">{p.desc}</span>
                </span>
              </span>
              <span className={`shrink-0 text-xs font-semibold ${p.ok ? "text-emerald-600" : "text-amber-600"}`}>
                {p.ok ? "siap" : "belum"}
              </span>
            </Row>
          ))}
        </SectionCard>

        {/* Storage */}
        <SectionCard title="Storage (Cloudflare R2)" desc={`Driver: ${data.storage?.driver ?? "—"} — cache pemakaian 6 jam`}>
          {data.storage && data.storage.buckets.length > 0 ? (
            <>
              {data.storage.buckets.map((b) => (
                <Row key={b.bucket}>
                  <span className="flex min-w-0 items-center gap-2">
                    <Dot tone={b.error ? "fail" : "ok"} />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs font-semibold text-slate-700">{b.bucket}</span>
                      <span className="block text-xs text-slate-400">{b.role}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {b.error ? "gagal list" : `${b.objects} objek · ${formatBytes(b.bytes)}`}
                  </span>
                </Row>
              ))}
              <Row>
                <span className="text-xs font-semibold text-slate-600">Total</span>
                <span className="text-xs font-bold tabular-nums text-slate-700">
                  {data.storage.totalObjects} objek · {formatBytes(data.storage.totalBytes)}
                </span>
              </Row>
            </>
          ) : (
            <p className="py-2 text-xs text-slate-400">Env R2 belum lengkap — pemakaian storage tidak tersedia.</p>
          )}
        </SectionCard>

        {/* Environment */}
        <SectionCard title="Environment variables" desc="Hanya status terisi — nilai tidak pernah ditampilkan">
          {data.envs.map((e) => (
            <Row key={e.key}>
              <span className="flex min-w-0 items-center gap-2">
                {e.set ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" /> : e.optional ? <Dot tone="warn" /> : <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs font-semibold text-slate-700">{e.key}</span>
                  <span className="block text-xs text-slate-400">{e.label}{e.optional ? " (opsional)" : ""}</span>
                </span>
              </span>
              <span className={`shrink-0 text-xs font-semibold ${e.set ? "text-emerald-600" : e.optional ? "text-amber-600" : "text-red-500"}`}>
                {e.set ? "terisi" : "kosong"}
              </span>
            </Row>
          ))}
        </SectionCard>

        {/* Deploy & CI */}
        <SectionCard title="Deploy & CI" desc={data.github?.repo ?? "—"}>
          {data.github?.error ? (
            <p className="py-2 text-xs text-slate-400">Status GitHub tidak tersedia: {data.github.error}</p>
          ) : data.github ? (
            <>
              <Row>
                <span className="text-xs text-slate-500">Commit deploy ini</span>
                <span className="font-mono text-xs font-semibold text-slate-700">{data.github.deploySha ?? "dev/lokal"}</span>
              </Row>
              <Row>
                <span className="text-xs text-slate-500">HEAD main di GitHub</span>
                <span className="font-mono text-xs font-semibold text-slate-700">{data.github.headSha ?? "—"}</span>
              </Row>
              {data.github.headSha && data.github.deploySha && (
                <Row>
                  <span className="text-xs text-slate-500">Sinkron deploy</span>
                  <span className={`text-xs font-semibold ${data.github.headSha === data.github.deploySha ? "text-emerald-600" : "text-amber-600"}`}>
                    {data.github.headSha === data.github.deploySha ? "terkini" : "di belakang main"}
                  </span>
                </Row>
              )}
              {data.github.lastRun && (
                <Row>
                  <span className="text-xs text-slate-500">Run Actions terakhir</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs">
                    <Dot tone={data.github.lastRun.conclusion === "success" ? "ok" : data.github.lastRun.conclusion === null ? "warn" : "fail"} />
                    <span className="font-semibold text-slate-700">{data.github.lastRun.name}</span>
                    <a href={data.github.lastRun.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[var(--brand-primary)]" title="Buka di GitHub">
                      <ArrowSquareOut className="h-3.5 w-3.5" />
                    </a>
                  </span>
                </Row>
              )}
            </>
          ) : (
            <p className="py-2 text-xs text-slate-400">Status GitHub tidak tersedia.</p>
          )}
        </SectionCard>

        {/* Backup */}
        <SectionCard title="Backup database" desc="Workflow GitHub Actions harian 02:30 WIB">
          {data.backup?.lastRun ? (
            <>
              <Row>
                <span className="text-xs text-slate-500">Backup terakhir</span>
                <span className="text-xs font-semibold text-slate-700">{formatTanggal(data.backup.lastRun)}</span>
              </Row>
              <Row>
                <span className="text-xs text-slate-500">Umur</span>
                <span className={`text-xs font-semibold ${(data.backup.ageDays ?? 99) <= 7 ? "text-emerald-600" : (data.backup.ageDays ?? 99) <= 14 ? "text-amber-600" : "text-red-500"}`}>
                  {data.backup.ageDays} hari lalu
                </span>
              </Row>
              <div className="pt-2">
                <Link href="/admin/backup" className="text-xs font-semibold text-[var(--brand-accent)] hover:underline">
                  Kelola & lihat riwayat →
                </Link>
              </div>
            </>
          ) : (
            <p className="py-2 text-xs text-slate-400">
              Belum ada manifest backup — cek workflow Actions &quot;Backup&quot; dan secrets GitHub.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
