import { ImageSquare } from "@/components/Icons";
import { getGalleryPageFiltered, getGalleryCategories } from "@/lib/queries";
import { CSSFadeIn } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import EmptyState from "@/components/public/EmptyState";
import CategoryChips, { type CategoryChip } from "@/components/public/CategoryChips";
import { pageOpenGraph } from "@/lib/seo";
import GalleryLightbox from "./GalleryLightbox";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Galeri foto dan video kegiatan SMP Muhammadiyah 4 Tanggul - Dokumentasi momen sekolah.",
  alternates: { canonical: "/gallery" },
  openGraph: pageOpenGraph({
    title: "Galeri",
    description: "Galeri foto dan video kegiatan SMP Muhammadiyah 4 Tanggul - Dokumentasi momen sekolah.",
    url: "/gallery",
  }),
};

export const revalidate = 3600;

const PER_PAGE = 20;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page) || 0);
  const cat = sp.cat?.trim() || undefined;

  const [gallery, categories] = await Promise.all([
    getGalleryPageFiltered(page, PER_PAGE, cat),
    getGalleryCategories(),
  ]);

  const chips: CategoryChip[] = [
    { key: "all", label: "Semua", href: "/gallery", active: !cat },
    ...categories.map((c) => ({
      key: c,
      label: c,
      href: `/gallery?cat=${encodeURIComponent(c)}`,
      active: cat === c,
    })),
  ];

  const empty = gallery.length === 0;

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "Galeri", item: "https://www.smpmuh4tanggul.sch.id/gallery" },
          ],
        })
      }} />
      <PageHero
        variant="compact"
        title="Galeri"
        description="Dokumentasi kegiatan SMP Muhammadiyah 4 Tanggul. Klik foto untuk memperbesar."
        icon={ImageSquare}
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Galeri" }]}
      />

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        {categories.length > 1 && (
          <CSSFadeIn className="mb-8">
            <CategoryChips chips={chips} />
          </CSSFadeIn>
        )}

        {empty ? (
          <EmptyState
            icon={ImageSquare}
            title={cat ? `Belum ada dokumentasi kategori «${cat}».` : "Galeri masih kosong."}
            description={cat ? "Coba pilih kategori lain, atau lihat semua dokumentasi." : "Nantikan dokumentasi dari sekolah kami."}
          />
        ) : (
          <GalleryLightbox items={gallery} page={page} perPage={PER_PAGE} cat={cat} />
        )}
      </section>
    </div>
  );
}
