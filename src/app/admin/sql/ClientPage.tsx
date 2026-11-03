"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SqlMigrationStatus } from "@/lib/queries/sql-status";
import { formatRelativeTime } from "@/lib/admin-display";
import { useToast } from "@/components/ui/Toast";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { FilterBar } from "@/components/admin/FilterBar";
import { MobileFilterBar, MobileListRow } from "@/components/admin/mobile";
import {
  ArrowsCounterClockwise,
  CaretDown,
  ChartPie,
  CheckCircle,
  Code,
  Copy,
  XCircle,
} from "@/components/Icons";

const CMD_MIGRATE = "npm run db:migrate";
const CMD_STATUS = "npm run db:migrate:status";

/** "0001_nama.sql" → { number, slug } untuk judul ringkas. */
function parseFile(file: string) {
  const base = file.split("/").pop() ?? file;
  const m = base.match(/^(\d{3,5})_(.+)$/);
  return { base, number: m?.[1] ?? null, slug: m?.[2] ?? base };
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Label kolom waktu: relatif bila ada waktunya, "Terdeteksi" untuk probe. */
function appliedLabel(s: SqlMigrationStatus): string {
  if (!s.applied) return "—";
  if (s.appliedAt) return formatRelativeTime(s.appliedAt) || "—";
  return "Terdeteksi";
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyBtn({ text, label = "Salin" }: { text: string; label?: string }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        const ok = await copyText(text);
        toast(ok ? `${label} — tersalin.` : "Gagal menyalin.", ok ? "success" : "error");
      }}
      className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
    >
      <Copy className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function StatusPill({ applied }: { applied: boolean }) {
  return applied ? (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-600">
      <CheckCircle className="h-4 w-4" /> Sudah
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <XCircle className="h-3 w-3" /> Belum
    </span>
  );
}

/** Isi expand per baris: path, sumber, waktu, checksum + salin path. */
function RowDetail({ s }: { s: SqlMigrationStatus }) {
  const isRunner = s.source === "ledger";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Path file</p>
        <code className="mt-1 block break-all font-mono text-xs text-slate-700">{s.file}</code>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sumber status</p>
        <p className="mt-1 text-[13px] text-slate-600">
          {isRunner ? (
            <>Runner — tercatat di <code className="font-mono text-xs">schema_migrations</code></>
          ) : (
            "Probe — disimpulkan dari efek di database"
          )}
        </p>
      </div>
      {s.appliedAt && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Dijalankan</p>
          <p className="mt-1 text-[13px] text-slate-700">{formatDateTime(s.appliedAt)}</p>
        </div>
      )}
      {s.appliedBy && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Dijalankan oleh</p>
          <p className="mt-1 text-[13px] text-slate-700">{s.appliedBy}</p>
        </div>
      )}
      {s.checksum && (
        <div className="min-w-0 sm:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Checksum</p>
          <code className="mt-1 block break-all font-mono text-xs text-slate-600">{s.checksum}</code>
        </div>
      )}
      <div className="sm:col-span-2">
        <CopyBtn text={s.file} label="Salin path" />
      </div>
    </div>
  );
}

/**
 * Status migrasi SQL — daftar file SQL di repo + apakah EFEKnya sudah ada
 * di database (diprobe via kolom/tabel/permission/RPC). Menghilangkan
 * tebak-tebakan "sudah belum SQL ini dijalankan?".
 */
