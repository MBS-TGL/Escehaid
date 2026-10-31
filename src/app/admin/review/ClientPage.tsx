"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Clock,
  Megaphone,
  Note,
  User,
  Eye,
  MagnifyingGlass,
  Funnel,
  X,
  CalendarBlank,
} from "@/components/Icons";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { approveAndPublishAction } from "./actions";

interface QueueItem {
  id: string;
  type: "news" | "articles";
  title: string;
  summary: string;
  author: string;
  created_at: string;
  published_at?: string | null;
}

export default function ReviewClientPage({ initialQueue }: { initialQueue: QueueItem[] }) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [actingId, setActingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "news" | "articles">("all");

  const stats = useMemo(() => {
    return {
      total: queue.length,
      news: queue.filter((q) => q.type === "news").length,
      articles: queue.filter((q) => q.type === "articles").length,
    };
  }, [queue]);

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchType = typeFilter === "all" || item.type === typeFilter;
      const matchSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.summary && item.summary.toLowerCase().includes(search.toLowerCase())) ||
        (item.author && item.author.toLowerCase().includes(search.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [queue, typeFilter, search]);

  const handleApprove = async (item: QueueItem, immediately: boolean) => {
    setActingId(item.id);
    const res = await approveAndPublishAction({
      entityType: item.type,
      entityId: item.id,
      publishImmediately: immediately,
    });
    setActingId(null);
    if (res.success) {
      setQueue((prev) => prev.filter((q) => q.id !== item.id));
    } else {
      alert(res.error || "Gagal menyetujui konten.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* ── Page Header Standar esceha ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-primary)]/10">
            <Clock className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Inbox Persetujuan</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Tinjau draf berita dan artikel yang diajukan sebelum terbit publik
            </p>
          </div>
        </div>
      </div>

      {/* ── Metrik Cepat (StatPillGroup) ── */}
      <StatPillGroup>
        <StatPill icon={Clock} label="Menunggu" value={stats.total} tone={stats.total > 0 ? "warning" : "neutral"} />
        <StatPill icon={Megaphone} label="Berita" value={stats.news} tone="info" />
        <StatPill icon={Note} label="Artikel" value={stats.articles} tone="neutral" />
      </StatPillGroup>

      {/* ── Toolbar Pencarian & Filter Tipe ── */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, ringkasan, atau penulis..."
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
            <Funnel className="h-3 w-3" /> Tipe:
          </span>
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
              typeFilter === "all"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semua ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("news")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
              typeFilter === "news"
                ? "bg-white text-[var(--brand-primary)] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Berita ({stats.news})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("articles")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
              typeFilter === "articles"
                ? "bg-white text-[var(--brand-primary)] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Artikel ({stats.articles})
          </button>
        </div>
      </div>

      {/* ── Konten Antrean ── */}
      {queue.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 shadow-2xs">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Semua Beres!</h2>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Tidak ada konten yang menunggu persetujuan saat ini. Draf baru yang diajukan oleh staf/operator akan muncul di sini.
          </p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-700">Tidak ada konten yang cocok</p>
          <p className="mt-1 text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter tipe.</p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredQueue.map((item) => {
            const isNews = item.type === "news";
            const editHref = isNews ? `/admin/news` : `/admin/articles`;
            const dateStr = new Date(item.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={`${item.type}-${item.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-[var(--brand-accent)]/50 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                        isNews
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-purple-200 bg-purple-50 text-purple-700"
                      }`}
                    >
                      {isNews ? <Megaphone className="h-3 w-3" /> : <Note className="h-3 w-3" />}
                      {isNews ? "Berita" : "Artikel"}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <CalendarBlank className="h-3 w-3" />
                      Diajukan: {dateStr}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-[var(--brand-primary)] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.summary || "Tidak ada ringkasan yang disertakan."}
                  </p>

                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>Penulis: <b className="text-slate-600 font-medium">{item.author || "Anonim"}</b></span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <Link
                    href={editHref}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    <span>Buka Modul</span>
                  </Link>

                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => handleApprove(item, true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[var(--brand-accent)] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{actingId === item.id ? "Memproses…" : "Setujui & Terbitkan"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
