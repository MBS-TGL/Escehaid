import type { Metadata } from "next";
import { getEkskulList } from "@/lib/queries";
import { CSSStagger } from "@/components/CSSAnimations";
import { Users } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
import EmptyState from "@/components/public/EmptyState";
import EkskulCard from "@/components/EkskulCard";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const ekskul = await getEkskulList();
  const description =
    "Ekstrakurikuler SMP Muhammadiyah 4 Tanggul — kegiatan penumbuhan minat dan bakat santri, dari tahfidz hingga olahraga dan seni.";
  return {
    title: "Ekstrakurikuler",
    description,
    alternates: { canonical: "/extracurricular" },
    // Kosong → noindex (pola halaman Prestasi) agar Google tidak mengindeks
    // daftar tanpa isi.
    robots: ekskul.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: pageOpenGraph({
      title: "Ekstrakurikuler",
      description,
      url: "/extracurricular",
      image: await ogImageOverride(),
    }),
  };
}

// Revalidasi on-demand dari panel admin (/admin/ekskul) — TTL disamakan
// dengan halaman Kegiatan (300 detik).
export const revalidate = 300;

export default async function EkskulPage() {
  const ekskul = await getEkskulList();

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
              { "@type": "ListItem", position: 2, name: "Ekstrakurikuler", item: "https://www.smpmuh4tanggul.sch.id/extracurricular" },
            ],
          }),
        }}
      />
      {ekskul.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Ekstrakurikuler SMP Muhammadiyah 4 Tanggul",
              itemListElement: ekskul.map((e, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: e.name,
                url: `https://www.smpmuh4tanggul.sch.id/extracurricular/${e.slug}`,
              })),
            }),
          }}
        />
      )}

      <PageHero
        variant="compact"
        eyebrow="Minat & Bakat"
        title="Ekstrakurikuler"
        description="Wadah penumbuhan minat, bakat, dan karakter santri di luar jam pelajaran — dari tahfidz dan keislaman hingga olahraga dan seni."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Ekstrakurikuler" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        {ekskul.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum ada ekstrakurikuler."
            description="Nantikan pilihan kegiatan ekstrakurikuler dari sekolah kami."
          />
        ) : (
          /* Kartu portrait 9:16 kanonik (sama dengan grid Profil) — klik
             mengarah ke halaman detail /extracurricular/[slug]. */
          <CSSStagger
            stagger={60}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5"
          >
            {ekskul.map((item) => (
              <EkskulCard key={item.id} item={item} />
            ))}
          </CSSStagger>
        )}
      </section>
    </div>
  );
}
