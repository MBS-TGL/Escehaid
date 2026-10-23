"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { CaretLeft, CaretRight, Clock } from "@/components/Icons";

interface HistorySlide {
  src: string;
  alt: string;
  badge: string;
  title: string;
  desc: string;
}

function subscribeMotionChange(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
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
  const [isInView, setIsInView] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const touchX = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeMotionChange,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), {
      threshold: 0.2,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setIsHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (isPaused || reducedMotion || !isInView || isHidden) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % defaultSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isPaused, reducedMotion, isInView, isHidden]);

  const slide = defaultSlides[current];

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Kilas balik sejarah sekolah"
      className="group relative overflow-hidden rounded-2xl border border-[#dce3ed] bg-slate-950 shadow-lg"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setIsPaused(true);
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) {
          setCurrent((prev) =>
            dx < 0
              ? (prev + 1) % defaultSlides.length
              : (prev - 1 + defaultSlides.length) % defaultSlides.length
          );
        }
        setIsPaused(false);
      }}
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
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-white hover:text-slate-900 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
          >
            <CaretLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((prev) => (prev + 1) % defaultSlides.length)}
            aria-label="Foto Berikutnya"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-white hover:text-slate-900 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
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
                aria-current={i === current}
                className="-m-2 rounded-full p-2"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? "w-6 bg-[var(--brand-highlight)]" : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
