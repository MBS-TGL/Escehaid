"use client";

import { Children, useRef, useState, type ReactNode } from "react";

type StatVariant = "brand" | "success" | "warning" | "danger" | "info" | "purple";

const variantStyles: Record<StatVariant, {
  dot: string;
  iconBg: string;
  iconColor: string;
}> = {
  brand:    { dot: "bg-[#082b59]", iconBg: "bg-[#082b59]/8",  iconColor: "text-[#082b59]" },
  success:  { dot: "bg-emerald-500", iconBg: "bg-emerald-50",   iconColor: "text-emerald-600" },
  warning:  { dot: "bg-amber-500", iconBg: "bg-amber-50",     iconColor: "text-amber-600" },
  danger:   { dot: "bg-red-500", iconBg: "bg-red-50",       iconColor: "text-red-500" },
  info:     { dot: "bg-blue-500", iconBg: "bg-blue-50",      iconColor: "text-blue-600" },
  purple:   { dot: "bg-purple-500", iconBg: "bg-purple-50",    iconColor: "text-purple-600" },
};

type StatCardProps = {
  label: string;
  value: number | string;
  variant?: StatVariant;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function StatCard({
  label,
  value,
  variant = "brand",
  icon,
  className = "",
}: StatCardProps) {
  const v = variantStyles[variant];

  return (
    <div
      className={`group rounded-2xl border border-slate-200/60 bg-white p-4 sm:p-5 transition-all duration-200 hover:border-slate-300/60 hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] snap-start ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-800 sm:text-3xl">
              {value}
            </p>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${v.dot}`} />
          </div>
          <p className="mt-1.5 text-[13px] font-medium text-slate-400">{label}</p>
        </div>

        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.iconBg} transition-transform duration-200 group-hover:scale-105`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatCardGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6 ${className}`}>
      {children}
    </div>
  );
}

/* Jumlah kolom di layar ≥ sm mengikuti jumlah kartu, supaya baris selalu terisi
   penuh. Tanpa ini, 3 kartu yang dipaksa ke `sm:grid-cols-4` menyisakan kolom
   keempat kosong (±188px ruang mati) dan kartunya sendiri jadi kekecilan.
   String-nya harus literal agar Tailwind bisa mendeteksinya saat build. */
const GRID_COLS_BY_COUNT: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

/* ─── StatCardRow — Carousel on mobile, grid on desktop ─── */
export function StatCardRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  /* Di mobile, kartu dibuat selebar 45% kontainer (min+max) supaya ukurannya
     seragam dan masih terlihat sedikit kartu berikutnya sebagai petunjuk scroll.
     `min-w`+`max-w` dipakai alih-alih `w-…` karena keduanya mengalahkan atribut
     `width` apa pun (mis. `w-full` pada pembungkus button) tanpa bergantung
     pada urutan kelas. Di ≥ sm dilepas lagi supaya kartu mengisi sel grid. */
  const count = Children.count(children);
  const cardWidth = "max-sm:[&>*]:min-w-[45%] max-sm:[&>*]:max-w-[45%]";
  const gridCols = GRID_COLS_BY_COUNT[count] ?? "sm:grid-cols-4";

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.children.length;
    if (cards === 0) return;
    const step = el.scrollWidth / cards;
    const idx = Math.round(Math.abs(el.scrollLeft) / step);
    setActiveIdx(Math.min(idx, cards - 1));
  };

  return (
    <div className={`relative mb-6 ${className}`}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex overflow-x-auto scrollbar-hide gap-3 pb-3 snap-x snap-mandatory px-1 sm:px-0 sm:grid sm:overflow-visible sm:pb-0 sm:snap-none ${gridCols} ${cardWidth}`}
      >
        {children}
      </div>

      {/* Dot indicators — mobile only, jumlahnya mengikuti jumlah kartu */}
      <div className="flex justify-center gap-1.5 mt-1 sm:hidden">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Geser ke kartu ${i + 1}`}
            onClick={() => {
              const el = scrollRef.current;
              if (!el) return;
              const cards = el.children.length;
              if (cards === 0) return;
              const step = el.scrollWidth / cards;
              el.scrollTo({ left: step * i, behavior: "smooth" });
            }}
            className={`rounded-full transition-all duration-300 ${
              activeIdx === i
                ? "w-5 h-1.5 bg-slate-800"
                : "w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
