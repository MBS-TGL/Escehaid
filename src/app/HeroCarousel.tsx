"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const VIDEO_URL = "https://ljobjrlhaifafvroapeq.supabase.co/storage/v1/object/public/videos/Profile.mp4";
const SEGMENTS = [
  { start: 0, end: 66 },
  { start: 66, end: 133 },
];

export default function HeroCarousel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

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
  }, [current]);

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 md:h-[400px]">
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        loop
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
      />

      {/* overlay gradient */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#082b59]/60 via-transparent to-transparent pointer-events-none" />

      {/* dots */}
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
