"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CaretLeft, CaretRight, Clock } from "@/components/Icons";

interface HistorySlide {
  src: string;
  alt: string;
  badge: string;
  title: string;
  desc: string;
}

const defaultSlides: HistorySlide[] = [
  {
    src: "/images/sejarah-pendiri.jpg",
    alt: "Tokoh dan Panitia Pendiri SMP Muhammadiyah 4 Tanggul",
    badge: "Fase Perintisan",
    title: "Para Tokoh & Panitia Perintis",
    desc: "Berdiri di atas pondasi awal cor beton saat memulai peletakan batu pertama sekolah.",
  },
  {
    src: "/images/sejarah-pembangunan.jpg",
    alt: "Pembangunan awal gedung sekolah",
    badge: "Fase Konstruksi",
    title: "Pembangunan Fisik Pertama",
    desc: "Struktur awal ruang belajar dengan perancah bambu di awal masa pendirian.",
  },
  {
    src: "/images/Ruang-Kelas.jpg",
    alt: "Kondisi ruang kelas modern saat ini",
    badge: "Kondisi Masa Kini",
    title: "Gedung & Fasilitas Modern",
    desc: "Berkembang menjadi pusat pendidikan berasrama unggulan berakreditasi A.",
  },
];

export default function HistoryCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % defaultSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const slide = defaultSlides[current];

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-[#dce3ed] bg-slate-950 shadow-lg"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Container Gambar */}
      <div className="relative h-72 w-full sm:h-80 lg:h-96">
        {defaultSlides.map((item, index) => (
          <div
            key={item.src}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === current ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
              priority={index === 0}
            />
          </div>
        ))}

        {/* Gradasi Lembut Bawah & Atas */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-black/20" />

        {/* Top Badges */}
        <div className="absolute left-4 right-4 top-4 z-30 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/10 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-[var(--brand-highlight)]" />
            {slide.badge}
          </span>

          <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-mono font-medium text-white/80 backdrop-blur-xs">
            {current + 1} / {defaultSlides.length}
          </span>
        </div>

        {/* Kontrol Navigasi Panah */}
        <div className="absolute inset-y-0 left-2 right-2 z-30 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={() => setCurrent((prev) => (prev - 1 + defaultSlides.length) % defaultSlides.length)}
            aria-label="Foto Sebelumnya"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-white hover:text-slate-900 opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <CaretLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((prev) => (prev + 1) % defaultSlides.length)}
            aria-label="Foto Berikutnya"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-white hover:text-slate-900 opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <CaretRight className="h-4 w-4" />
          </button>
        </div>

        {/* Keterangan Teks Bawah */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-5 text-white">
          <p className="text-base font-bold leading-snug sm:text-lg text-white drop-shadow-sm">
            {slide.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300 drop-shadow-sm line-clamp-2">
            {slide.desc}
          </p>

          {/* Dots Indicator */}
          <div className="mt-3.5 flex items-center gap-1.5">
            {defaultSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Buka slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-6 bg-[var(--brand-highlight)]" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
