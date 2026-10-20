"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";

const POSTER_URL = "/images/Ruang-Kelas.jpg";
const MOBILE_QUERY = "(max-width: 767px)";

function subscribeMobileChange(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobileChange,
    () => (typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false),
    () => false
  );
}

/**
 * Flag "sudah mount": false saat SSR/hydration, true sejak snapshot klien.
 * useSyncExternalStore (bukan setState dalam effect) — pola yang sama dipakai
 * CSSAnimations.tsx agar video tak dirender sebelum hidrasi tuntas & tervalidasi.
 */
function subscribeNoop(): () => void {
  return () => {};
}

function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

export default function HeroBackground({
  ytId = "",
  videoUrl = "/videos/Profile.mp4",
}: {
  ytId?: string;
  videoUrl?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();
  const mounted = useMounted();
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-slate-950">
      {/* Fallback poster image (tampil di mobile atau sebelum video mulai berputar) */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isPlaying && !isMobile ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <Image
          src={POSTER_URL}
          alt="SMP Muhammadiyah 4 Tanggul"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Desktop Autoplay Muted Video Background (100% Full Bleed Cover) */}
      {mounted && !isMobile && (
        videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setIsPlaying(true)}
            onCanPlay={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            className="h-full w-full object-cover"
          />
        ) : ytId ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3&disablekb=1&vq=hd1080`}
              title="Latar Belakang Profil Sekolah"
              width="1920"
              height="1080"
              onLoad={(e) => {
                setIsPlaying(true);
                const target = e.currentTarget;
                try {
                  target.contentWindow?.postMessage(
                    JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1080"] }),
                    "*"
                  );
                  target.contentWindow?.postMessage(
                    JSON.stringify({ event: "command", func: "setPlaybackQualityRange", args: ["hd1080"] }),
                    "*"
                  );
                } catch {
                  // ignore cross-origin restrictions
                }
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-0 pointer-events-none"
              style={{
                width: "100vw",
                height: "56.25vw",
                minHeight: "100%",
                minWidth: "177.77vh",
              }}
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : null
      )}
    </div>
  );
}
