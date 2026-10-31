"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  CalendarCheck,
  MagnifyingGlass,
  Buildings,
  Funnel,
  X,
  GraduationCap,
  CaretLeft,
  CaretRight,
} from "@/components/Icons";
import { normalizeName, normalizeSchool } from "@/lib/format-name";
import type { SpmbRegistration } from "@/lib/supabase";

export interface PipelineItem extends SpmbRegistration {
  interview_at?: string | null;
  interview_note?: string;
}

export type PipelineStage = "new" | "verifying" | "interview" | "accepted" | "rejected";

const pathLabels: Record<string, string> = {
  reguler: "Reguler",
  prestasi: "Prestasi",
  beasiswa: "Beasiswa",
};

const pathStyles: Record<string, string> = {
  reguler: "border-slate-200 bg-slate-100 text-slate-700",
  prestasi: "border-blue-200 bg-blue-50 text-blue-700",
  beasiswa: "border-purple-200 bg-purple-50 text-purple-700",
};

export function PipelineBoard({
  registrations,
  docSummary,
  onOpenDetail,
  onOpenConfirmStatus,
  onUpdateStatus,
}: {
  registrations: SpmbRegistration[];
  docSummary: Record<string, { total: number; verified: number; rejected: number; pending: number }>;
  onOpenDetail: (item: SpmbRegistration) => void;
  onOpenConfirmStatus?: (id: string, status: "accepted" | "rejected") => void;
  onUpdateStatus: (id: string, status: "accepted" | "rejected") => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [selectedPath, setSelectedPath] = useState<string>("all");

  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = Kolom 1-3, 1 = Kolom 3-5

  // Update indikator scroll panah & slide index
  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 20);
    setCanScrollRight(maxScroll > 20 && el.scrollLeft < maxScroll - 20);

    if (maxScroll > 0) {
      const progress = el.scrollLeft / maxScroll;
      setCurrentSlide(progress > 0.5 ? 1 : 0);
    }
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateScrollState())
        : null;

    observer?.observe(el);
    window.addEventListener("resize", updateScrollState);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollTrack = (direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    // Di layar desktop geser 2 kolom agar mulus bertransisi dari 1-3 ke 3-5
    const step = el.clientWidth * 0.68;
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  const scrollToSlide = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollTo({
      left: index === 0 ? 0 : maxScroll,
      behavior: "smooth",
    });
  };

  const filteredRegistrations = useMemo(() => {
    let list = registrations;

    if (selectedPath !== "all") {
      list = list.filter((item) => (item.registration_path || "reguler") === selectedPath);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.full_name.toLowerCase().includes(q) ||
          (item.previous_school && item.previous_school.toLowerCase().includes(q)) ||
          (item.documents?.nisn && item.documents.nisn.toLowerCase().includes(q)) ||
          (item.phone && item.phone.toLowerCase().includes(q))
      );
    }

    return list;
  }, [registrations, search, selectedPath]);

  const columns = useMemo(() => {
    const stageMap: Record<PipelineStage, SpmbRegistration[]> = {
      new: [],
      verifying: [],
      interview: [],
      accepted: [],
      rejected: [],
    };

    for (const item of filteredRegistrations) {
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
      {
        key: "new",
        title: "Baru Masuk",
        badge: "Tahap 1",
        icon: Users,
        headerBg: "bg-blue-50/80 text-blue-700 border-blue-100",
        pillColor: "bg-blue-100/80 text-blue-800",
        accentBorder: "hover:border-blue-300",
        items: stageMap.new,
      },
      {
        key: "verifying",
        title: "Verifikasi Berkas",
        badge: "Tahap 2",
        icon: Clock,
        headerBg: "bg-amber-50/80 text-amber-700 border-amber-100",
        pillColor: "bg-amber-100/80 text-amber-800",
        accentBorder: "hover:border-amber-300",
        items: stageMap.verifying,
      },
      {
        key: "interview",
        title: "Wawancara",
        badge: "Tahap 3",
        icon: CalendarCheck,
        headerBg: "bg-purple-50/80 text-purple-700 border-purple-100",
        pillColor: "bg-purple-100/80 text-purple-800",
        accentBorder: "hover:border-purple-300",
        items: stageMap.interview,
      },
      {
        key: "accepted",
        title: "Diterima",
        badge: "Lulus",
        icon: CheckCircle,
        headerBg: "bg-emerald-50/80 text-emerald-700 border-emerald-100",
        pillColor: "bg-emerald-100/80 text-emerald-800",
        accentBorder: "hover:border-emerald-300",
        items: stageMap.accepted,
      },
      {
        key: "rejected",
        title: "Ditolak",
        badge: "Gugur",
        icon: XCircle,
        headerBg: "bg-rose-50/80 text-rose-700 border-rose-100",
        pillColor: "bg-rose-100/80 text-rose-800",
        accentBorder: "hover:border-rose-300",
        items: stageMap.rejected,
      },
    ];
  }, [filteredRegistrations, docSummary]);

  return (
    <div className="space-y-4">
      {/* ── Toolbar & Filter Pipeline ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama santri, asal sekolah, NISN..."
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

        {/* Filter Jalur & Carousel Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
            <span className="px-2 text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Funnel className="h-3 w-3" /> Jalur:
            </span>
            <button
              type="button"
              onClick={() => setSelectedPath("all")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                selectedPath === "all"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua
            </button>
            {Object.entries(pathLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPath(key)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  selectedPath === key
                    ? "bg-white text-[var(--brand-primary)] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-slate-500 font-medium">
            <span>Total:</span>
            <span className="font-bold text-slate-800">{filteredRegistrations.length}</span>
            <span className="text-[10px] text-slate-400">santri</span>
          </div>

          {/* Navigasi Carousel Slider (Panah Kiri & Kanan + Indikator Slide) */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
            <button
              type="button"
              onClick={() => scrollTrack("left")}
              disabled={!canScrollLeft}
              aria-label="Geser kolom ke kiri"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/70 bg-white text-slate-600 shadow-2xs transition-all hover:border-[var(--brand-accent)] hover:bg-[var(--brand-primary)] hover:text-white disabled:pointer-events-none disabled:opacity-30 cursor-pointer"
            >
              <CaretLeft className="h-4 w-4" />
            </button>

            {/* Indikator Dot Paginasi Slide (Tahap 1-3 vs 3-5) */}
            <div className="flex items-center gap-1 px-1">
              <button
                type="button"
                onClick={() => scrollToSlide(0)}
                title="Tampilkan Tahap 1 - 3"
                className={`h-2 rounded-full transition-all duration-200 ${
                  currentSlide === 0
                    ? "w-4 bg-[var(--brand-primary)]"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
              <button
                type="button"
                onClick={() => scrollToSlide(1)}
                title="Tampilkan Tahap 3 - 5"
                className={`h-2 rounded-full transition-all duration-200 ${
                  currentSlide === 1
                    ? "w-4 bg-[var(--brand-primary)]"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            </div>

            <button
              type="button"
              onClick={() => scrollTrack("right")}
              disabled={!canScrollRight}
              aria-label="Geser kolom ke kanan"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/70 bg-white text-slate-600 shadow-2xs transition-all hover:border-[var(--brand-accent)] hover:bg-[var(--brand-primary)] hover:text-white disabled:pointer-events-none disabled:opacity-30 cursor-pointer"
            >
              <CaretRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Carousel Slider Rail / Pipeline Columns ── */}
      <div className="relative">
        {/* Track Pembungkus Kolom Kanban (Scrollbar Bersih & Tepat 3 Kolom di Layar Lebar) */}
        <div
          ref={trackRef}
          onScroll={updateScrollState}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 pt-1 px-0.5 snap-x snap-mandatory scroll-smooth"
        >
          {columns.map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.key}
                className="flex flex-col w-[85vw] sm:w-[calc(50%-0.5rem)] lg:w-[calc((100%-2rem)/3)] shrink-0 snap-start rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 shadow-xs"
              >
                {/* Header Kolom */}
                <div
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 mb-3 select-none ${col.headerBg}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white shadow-xs">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">{col.title}</span>
                      <span className="block text-[10px] font-medium opacity-80">{col.badge}</span>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums shadow-xs ${col.pillColor}`}
                  >
                    {col.items.length}
                  </span>
                </div>

                {/* List Kartu Calon Santri */}
                <div className="flex-1 space-y-3 overflow-y-auto min-h-[380px] max-h-[calc(100vh-21rem)] pr-1">
                  {col.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 py-10 px-4 text-center">
                      <p className="text-xs text-slate-400 font-medium">Tidak ada pendaftar</p>
                      <p className="text-[10px] text-slate-400/80 mt-0.5">di tahapan ini</p>
                    </div>
                  ) : (
                    col.items.map((item) => {
                      const ds = docSummary[item.id];
                      const name = normalizeName(item.full_name);
                      const initials = name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      const dateStr = new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      });
                      const pathKey = item.registration_path || "reguler";
                      const pathLabel = pathLabels[pathKey] || pathKey.toUpperCase();
                      const pathBadgeStyle = pathStyles[pathKey] || "border-slate-200 bg-slate-100 text-slate-700";

                      return (
                        <div
                          key={item.id}
                          onClick={() => onOpenDetail(item)}
                          className={`group relative w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-150 hover:border-slate-300 hover:shadow-sm ${col.accentBorder}`}
                        >
                          {/* Avatar & Header Kartu */}
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-xs font-bold text-[var(--brand-primary)]">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className="font-semibold text-xs text-slate-800 line-clamp-1 group-hover:text-[var(--brand-primary)] transition-colors"
                                title={name}
                              >
                                {name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                {item.gender && (
                                  <span
                                    className={`rounded px-1.5 py-0.5 font-semibold text-[10px] ${
                                      item.gender === "L"
                                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                                        : "bg-rose-50 text-rose-600 border border-rose-100"
                                    }`}
                                  >
                                    {item.gender === "L" ? "Putra" : "Putri"}
                                  </span>
                                )}
                                <span>&middot;</span>
                                <span className="tabular-nums">{dateStr}</span>
                              </div>
                            </div>
                          </div>

                          {/* Asal Sekolah */}
                          {item.previous_school && (
                            <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-slate-500">
                              <Buildings className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{normalizeSchool(item.previous_school)}</span>
                            </div>
                          )}

                          {/* Badges: Jalur & Kelengkapan Berkas */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold ${pathBadgeStyle}`}
                            >
                              <GraduationCap className="h-2.5 w-2.5" />
                              {pathLabel}
                            </span>

                            {ds && ds.total > 0 && (
                              <span
                                className={`rounded-md border px-1.5 py-0.5 font-bold ${
                                  ds.verified === 5
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : ds.rejected > 0
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : "border-amber-200 bg-amber-50 text-amber-700"
                                }`}
                              >
                                Berkas {ds.verified}/5
                              </span>
                            )}
                          </div>

                          {/* Jadwal Wawancara */}
                          {item.interview_at && (
                            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-purple-100 bg-purple-50/80 px-2 py-1 text-[10.5px] font-medium text-purple-700">
                              <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                              <span className="truncate">
                                Wawancara:{" "}
                                {new Date(item.interview_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>
                          )}

                          {/* Aksi Cepat / Footer Kartu */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDetail(item);
                              }}
                              className="inline-flex items-center gap-1 text-[var(--brand-primary)] font-semibold hover:text-[var(--brand-accent)] transition-colors"
                            >
                              <span>Detail</span>
                              <span className="text-[10px] font-bold">→</span>
                            </button>

                            {item.status === "pending" && (
                              <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenConfirmStatus) {
                                      onOpenConfirmStatus(item.id, "accepted");
                                    } else {
                                      void onUpdateStatus(item.id, "accepted");
                                    }
                                  }}
                                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10.5px] text-emerald-700 font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                                >
                                  Terima
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onOpenConfirmStatus) {
                                      onOpenConfirmStatus(item.id, "rejected");
                                    } else {
                                      void onUpdateStatus(item.id, "rejected");
                                    }
                                  }}
                                  className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10.5px] text-rose-700 font-bold hover:bg-rose-100 transition-colors shadow-2xs"
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
