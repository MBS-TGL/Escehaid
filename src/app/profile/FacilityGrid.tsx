"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import { ArrowUpRight, CaretLeft, CaretRight, ImageSquare, X } from "@/components/Icons";
import { CSSFadeIn } from "@/components/CSSAnimations";
import type { Facility } from "@/lib/supabase";

/* Tinggi dialog pratinjau. */
const RATIO_DIALOG = "h-[50vh] min-h-[260px]";

/* `sizes` dialog pratinjau. */
const SIZES_DIALOG = "(max-width: 1023px) 92vw, 64rem";

/**
 * Layout bento sinematik ala beranda — kartu foto penuh + teks overlay.
 * 5+ item: foto besar kiri (2 kolom 2 baris desktop) + kecil 2x2 kanan.
 * Di mobile: foto besar span 2 kolom di baris pertama.
 * Total < 5: adaptasi dinamis agar tidak ada kotak kosong.
 */
function bentoSpanClass(index: number, total: number): string {
  if (total >= 5) {
    if (index === 0) {
      return "col-span-2 lg:col-span-2 lg:row-span-2 min-h-[260px] sm:min-h-[320px] lg:min-h-[440px]";
    }
    return "col-span-1 lg:col-span-1 lg:row-span-1 min-h-[170px] sm:min-h-[190px] lg:min-h-[210px]";
  }
  if (total === 4) {
    return "col-span-1 lg:col-span-1 min-h-[180px] sm:min-h-[220px] lg:min-h-[260px]";
  }
  if (total === 3) {
    if (index === 0) {
      return "col-span-2 lg:col-span-2 lg:row-span-2 min-h-[260px] sm:min-h-[320px] lg:min-h-[440px]";
    }
    return "col-span-1 lg:col-span-2 lg:row-span-1 min-h-[170px] sm:min-h-[190px] lg:min-h-[210px]";
  }
  if (total === 2) {
    return "col-span-2 sm:col-span-1 lg:col-span-2 min-h-[220px] sm:min-h-[260px] lg:min-h-[320px]";
  }
  return "col-span-2 lg:col-span-4 min-h-[280px] sm:min-h-[360px]";
}

const NAV_BUTTON =
  "inline-flex items-center gap-1.5 rounded-xl border border-[#dce3ed] px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] transition hover:border-[var(--brand-primary)] hover:bg-[#f4f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-1 sm:px-4 sm:py-2.5 sm:text-sm";

/**
 * Isi kartu bento: foto penuh + overlay sinematik + teks di atas scrim.
 * Tanpa image_url → placeholder gradient brand + ikon (bukan foto lain).
 */
