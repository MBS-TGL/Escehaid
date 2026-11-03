"use client";

/**
 * IslamicParticles
 * Partikel prosedural membentuk pola bintang 8 sudut (dua persegi bertumpuk,
 * dikenal sebagai Rub el Hizb) dalam 3 lapis konsentris, ditambah debu partikel
 * sebaran bola. Shader custom: tiap titik berkelip (twinkle) dengan fase acak
 * + variasi ukuran — tanpa file gambar (sprite dilukis di fragment shader).
 * Tanpa model .glb, tanpa drei.
 *
 * Dependensi: three, @react-three/fiber
 * Pasang lewat dynamic import (lihat contoh di bawah file).
 */

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
function buildStarPositions(): { positions: Float32Array; phases: Float32Array; scales: Float32Array } {
  const pts: number[] = [];
  const phases: number[] = [];
  const scales: number[] = [];
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
          phases.push(Math.random());
          // Titik sudut (t≈0) sedikit lebih besar → pola terbaca.
          scales.push(0.7 + Math.random() * 0.6 + (t < 0.06 ? 0.5 : 0));
        }
      }
    }
  }
  return {
    positions: new Float32Array(pts),
    phases: new Float32Array(phases),
    scales: new Float32Array(scales),
  };
}

/** Debu partikel sebaran volume bola di sekitar pola. */
function buildDustPositions(): { positions: Float32Array; phases: Float32Array; scales: Float32Array } {
  const positions = new Float32Array(DUST_COUNT * 3);
  const phases = new Float32Array(DUST_COUNT);
  const scales = new Float32Array(DUST_COUNT);
  for (let i = 0; i < DUST_COUNT; i++) {
    // Arah acak + radius akar kubik → sebaran volume merata, bukan kulit bola.
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 2.2 + Math.cbrt(Math.random()) * 2.4;
    positions[i * 3] = s * Math.cos(th) * r;
    positions[i * 3 + 1] = (u * r * 0.62) + (Math.random() - 0.5) * 0.2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
    phases[i] = Math.random();
    scales[i] = 0.5 + Math.random() * 0.9;
  }
  return { positions, phases, scales };
}

const TWINKLE_VERTEX = /* glsl */ `
  attribute float aPhase;
  attribute float aScale;
  uniform float uTime;
  uniform float uSize;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float speed = 0.8 + aPhase * 1.6;
    vTwinkle = 0.55 + 0.45 * sin(uTime * speed + aPhase * 6.2831);
    gl_PointSize = uSize * aScale * (300.0 / -mv.z);
  }
`;

const TWINKLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    // Sprite bulat lembut dilukis di shader (tanpa tekstur gambar).
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.05, d);
    core = pow(core, 1.6);
    // Halo tipis di sekeliling inti → kesan glow.
    float halo = smoothstep(0.5, 0.2, d) * 0.35;
    float a = (core + halo) * uOpacity * vTwinkle;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

type PointerRef = RefObject<{ x: number; y: number }>;

function Layer({
  data,
  color,
  size,
  spin,
  drift,
  parallax,
  reduced,
  pointer,
  blending,
}: {
  data: { positions: Float32Array; phases: Float32Array; scales: Float32Array };
  color: string;
  size: number;
  spin: number;
  drift: number;
  parallax: number;
  reduced: boolean;
  pointer: PointerRef;
  blending: "additive" | "normal";
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(data.phases, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(data.scales, 1));
    return g;
  }, [data]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size * dpr },
      uOpacity: { value: blending === "normal" ? 0.55 : 0.9 },
    }),
    [color, size, dpr, blending]
  );
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((state, delta) => {
    const grp = group.current;
    if (!grp) return;
    if (mat.current && !reduced) {
      mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (reduced) return;
    grp.rotation.z += delta * spin;
    // Drift vertikal pelan (debu naik, pola turun sangat pelan) + parallax.
    grp.position.y += Math.sin(state.clock.elapsedTime * 0.3) * delta * drift;
    grp.rotation.x += (pointer.current.y * parallax - grp.rotation.x) * 0.05;
    grp.rotation.y += (pointer.current.x * parallax - grp.rotation.y) * 0.05;
  });

  return (
    <group ref={group}>
      <points geometry={geo} frustumCulled={false}>
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={TWINKLE_VERTEX}
          fragmentShader={TWINKLE_FRAGMENT}
          transparent
          depthWrite={false}
          blending={blending === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </points>
    </group>
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
            data={star}
            color={color}
            size={0.055}
            spin={0.04}
            drift={-0.008}
            parallax={0.2}
            reduced={reduced}
            pointer={pointer}
            blending={blending}
          />
          <Layer
            data={dust}
            color={accentColor}
            size={0.038}
            spin={-0.015}
            drift={0.02}
            parallax={0.45}
            reduced={reduced}
            pointer={pointer}
            blending={blending}
          />
          {/* Fase 2.5 — lapisan prosedural sesuai mode:
              bidang gelap → medallion kaca Rub el Hizb + ring arabeske tabung;
              bidang terang → gelombang shader ganda. Semua masih di dalam
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
