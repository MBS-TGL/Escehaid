"use client";

/**
 * ThreeBackdrop — pembungkus gate untuk ornamen partikel 3D (Fase 0).
 *
 * Bertugas memutuskan apakah canvas 3D boleh render sama sekali:
 *   1. `enabled`  — saklar dari settings (`three_enabled` + saklar per lokasi),
 *                  sudah di-resolve di server; false → fallback CSS.
 *   2. perangkat  — kill-switch RAM ≤3 GB / core ≤4 (keputusan pemilik,
 *                  budget RAM 2/3 GB) → fallback CSS.
 *   3. WebGL      — tanpa context WebGL → fallback CSS.
 *
 * `prefers-reduced-motion` ditangani di dalam IslamicParticles (frameloop
 * "demand" — partikel masih tampil sebagai gambar diam, tanpa animasi).
 *
 * Fallback selalu berupa <div> dengan ukuran/posisi sama (className dari luar)
 * berisi gradasi CSS, sehingga TIDAK ada perbedaan tata letak (anti-CLS) dan
 * halaman tetap utuh saat ornamen dimatikan. Ornamen hanyalah dekorasi:
 * aria-hidden, pointer-events none, teks/CTA tetap HTML di luar canvas.
 */
import { useState } from "react";
import IslamicParticles, { isWeakDevice, checkWebglSupported } from "./IslamicParticles";

export type Props = {
  /** Nilai gabungan saklar induk + per lokasi dari settings. false = mati total. */
  enabled: boolean;
  /** Warna pola bintang (settings `three_color`). */
  color: string;
  /** Warna debu partikel (settings `three_accent_color`). */
  accentColor: string;
  /**
   * Posisi & ukuran dari luar, mis. "absolute inset-0 -z-10". Dipakai juga
   * oleh fallback CSS sehingga ukurannya selalu sama.
   */
  className?: string;
  /** "normal" untuk latar terang (/portal); "additive" untuk bidang gelap. */
  blending?: "additive" | "normal";
};

export default function ThreeBackdrop({
  enabled,
  color,
  accentColor,
  className,
  blending = "additive",
}: Props) {
  // Komponen ini hanya jalan di klien (dynamic ssr:false di pemanggilnya),
  // jadi kemampuan perangkat cukup dicek SEKALI di lazy initializer — bukan
  // setState di effect. Saklar `enabled` tetap reaktif karena hanya digabung
  // saat render, bukan saat mount.
  const [device] = useState(() => ({
    webgl: checkWebglSupported(),
    weak: isWeakDevice(),
  }));

  const ok = enabled && device.webgl && !device.weak;

  if (!ok) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{ pointerEvents: "none" }}
      >
        {/* Gradasi tema halus — latar dekoratif bila canvas tidak boleh render. */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 60% at 50% 40%, ${accentColor}1f 0%, transparent 70%)`,
          }}
        />
      </div>
    );
  }

  return (
    <IslamicParticles
      className={className}
      color={color}
      accentColor={accentColor}
      blending={blending}
    />
  );
}
