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
 * PENTING: merge Next.js bersifat dangkal per-key — `openGraph` di halaman
 * menimpa `openGraph` layout secara UTUH (bukan per-field). Karena itu
 * `images` WAJIB selalu diisi di sini; kalau tidak, kartu pratinjau kehilangan
 * gambarnya (bug yang pernah terjadi di halaman detail tanpa foto).
 */
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";

/** Gambar OG statis bawaan situs (ada di public/). */
export const DEFAULT_OG_IMAGE = "/og-image.jpg";

/** Dimensi kartu OG standar (rasio 1.91:1). */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * Gambar OG kustom dari Pengaturan Situs (`seo_og_image`), atau `undefined`
 * bila admin belum menggantinya. `undefined` = pakai kartu dinamis `/api/og`
 * (judul halaman digambar otomatis), yang lebih informatif daripada gambar
 * statis generik. Gagal membaca setting → `undefined` (jangan pernah
 * menggagalkan render metadata karena ini).
 */
export async function ogImageOverride(): Promise<string | undefined> {
  try {
    const settings = await getSiteSettings();
    const value = settings.values.seo_og_image.trim();
    if (!value || value === DEFAULT_OG_IMAGE) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

/**
 * URL kartu OG dinamis (digambar server via `next/og`, lihat /api/og).
 * Dipakai sebagai default ketika halaman tidak punya foto sampul sendiri.
 */
export function dynamicOgImageUrl({ title, kind }: { title: string; kind?: string }): string {
  const params = new URLSearchParams({ title });
  if (kind) params.set("kind", kind);
  return `/api/og?${params.toString()}`;
}

export type OgImage = { url: string; alt?: string; width?: number; height?: number };

/** Susun satu entri gambar OG dari URL + judul (dipakai sebagai alt). */
export function ogImageEntry(url: string, alt: string): OgImage {
  return { url, alt, width: OG_SIZE.width, height: OG_SIZE.height };
}

export function pageOpenGraph({
  title,
  description,
  url,
  type = "website",
  image,
  imageAlt,
  kind,
}: {
  title: string;
  description?: string;
  /** Path halaman, mis. "/news". Wajib — inilah nilai `og:url`. */
  url: string;
  type?: "website" | "article";
  /** Foto sampul / gambar kustom admin. Absen → kartu OG dinamis. */
  image?: string;
  /** Alt gambar; default judul halaman. */
  imageAlt?: string;
  /** Label jenis pada kartu OG dinamis (mis. "Berita"). */
  kind?: string;
}): NonNullable<Metadata["openGraph"]> {
  const images: OgImage[] = image
    ? [ogImageEntry(image, imageAlt ?? title)]
    : [ogImageEntry(dynamicOgImageUrl({ title, kind }), imageAlt ?? title)];

  return {
    title,
    description,
    url,
    type,
    locale: "id_ID",
    images,
  };
}
