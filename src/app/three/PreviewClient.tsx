"use client";

/**
 * PreviewClient — panel pratinjau internal ornamen 3D (`/three`).
 * Dua stage berdampingan: bidang gelap (additive) + bidang terang (normal),
 * dengan kontrol warna + saklar enabled (untuk melihat fallback saat mati).
 * `enabled` di-hardcode true secara default — bypass settings agar bisa
 * dilihat walau saklar admin mati; halaman produksi tetap ikut saklar.
 */
import { useState } from "react";
import Link from "next/link";
import ThreeOrnament from "@/components/three/ThreeOrnament";
import { checkWebglSupported, isWeakDevice } from "@/components/three/IslamicParticles";

const DEFAULT_COLOR = "#2f7bff";
const DEFAULT_ACCENT = "#8fc3ff";

export default function PreviewClient() {
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [enabled, setEnabled] = useState(true);
  // Cek kemampuan perangkat sekali di lazy initializer (client-only, tanpa
  // setState di effect).
  const [device] = useState(() => ({
    webgl: checkWebglSupported(),
    weak: isWeakDevice(),
    reduced:
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/"
          className="text-sm font-semibold text-sky-300 underline-offset-4 hover:underline"
        >
          ← Kembali ke beranda
        </Link>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Pratinjau Ornamen 3D
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Medallion kaca Rub el Hizb + partikel twinkle prosedural (tanpa file
          model/gambar). Kiri: bidang gelap (additive, seperti section visi).
          Kanan: bidang terang (normal, seperti /program & /portal).
        </p>

        {/* Status perangkat */}
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-3 py-1 font-semibold ${device.webgl ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
            WebGL: {device.webgl ? "tersedia" : "tidak tersedia"}
          </span>
          <span className={`rounded-full px-3 py-1 font-semibold ${device.weak ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
            Perangkat: {device.weak ? "lemah (fallback CSS)" : "mampu"}
          </span>
          <span className="rounded-full bg-slate-500/15 px-3 py-1 font-semibold text-slate-300">
            Reduced motion: {device.reduced ? "aktif (diam)" : "mati (animasi)"}
          </span>
        </div>

        {/* Kontrol */}
        <div className="mt-6 flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-white/20 bg-transparent"
              aria-label="Warna pola bintang"
            />
            <span className="text-slate-300">Warna pola <code className="text-sky-300">{color}</code></span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-white/20 bg-transparent"
              aria-label="Warna debu partikel"
            />
            <span className="text-slate-300">Warna aksen <code className="text-sky-300">{accentColor}</code></span>
          </label>
          <button
            type="button"
            onClick={() => {
              setColor(DEFAULT_COLOR);
              setAccentColor(DEFAULT_ACCENT);
            }}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
          >
            Reset
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-sky-400"
            />
            Ornamen aktif {enabled ? "" : "(mati = null, tanpa fallback)"}
          </label>
        </div>

        {/* Dua stage */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section aria-label="Pratinjau bidang gelap">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Bidang gelap · additive
            </p>
            <div className="relative h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#050c1d] via-[#0a1f44] to-[#0b3b8f] sm:h-[520px]">
              <ThreeOrnament
                enabled={enabled}
                color={color}
                accentColor={accentColor}
                className="absolute inset-0"
                blending="additive"
              />
              <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs text-white/50">
                Medallion kaca + ring tabung + manik orbit + twinkle
              </p>
            </div>
          </section>
          <section aria-label="Pratinjau bidang terang">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Bidang terang · normal
            </p>
            <div className="relative h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-slate-100 sm:h-[520px]">
              <ThreeOrnament
                enabled={enabled}
                color={color}
                accentColor={accentColor}
                className="absolute inset-0"
                blending="normal"
              />
              <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs text-slate-500">
                Gelombang shader ganda + twinkle (normal blending)
              </p>
            </div>
          </section>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          Halaman internal — tidak di-link dari navigasi, tidak masuk sitemap,
          dan noindex. Canvas dimatikan otomatis saat di luar viewport, diam
          saat prefers-reduced-motion, dan diganti fallback CSS di perangkat
          lemah / tanpa WebGL (lihat ThreeBackdrop).
        </p>
      </div>
    </div>
  );
}
