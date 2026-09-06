"use client";

import { Megaphone } from "@phosphor-icons/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { getActiveAnnouncements } from "@/lib/queries";

const SPEED_PX_PER_SEC = 70; // ganti di sini kalau mau lebih cepet/lambat
const MIN_COPIES = 2; // minimal 2 salinan biar loop selalu punya "pasangan"

export function RunningText() {
  const [text, setText] = useState("");
  const [paused, setPaused] = useState(false);
  // Jumlah salinan teks yang di-render, dihitung dinamis dari lebar
  // container vs lebar 1 teks — supaya track SELALU penuh dari ujung ke
  // ujung, tidak peduli teksnya pendek atau bar-nya lebar.
  const [copies, setCopies] = useState(MIN_COPIES);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const itemWidthRef = useRef(0); // lebar 1 salinan (teks + gap pr-16)
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;

    getActiveAnnouncements()
      .then((items) => {
        if (cancelled) return;
        setText(
          items.length > 0
            ? items.join("  •  ")
            : "Selamat Datang di Website SMP Muhammadiyah 4 Tanggul"
        );
      })
      .catch((err) => {
        console.error("Failed to load announcements:", err);
        if (!cancelled) {
          setText("Selamat Datang di Website SMP Muhammadiyah 4 Tanggul");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Ukur lebar 1 salinan teks, lalu tentukan berapa banyak salinan yang
  // dibutuhkan supaya (jumlah salinan - 1) * itemWidth >= lebar container.
  // Itu syarat minimal biar track tetap penuh terus walau posisi lagi di
  // titik "terjauh" sebelum wrap (pos = -itemWidth).
  const measure = useCallback(() => {
    if (!containerRef.current || !firstItemRef.current) return;
    const itemWidth = firstItemRef.current.offsetWidth;
    if (itemWidth <= 0) return;
    itemWidthRef.current = itemWidth;

    const containerWidth = containerRef.current.offsetWidth;
    const needed = Math.max(
      MIN_COPIES,
      Math.ceil(containerWidth / itemWidth) + 2
    );
    setCopies((prev) => (prev === needed ? prev : needed));
  }, []);

  useEffect(() => {
    if (!text || !containerRef.current || !contentRef.current) return;

    const container = containerRef.current;

    // Respect reduced-motion preference: show static text, no animation.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Measure after fonts are ready so scrollWidth is accurate.
    const doMeasure = () => measure();
    doMeasure();
    document.fonts?.ready?.then(doMeasure).catch(() => {});

    const resizeObserver = new ResizeObserver(doMeasure);
    resizeObserver.observe(container);
    if (contentRef.current) resizeObserver.observe(contentRef.current);

    if (prefersReducedMotion) {
      return () => resizeObserver.disconnect();
    }

    posRef.current = container.offsetWidth;
    lastTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (!pausedRef.current && itemWidthRef.current > 0) {
        posRef.current -= SPEED_PX_PER_SEC * deltaSec;
        // Seamless wrap: geser tepat satu period (lebar 1 salinan). Karena
        // semua salinan identik dan berjarak sama, geser sejauh itu bikin
        // barisan salinan terlihat persis sama seperti sebelum wrap — tidak
        // ada lompatan maupun celah kosong.
        const loopWidth = itemWidthRef.current;
        if (posRef.current <= -loopWidth) {
          posRef.current += loopWidth;
        }
      }

      if (contentRef.current) {
        contentRef.current.style.transform = `translateX(${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
    };
  }, [text, measure]);

  if (!text) return null;

  return (
    <div
      className="relative overflow-hidden bg-[#082b59] py-2 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="marquee"
      aria-label={text}
    >
      {/* Solid badge — fully opaque, so it always fully hides whatever
          text is underneath. No gradient here: a translucent color would
          blend with the text color and produce a muddy/grey glyph as it
          passes through, instead of a clean fade. */}
      <div className="absolute left-0 top-0 z-10 flex h-full items-center bg-[#082b59] pl-4 pr-8">
        <Megaphone className="h-3.5 w-3.5 text-[#f4d21f]" weight="fill" />
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden"
        style={{
          // Real alpha mask on the scrolling text itself: it fades its own
          // opacity to 0 under the badge, so it visually disappears into
          // the matching navy background — no color blending, no grey
          // "ghost" characters like the old overlay-on-top approach.
          maskImage: "linear-gradient(to right, transparent, black 62px)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 62px)",
        }}
      >
        <div
          ref={contentRef}
          className="flex w-max will-change-transform"
          style={{ transform: "translateX(100%)" }}
          aria-hidden="true"
        >
          {Array.from({ length: copies }).map((_, i) => (
            // Separator is INSIDE this same item unit (not a sibling), so
            // firstItemRef's offsetWidth already includes it. That keeps
            // itemWidth (used for the loop-wrap math) automatically correct
            // — no separate gap constant to keep in sync.
            <span
              key={i}
              ref={i === 0 ? firstItemRef : undefined}
              className="flex shrink-0 items-center whitespace-nowrap text-xs font-medium tracking-wide"
            >
              {text}
              <span className="mx-6 text-[#f4d21f]">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}