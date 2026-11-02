"use client";

import { useMemo, useState } from "react";import {
  Phone,
  MagnifyingGlass,
  CalendarBlank,
  CalendarCheck,
  Warning,
  PencilSimple,
  Printer,
  WhatsappLogo,
  Eye,
} from "@/components/Icons";
import { normalizeName, normalizeSchool } from "@/lib/format-name";
import type { SpmbAdminListRow } from "@/lib/queries/spmb-list";
import type { SpmbRegistration } from "@/lib/supabase";
import { pathLabels } from "./shared";

export type InterviewGroup = "overdue" | "today" | "tomorrow" | "week" | "later";

const GROUP_META: Record<InterviewGroup, { label: string; cls: string }> = {
  overdue: { label: "Lewat Jadwal", cls: "border-red-200 bg-red-50 text-red-700" },
  today: { label: "Hari Ini", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  tomorrow: { label: "Besok", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  week: { label: "7 Hari Ke Depan", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  later: { label: "Berikutnya", cls: "border-slate-200 bg-slate-100 text-slate-600" },
};

/** Kelompokkan jadwal berdasarkan hari WIB (batas tengah malam lokal). */
export function interviewGroupOf(iso: string, nowMs: number): InterviewGroup {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "later";
  // Awal hari ini (WIB = UTC+7).
  const wibNow = new Date(nowMs + 7 * 3600000);
  const startTodayUtc = Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()) - 7 * 3600000;
  const day = 86400000;
  if (t < startTodayUtc) return "overdue";
  if (t < startTodayUtc + day) return "today";
  if (t < startTodayUtc + 2 * day) return "tomorrow";
  if (t < startTodayUtc + 7 * day) return "week";
  return "later";
}

export function formatInterviewAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export interface InterviewsPanelProps {
  rows: SpmbAdminListRow[];
  loading: boolean;
  canVerify: boolean;
  onDetail: (item: SpmbRegistration) => void;
  onReschedule: (item: SpmbRegistration) => void;
  onSendInvite: (item: SpmbRegistration) => void;
}

/**
 * Tab Wawancara: semua pendaftar berjadwal, dikelompokkan Hari ini / Besok /
 * 7 hari / Berikutnya / Lewat jadwal. Tombol cetak memakai window.print()
 * dengan blok `print:block` khusus di bawah.
 */
export function InterviewsPanel({ rows, loading, canVerify, onDetail, onReschedule, onSendInvite }: InterviewsPanelProps) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<InterviewGroup | "all">("all");
  // Patokan "sekarang" dibekukan per mount — pengelompokan stabil antar render.
  const [nowMs] = useState(() => Date.now());

  const scheduled = useMemo(() => {
    return rows
      .filter((r) => r.interview_at)
      .map((r) => ({ row: r, group: interviewGroupOf(r.interview_at as string, nowMs) }))
      .filter(({ row }) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          row.full_name.toLowerCase().includes(q) ||
          (row.previous_school || "").toLowerCase().includes(q) ||
          (row.phone || "").includes(q)
        );
      })
      .filter(({ group }) => groupFilter === "all" || group === groupFilter)
      .sort((a, b) => new Date(a.row.interview_at as string).getTime() - new Date(b.row.interview_at as string).getTime());
  }, [rows, search, groupFilter, nowMs]);

  const counts = useMemo(() => {
    const c: Record<InterviewGroup, number> = { overdue: 0, today: 0, tomorrow: 0, week: 0, later: 0 };
    for (const r of rows) {
      if (!r.interview_at) continue;
      c[interviewGroupOf(r.interview_at, nowMs)] += 1;
    }
    return c;
  }, [rows, nowMs]);

  return (
    <div>
      {/* Toolbar — disembunyikan saat cetak */}
      <div className="mb-4 flex flex-col gap-2 print:hidden sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, sekolah, telepon…"
            aria-label="Cari jadwal wawancara"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", "Semua Jadwal", scheduled.length],
              ...(Object.entries(GROUP_META) as [InterviewGroup, { label: string }][]).map(
                ([key, meta]) => [key, meta.label, counts[key]] as [string, string, number]
              ),
            ] as [string, string, number][]
          ).map(([key, label, count]) => {
            const active = groupFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setGroupFilter(key as InterviewGroup | "all")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[var(--brand-accent)]/40"
                }`}
              >
                {label}
                <span className={`rounded-full px-1 tabular-nums ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:ml-auto"
        >
          <Printer className="h-4 w-4" />
          Cetak Jadwal
        </button>
      </div>

      {/* Daftar — disembunyikan saat cetak (diganti tabel cetak) */}
      <div className="print:hidden">
      {loading ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          <p className="text-sm text-slate-500">Memuat jadwal wawancara...</p>
        </div>
      ) : scheduled.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <CalendarBlank className="h-8 w-8 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Belum ada jadwal wawancara</p>
            <p className="mt-1 text-xs text-slate-400">
              {search || groupFilter !== "all" ? "Coba kata kunci atau grup lain" : "Jadwalkan dari detail pendaftar atau aksi massal"}
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {scheduled.map(({ row, group }) => {
            const meta = GROUP_META[group];
            const overdue = group === "overdue" && row.status === "pending";
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[11px] font-bold text-[var(--brand-primary)]">
                    {normalizeName(row.full_name).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{normalizeName(row.full_name)}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-semibold text-purple-700">
                        <CalendarCheck className="h-3.5 w-3.5" />
                        {formatInterviewAt(row.interview_at as string)}
                      </span>
                      {row.previous_school && <span className="truncate">{normalizeSchool(row.previous_school)}</span>}
                      {row.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {row.phone}
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {pathLabels[row.registration_path] || row.registration_path}
                      </span>
                    </p>
                    {row.interview_note && (
                      <p className="mt-1 truncate text-xs text-slate-400" title={row.interview_note}>
                        {row.interview_note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                    {overdue && <Warning className="h-3 w-3" />}
                    {meta.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDetail(row)}
                    title="Detail"
                    aria-label={`Detail ${normalizeName(row.full_name)}`}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {canVerify && (
                    <>
                      <button
                        type="button"
                        onClick={() => onSendInvite(row)}
                        title="Kirim undangan via WhatsApp"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <WhatsappLogo className="h-3.5 w-3.5" />
                        Undang
                      </button>
                      <button
                        type="button"
                        onClick={() => onReschedule(row)}
                        title="Ubah jadwal"
                        aria-label={`Ubah jadwal ${normalizeName(row.full_name)}`}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-purple-50 hover:text-purple-600"
                      >
                        <PencilSimple className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>

      {/* Versi cetak — hanya tampil saat print */}
      <div className="hidden print:block">
        <h1 className="text-lg font-bold">Jadwal Wawancara SPMB</h1>
        <p className="text-xs text-slate-500">
          Dicetak {new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} · {scheduled.length} pendaftar
        </p>
        <table className="mt-3 w-full border-collapse text-xs">
          <thead>
            <tr>
              {["No", "Nama", "Telepon", "Asal Sekolah", "Jadwal (WIB)", "Catatan"].map((h) => (
                <th key={h} className="border border-slate-400 px-2 py-1 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scheduled.map(({ row }, i) => (
              <tr key={row.id}>
                <td className="border border-slate-300 px-2 py-1">{i + 1}</td>
                <td className="border border-slate-300 px-2 py-1">{normalizeName(row.full_name)}</td>
                <td className="border border-slate-300 px-2 py-1">{row.phone || "-"}</td>
                <td className="border border-slate-300 px-2 py-1">{normalizeSchool(row.previous_school) || "-"}</td>
                <td className="border border-slate-300 px-2 py-1">{formatInterviewAt(row.interview_at as string)}</td>
                <td className="border border-slate-300 px-2 py-1">{row.interview_note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