export default function SqlStatusClientPage({ statuses }: { statuses: SqlMigrationStatus[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [openFile, setOpenFile] = useState<string | null>(null);

  const total = statuses.length;
  const applied = statuses.filter((s) => s.applied).length;
  const pending = total - applied;
  const pendingRunner = statuses.filter((s) => !s.applied && s.source === "ledger").length;
  const pendingManual = statuses.filter((s) => !s.applied && s.source === "probe").length;
  const runnerCount = statuses.filter((s) => s.source === "ledger").length;
  const percent = total === 0 ? 0 : Math.round((applied / total) * 100);

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    const rank = (s: SqlMigrationStatus) => (!s.applied ? 0 : s.source === "ledger" ? 1 : 2);
    return statuses
      .filter((s) => {
        if (statusFilter === "pending" && s.applied) return false;
        if (statusFilter === "applied" && !s.applied) return false;
        if (sourceFilter === "runner" && s.source !== "ledger") return false;
        if (sourceFilter === "manual" && s.source === "ledger") return false;
        if (q && !`${s.file} ${s.description ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => rank(a) - rank(b) || a.file.localeCompare(b.file));
  }, [statuses, statusFilter, sourceFilter, q]);

  const hasFilter = q.length > 0 || statusFilter !== "all" || sourceFilter !== "all";
  const reset = () => {
    setQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
  };
  const toggle = (file: string) => setOpenFile((cur) => (cur === file ? null : file));

  const statusOptions = [
    { key: "all", label: "Semua Status" },
    { key: "pending", label: "Belum", count: pending },
    { key: "applied", label: "Sudah", count: applied },
  ];
  const sourceOptions = [
    { key: "all", label: "Semua Sumber" },
    { key: "runner", label: "Runner", count: runnerCount },
    { key: "manual", label: "Manual", count: total - runnerCount },
  ];

  const emptyState = (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-600">Tidak ada migrasi yang cocok</p>
      <p className="mt-1 text-[13px] text-slate-400">Coba ubah kata kunci atau filter.</p>
      {hasFilter && (
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Reset filter
        </button>
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <Code className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Migrasi SQL</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Status file SQL di repo — sudah/belum efeknya ada di database
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-1.5">
              <ArrowsCounterClockwise className="h-3.5 w-3.5" /> Muat ulang
            </span>
          </button>
        </div>
      </div>

      {/* Statistik */}
      <StatPillGroup>
        <StatPill icon={Code} label="Total" value={total} tone="neutral" />
        <StatPill icon={CheckCircle} label="Sudah" value={applied} tone="success" />
        <StatPill icon={XCircle} label="Belum" value={pending} tone={pending === 0 ? "success" : "warning"} />
        <StatPill icon={ChartPie} label="Progres" value={`${percent}%`} tone="info" />
      </StatPillGroup>

      {/* Callout */}
      {pending === 0 ? (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" /> Semua {total} migrasi sudah dijalankan.
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-amber-800">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {pending} dari {total} entri SQL belum terdeteksi di database.
          </p>
          {pendingRunner > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[13px] text-amber-800">
                {pendingRunner} migrasi berurutan — jalankan di terminal proyek:
              </p>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white/80 py-1.5 pl-3 pr-1.5">
                <code className="min-w-0 truncate font-mono text-[13px] text-slate-800">{CMD_MIGRATE}</code>
                <CopyBtn text={CMD_MIGRATE} />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white/80 py-1.5 pl-3 pr-1.5">
                <code className="min-w-0 truncate font-mono text-[13px] text-slate-800">{CMD_STATUS}</code>
                <CopyBtn text={CMD_STATUS} />
              </div>
              <p className="text-xs text-amber-800/70">Perintah kedua hanya memeriksa tanpa menjalankan.</p>
            </div>
          )}
          {pendingManual > 0 && (
            <p className="mt-3 text-[13px] text-amber-800">
              {pendingManual} berkas manual: jalankan isinya di Supabase → SQL Editor (idempoten, aman diulang).
            </p>
          )}
        </div>
      )}

      {/* Toolbar: mobile + desktop */}
      <MobileFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Cari nama file atau deskripsi…"
        searchLabel="Cari migrasi"
        filter={{
          value: statusFilter,
          options: statusOptions,
          onChange: setStatusFilter,
          menuLabel: "Filter status",
        }}
        filter2={{
          value: sourceFilter,
          options: sourceOptions,
          onChange: setSourceFilter,
          menuLabel: "Filter sumber",
        }}
      />
      <div className="hidden md:block">
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Cari nama file atau deskripsi…"
          searchLabel="Cari migrasi"
          filters={[
            {
              value: statusFilter,
              options: statusOptions,
              onChange: setStatusFilter,
              menuLabel: "Filter status",
            },
            {
              value: sourceFilter,
              options: sourceOptions,
              onChange: setSourceFilter,
              menuLabel: "Filter sumber",
            },
          ]}
        />
      </div>

      <p role="status" aria-live="polite" className="mb-3 text-xs text-slate-400">
        Menampilkan {rows.length} dari {total} entri
        {hasFilter ? " (terfilter)" : ""}
      </p>

      {/* Desktop: tabel */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        {rows.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400">
                <th scope="col" className="px-4 py-3 font-semibold">Migrasi</th>
                <th scope="col" className="px-4 py-3 font-semibold">Sumber</th>
                <th scope="col" className="px-4 py-3 font-semibold">Dijalankan</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="w-12 px-2 py-3"><span className="sr-only">Detail</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const p = parseFile(s.file);
                const open = openFile === s.file;
                return (
                  <Fragment key={s.file}>
                    <tr className={`border-b border-slate-100 last:border-0 ${s.applied ? "" : "bg-amber-50/40"} ${open ? "" : "hover:bg-slate-50/60"}`}>
                      <td className="min-w-0 px-4 py-3">
                        <p className="flex items-start gap-2">
                          {p.number && (
                            <span className="mt-0.5 shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                              {p.number}
                            </span>
                          )}
                          <span className="min-w-0 text-sm font-semibold text-slate-800 [overflow-wrap:anywhere]">
                            {s.description || p.slug}
                          </span>
                        </p>
                        <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{s.file}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-500">
                        {s.source === "ledger" ? "Runner" : "Manual"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-500">{appliedLabel(s)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusPill applied={s.applied} />
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggle(s.file)}
                          aria-expanded={open}
                          aria-label={open ? `Tutup detail ${p.base}` : `Lihat detail ${p.base}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <CaretDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <td colSpan={5} className="px-4 py-4">
                          <RowDetail s={s} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          emptyState
        )}
      </div>

      {/* Mobile: daftar baris */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:hidden">
        {rows.length > 0 ? (
          rows.map((s) => {
            const open = openFile === s.file;
            return (
              <div key={s.file} className={s.applied ? "" : "bg-amber-50/40"}>
                <MobileListRow
                  onClick={() => toggle(s.file)}
                  title={
                    <span className="break-all font-mono text-[13px] font-semibold text-slate-700">
                      {s.file}
                      {s.source === "ledger" && (
                        <span className="ml-1.5 rounded bg-[var(--brand-accent)]/10 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-[var(--brand-accent)]">
                          runner
                        </span>
                      )}
                    </span>
                  }
                  subtitle={
                    <>
                      <span className="block text-[13px]">{s.description}</span>
                      {s.applied && <span className="mt-0.5 block text-[11px]">{appliedLabel(s)}</span>}
                    </>
                  }
                  status={<StatusPill applied={s.applied} />}
                  actions={
                    <CaretDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                  }
                />
                {open && (
                  <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-3">
                    <RowDetail s={s} />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          emptyState
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Dua sumber status: <strong>runner</strong> (tercatat di tabel{" "}
        <code className="font-mono">schema_migrations</code> oleh{" "}
        <code className="font-mono">npm run db:migrate</code>) dan{" "}
        <strong>probe</strong> (disimpulkan dari efek file di database — untuk SQL lama
        yang dijalankan manual sebelum runner ada). Semua file bersifat idempoten.
      </p>
    </div>
  );
}
