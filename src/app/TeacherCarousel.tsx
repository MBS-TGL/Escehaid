"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { User } from "@/components/Icons";
import { Splide } from "@splidejs/splide";
import type { Teacher } from "@/lib/supabase";

import "@splidejs/splide/css";

const splideOverrides = `
  .splide__slide,
  .splide__slide > div { border: none !important; outline: none !important; border-radius: 0 !important; }
`;

export default function TeacherCarousel({ teachers }: { teachers: Teacher[] }) {
  const splideRef = useRef<HTMLDivElement>(null);
  const splideInstance = useRef<Splide | null>(null);

  useEffect(() => {
    if (!splideRef.current || teachers.length === 0) return;

    const instance = new Splide(splideRef.current, {
      type: "loop",
      perPage: 6,
      perMove: 1,
      gap: "10px",
      speed: 1500,
      autoplay: true,
      interval: 3000,
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
        0: { perPage: 2 },
        640: { perPage: 2 },
        1024: { perPage: 4 },
        1280: { perPage: 6 },
      },
    }).mount();

    splideInstance.current = instance;

    return () => {
      splideInstance.current?.destroy(true);
      splideInstance.current = null;
    };
  }, [teachers.length]);

  if (teachers.length === 0) return null;

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: splideOverrides }} />
    <div className="splide-wrapper relative group">
      {/* Custom arrows */}
      <button
        onClick={() => splideInstance.current?.go("<")}
        className="absolute -left-5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#082b59] shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:border-[#1767b1] hover:bg-[#082b59] hover:text-white cursor-pointer"
        aria-label="Previous"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => splideInstance.current?.go(">")}
        className="absolute -right-5 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#082b59] shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:border-[#1767b1] hover:bg-[#082b59] hover:text-white cursor-pointer"
        aria-label="Next"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Splide container */}
      <div ref={splideRef} className="splide">
        <div className="splide__track">
          <div className="splide__list">
            {teachers.map((t) => (
              <div key={t.id} className="splide__slide" style={{ width: "calc(16.6667% - 8.33333px)", marginRight: "10px" }}>
                <div className="group/card relative aspect-[3/4] overflow-hidden rounded-none bg-[#082b59] shadow-md transition-shadow duration-500 hover:shadow-xl">
                  {t.photo_url ? (
                    <Image
                      src={t.photo_url}
                      alt={t.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16.67vw"
                      className="object-cover object-top transition-transform duration-700 ease-out group-hover/card:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#f0f4fa]">
                      <User className="h-16 w-16 text-[#082b59]/15" weight="light" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#082b59] via-[#082b59]/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <h3 className="text-xs font-semibold text-white drop-shadow-sm leading-tight" title={t.name}>
                      {t.name}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-white/80">{t.position}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
