"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock, Megaphone, Note, User, Eye } from "@/components/Icons";
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
      <div className="mb-6">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Inbox Persetujuan Konten (Review)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Daftar draf berita dan artikel yang menunggu persetujuan editor/admin sebelum terbit ke website publik.
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <CheckCircle className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
          <h2 className="text-base font-bold text-slate-800">Semua Beres!</h2>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Tidak ada konten yang menunggu persetujuan saat ini. Draf baru yang diajukan oleh staf/operator akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {queue.map((item) => {
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
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#dce3ed] bg-white p-4 sm:p-5 shadow-sm transition-colors hover:border-[var(--brand-accent)]/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isNews ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      }`}
                    >
                      {isNews ? <Megaphone className="h-3 w-3" /> : <Note className="h-3 w-3" />}
                      {isNews ? "Berita" : "Artikel"}
                    </span>
                    <span className="text-xs text-slate-400">Diajukan: {dateStr}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.summary}</p>

                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>Penulis: {item.author}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <Link
                    href={editHref}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" /> Buka Modul
                  </Link>

                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => handleApprove(item, true)}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {actingId === item.id ? "Memproses…" : "Setujui & Terbitkan"}
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
