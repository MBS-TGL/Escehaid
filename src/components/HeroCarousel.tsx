"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const videos = [
  { src: "https://smpmuh4tanggul.sch.id/wp-content/uploads/2025/11/Profil-MBS-2-Muhammadiyah-Tanggul.mp4", alt: "Profil Boarding School" },
  { src: "https://smpmuh4tanggul.sch.id/wp-content/uploads/2025/10/Profil-SMP-SMA-Muhammadiyah-4-Tanggul-Jember.mp4", alt: "Profil Sekolah" },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  const goTo = useCallback((index: number) => {
    if (isTransitioning || index === current) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setIsTransitioning(false);
    }, 400);
  }, [current, isTransitioning]);

  const next = useCallback(() => {
    goTo((current + 1) % videos.length);
  }, [current, goTo]);

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === current) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [current]);

  const handleVideoEnded = useCallback(() => {
    if (current < videos.length - 1) {
      next();
    }
  }, [current, next]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && current < videos.length - 1) next();
      else if (dx > 0 && current > 0) goTo(current - 1);
    }
    dragRef.current = null;
  };

  return (
    <div
      className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 md:h-[400px] touch-pan-y"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {videos.map((v, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <video
            ref={(el) => { videoRefs.current[i] = el; }}
            src={v.src}
            muted
            loop
            playsInline
            preload={i === 0 ? "auto" : "metadata"}
            className="h-full w-full object-cover"
            onEnded={i === current ? handleVideoEnded : undefined}
          />
        </div>
      ))}

      {/* overlay gradient */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#082b59]/80 via-transparent to-transparent pointer-events-none" />

      {/* dots */}
      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        {videos.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-6 bg-[#f4d21f]" : "w-2 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* bottom label */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 pointer-events-none">
        <div className="flex items-center gap-3">
          <Image src="/images/Logo-Sekolah.png" alt="Logo" width={40} height={52} className="h-10 w-auto" />
          <div>
            <p className="text-sm font-bold text-white">SMP Muhammadiyah 4 Tanggul</p>
            <p className="text-xs text-white/60">Sejak 2016 &middot; Tanggul, Jember</p>
          </div>
        </div>
      </div>
    </div>
  );
}
