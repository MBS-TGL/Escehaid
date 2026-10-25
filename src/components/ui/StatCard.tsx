"use client";

import { Children, useRef, useState, type ReactNode } from "react";

type StatVariant = "brand" | "success" | "warning" | "danger" | "info" | "purple";

const variantStyles: Record<StatVariant, {
  dot: string;
  iconBg: string;
  iconColor: string;
}> = {
  brand:    { dot: "bg-[var(--brand-primary)]", iconBg: "bg-[var(--brand-primary)]/8",  iconColor: "text-[var(--brand-primary)]" },
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
  children,
  className = "",
}: StatCardProps) {
  const v = variantStyles[variant];

  /* border-[#dce3ed] = token warna border kartu di seluruh proyek (news, galeri,
     profile, portal, dll). Jangan dikembalikan ke warna slate generik yang
     semi-transparan: dia menyerap warna di belakangnya sehingga kelihatan pudar
     dan tidak merata di setiap sisi. */
  return (
    /* `h-full` + `flex flex-col` WAJIB: kartu hidup di dalam sel grid, dan
       pembungkusnya (mis. <Link> di dashboard) sudah `h-full`. Tanpa ini kotak
       putih mengikuti tinggi kontennya sendiri sehingga kartu yang punya
       rincian 2 baris lebih tinggi daripada yang tanpa rincian — tepi bawah
       satu baris jadi bergerigi. */
    <div
      className={`group flex h-full flex-col rounded-2xl border border-[#dce3ed] bg-white p-4 sm:p-5 transition-all duration-200 hover:border-[var(--brand-accent)]/30 hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] snap-start ${className}`}
    >
      {/* `items-stretch` (bukan `items-start`) supaya kolom teks mengisi tinggi
          kartu sehingga rincian bisa didorong ke dasar lewat `mt-auto`. Ikon
          tetap 40×40 karena `h-10 w-10` eksplisit mengalahkan stretch. */}
      <div className="flex flex-1 items-stretch justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-800 sm:text-3xl">
              {value}
            </p>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-slate-400">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${v.dot}`} />
            {label}
          </p>
          {/* Slot rincian status di bawah angka utama (opsional), mis.
              "34 menunggu · 1 diterima". `mt-auto` menempelkannya ke dasar
              kartu, jadi rincian di semua kartu satu baris sejajar. */}
          {children && <div className="mt-auto pt-2 text-[11px] leading-snug text-slate-400 tabular-nums">{children}</div>}
        </div>

        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl ${v.iconBg} transition-transform duration-200 group-hover:scale-105`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Kelas grid kartu statistik untuk `count` kartu.
 *
 * Diekspor karena skeleton Suspense WAJIB memakai kelas yang sama — kalau
 * skeleton memakai kolom berbeda, grid melompat saat konten asli selesai
 * dimuat (CLS). Dua bentuk yang benar-benar terjadi di dashboard:
 *   4 kartu (publisher)         → 1 baris 4 kolom, tanpa sel kosong
 *   6 kartu (admin/developer)   → 2 baris × 3 kolom, kartu cukup lebar
 *                                 agar rincian status terbaca (di 6 kolom
 *                                 kartu hanya ±171px dan teksnya ter-truncate)
 * Mobile selalu 2 kolom: 3 kolom menyisakan ±104px per kartu di layar 360px.
 */
export function statGridClass(count: number): string {
  const lg = count === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return `grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${lg}`;
}

export function StatCardGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  // Jarak antar-blok diatur pemanggil (satu sumber), bukan `mb-6` di sini.
  return (
    <div className={`${statGridClass(Children.count(children))} ${className}`}>
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
      {/* pt-3 + pb-3 bukan sekadar jarak: overflow-x:auto membuat overflow-y ikut
          terhitung auto sehingga kontainer memotong di kedua sumbu. Tanpa pt-3,
          ring-2 pada kartu aktif (box-shadow 2px di luar border) terpotong di atas
          dan garisnya berhenti mendadak di dua sudut atas. */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex overflow-x-auto scrollbar-hide gap-3 pt-3 pb-3 snap-x snap-mandatory px-1 sm:px-0 sm:pt-0 sm:pb-0 sm:grid sm:overflow-visible sm:snap-none ${gridCols} ${cardWidth}`}
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
