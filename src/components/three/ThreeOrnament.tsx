"use client";

/**
 * ThreeOrnament — batas dynamic-import untuk ornamen 3D.
 *
 * Halaman publik adalah Server Component; `next/dynamic` dengan `ssr:false`
 * hanya boleh dipakai di komponen client, jadi pembungkus kecil ini yang
 * menjadi satu-satunya jalur pemasangan ornamen (beranda, portal, profil,
 * program). Chunk `three` + `@react-three/fiber` baru diunduh saat komponen
 * ini benar-benar dirender di klien — LCP halaman tidak tersentuh.
 *
 * Skeleton `loading` berupa <div> absolute inset-0: ukurannya mengikuti
 * parent (relative), sehingga saat canvas selesai dimuat TIDAK ada
 * pergeseran tata letak (anti-CLS).
 */
import dynamic from "next/dynamic";
import type { Props as ThreeOrnamentProps } from "./ThreeBackdrop";

const ThreeBackdrop = dynamic(
  () => import("@/components/three/ThreeBackdrop"),
  {
    ssr: false,
    loading: () => (
      <div className="pointer-events-none absolute inset-0" aria-hidden="true" />
    ),
  }
);

export default function ThreeOrnament(props: ThreeOrnamentProps) {
  return <ThreeBackdrop {...props} />;
}
