"use client";

import { useEffect, useState } from "react";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  getAuditLogs,
  getAuditStats,
} from "@/lib/queries";
import type { AuditAction, AuditLogResult } from "@/lib/queries";
import { StatCard, StatCardRow } from "@/components/ui";
import {
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Scroll,
  Warning,
  X,
} from "@/components/Icons";

const PAGE_SIZE = 20;

const ENTITY_OPTIONS = Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const ACTION_FILTERS: { value: AuditAction | ""; label: string }[] = [
  { value: "", label: "Semua aksi" },
  { value: "create", label: AUDIT_ACTION_LABELS.create },
  { value: "update", label: AUDIT_ACTION_LABELS.update },
  { value: "delete", label: AUDIT_ACTION_LABELS.delete },
];

const ACTION_BADGE: Record<string, string> = {
  create: "border-emerald-100 bg-emerald-50 text-emerald-600",
  update: "border-blue-100 bg-blue-50 text-[#1767b1]",
  delete: "border-red-100 bg-red-50 text-red-600",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Log aktivitas admin (P2.8): siapa, apa, kapan — untuk menyelesaikan
 * sengketa "siapa yang mengubah ini?".
 *
 * Data datang dari trigger `log_audit()` (supabase/audit_logs.sql). Bila tabel
 * belum dibuat, halaman menampilkan panel instruksi SQL (degradasi anggun,
 * tanpa error). Halaman ini hanya-baca.
 */
export default function AdminLogsPage() {
  // Input pencarian di-debounce 300ms sebelum jadi kunci query.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<{ total: number; today: number } | null>(null);
  // Hasil dikunci oleh filterKey supaya loading bisa di-derive tanpa
  // setState sinkron di effect (aman untuk react-hooks/set-state-in-effect).
  const [result, setResult] = useState<({ key: string } & AuditLogResult) | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filterKey = JSON.stringify({ action, entity, search, page });

  useEffect(() => {
    let cancelled = false;
    const key = JSON.stringify({ action, entity, search, page });
    getAuditLogs({ action, entity, search, page })
      .then((res) => {
        if (!cancelled) setResult({ key, ...res });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({
            key,
            available: true,
            rows: [],
            count: 0,
            error: err instanceof Error ? err.message : "Gagal memuat log",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [action, entity, search, page]);

  useEffect(() => {
    let cancelled = false;
    getAuditStats()
      .then((s) => {
        if (!cancelled && s) setStats(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = !result || result.key !== filterKey;
  const current = result && result.key === filterKey ? result : null;
  const available = current?.available ?? true;
  const rows = current?.rows ?? [];
  const count = current?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const hasFilters = Boolean(action || entity || searchInput);

  function applyFilter(mutate: () => void) {
    mutate();
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1767b1]/10">
            <Scroll className="h-5 w-5 text-[#1767b1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Log Aktivitas</h1>
            <p className="text-sm text-slate-500">
              Siapa, apa, kapan — riwayat perubahan konten &amp; SPMB
            </p>
          </div>
        </div>
      </div>

      {/* Panel: SQL belum dijalankan (degradasi anggun) */}
      {current && !available && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-14 text-center">
          <Warning className="h-10 w-10 text-amber-400" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Tabel <code className="rounded bg-slate-100 px-1.5 py-0.5">audit_logs</code> belum
            ada
          </p>
          <p className="mt-1 max-w-md text-xs text-slate-500">
            Log aktivitas memerlukan tabel + trigger. Jalankan file{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">supabase/audit_logs.sql</code>{" "}
            di Supabase SQL Editor, lalu muat ulang halaman ini.
          </p>
        </div>
      )}

      {/* Statistik */}
      {available && stats && (
        <StatCardRow>
          <StatCard label="Total aktivitas" value={stats.total} variant="brand" />
          <StatCard label="Hari ini" value={stats.today} variant="info" />
        </StatCardRow>
      )}

      {/* Filter */}
      {available && (
        <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari aktor atau id objek…"
              aria-label="Cari log"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/15"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={action}
            onChange={(e) =>
              applyFilter(() => setAction(e.target.value as AuditAction | ""))
            }
            aria-label="Filter aksi"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/15"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={entity}
            onChange={(e) => applyFilter(() => setEntity(e.target.value))}
            aria-label="Filter objek"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/15"
          >
            <option value="">Semua objek</option>
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hasil: memuat / error / kosong / tabel */}
      {available && loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-14 text-center">
          <Scroll className="h-10 w-10 animate-pulse text-[#082b59]/30" />
          <p className="mt-3 text-sm text-slate-500">Memuat log…</p>
        </div>
      )}

      {available && !loading && current?.error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="text-sm text-red-700">
            <p className="font-semibold">Gagal memuat log</p>
            <p className="text-xs">{current.error}</p>
          </div>
        </div>
      )}

      {available && !loading && !current?.error && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-14 text-center">
          <Scroll className="h-10 w-10 text-[#082b59]/15" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            {hasFilters
              ? "Tidak ada log yang cocok dengan filter"
              : "Belum ada aktivitas tercatat"}
          </p>
        </div>
      )}

      {available && !loading && !current?.error && rows.length > 0 && (
        <>
          <p
            role="status"
            aria-live="polite"
            className="mb-3 text-xs text-slate-400"
          >
            Menampilkan {rows.length} dari {count} entri
            {hasFilters ? " (terfilter)" : ""}
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400">
                  <th scope="col" className="px-4 py-3 font-semibold">Waktu</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Aksi</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Objek</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Aktor</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          ACTION_BADGE[row.action] ?? "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {AUDIT_ACTION_LABELS[row.action] ?? row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-sm font-medium text-slate-700">
                        {AUDIT_ENTITY_LABELS[row.entity_type] ?? row.entity_type}
                      </span>
                      {row.entity_id && (
                        <span
                          className="block max-w-[180px] truncate text-[11px] text-slate-400"
                          title={row.entity_id}
                        >
                          {row.entity_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.actor_name ?? "–"}
                    </td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-[#1767b1] hover:underline">
                          Lihat
                        </summary>
                        <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">
                          {JSON.stringify(row.detail ?? {}, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginasi */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Halaman sebelumnya"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#1767b1]/40 hover:text-[#1767b1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CaretLeft className="h-3.5 w-3.5" /> Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Halaman berikutnya"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#1767b1]/40 hover:text-[#1767b1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya <CaretRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
