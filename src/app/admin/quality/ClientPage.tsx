"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Warning,
  Eye,
  Megaphone,
  Note,
  Heartbeat,
} from "@/components/Icons";
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

  const filtered = filter === "all"
    ? initialIssues
    : initialIssues.filter((i) => i.severity === filter);

  const scoreColor = healthScore >= 85
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : healthScore >= 60
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Heartbeat className="h-5 w-5 text-[var(--brand-accent)]" />
          Kesehatan Konten &amp; Audit SEO
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pemindaian otomatis teks alternatif gambar, meta ringkasan, dan kesegaran informasi di seluruh publikasi sekolah.
        </p>
      </div>

      {/* Skor & Metrik */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-2xl border p-5 flex items-center justify-between shadow-sm ${scoreColor}`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">Skor Kesehatan Konten</p>
            <p className="text-3xl font-extrabold mt-1 tabular-nums">{healthScore} / 100</p>
            <p className="text-[11px] opacity-80 mt-0.5">
              {healthScore >= 85 ? "Sangat Baik" : healthScore >= 60 ? "Perlu Perhatian" : "Kritis"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce3ed] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Diaudit</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums text-slate-800">{totalAudited}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Berita &amp; Artikel Publik</p>
        </div>

        <div className="rounded-2xl border border-[#dce3ed] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Temuan</p>
          <p className="text-3xl font-extrabold mt-1 tabular-nums text-slate-800">{initialIssues.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Hal yang dapat dioptimalkan</p>
        </div>
      </div>

      {/* Filter tab */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "all" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Semua ({initialIssues.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("danger")}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "danger" ? "bg-red-600 text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Penting ({initialIssues.filter((i) => i.severity === "danger").length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("warning")}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "warning" ? "bg-amber-600 text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Peringatan ({initialIssues.filter((i) => i.severity === "warning").length})
        </button>
      </div>

      {/* Daftar Temuan */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <CheckCircle className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
          <h2 className="text-base font-bold text-slate-800">Semua Konten Optimal!</h2>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Tidak ditemukan masalah meta deskripsi atau alt text pada kategori yang dipilih.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-[#dce3ed] bg-white shadow-sm overflow-hidden">
          {filtered.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.severity === "danger"
                        ? "bg-red-50 text-red-700"
                        : item.severity === "warning"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.severity === "danger" ? <Warning className="h-3 w-3" /> : null}
                    {item.issue.replace("_", " ")}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    {item.type === "news" ? <Megaphone className="h-3 w-3" /> : <Note className="h-3 w-3" />}
                    {item.type === "news" ? "Berita" : "Artikel"}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{item.detail}</p>
              </div>

              <Link
                href={item.href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" /> Perbaiki di CMS
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
