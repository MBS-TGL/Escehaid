"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Splide } from "@splidejs/splide";
import EkskulGlyph from "@/components/EkskulIcon";
import { formatEkskulSchedule } from "@/app/ekskul-data";
import type { Ekskul } from "@/lib/supabase";
import { Clock } from "@/components/Icons";

import "@splidejs/splide/css";

const splideOverrides = `
  .eskul-splide .splide__slide,
  .eskul-splide .splide__slide > div { border: none !important; outline: none !important; border-radius: 0 !important; }
`;

export default function EkskulCarousel({ ekskuls }: { ekskuls: Ekskul[] }) {
  const splideRef = useRef<HTMLDivElement>(null);
  const splideInstance = useRef<Splide | null>(null);

  useEffect(() => {
    if (!splideRef.current || ekskuls.length === 0) return;

    const instance = new Splide(splideRef.current, {
      type: "loop",
      perPage: 5,
      perMove: 1,
      gap: "12px",
      speed: 1500,
      autoplay: true,
      interval: 3500,
      pauseOnHover: true,
      pauseOnFocus: false,
      drag: true,
      cover: true,
      rewind: true,
      arrows: false,
      pagination: false,
      autoWidth: false,
      autoHeight: false,
      updateOnMove: true,
      live: false,
      breakpoints: {
        0: { perPage: 2, gap: "10px" },
        640: { perPage: 3, gap: "10px" },
        1024: { perPage: 4, gap: "12px" },
        1280: { perPage: 5, gap: "12px" },
      },
    }).mount();

    splideInstance.current = instance;

    return () => {
      splideInstance.current?.destroy(true);
      splideInstance.current = null;
    };
  }, [ekskuls.length]);

  if (ekskuls.length === 0) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: splideOverrides }} />
      <div className="splide-wrapper relative group">
        {/* Custom arrows */}
        <button
          onClick={() => splideInstance.current?.go("<")}
          className="absolute -left-5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[var(--brand-primary)] shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:border-[var(--brand-accent)] hover:bg-[var(--brand-primary)] hover:text-white cursor-pointer"
          aria-label="Previous"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => splideInstance.current?.go(">")}
          className="absolute -right-5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[var(--brand-primary)] shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:border-[var(--brand-accent)] hover:bg-[var(--brand-primary)] hover:text-white cursor-pointer"
          aria-label="Next"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Splide container */}
        <div ref={splideRef} className="splide eskul-splide">
          <div className="splide__track">
            <div className="splide__list">
              {ekskuls.map((item) => {
                const schedule = formatEkskulSchedule(
                  item.schedule_day,
                  item.schedule_time,
                  item.schedule_note,
                );
                return (
                  <div key={item.id} className="splide__slide">
                    <Link
                      href={`/ekskul/${item.slug}`}
                      className="group/card relative block aspect-[9/16] overflow-hidden bg-[var(--brand-primary)] shadow-md transition-shadow duration-500 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
                    >
                      {/* Foto portrait 9:16 atau placeholder gradient */}
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.image_alt || item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                          className="object-cover object-top transition-transform duration-700 ease-out group-hover/card:scale-105"
                        />
                      ) : (
                        /* Placeholder estetik jika belum ada foto */
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[var(--brand-primary-light)] via-[var(--brand-primary)] to-[var(--brand-primary)]">
                          <div className="pointer-events-none absolute inset-0 opacity-20">
                            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--brand-highlight)] blur-3xl" />
                            <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-[var(--brand-accent)] blur-3xl" />
                          </div>
                          <span className="relative z-10 opacity-30">
                            <EkskulGlyph
                              slug={item.slug}
                              iconKey={item.icon}
                              className="h-20 w-20 text-white"
                            />
                          </span>
                        </div>
                      )}

                      {/* Cinematic scrim gradient bawah — panjang 2/3 karena foto portrait */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--brand-primary)] via-[var(--brand-primary)]/60 to-transparent" />

                      {/* Badge ikon ekskul di pojok kiri atas */}
                      <div className="absolute left-2.5 top-2.5 z-10">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-md border border-white/20 shadow-sm transition-transform duration-300 group-hover/card:scale-110">
                          <EkskulGlyph slug={item.slug} iconKey={item.icon} className="h-4 w-4" />
                        </span>
                      </div>

                      {/* Teks nama + jadwal + pembina di bawah */}
                      <div className="absolute inset-x-0 bottom-0 z-10 p-3">
                        <h3
                          className="text-sm font-semibold leading-tight text-white drop-shadow-sm"
                          title={item.name}
                        >
                          {item.name}
                        </h3>
                        {schedule && (
                          <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/70">
                            <Clock className="h-3 w-3 shrink-0" />
                            {schedule}
                          </p>
                        )}
                        {item.coach && (
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-white/60">
                            {item.coach}
                          </p>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
