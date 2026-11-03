"use client";

/**
 * SceneExtras — lapisan prosedural tambahan untuk scene partikel (Fase 2.5).
 * Semua dibuat dari kode: TANPA file model, TANPA gambar, TANPA drei.
 *
 *   • StarCenterpiece — bintang Rub el Hizb 3D solid (ExtrudeGeometry dari
 *     poligon 8 titik dua persegi bertumpuk), melayang & berputar pelan,
 *     plus dua ring arabeske (LineLoop bergelombang 8 puncak) mengelilinginya.
 *     Dipakai di bidang GELAP (blending "additive") — ada lampu + emissive.
 *   • WaveLayer — bidang shader GLSL bergelombang sangat halus untuk latar
 *     TERANG (blending "normal"), warna aksen tema dengan opasitas rendah.
 *
 * Semua lapisan menghormati `reduced` (prefers-reduced-motion → diam tanpa
 * animasi) dan berhenti menghitung saat frameloop "never" (di luar viewport).
 * Biaya: 3-4 draw call tambahan, vertex count kecil — aman untuk budget
 * RAM 2/3 GB (kill-switch tetap berlaku di ThreeBackdrop).
 */
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type PointerRef = RefObject<{ x: number; y: number }>;

/* ── Bintang Rub el Hizb (poligon gabungan dua persegi 0° dan 45°) ──────── */

const STAR_OUTER = 1.5;
// Titik dalam bintang: perpotongan sisi dua persegi = R·√(2−√2) ≈ 0.7654·R.
const STAR_INNER = STAR_OUTER * 0.7654;

function buildStarShape(): THREE.Shape {
  const shape = new THREE.Shape();
  for (let k = 0; k < 8; k++) {
    const aOuter = (k * Math.PI) / 4;
    const aInner = aOuter + Math.PI / 8;
    const xo = Math.cos(aOuter) * STAR_OUTER;
    const yo = Math.sin(aOuter) * STAR_OUTER;
    const xi = Math.cos(aInner) * STAR_INNER;
    const yi = Math.sin(aInner) * STAR_INNER;
    if (k === 0) shape.moveTo(xo, yo);
    else shape.lineTo(xo, yo);
    shape.lineTo(xi, yi);
  }
  shape.closePath();
  return shape;
}

/** Ring arabeske: lingkaran dengan riak sinus 8 puncak (LineLoop, 1 draw call). */
function ArabeskeRing({
  color,
  reduced,
  radius,
  reverse,
}: {
  color: string;
  reduced: boolean;
  radius: number;
  reverse?: boolean;
}) {
  const ref = useRef<THREE.LineLoop>(null);
  const geo = useMemo(() => {
    const N = 240;
    const pts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const r = radius * (1 + 0.05 * Math.sin(8 * th));
      pts[i * 3] = Math.cos(th) * r;
      pts[i * 3 + 1] = Math.sin(th) * r;
      pts[i * 3 + 2] = 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, [radius]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((_, delta) => {
    const l = ref.current;
    if (!l || reduced) return;
    l.rotation.z += delta * (reverse ? -0.02 : 0.025);
  });

  return (
    <lineLoop ref={ref} geometry={geo}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineLoop>
  );
}

/** Bintang 3D solid + ring arabeske — pusat scene untuk bidang gelap. */
export function StarCenterpiece({
  color,
  accentColor,
  reduced,
  pointer,
}: {
  color: string;
  accentColor: string;
  reduced: boolean;
  pointer: PointerRef;
}) {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(
    () =>
      new THREE.ExtrudeGeometry(buildStarShape(), {
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 1,
      }),
    []
  );
  useEffect(() => () => geo.dispose(), [geo]);

  // Responsif: di HP sempit kecilkan agar tidak terpotong section.
  const viewport = useThree((s) => s.viewport);
  const scale = Math.min(1, viewport.width / 3.6);

  useFrame((state) => {
    const g = group.current;
    if (!g || reduced) return;
    const t = state.clock.elapsedTime;
    g.position.y = Math.sin(t * 0.5) * 0.08;
    g.rotation.z = t * 0.05;
    // parallax halus mengikuti kursor/sentuhan (ref sama dengan partikel)
    g.rotation.x = 0.15 + pointer.current.y * 0.08;
    g.rotation.y = pointer.current.x * 0.12;
  });

  return (
    <>
      {/* Lampu minimal untuk material lit — hanya ada di scene bidang gelap. */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <group ref={group} scale={scale}>
        <mesh geometry={geo}>
          <meshStandardMaterial
            color={color}
            emissive={accentColor}
            emissiveIntensity={0.18}
            metalness={0.15}
            roughness={0.55}
          />
        </mesh>
        <ArabeskeRing color={accentColor} reduced={reduced} radius={2.5} />
        <ArabeskeRing color={accentColor} reduced={reduced} radius={2.8} reverse />
      </group>
    </>
  );
}

/* ── Gelombang shader untuk latar terang ────────────────────────────────── */

const WAVE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WAVE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    // Dua gelombang sinus silang → pola kain/bayu sangat halus.
    float w1 = sin(vUv.x * 8.0 + uTime * 0.35) * 0.5 + 0.5;
    float w2 = sin(vUv.x * 3.0 - uTime * 0.22 + vUv.y * 2.0) * 0.5 + 0.5;
    float band = smoothstep(0.55, 0.95, w1 * w2);
    // Pudar di tepi atas/bawah supaya menyatu dengan latar section.
    float fade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
    gl_FragColor = vec4(uColor, band * 0.10 * fade);
  }
`;

export function WaveLayer({
  color,
  reduced,
}: {
  color: string;
  reduced: boolean;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const viewport = useThree((s) => s.viewport);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    }),
    [color]
  );

  useFrame((state) => {
    if (reduced) return;
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0, 0, -1.5]}>
      <planeGeometry args={[viewport.width * 1.2, viewport.height * 1.2]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={WAVE_VERTEX}
        fragmentShader={WAVE_FRAGMENT}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
