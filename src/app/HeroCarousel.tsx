"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Video hero.
 *
 * Default: video MP4 di Supabase Storage (52 MB → menyedot egress tiap kunjungan).
 * Setelah video di-upload ke channel YouTube (@MBSTANGGUL), cukup set env
 *   NEXT_PUBLIC_HERO_VIDEO_YT=<id video>
 * di Vercel/.env.local — halaman otomatis memakai embed YouTube (egress Supabase nol).
 * NEXT_PUBLIC_HERO_VIDEO_URL dipakai kalau mau menunjuk URL video lain
 * (mis. /videos/Profile.mp4 setelah dipindah ke /public).
 */
const YT_ID = process.env.NEXT_PUBLIC_HERO_VIDEO_YT || "";
const VIDEO_URL =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL ||
  "https://ljobjrlhaifafvroapeq.supabase.co/storage/v1/object/public/videos/Profile.mp4";
const SEGMENTS = [
  { start: 0, end: 66 },
  { start: 66, end: 133 },
];

export default function HeroCarousel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loaded) {
          video.src = VIDEO_URL;
          video.load();
          setLoaded(true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [loaded]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !loaded) return;

    v.currentTime = SEGMENTS[current].start;
    v.play().catch(() => {});

    const onTimeUpdate = () => {
      if (v.currentTime >= SEGMENTS[current].end) {
        const next = (current + 1) % SEGMENTS.length;
        setCurrent(next);
        v.currentTime = SEGMENTS[next].start;
        v.play().catch(() => {});
      }
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [current, loaded]);

  return (
    <div ref={containerRef} className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-white/10 md:h-[600px]">
      {YT_ID ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${YT_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${YT_ID}&playsinline=1&rel=0&modestbranding=1`}
          title="Video profil SMP Muhammadiyah 4 Tanggul"
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        />
      ) : (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover"
        />
      )}

      {/* overlay gradient */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#082b59]/60 via-transparent to-transparent pointer-events-none" />

      {/* dots (hanya mode segment MP4) */}
      {!YT_ID && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {SEGMENTS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-[#f4d21f]" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* bottom label */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 pointer-events-none">
        <div className="flex items-center gap-3">
          <Image src="/images/Logo-Sekolah.png" alt="Logo SMP Muhammadiyah 4 Tanggul" width={40} height={52} sizes="40px" className="h-10 w-auto" />
          <div>
            <p className="text-sm font-bold text-white">SMP Muhammadiyah 4 Tanggul</p>
            <p className="text-xs text-white/60">Sejak 2016 &middot; Tanggul, Jember</p>
          </div>
        </div>
      </div>
    </div>
  );
}
