import { ImageSquare, Star } from "@/components/Icons";
import { getGalleryPage } from "@/lib/queries";
import { CSSFadeIn } from "@/components/CSSAnimations";
import GalleryLightbox from "./GalleryLightbox";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Galeri foto dan video kegiatan SMP Muhammadiyah 4 Tanggul - Dokumentasi momen sekolah.",
  alternates: { canonical: "/gallery" },
};

export const revalidate = 3600;

const PER_PAGE = 20;

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page) || 0);
  const gallery = await getGalleryPage(page, PER_PAGE);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <ImageSquare className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <Star className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <CSSFadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Galeri</h1>
            <p className="mt-3 text-base text-white/70">Dokumentasi kegiatan SMP Muhammadiyah 4 Tanggul</p>
          </CSSFadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        {gallery.length === 0 && page === 0 ? (
          <CSSFadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
              <ImageSquare className="h-14 w-14 text-[#082b59]/20" />
              <p className="mt-5 text-base text-slate-500">Galeri masih kosong.</p>
              <p className="mt-1 text-sm text-slate-400">Nantikan dokumentasi dari sekolah kami.</p>
            </div>
          </CSSFadeIn>
        ) : (
          <CSSFadeIn>
            <GalleryLightbox items={gallery} page={page} perPage={PER_PAGE} />
          </CSSFadeIn>
        )}
      </section>
    </div>
  );
}
