"use client";

import { useMemo } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  CalendarCheck,
} from "@/components/Icons";
import type { SpmbRegistration } from "@/lib/supabase";

export interface PipelineItem extends SpmbRegistration {
  interview_at?: string | null;
  interview_note?: string;
}

export type PipelineStage = "new" | "verifying" | "interview" | "accepted" | "rejected";

export function PipelineBoard({
  registrations,
  docSummary,
  onOpenDetail,
  onUpdateStatus,
}: {
  registrations: SpmbRegistration[];
  docSummary: Record<string, { total: number; verified: number; rejected: number; pending: number }>;
  onOpenDetail: (item: SpmbRegistration) => void;
  onUpdateStatus: (id: string, status: "accepted" | "rejected") => Promise<void>;
}) {
  const columns = useMemo(() => {
    const stageMap: Record<PipelineStage, SpmbRegistration[]> = {
      new: [],
      verifying: [],
      interview: [],
      accepted: [],
      rejected: [],
    };

    for (const item of registrations) {
      if (item.status === "accepted") {
        stageMap.accepted.push(item);
      } else if (item.status === "rejected") {
        stageMap.rejected.push(item);
      } else if (item.interview_at) {
        stageMap.interview.push(item);
      } else {
        const ds = docSummary[item.id];
        if (ds && ds.verified > 0) {
          stageMap.verifying.push(item);
        } else {
          stageMap.new.push(item);
        }
      }
    }

    return [
      { key: "new", title: "1. Baru Masuk", icon: Users, color: "text-blue-600 bg-blue-50 border-blue-200", items: stageMap.new },
      { key: "verifying", title: "2. Verifikasi Berkas", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200", items: stageMap.verifying },
      { key: "interview", title: "3. Wawancara", icon: CalendarCheck, color: "text-purple-600 bg-purple-50 border-purple-200", items: stageMap.interview },
      { key: "accepted", title: "4. Diterima", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-200", items: stageMap.accepted },
      { key: "rejected", title: "5. Ditolak", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200", items: stageMap.rejected },
    ];
  }, [registrations, docSummary]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x">
      {columns.map((col) => (
        <div
          key={col.key}
          className="flex flex-col w-72 shrink-0 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 shadow-sm snap-start"
        >
          {/* Header Kolom */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <col.icon className="h-3.5 w-3.5 text-slate-500" />
              {col.title}
            </span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-600 tabular-nums">
              {col.items.length}
            </span>
          </div>

          {/* Kartu-kartu dalam kolom */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-22rem)] pr-0.5">
            {col.items.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 italic">
                Kosong
              </div>
            ) : (
              col.items.map((item) => {
                const ds = docSummary[item.id];
                const dateStr = new Date(item.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => onOpenDetail(item)}
                    className="cursor-pointer rounded-xl border border-[#dce3ed] bg-white p-3 shadow-xs hover:border-[var(--brand-accent)] hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-xs text-slate-800 line-clamp-1">
                        {item.full_name}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">{dateStr}</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {item.registration_path && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                          {item.registration_path}
                        </span>
                      )}
                      {ds && ds.total > 0 && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold ${
                            ds.verified === 5
                              ? "bg-emerald-50 text-emerald-700"
                              : ds.rejected > 0
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          Berkas {ds.verified}/5
                        </span>
                      )}
                    </div>

                    {item.interview_at && (
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-purple-600 font-medium">
                        <CalendarCheck className="h-3 w-3" />
                        Wawancara: {new Date(item.interview_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </p>
                    )}

                    {/* Aksi cepat */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(item);
                        }}
                        className="text-[var(--brand-accent)] font-semibold hover:underline"
                      >
                        Detail →
                      </button>

                      {item.status === "pending" && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(item.id, "accepted")}
                            className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 font-bold hover:bg-emerald-100"
                          >
                            Terima
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(item.id, "rejected")}
                            className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 font-bold hover:bg-red-100"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
