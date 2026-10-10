"use client";

import Image from "next/image";
import ImageZoom from "@/app/news/[slug]/ImageZoom";

/**
 * Sampul sederhana: gambar tampil dengan ukuran natural (rasio asli), rata tengah,
 * tanpa crop dan tanpa latar blur.
 *
 * - Wadah `relative mx-auto w-fit max-w-full` → mengikuti lebar gambar, rata tengah.
 * - Gambar `block h-auto w-auto max-w-full max-h-[75vh] object-contain`:
 *     * poster portrait tampil utuh (lebar mengikuti tinggi, tak terpotong),
 *     * foto landscape hampir selebar kolom,
 *     * tak pernah melebihi 75vh (mobile 70vh) dan tak merusak layout.
 * - `width`/`height` tebakan 1200×675 (16:9) hanya untuk mencadangkan tempat saat
 *   gambar belum dimuat; rasio sesungguhnya dipakai browser setelah load lewat
 *   `style width/height: auto` (Fase A, tanpa kolom DB).
 * - Tombol "Perbesar" (lightbox ImageZoom yang sudah ada) menempel di pojok kanan
 *   atas gambar, karena wadah mengikuti ukuran gambar (w-fit).
 */

export default function CoverImage({
  src,
  alt,
  priority,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative mx-auto w-fit max-w-full ${className}`}>
      <ImageZoom src={src} alt={alt}>
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={675}
          preload={priority}
          sizes="(min-width: 1024px) 896px, 100vw"
          className="block h-auto w-auto max-w-full max-h-[70vh] md:max-h-[75vh] rounded-2xl border border-[#dce3ed] shadow-sm object-contain"
          style={{ width: "auto", height: "auto" }}
        />
      </ImageZoom>
    </div>
  );
}
