"use client";

/**
 * SceneExtras — lapisan prosedural tambahan untuk scene partikel.
 * Semua dibuat dari kode: TANPA file model, TANPA gambar, TANPA drei.
 *
 *   • StarCenterpiece — medallion Rub el Hizb kaca biru (meshPhysicalMaterial
 *     + clearcoat) dengan bintang kedua offset di belakang, torus luar
 *     metalik, kubah tengah icosahedron, dua ring arabeske berupa TABUNG
 *     (TubeGeometry — kena cahaya, bukan garis 1px), plus manik orbit
 *     (InstancedMesh, 1 draw call). Lighting 3 titik: key putih dingin,
 *     rim aksen dari belakang, ambient rendah. Dipakai di bidang GELAP
 *     (blending "additive").
 *   • WaveLayer — dua bidang shader GLSL (pita alir + gumpalan lembut) untuk
 *     latar TERANG (blending "normal"), warna aksen tema, alpha rendah.
 *
 * Semua lapisan menghormati `reduced` (prefers-reduced-motion → diam tanpa
 * animasi) dan berhenti menghitung saat frameloop "never" (di luar viewport).
 * Biaya scene gelap: ~9 draw call kecil — aman untuk budget RAM 2/3 GB
 * (kill-switch tetap berlaku di ThreeBackdrop).
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

/** Ring arabeske: tabung mengikuti lingkaran riak 8 puncak (1 draw call). */
function ArabeskeRing({
  color,
  reduced,
  radius,
  reverse,
  tilt,
}: {
  color: string;
  reduced: boolean;
  radius: number;
  reverse?: boolean;
  tilt?: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const N = 180;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const r = radius * (1 + 0.05 * Math.sin(8 * th));
      pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    return new THREE.TubeGeometry(curve, 220, 0.012, 6, true);
  }, [radius]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m || reduced) return;
    m.rotation.z += delta * (reverse ? -0.03 : 0.04);
  });

  return (
    <mesh ref={ref} geometry={geo} rotation={tilt ?? [0, 0, 0]}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.55}
        metalness={0.6}
        roughness={0.3}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Manik orbit: bola-bola kecil di sekeliling medallion (1 draw call). */
function OrbitBeads({
  color,
  reduced,
  radius,
  count,
  size,
  speed,
  phase,
}: {
  color: string;
  reduced: boolean;
  radius: number;
  count: number;
  size: number;
  speed: number;
  phase: number;
}) {
  const group = useRef<THREE.Group>(null);
  const beads = useMemo(() => {
    const g = new THREE.SphereGeometry(size, 12, 12);
    const m = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.7,
      metalness: 0.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const im = new THREE.InstancedMesh(g, m, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = phase + (i / count) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    return im;
  }, [color, count, radius, size, phase]);
  useEffect(
    () => () => {
      beads.geometry.dispose();
      (beads.material as THREE.Material).dispose();
    },
    [beads]
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g || reduced) return;
    g.rotation.z += delta * speed;
  });

  return (
    <group ref={group}>
      <primitive object={beads} />
    </group>
  );
}

/** Medallion kaca biru + ring arabeske + manik orbit — pusat scene bidang gelap. */
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
  const inner = useRef<THREE.Group>(null);
  const geo = useMemo(
    () =>
      new THREE.ExtrudeGeometry(buildStarShape(), {
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
        curveSegments: 4,
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
    // Bintang dalam counter-rotate pelan → kesan kedalaman mekanis.
    if (inner.current) inner.current.rotation.z = -t * 0.09;
  });

  return (
    <>
      {/* Lighting 3 titik: key dingin + rim aksen + ambient rendah. */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={2.0} color="#ffffff" />
      <directionalLight position={[-4, -1, -3]} intensity={1.2} color={accentColor} />
      <group ref={group} scale={scale}>
        {/* Bintang utama: kaca biru clearcoat. */}
        <mesh geometry={geo}>
          <meshPhysicalMaterial
            color={color}
            emissive={accentColor}
            emissiveIntensity={0.25}
            metalness={0.1}
            roughness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.15}
          />
        </mesh>
        {/* Bintang kedua di belakang, diputar 22,5° + menyusut → kedalaman. */}
        <group ref={inner}>
          <mesh geometry={geo} position={[0, 0, -0.4]} rotation={[0, 0, Math.PI / 8]} scale={0.62}>
            <meshPhysicalMaterial
              color={accentColor}
              emissive={color}
              emissiveIntensity={0.3}
              metalness={0.2}
              roughness={0.2}
              clearcoat={1}
              clearcoatRoughness={0.2}
              transparent
              opacity={0.9}
            />
          </mesh>
        </group>
        {/* Torus luar tipis metalik — bingkai medallion. */}
        <mesh>
          <torusGeometry args={[2.15, 0.015, 8, 180]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={0.4}
            metalness={0.8}
            roughness={0.25}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Kubah tengah icosahedron — titik fokus cahaya. */}
        <mesh position={[0, 0, 0.28]}>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshPhysicalMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={0.5}
            metalness={0.3}
            roughness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
        <ArabeskeRing color={accentColor} reduced={reduced} radius={2.5} />
        <ArabeskeRing color={accentColor} reduced={reduced} radius={2.8} reverse tilt={[0.2, 0.1, 0]} />
        <OrbitBeads color={accentColor} reduced={reduced} radius={2.5} count={7} size={0.035} speed={-0.08} phase={0} />
        <OrbitBeads color={color} reduced={reduced} radius={2.8} count={7} size={0.028} speed={0.06} phase={Math.PI / 7} />
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

const FLOW_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    // Dua gelombang sinus silang → pola kain/bayu halus.
    float w1 = sin(vUv.x * 8.0 + uTime * 0.35) * 0.5 + 0.5;
    float w2 = sin(vUv.x * 3.0 - uTime * 0.22 + vUv.y * 2.0) * 0.5 + 0.5;
    float band = smoothstep(0.5, 0.95, w1 * w2);
    // Pudar di tepi atas/bawah supaya menyatu dengan latar section.
    float fade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
    gl_FragColor = vec4(uColor, band * 0.16 * fade);
  }
`;

const BLOOM_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    // Gumpalan lembut melayang — dua blob sinus berjalan berlawanan arah.
    vec2 p1 = vec2(0.5 + 0.28 * sin(uTime * 0.12), 0.5 + 0.2 * cos(uTime * 0.1));
    vec2 p2 = vec2(0.5 + 0.3 * cos(uTime * 0.09 + 2.0), 0.5 + 0.22 * sin(uTime * 0.11 + 1.0));
    float d1 = smoothstep(0.45, 0.0, distance(vUv, p1));
    float d2 = smoothstep(0.38, 0.0, distance(vUv, p2));
    float fade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y)
               * smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
    gl_FragColor = vec4(uColor, (d1 * 0.10 + d2 * 0.08) * fade);
  }
`;

function ShaderPlane({
  color,
  reduced,
  fragment,
  speed,
  z,
}: {
  color: string;
  reduced: boolean;
  fragment: string;
  speed: number;
  z: number;
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
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime * speed;
  });

  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[viewport.width * 1.2, viewport.height * 1.2]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={WAVE_VERTEX}
        fragmentShader={fragment}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

export function WaveLayer({
  color,
  reduced,
}: {
  color: string;
  reduced: boolean;
}) {
  return (
    <>
      <ShaderPlane color={color} reduced={reduced} fragment={FLOW_FRAGMENT} speed={1} z={-1.5} />
      <ShaderPlane color={color} reduced={reduced} fragment={BLOOM_FRAGMENT} speed={1} z={-1.6} />
    </>
  );
}
