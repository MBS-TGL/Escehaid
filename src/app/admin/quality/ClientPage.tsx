"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Warning,
  Eye,
  Megaphone,
  Note,
  Heartbeat,
  MagnifyingGlass,
  Funnel,
  X,
  ChartLine,
  FileText,
} from "@/components/Icons";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import type { QualityIssue } from "./page";

export default function QualityClientPage({
  initialIssues,
  healthScore,
  totalAudited,
}: {
  initialIssues: QualityIssue[];
  healthScore: number;
  totalAudited: number;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    return {
      danger: initialIssues.filter((i) => i.severity === "danger").length,
      warning: initialIssues.filter((i) => i.severity === "warning").length,
      total: initialIssues.length,
    };
  }, [initialIssues]);

  const filtered = useMemo(() => {
    return initialIssues.filter((i) => {
      const matchFilter = filter === "all" || i.severity === filter;
      const matchSearch =
        !search.trim() ||
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.detail.toLowerCase().includes(search.toLowerCase()) ||
        i.issue.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [initialIssues, filter, search]);

  const healthTone = healthScore >= 85 ? "success" : healthScore >= 60 ? "warning" : "danger";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* ── Page Header Standar esceha ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-primary)]/10">
            <Heartbeat className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kesehatan &amp; Audit SEO</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Audit otomatis teks alternatif gambar, meta ringkasan, dan kualitas konten publik
            </p>
          </div>
        </div>
      </div>

      {/* ── Metrik Cepat (StatPillGroup) ── */}
      <StatPillGroup>
        <StatPill
          icon={ChartLine}
          label="Skor Kesehatan"
          value={`${healthScore}/100`}
          tone={healthTone}
        />
        <StatPill
          icon={FileText}
          label="Total Diaudit"
          value={totalAudited}
          tone="neutral"
        />
        <StatPill
          icon={Warning}
          label="Perlu Perhatian"
          value={counts.danger}
          tone="danger"
        />
        <StatPill
          icon={Warning}
          label="Peringatan"
          value={counts.warning}
          tone="warning"
        />
      </StatPillGroup>

      {/* ── Toolbar Pencarian & Filter Keparahan ── */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul konten, isu, atau deskripsi..."
            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 py-2 pl-9.5 pr-8 text-xs text-slate-700 placeholder-slate-400 focus:border-[var(--brand-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1 text-xs">
          <span className="px-2 text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Funnel className="h-3 w-3" /> Status:
          </span>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
              filter === "all"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semua ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter("danger")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
              filter === "danger"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Penting ({counts.danger})
          </button>
          <button
            type="button"
            onClick={() => setFilter("warning")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
              filter === "warning"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Peringatan ({counts.warning})
          </button>
        </div>
      </div>

      {/* ── Daftar Temuan ── */}
      {initialIssues.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 shadow-2xs">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Semua Konten Optimal!</h2>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Tidak ditemukan masalah meta deskripsi atau alt text pada seluruh publikasi sekolah.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-700">Tidak ada temuan yang cocok</p>
          <p className="mt-1 text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter status.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors hover:bg-slate-50/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                      item.severity === "danger"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : item.severity === "warning"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.severity === "danger" ? <Warning className="h-3 w-3" /> : null}
                    {item.issue.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    {item.type === "news" ? <Megaphone className="h-3 w-3 text-slate-400" /> : <Note className="h-3 w-3 text-slate-400" />}
                    {item.type === "news" ? "Berita" : "Artikel"}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-[var(--brand-primary)] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.detail}</p>
              </div>

              <Link
                href={item.href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Eye className="h-3.5 w-3.5 text-slate-500" />
                <span>Perbaiki di CMS</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
