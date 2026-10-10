"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import ImageZoom from "@/app/news/[slug]/ImageZoom";

/**
 * Sampul yang menyesuaikan rasio asli gambar.
 *
 * - Wadah `relative` dengan tinggi mengikuti rasio (aspect-ratio).
 * - Gambar utama `object-contain` (poster portrait tampil utuh) di atas latar blur.
 * - Rasio di-clamp antara 4/5 dan 16/9 supaya tak terlalu tinggi/lebar.
 * - Bila `width`/`height` tidak diketahui, rasio awal 16:9 lalu dikoreksi saat
 *   gambar load (naturalWidth/naturalHeight) — Fase A, tanpa kolom DB.
 * - Tinggi dibatasi `max-h-[80vh]` (mobile 70vh) & `min-h-[220px]`; saat batas
 *   tercapai gambar mengecil dan sisi kiri-kanan terisi latar blur.
 * - Reuse lightbox "Perbesar" yang sudah ada (ImageZoom) lewat `children`.
 */

const MIN_RATIO = 4 / 5; // 0.8
const MAX_RATIO = 16 / 9; // ~1.778
const FALLBACK_RATIO = 16 / 9;

function clampRatio(r: number): number {
  if (!Number.isFinite(r) || r <= 0) return FALLBACK_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, r));
}

export default function CoverImage({
  src,
  alt,
  priority,
  width,
  height,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  width?: number;
  height?: number;
  className?: string;
}) {
  // Rasio awal: dari dimensi diketahui, atau fallback 16:9 (dikoreksi saat load).
  const knownRatio =
    width && height ? clampRatio(width / height) : null;
  const [ratio, setRatio] = useState<number>(knownRatio ?? FALLBACK_RATIO);
  const imgRef = useRef<HTMLImageElement>(null);

  const applyNatural = useCallback((el: HTMLImageElement | null | undefined) => {
    // Jangan override rasio yang sudah diketahui dari props.
    if (knownRatio != null) return;
    if (!el) return;
    const nw = el.naturalWidth;
    const nh = el.naturalHeight;
    if (nw > 0 && nh > 0) setRatio(clampRatio(nw / nh));
  }, [knownRatio]);

  // Gambar mungkin sudah termuat dari cache sebelum hydrasi → cek saat mount.
  // naturalWidth cukup sebagai penanda (tak wajib `complete`) bila dimensi sudah terbaca.
  useEffect(() => {
    applyNatural(imgRef.current);
  }, [applyNatural, src]);

  return (
    <ImageZoom src={src} alt={alt}>
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-slate-100 min-h-[220px] max-h-[70vh] md:max-h-[80vh] motion-reduce:transition-none transition-[aspect-ratio] duration-300 ease-out ${className}`}
        style={{ aspectRatio: String(ratio) }}
      >
        {/* Latar blur dekoratif — mengisi sisi saat rasio berbeda / batas tinggi tercapai */}
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          sizes="200px"
          quality={20}
          className="object-cover scale-110 blur-2xl opacity-60"
        />
        {/* Gambar utama — utuh (contain), tak melebihi rasio asli */}
        <Image
          ref={imgRef}
          src={src}
          alt={alt}
          fill
          preload={priority}
          sizes="(max-width: 1024px) 100vw, 896px"
          className="object-contain"
          onLoad={(e) => applyNatural(e.currentTarget)}
        />
      </div>
    </ImageZoom>
  );
}
