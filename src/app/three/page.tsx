import type { Metadata } from "next";
import PreviewClient from "./PreviewClient";

/**
 * Route preview internal untuk ornamen 3D (`/three`).
 * Tidak di-link dari navigasi mana pun, tidak masuk sitemap (statis di
 * `src/app/sitemap.ts`), dan `noindex` agar tak terindeks mesin pencari.
 * `enabled` di-hardcode true di PreviewClient supaya bisa dilihat walau
 * saklar settings mati — halaman produksi tetap ikut saklar seperti biasa.
 */
export const metadata: Metadata = {
  title: "Pratinjau Ornamen 3D",
  description:
    "Halaman internal untuk melihat ornamen 3D prosedural sekolah pada bidang gelap dan terang.",
  alternates: { canonical: "/three" },
  robots: { index: false, follow: false },
};

export default function ThreePreviewPage() {
  return <PreviewClient />;
}
