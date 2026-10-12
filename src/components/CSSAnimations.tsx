"use client";

import { useRef, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Langganan perubahan preferensi "kurangi gerakan" (dipakai useSyncExternalStore). */
function subscribeMotionChange(onChange: () => void) {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Preferensi "kurangi gerakan": true di klien bila OS/ browser memintanya,
 * false saat render server (hydration aman — React render ulang setelah snapshot
 * klien terbaca, tanpa setState sinkron di dalam effect).
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotionChange,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false
  );
}

/**
 * Hook bersama: `visible` jadi true saat elemen mendekati viewport (sekali saja),
 * atau langsung bila pengguna meminta gerak dikurangi (prefers-reduced-motion).
 */
function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Hormati preferensi "kurangi gerakan": tampil langsung tanpa animasi —
  // dihitung dari snapshot external store (bukan setState di dalam effect).
  const visible = inView || reducedMotion;

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reducedMotion]);

  return { ref, visible };
}

/* ─── CSSFadeIn — pure CSS animation, no Framer Motion ──
 *
 * `will-change` HANYA dipasang sebelum elemen tampil (saat menunggu animasi).
 * Setelah `visible`, properti itu dilepas dan transform kembali "none" supaya
 * browser menurunkan elemen dari layer GPU sendiri. Jika `will-change: transform`
 * dibiarkan permanen, teks di dalamnya dirender tanpa subpixel antialiasing
 * dan terlihat blur (terutama di Windows).
 */
export function CSSFadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useRevealOnce<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(20px)",
        transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
        willChange: visible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ─── CSSStagger — CSS stagger animation ── */
export function CSSStagger({
  children,
  className = "",
  stagger = 80,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const { ref, visible } = useRevealOnce<HTMLDivElement>();

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
          <div
            key={i}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(15px)",
              transition: `opacity 0.4s ease ${i * stagger}ms, transform 0.4s ease ${i * stagger}ms`,
              willChange: visible ? "auto" : "opacity, transform",
            }}
          >
            {child}
          </div>
        ))
        : children}
    </div>
  );
}