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
  CaretDown,
  CaretLeft,
  CaretRight,
  Scroll,
  Warning,
} from "@/components/Icons";
import { FilterBar } from "@/components/admin/FilterBar";
import { MobileFilterBar, MobileListRow, MobilePagination } from "@/components/admin/mobile";

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
 * Data datang dari trigger `log_audit()` (migrasi tabel `audit_logs`). Bila tabel
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
  // Baris timeline mobile yang sedang dibuka detailnya (JSON payload).
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[#1767b1]/10">
            <Scroll className="h-5 w-5 text-[#1767b1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Log Aktivitas</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
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
            Log aktivitas memerlukan tabel + trigger. Jalankan migrasi SQL{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">audit_logs</code> (tabel + RLS +
            trigger <code className="rounded bg-slate-100 px-1.5 py-0.5">log_audit()</code>,
            idempoten) di Supabase SQL Editor, lalu muat ulang halaman ini.
          </p>
        </div>
      )}

      {/* Statistik — desktop: kartu baris; mobile: ringkas 2 metrik unik. */}
      {available && stats && (
        <>
          <div className="hidden md:block">
            <StatCardRow>
              <StatCard label="Total aktivitas" value={stats.total} variant="brand" />
              <StatCard label="Hari ini" value={stats.today} variant="info" />
            </StatCardRow>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:hidden">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-3">
              <p className="text-xs text-[#64748b]">Total aktivitas</p>
              <p className="mt-0.5 text-xl font-bold text-[#0f2a4d] tabular-nums">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white p-3">
              <p className="text-xs text-[#64748b]">Hari ini</p>
              <p className="mt-0.5 text-xl font-bold text-[#0f2a4d] tabular-nums">{stats.today}</p>
            </div>
          </div>
        </>
      )}

      {/* Filter — mobile: toolbar dua baris (cari + pill aksi/objek);
          desktop: gaya Portal (pencarian kiri, pill dropdown kanan). */}
      {available && (
        <>
          <MobileFilterBar
            query={searchInput}
            onQueryChange={setSearchInput}
            placeholder="Cari aktor atau id objek…"
            searchLabel="Cari log"
            filter={{
              value: action,
              options: ACTION_FILTERS.map((f) => ({ key: f.value, label: f.label })),
              onChange: (k) => applyFilter(() => setAction(k as AuditAction | "")),
            }}
            filter2={{
              value: entity,
              options: [
                { key: "", label: "Semua objek" },
                ...ENTITY_OPTIONS.map((o) => ({ key: o.value, label: o.label })),
              ],
              onChange: (k) => applyFilter(() => setEntity(k)),
            }}
          />
          <div className="mt-6 hidden md:block">
            <FilterBar
              placeholder="Cari aktor atau id objek…"
              searchLabel="Cari log"
              query={searchInput}
              onQueryChange={setSearchInput}
              filters={[
                {
                  value: action,
                  options: ACTION_FILTERS.map((f) => ({ key: f.value, label: f.label })),
                  onChange: (k) => applyFilter(() => setAction(k as AuditAction | "")),
                  menuLabel: "Filter aksi",
                },
                {
                  value: entity,
                  options: [
                    { key: "", label: "Semua objek" },
                    ...ENTITY_OPTIONS.map((o) => ({ key: o.value, label: o.label })),
                  ],
                  onChange: (k) => applyFilter(() => setEntity(k)),
                  menuLabel: "Filter objek",
                },
              ]}
            />
          </div>
        </>
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
            className="mb-3 hidden text-xs text-slate-400 md:block"
          >
            Menampilkan {rows.length} dari {count} entri
            {hasFilters ? " (terfilter)" : ""}
          </p>

          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
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

          {/* Mobile: daftar timeline — avatar inisial, kalimat
              "<pelaku> <aksi> <objek>", badge aksi, waktu; tap baris untuk
              membuka/menutup detail JSON. */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
            {rows.map((row) => {
              const actor = row.actor_name ?? "Sistem";
              const open = expandedId === row.id;
              return (
                <div key={row.id}>
                  <MobileListRow
                    onClick={() => setExpandedId(open ? null : row.id)}
                    thumb={
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e4ecf6] text-sm font-bold text-[#082b59]">
                        {actor.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                    }
                    title={
                      <>
                        <span className="text-[#082b59]">{actor}</span>{" "}
                        {(AUDIT_ACTION_LABELS[row.action] ?? row.action).toLowerCase()}{" "}
                        {AUDIT_ENTITY_LABELS[row.entity_type] ?? row.entity_type}
                      </>
                    }
                    badge={
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          ACTION_BADGE[row.action] ?? "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {AUDIT_ACTION_LABELS[row.action] ?? row.action}
                      </span>
                    }
                    subtitle={
                      <>
                        {formatTime(row.created_at)}
                        {row.entity_id && (
                          <span
                            className="mt-0.5 block max-w-full truncate text-[11px] text-slate-400"
                            title={row.entity_id}
                          >
                            {row.entity_id}
                          </span>
                        )}
                      </>
                    }
                    actions={
                      <CaretDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    }
                  />
                  {open && (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
                      <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-100 bg-white p-2 text-[11px] leading-relaxed text-slate-600">
                        {JSON.stringify(row.detail ?? {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
            <MobilePagination
              page={page}
              totalPages={totalPages}
              total={count}
              from={count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
              to={(page - 1) * PAGE_SIZE + rows.length}
              onPageChange={setPage}
              itemLabel="entri"
            />
          </div>

          {/* Paginasi desktop */}
          <div className="mt-4 hidden items-center justify-between md:flex">
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
