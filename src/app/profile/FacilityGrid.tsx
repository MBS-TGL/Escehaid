"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import { CaretLeft, CaretRight, ImageSquare, X } from "@/components/Icons";
import { CSSFadeIn } from "@/components/CSSAnimations";
import type { Facility } from "@/lib/supabase";

/* Rasio media. Kartu pertama selalu lebih tinggi karena lebarnya 2–3 kolom. */
const RATIO_HERO = "aspect-video";
const RATIO_CARD = "aspect-[4/3]";
const RATIO_DIALOG = "h-[50vh] min-h-[260px]";

/* `sizes` — kolom tiap breakpoint: <768px satu, 768–1023px dua, ≥1024px tiga. */
const SIZES_CARD = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 26rem";
const SIZES_DIALOG = "(max-width: 1023px) 92vw, 64rem";

const NAV_BUTTON =
  "inline-flex items-center gap-1.5 rounded-xl border border-[#dce3ed] px-4 py-2.5 text-sm font-semibold text-[#082b59] transition hover:border-[#082b59] hover:bg-[#f4f7fb] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1767b1] focus-visible:ring-offset-1";

/**
 * Bentuk kartu pertama supaya grid selalu terisi penuh — berapa pun jumlah
 * fasilitas. Total sel terpakai = lebar kartu pertama + (n − 1):
 *
 *   lg · 3 kolom   n%3 === 2 → col-span-2            (n−1)+2 = n+1  ÷ 3
 *                  n%3 === 1 → col-span-3            (n−1)+3 = n+2  ÷ 3
 *                  n%3 === 0 → col-span-2 row-span-2 (n−1)+4 = n+3  ÷ 3
 *   md · 2 kolom   col-span-2 hanya saat n ganjil, supaya jumlah sel genap.
 *   < md · 1 kolom selalu penuh tanpa syarat.
 *
 * Kolomnya sendiri tidak diubah (md dua, lg tiga) — hanya lebar kartu pertama
 * yang menyesuaikan, sehingga tidak pernah ada sel kosong di baris mana pun.
 */
function heroSpan(n: number): string {
  const md = n % 2 === 1 ? "md:col-span-2" : "";
  const rem = n % 3;
  const lg =
    rem === 2 ? "lg:col-span-2" : rem === 1 ? "lg:col-span-3" : "lg:col-span-2 lg:row-span-2";
  return `${md} ${lg}`.trim();
}

/** `sizes` untuk kartu pertama, mengikuti kolom yang dipilih heroSpan(). */
function heroSizes(n: number): string {
  const md = n % 2 === 1 ? "100vw" : "50vw";
  const lg = n % 3 === 1 ? "77rem" : "52rem";
  return `(max-width: 767px) 100vw, (max-width: 1023px) ${md}, ${lg}`;
}

/**
 * Media kartu. Tanpa image_url → penanda kosong netral (gradasi biru brand +
 * ikon), bukan foto lain.
 */
function Media({
  facility,
  ratio,
  sizes,
  fitClass,
  iconClass,
  zoom,
  priority,
}: {
  facility: Facility;
  ratio: string;
  sizes: string;
  fitClass: string;
  iconClass: string;
  zoom?: boolean;
  priority?: boolean;
}) {
  const src = facility.image_url?.trim() || "";
  return (
    <div
      className={`relative w-full overflow-hidden ${ratio} ${
        src ? "bg-[#f4f7fb]" : "bg-gradient-to-br from-[#082b59] to-[#0d4a8a]"
      }`}
    >
      {src ? (
        <Image
          src={src}
          alt={facility.name}
          fill
          sizes={sizes}
          priority={priority}
          className={`${fitClass} transition-transform duration-500 ${zoom ? "group-hover:scale-105" : ""}`}
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <ImageSquare className={iconClass} />
        </span>
      )}
    </div>
  );
}

export default function FacilityGrid({ facilities }: { facilities: Facility[] }) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const n = facilities.length;
  const span = heroSpan(n);
  const heroSizesValue = heroSizes(n);
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {facilities.map((f, i) => (
          <CSSFadeIn key={f.id} delay={i * 0.08} className={i === 0 ? span : undefined}>
            <button
              type="button"
              onClick={() => open(i)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white text-left transition-all hover:shadow-xl hover:shadow-[#082b59]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1767b1] focus-visible:ring-offset-2"
            >
              <Media
                facility={f}
                ratio={i === 0 ? RATIO_HERO : RATIO_CARD}
                sizes={i === 0 ? heroSizesValue : SIZES_CARD}
                fitClass="object-cover"
                iconClass="h-10 w-10 text-white/40"
                zoom
              />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold text-[#082b59]">{f.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{f.description}</p>
              </div>
            </button>
          </CSSFadeIn>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="facility-dialog-title"
        onClick={onDialogClick}
        className="m-auto max-h-[90vh] w-[min(92vw,64rem)] overflow-hidden rounded-2xl border border-[#dce3ed] bg-white p-0 shadow-2xl [&::backdrop]:bg-black/60"
      >
        {active !== null && item && (
          <div className="flex max-h-[90vh] flex-col">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#e7ecf3] px-5 py-4">
              <h3 id="facility-dialog-title" className="truncate text-lg font-semibold text-[#082b59]">
                {item.name}
              </h3>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Tutup pratinjau"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#082b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1767b1]"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <Media
                facility={item}
                ratio={RATIO_DIALOG}
                sizes={SIZES_DIALOG}
                fitClass="object-contain"
                iconClass="h-16 w-16 text-white/40"
                priority
              />
              <p className="px-5 py-5 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e7ecf3] px-5 py-3.5">
              <button type="button" onClick={() => step(-1)} disabled={n <= 1} className={NAV_BUTTON}>
                <CaretLeft className="h-4 w-4" /> Sebelumnya
              </button>
              <span className="text-xs font-medium tabular-nums text-slate-400">
                {active + 1} / {n}
              </span>
              <button type="button" onClick={() => step(1)} disabled={n <= 1} className={NAV_BUTTON}>
                Berikutnya <CaretRight className="h-4 w-4" />
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}
