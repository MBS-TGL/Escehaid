"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Play } from "@/components/Icons";

/**
 * Video hero.
 *
 * Default: video MP4 di Supabase Storage (52 MB → menyedot egress tiap kunjungan).
 * Setelah video di-upload ke channel YouTube (@MBSTANGGUL), cukup set env
 *   NEXT_PUBLIC_HERO_VIDEO_YT=<id video>
 * di Vercel/.env.local — halaman otomatis memakai embed YouTube (egress Supabase nol).
 * NEXT_PUBLIC_HERO_VIDEO_URL dipakai kalau mau menunjuk URL video lain
 * (mis. /videos/Profile.mp4 setelah dipindah ke /public).
 *
 * Di HP (< 768px) video TIDAK autoplay: yang tampil poster + tombol play, dan
 * file video baru diunduh setelah diklik — menghemat kuota serta menghindari
 * decode/streaming 52 MB di device kelas menengah. Desktop tetap autoplay malas
 * (src dipasang via IntersectionObserver, preload="none").
 */
const YT_ID = process.env.NEXT_PUBLIC_HERO_VIDEO_YT || "";
const VIDEO_URL =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL ||
  "https://ljobjrlhaifafvroapeq.supabase.co/storage/v1/object/public/videos/Profile.mp4";
/** Poster saat video belum berjalan (HP: sampai tombol play ditekan). */
const POSTER_URL = "/images/Ruang-Kelas.jpg";
const SEGMENTS = [
  { start: 0, end: 66 },
  { start: 66, end: 133 },
];

const MOBILE_QUERY = "(max-width: 767px)";

/** Langganan perubahan lebar layar (pola sama dengan CSSAnimations.tsx). */
function subscribeMobileChange(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** true di klien bila lebar < 768px; selalu false saat render server. */
function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobileChange,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

export default function HeroCarousel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false); // HP: sudah tekan tombol play?
  const [loaded, setLoaded] = useState(false); // src video sudah dipasang?
  const [playing, setPlaying] = useState(false); // video sedang berjalan?

  const isMobile = useIsMobile();
  // Desktop: autoplay malas. HP: hanya setelah tombol play ditekan.
  const autoplay = !isMobile || started;

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !autoplay || loaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.src = VIDEO_URL;
          video.load();
          setLoaded(true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [autoplay, loaded]);

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
    <div
      ref={containerRef}
      className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)] md:h-[600px]"
    >
      {/* Poster: tampil selama video belum berjalan — di HP sampai tombol play
          ditekan, di desktop selama buffer awal. `priority` karena ini yang
          jadi LCP di HP (video tidak lagi diunduh otomatis). */}
      {!playing && (
        <Image
          src={POSTER_URL}
          alt="Suasana ruang kelas SMP Muhammadiyah 4 Tanggul"
          fill
          sizes="(max-width: 767px) 100vw, 800px"
          priority
          className="object-cover"
        />
      )}

      {/* Video/iframe hanya dirender saat autoplay diizinkan — di HP sebelum
          ditekan play, tidak ada elemen video sama sekali (nol byte). */}
      {autoplay ? (
        YT_ID ? (
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
            onPlaying={() => setPlaying(true)}
            className="relative h-full w-full object-cover"
          />
        )
      ) : null}

      {/* overlay gradient */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[var(--brand-primary)]/60 via-transparent to-transparent pointer-events-none" />

      {/* Tombol play (khusus HP sebelum mulai) — seluruh area hero bisa diklik */}
      {!autoplay && (
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label="Putar video profil sekolah"
          className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-[0_8px_30px_rgba(8,43,89,0.45)] transition-transform duration-200 active:scale-95">
            <Play weight="fill" className="h-9 w-9 translate-x-0.5 text-[var(--brand-primary)]" />
          </span>
        </button>
      )}

      {/* dots (hanya mode segment MP4, tampil setelah video berjalan) —
          tombol bisa diklik lompat ke segmen */}
      {!YT_ID && autoplay && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {SEGMENTS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Bagian video ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
              onClick={() => setCurrent(i)}
              className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${
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
