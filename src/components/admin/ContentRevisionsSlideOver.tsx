"use client";

import { useEffect, useState } from "react";
import { Clock, ArrowsCounterClockwise } from "@/components/Icons";
import { SlideOver } from "@/components/ui";
import { getContentRevisions, type ContentRevision } from "@/lib/queries/revisions";
import { restoreRevisionAction } from "@/app/admin/review/actions";
import { supabase } from "@/lib/supabase";

export function ContentRevisionsSlideOver({
  isOpen,
  onClose,
  entityType,
  entityId,
  currentTitle,
  onRestored,
}: {
  isOpen: boolean;
  onClose: () => void;
  entityType: "news" | "articles";
  entityId: string;
  currentTitle: string;
  onRestored?: () => void;
}) {
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !entityId) return;
    let cancelled = false;

    // Deferred start loading via microtask/timer to avoid calling setState directly in effect body
    const timer = setTimeout(() => {
      setLoading(true);
      getContentRevisions(supabase, entityType, entityId)
        .then((data) => {
          if (!cancelled) {
            setRevisions(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, entityType, entityId]);

  const handleRestore = async (revId: string) => {
    if (!confirm("Pulihkan konten ke versi ini? Perubahan saat ini akan dicatat sebagai revisi baru.")) return;
    setRestoringId(revId);
    const res = await restoreRevisionAction({
      entityType,
      entityId,
      revisionId: revId,
    });
    setRestoringId(null);
    if (res.success) {
      if (onRestored) onRestored();
      onClose();
    } else {
      alert(res.error || "Gagal memulihkan revisi.");
    }
  };

  return (
    <SlideOver
      open={isOpen}
      onClose={onClose}
      title="Riwayat Revisi Konten"
    >
      <div className="space-y-4 p-4 text-xs">
        <div>
          <p className="font-semibold text-slate-800 line-clamp-1">{currentTitle}</p>
          <p className="text-slate-400">Setiap penyimpanan dan pemulihan dicatat otomatis sebagai snapshot terpisah.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : revisions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            <Clock className="mx-auto h-6 w-6 text-slate-400 mb-2" />
            <p>Belum ada riwayat snapshot untuk konten ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {revisions.map((rev, index) => {
              const d = new Date(rev.created_at);
              const dateStr = d.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={rev.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {index === 0 ? "Versi Terakhir" : `Versi ${revisions.length - index}`}
                      </span>
                      <p className="mt-1 font-medium text-slate-800">{rev.note || "Perubahan konten"}</p>
                      <p className="text-[11px] text-slate-400">
                        {dateStr} {rev.editor_name ? `oleh ${rev.editor_name}` : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={restoringId === rev.id}
                      onClick={() => handleRestore(rev.id)}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-[var(--brand-primary)]"
                    >
                      <ArrowsCounterClockwise className="h-3 w-3" />
                      {restoringId === rev.id ? "Memulihkan…" : "Pulihkan"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SlideOver>
  );
}
