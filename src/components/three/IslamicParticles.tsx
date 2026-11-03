"use client";

/**
 * IslamicParticles
 * Partikel prosedural membentuk pola bintang 8 sudut (dua persegi bertumpuk,
 * dikenal sebagai Rub el Hizb) dalam 3 lapis konsentris, ditambah debu partikel.
 * Tanpa model .glb, tanpa gambar: semua dibuat dari kode.
 *
 * Dependensi: three, @react-three/fiber
 * Pasang lewat dynamic import (lihat contoh di bawah file).
 */

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { StarCenterpiece, WaveLayer } from "./SceneExtras";

type Props = {
  /** Warna titik pola bintang (hex). Ambil dari settings `three_color`. */
  color: string;
  /** Warna debu partikel (hex). Ambil dari settings `three_accent_color`. */
  accentColor: string;
  /**
   * Mode pencampuran warna partikel. `additive` = glow, hanya terlihat di
   * atas bidang gelap; `normal` = untuk latar terang (seperti /portal).
   * Default `additive` dipertahankan demi kompatibilitas pemakaian lama.
   */
  blending?: "additive" | "normal";
  /** Beri posisi dari luar, mis. "absolute inset-0 -z-10". */
  className?: string;
};

/**
 * Kill-switch perangkat lemah (keputusan pemilik: RAM 2/3 GB).
 * `navigator.deviceMemory` belum ada di semua browser → undefined = lolos;
 * ambang: ≤3 GB RAM atau ≤4 core CPU dianggap lemah (fallback CSS saja).
 */
export function isWeakDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 3) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) {
    return true;
  }
  return false;
}

/** Cek dukungan WebGL (murah — hanya membuat context sementara lalu dibuang). */
export function checkWebglSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const RINGS = [0.45, 0.75, 1.05]; // skala tiap lapis bintang
const POINTS_PER_EDGE = 36; // makin kecil makin ringan
const DUST_COUNT = 260;

/** Titik-titik di sepanjang sisi dua persegi (0° dan 45°) pada tiap lapis. */
function buildStarPositions(): Float32Array {
  const pts: number[] = [];
  for (const scale of RINGS) {
    const radius = scale * 2;
    for (const offset of [0, Math.PI / 4]) {
      for (let k = 0; k < 4; k++) {
        const a1 = offset + (k * Math.PI) / 2;
        const a2 = offset + ((k + 1) * Math.PI) / 2;
        const x1 = Math.cos(a1) * radius;
        const y1 = Math.sin(a1) * radius;
        const x2 = Math.cos(a2) * radius;
        const y2 = Math.sin(a2) * radius;
        for (let i = 0; i < POINTS_PER_EDGE; i++) {
          const t = i / POINTS_PER_EDGE;
          pts.push(
            x1 + (x2 - x1) * t,
            y1 + (y2 - y1) * t,
            (Math.random() - 0.5) * 0.15 // sedikit kedalaman
          );
        }
      }
    }
  }
  return new Float32Array(pts);
}

/** Debu partikel acak di sekitar pola. */
function buildDustPositions(): Float32Array {
  const pts = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    pts[i * 3] = (Math.random() - 0.5) * 7;
    pts[i * 3 + 1] = (Math.random() - 0.5) * 4.4;
    pts[i * 3 + 2] = (Math.random() - 0.5) * 3;
  }
  return pts;
}

/** Tekstur titik bulat dibuat dari canvas 2D (tanpa file gambar). */
function createDotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.8)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

type PointerRef = RefObject<{ x: number; y: number }>;

function Layer({
  positions,
  color,
  size,
  spin,
  parallax,
  reduced,
  pointer,
  blending,
}: {
  positions: Float32Array;
  color: string;
  size: number;
  spin: number;
  parallax: number;
  reduced: boolean;
  pointer: PointerRef;
  blending: "additive" | "normal";
}) {
  const ref = useRef<THREE.Points>(null);
  const map = useMemo(() => createDotTexture(), []);
  useEffect(() => () => map.dispose(), [map]);

  useFrame((_, delta) => {
    const p = ref.current;
    if (!p || reduced) return;
    p.rotation.z += delta * spin;
    // parallax halus mengikuti kursor / sentuhan
    p.rotation.x += (pointer.current.y * parallax - p.rotation.x) * 0.05;
    p.rotation.y += (pointer.current.x * parallax - p.rotation.y) * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={map}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={blending === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function IslamicParticles({
  color,
  accentColor,
  blending = "additive",
  className,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);
  // Komponen ini hanya jalan di klien (dynamic ssr:false lewat ThreeBackdrop),
  // jadi pemeriksaan lingkungan aman dilakukan di lazy initializer — tidak ada
  // setState sinkron di effect (react-hooks/set-state-in-effect).
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [webgl] = useState(() => checkWebglSupported());

  const star = useMemo(() => buildStarPositions(), []);
  const dust = useMemo(() => buildDustPositions(), []);

  useEffect(() => {

    // 3. hentikan render saat tidak terlihat di layar
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (wrapRef.current) io.observe(wrapRef.current);

    // 4. posisi pointer global (wrapper memakai pointer-events: none)
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={className}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      {webgl && (
        <Canvas
          frameloop={!visible ? "never" : reduced ? "demand" : "always"}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        >
          <Layer
            positions={star}
            color={color}
            size={0.05}
            spin={0.04}
            parallax={0.2}
            reduced={reduced}
            pointer={pointer}
            blending={blending}
          />
          <Layer
            positions={dust}
            color={accentColor}
            size={0.03}
            spin={-0.015}
            parallax={0.45}
            reduced={reduced}
            pointer={pointer}
            blending={blending}
          />
          {/* Fase 2.5 — lapisan prosedural sesuai mode:
              bidang gelap → bintang Rub el Hizb 3D solid + ring arabeske;
              bidang terang → gelombang shader halus. Semua masih di dalam
              gate/kill-switch yang sama. */}
          {blending === "additive" ? (
            <StarCenterpiece
              color={color}
              accentColor={accentColor}
              reduced={reduced}
              pointer={pointer}
            />
          ) : (
            <WaveLayer color={accentColor} reduced={reduced} />
          )}
        </Canvas>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   PEMAKAIAN — jangan impor file ini langsung. Pakai `ThreeBackdrop.tsx`
   (pembungkus saklar + kill-switch + fallback CSS), dipasang via dynamic
   import dengan skeleton ukuran tetap (anti-CLS) di komponen client:

   "use client";
   import dynamic from "next/dynamic";

   const ThreeBackdrop = dynamic(
     () => import("@/components/three/ThreeBackdrop"),
     { ssr: false, loading: () => <div className="h-[420px] rounded-2xl" /> }
   );

   <ThreeBackdrop
     className="absolute inset-0"
     color={threeColor}          // dari settings: three_color
     accentColor={threeAccent}   // dari settings: three_accent_color
     blending="normal"           // latar terang (/portal); "additive" di gelap
   />
------------------------------------------------------------------- */
