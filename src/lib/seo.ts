/**
 * Helper metadata OpenGraph per halaman.
 *
 * Kenapa ada: `openGraph` di `app/layout.tsx` di-merge DANGKAL oleh Next.js —
 * nilai `url` di sana menimpa semua halaman, sehingga seluruh situs dulu
 * melaporkan `og:url` = beranda (bug nyata, terverifikasi di produksi).
 * Sebaliknya, menghapus `url` dari layout TIDAK membuat Next menurunkannya
 * dari `alternates.canonical` (diuji di Next 16.4.2: tag `og:url` hilang
 * sama sekali). Jadi `og:url` harus diisi eksplisit per halaman.
 *
 * `url` relatif (mis. "/news") aman: Next me-resolve-nya terhadap
 * `metadataBase` di layout root.
 *
 * Objek ini hanya memuat field yang SERING berbeda antar halaman; field
 * bersama (locale, siteName, images 1200×630, type) tetap diwarisi dari
 * layout — merge Next.js bersifat dangkal per-key, jadi `openGraph` di
 * halaman menimpa `openGraph` layout secara UTUH. Karena itu `images`
 * ditulis ulang di sini agar kartu pratinjau tidak kehilangan gambarnya.
 */
import type { Metadata } from "next";

/** Gambar OG bawaan situs (dipakai bila halaman tidak punya gambar sendiri). */
export const DEFAULT_OG_IMAGE = "/og-image.jpg";

export function pageOpenGraph({
  title,
  description,
  url,
  type = "website",
  images,
}: {
  title: string;
  description?: string;
  /** Path halaman, mis. "/news". Wajib — inilah nilai `og:url`. */
  url: string;
  type?: "website" | "article";
  /** Gambar khusus halaman; default gambar situs. */
  images?: { url: string; alt?: string; width?: number; height?: number }[];
}): NonNullable<Metadata["openGraph"]> {
  return {
    title,
    description,
    url,
    type,
    locale: "id_ID",
    images:
      images && images.length > 0
        ? images
        : [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  };
}
