import type { Metadata } from "next";
import { getFacilityList } from "@/lib/queries";
import { SquaresFour } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
import EmptyState from "@/components/public/EmptyState";
import FacilityGrid from "@/app/profile/FacilityGrid";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const facilities = await getFacilityList();
  const description =
    "Fasilitas SMP Muhammadiyah 4 Tanggul — ruang kelas, laboratorium, masjid, asrama, dan sarana penunjang belajar santri di kampus putra dan putri.";
  return {
    title: "Fasilitas",
    description,
    alternates: { canonical: "/facilities" },
    robots: facilities.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: pageOpenGraph({
      title: "Fasilitas",
      description,
      url: "/facilities",
      image: await ogImageOverride(),
    }),
  };
}

// Revalidasi on-demand dari panel admin (/admin/facilities) — TTL disamakan
// dengan halaman Kegiatan (300 detik).
export const revalidate = 300;

export default async function FasilitasPage() {
  const facilities = await getFacilityList();

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
              { "@type": "ListItem", position: 2, name: "Fasilitas", item: "https://www.smpmuh4tanggul.sch.id/facilities" },
            ],
          }),
        }}
      />

      <PageHero
        variant="compact"
        eyebrow="Sarana & Prasarana"
        title="Fasilitas"
        description="Sarana belajar dan pembinaan santri di kampus putra dan putri — dirancang menunjang kegiatan akademik, tahfidz, dan pengembangan karakter."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Fasilitas" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        {facilities.length === 0 ? (
          <EmptyState
            icon={SquaresFour}
            title="Belum ada fasilitas."
            description="Daftar fasilitas sekolah akan tampil di halaman ini."
          />
        ) : (
          /* Grid bento sinematik kanonik — komponen yang sama dengan section
             fasilitas halaman Profil, kini menampilkan seluruh item. */
          <FacilityGrid facilities={facilities} />
        )}
      </section>
    </div>
  );
}