function BentoMedia({ facility, sizes, isLarge }: { facility: Facility; sizes: string; isLarge: boolean }) {
  const src = facility.image_url?.trim() || "";
  return (
    <>
      {src ? (
        <Image
          src={src}
          alt={facility.name}
          fill
          sizes={sizes}
          quality={70}
          loading="lazy"
          decoding="async"
          className="object-cover sm:transition-transform sm:duration-700 sm:ease-out sm:motion-safe:group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] via-[#0a3570] to-[#0c4482] p-4 text-white">
          <div className="pointer-events-none absolute -right-8 -top-8 hidden h-36 w-36 rounded-full bg-[var(--brand-highlight)]/15 blur-2xl sm:block" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 hidden h-36 w-36 rounded-full bg-[var(--brand-accent)]/25 blur-2xl sm:block" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-xs sm:backdrop-blur-md sm:transition-transform sm:duration-500 sm:group-hover:scale-110">
            <ImageSquare className="h-6 w-6 text-[var(--brand-highlight)]" />
          </div>
          <span className="relative z-10 mt-2 text-[10px] font-semibold tracking-wider text-white/50 uppercase">SMP Muhammadiyah 4</span>
        </div>
      )}

      {/* Scrim gradient 2-stop (murah di-paint saat scroll HP). */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 to-black/10 sm:transition-opacity sm:duration-300 sm:group-hover:from-slate-950/95" />

      {/* Info & nama */}
      <div className="relative z-10 mt-auto p-4 sm:p-5 lg:p-6">
        <h3 className={`font-bold text-white drop-shadow-sm leading-snug sm:transition-colors sm:group-hover:text-[var(--brand-highlight)] ${isLarge ? "text-lg sm:text-2xl lg:text-[26px]" : "text-sm sm:text-base line-clamp-1"}`}>
          {facility.name}
        </h3>
        {facility.description && (
          <p className={`mt-1 font-normal text-slate-200/85 leading-relaxed ${isLarge ? "text-xs sm:text-sm line-clamp-2 max-w-xl" : "hidden sm:line-clamp-1 text-[11px]"}`}>
            {facility.description}
          </p>
        )}
      </div>
    </>
  );
}

export default function FacilityGrid({ facilities }: { facilities: Facility[] }) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogTouch = useRef<{ x: number; y: number } | null>(null);
  const n = facilities.length;
  const item = active === null ? null : facilities[active];

  /* Buka/tutup <dialog> mengikuti `active`. showModal() menjebak fokus & Esc. */
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (active !== null && !el.open) el.showModal();
    else if (active === null && el.open) el.close();
  }, [active]);

  /* close() — dari tombol X, klik latar, maupun Esc — samakan state + pulihkan fokus. */
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => {
      setActive(null);
      triggerRef.current?.focus();
    };
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, []);

  const step = useCallback(
    (delta: number) =>
      setActive((cur) => (cur === null || n === 0 ? cur : (cur + delta + n) % n)),
    [n]
  );

  /* Panah kiri/kanan berpindah fasilitas selama dialog terbuka. */
  useEffect(() => {
    if (active === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, step]);

  const open = (i: number) => {
    const el = document.activeElement;
    triggerRef.current = el instanceof HTMLElement ? el : null;
    setActive(i);
  };

  /* Kunci scroll latar saat dialog terbuka — <dialog> native tidak selalu
     mencegah scroll body di iOS. */
  useEffect(() => {
    if (active === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  /* Klik di luar kartu = klik latar. Koordinat dibandingkan dengan kotak dialog
     karena p-0 membuat kotak dialog persis seukuran kartu. */
  const onDialogClick = (e: ReactMouseEvent<HTMLDialogElement>) => {
    const el = dialogRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const outside =
      e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (outside) el.close();
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {facilities.map((f, i) => {
          const isLarge = i === 0 && (n >= 5 || n === 3);
          const sizes = isLarge
            ? "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 640px"
            : "(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 320px";
          return (
            <CSSFadeIn key={f.id} delay={i * 0.08} className={`h-full ${bentoSpanClass(i, n)}`}>
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={`Lihat ${f.name}`}
                className="group relative flex h-full min-h-[inherit] w-full flex-col justify-end overflow-hidden rounded-3xl border border-white/80 bg-slate-900 text-left shadow-md shadow-slate-900/5 ring-1 ring-slate-900/[0.06] sm:transition-all sm:duration-500 sm:ease-out sm:hover:border-white sm:hover:shadow-2xl sm:hover:shadow-[var(--brand-primary)]/20 sm:motion-safe:hover:-translate-y-1 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              >
                {/* Badge kategori glassmorphism (blur hanya sm+ agar hemat GPU HP). */}
                <div className="absolute left-3.5 top-3.5 z-20 sm:left-4 sm:top-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs sm:bg-black/40 sm:backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-highlight)]" />
                    Fasilitas
                  </span>
                </div>

                {/* Tombol aksi panah mini */}
                <div className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white opacity-90 sm:right-4 sm:top-4 sm:bg-black/30 sm:opacity-85 sm:backdrop-blur-md sm:transition-all sm:duration-300 sm:group-hover:scale-110 sm:group-hover:border-white sm:group-hover:bg-white sm:group-hover:text-[var(--brand-primary)] sm:group-hover:opacity-100">
                  <ArrowUpRight className="h-3.5 w-3.5 sm:transition-transform sm:duration-300 sm:group-hover:translate-x-0.5 sm:group-hover:-translate-y-0.5" />
                </div>

                <BentoMedia facility={f} sizes={sizes} isLarge={isLarge} />
              </button>
            </CSSFadeIn>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="facility-dialog-title"
        onClick={onDialogClick}
        style={{ touchAction: "pan-y" }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          dialogTouch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const start = dialogTouch.current;
          if (!start) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
          dialogTouch.current = null;
        }}
        className="m-auto max-h-[90vh] w-[min(92vw,64rem)] overflow-hidden rounded-2xl border border-[#dce3ed] bg-white p-0 shadow-2xl [&::backdrop]:bg-black/60"
      >
        {active !== null && item && (
          <div className="flex max-h-[90vh] flex-col">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#e7ecf3] px-5 py-4">
              <h3 id="facility-dialog-title" className="truncate text-lg font-semibold text-[var(--brand-primary)]">
                {item.name}
              </h3>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Tutup pratinjau"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {item.image_url?.trim() ? (
                <div className={`relative w-full overflow-hidden bg-[#f4f7fb] ${RATIO_DIALOG}`}>
                  <Image
                    src={item.image_url.trim()}
                    alt={item.name}
                    fill
                    sizes={SIZES_DIALOG}
                    priority
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className={`flex w-full flex-col items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-light)] p-6 text-white ${RATIO_DIALOG}`}>
                  <ImageSquare className="h-16 w-16 text-white/40" />
                </div>
              )}
              <p className="px-5 py-5 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e7ecf3] px-5 py-3.5">
              <button type="button" onClick={() => step(-1)} disabled={n <= 1} className={NAV_BUTTON}>
                <CaretLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>
              <span className="text-xs font-medium tabular-nums text-slate-400">
                {active + 1} / {n}
              </span>
              <button type="button" onClick={() => step(1)} disabled={n <= 1} className={NAV_BUTTON}>
                <span className="hidden sm:inline">Berikutnya</span>
                <CaretRight className="h-4 w-4" />
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}
