"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  getAuditLogs,
  getAuditStats,
} from "@/lib/queries";
import type { AuditAction, AuditLogResult } from "@/lib/queries";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  Scroll,
  Warning,
  Users,
  CalendarBlank,
  Download,
  X,
} from "@/components/Icons";
import { FilterBar } from "@/components/admin/FilterBar";
import { MobileFilterBar, MobileListRow, MobilePagination, DesktopPagination } from "@/components/admin/mobile";

// PAGE_SIZE moved to state

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
  update: "border-blue-100 bg-blue-50 text-[var(--brand-accent)]",
  delete: "border-red-100 bg-red-50 text-red-600",
};

/** Render before/after sebagai pasangan kunci; fallback JSON mentah. */
function AuditDetail({ detail }: { detail: Record<string, unknown> | null }) {
  const d = detail ?? {};
  const before = (d.before && typeof d.before === "object" ? d.before : null) as Record<string, unknown> | null;
  const after = (d.after && typeof d.after === "object" ? d.after : null) as Record<string, unknown> | null;

  if (before && after) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    return (
      <div className="space-y-1.5">
        {keys.map((key) => {
          const b = before[key];
          const a = after[key];
          if (JSON.stringify(b) === JSON.stringify(a)) return null;
          return (
            <div key={key} className="rounded-lg border border-slate-100 bg-white px-2 py-1.5 text-[11px]">
              <p className="font-semibold text-slate-600">{key}</p>
              <p className="mt-0.5 break-words text-red-600 line-through">{JSON.stringify(b)}</p>
              <p className="break-words text-emerald-700">{JSON.stringify(a)}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">
      {JSON.stringify(d, null, 2)}
    </pre>
  );
}

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
  return (
    <Suspense fallback={null}>
      <AdminLogsInner />
    </Suspense>
  );
}

function AdminLogsInner() {
  // Filter aktor via URL: /admin/logs?user=<id>&nama=<nama> (dari halaman
  // Users → "Riwayat aktivitas"). useSearchParams butuh Suspense.
  const searchParams = useSearchParams();
  const [actorId, setActorId] = useState(searchParams.get("user") ?? "");
  const [actorName, setActorName] = useState(searchParams.get("nama") ?? "");

  // Input pencarian di-debounce 300ms sebelum jadi kunci query.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [entity, setEntity] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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

  const filterKey = JSON.stringify({ action, entity, search, fromDate, toDate, page, pageSize, actorId, refreshKey });

  useEffect(() => {
    let cancelled = false;
    const key = JSON.stringify({ action, entity, search, fromDate, toDate, page, pageSize, actorId, refreshKey });
    getAuditLogs({
      action,
      entity,
      search,
      page,
      pageSize,
      actorId: actorId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    })
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
  }, [action, entity, search, fromDate, toDate, page, actorId, refreshKey]);

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
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const hasFilters = Boolean(action || entity || searchInput || fromDate || toDate);

  function applyFilter(mutate: () => void) {
    mutate();
    setPage(1);
  }

  function exportCsv() {
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Waktu", "Aksi", "Objek", "Entity ID", "Aktor", "Detail"];
    const lines = [header.map(cell).join(";")];
    for (const row of rows) {
      lines.push(
        [
          formatTime(row.created_at),
          AUDIT_ACTION_LABELS[row.action] ?? row.action,
          AUDIT_ENTITY_LABELS[row.entity_type] ?? row.entity_type,
          row.entity_id ?? "",
          row.actor_name ?? "Sistem",
          JSON.stringify(row.detail ?? {}),
        ]
          .map(cell)
          .join(";")
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `log-aktivitas-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <Scroll className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Log Aktivitas</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Siapa, apa, kapan — riwayat perubahan konten &amp; SPMB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Muat ulang
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Ekspor CSV
          </button>
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

      {/* Statistik — StatPillGroup: pill kompak satu baris. */}
      {available && stats && (
        <StatPillGroup>
          <StatPill icon={Users} label="Total Aktivitas" value={stats.total} tone="neutral" />
          <StatPill icon={CalendarBlank} label="Hari Ini" value={stats.today} tone="info" />
        </StatPillGroup>
      )}

      {/* Chip aktor — aktif bila diarahkan dari halaman Users (?user=&nama=). */}
      {actorId && (
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)]">
            <Users className="h-3.5 w-3.5" />
            Aktor: {actorName || "pengguna"}
            <button
              type="button"
              onClick={() => { setActorId(""); setActorName(""); setPage(1); }}
              aria-label="Lepas filter aktor"
              className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--brand-primary)]/10"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
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

      {available && (
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="log-from" className="mb-1 block text-[11px] font-semibold text-slate-500">Dari tanggal</label>
            <input
              id="log-from"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => applyFilter(() => setFromDate(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            />
          </div>
          <div>
            <label htmlFor="log-to" className="mb-1 block text-[11px] font-semibold text-slate-500">Sampai tanggal</label>
            <input
              id="log-to"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => applyFilter(() => setToDate(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => applyFilter(() => { setFromDate(""); setToDate(""); })}
              className="mt-5 text-xs font-semibold text-slate-500 hover:underline"
            >
              Reset tanggal
            </button>
          )}
        </div>
      )}

      {/* Hasil: memuat / error / kosong / tabel */}
      {available && loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-14 text-center">
          <Scroll className="h-10 w-10 animate-pulse text-[var(--brand-primary)]/30" />
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
          <Scroll className="h-10 w-10 text-[var(--brand-primary)]/15" />
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
                        <summary className="cursor-pointer text-xs font-semibold text-[var(--brand-accent)] hover:underline">
                          Lihat
                        </summary>
                        <AuditDetail detail={row.detail} />
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
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e4ecf6] text-sm font-bold text-[var(--brand-primary)]">
                        {actor.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                    }
                    title={
                      <>
                        <span className="text-[var(--brand-primary)]">{actor}</span>{" "}
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
                      <AuditDetail detail={row.detail} />
                    </div>
                  )}
                </div>
              );
            })}
            <MobilePagination
              page={page}
              totalPages={totalPages}
              total={count}
              from={count === 0 ? 0 : (page - 1) * pageSize + 1}
              to={(page - 1) * pageSize + rows.length}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              itemLabel="entri"
            />
          </div>

          {/* Paginasi desktop */}
          <DesktopPagination
            page={page}
            totalPages={totalPages}
            total={count}
            from={count === 0 ? 0 : (page - 1) * pageSize + 1}
            to={(page - 1) * pageSize + rows.length}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemLabel="entri"
            className="mt-4 rounded-xl border border-slate-200/80"
          />
          {/*
            <span className="text-xs text-slate-400">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Halaman sebelumnya"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-accent)]"
              >
                <CaretLeft className="h-3.5 w-3.5" /> Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Halaman berikutnya"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-accent)]"
              >
                Berikutnya <CaretRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>*/}
        </>
      )}
    </div>
  );
}
