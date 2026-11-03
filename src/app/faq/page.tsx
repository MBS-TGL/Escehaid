import type { Metadata } from "next";
import Link from "next/link";
import { getActiveFaqs } from "@/lib/queries";
import { Info } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
import EmptyState from "@/components/public/EmptyState";
import FaqList from "@/components/public/FaqList";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";

// Revalidasi on-demand dari panel admin (/admin/faq) — TTL disamakan dengan
// halaman Kegiatan (300 detik).
export const revalidate = 300;

const SITE_URL = "https://www.smpmuh4tanggul.sch.id";

export async function generateMetadata(): Promise<Metadata> {
  const [home, spmb] = await Promise.all([getActiveFaqs("home"), getActiveFaqs("spmb")]);
  const description =
    "Pertanyaan yang sering diajukan seputar SMP Muhammadiyah 4 Tanggul — informasi umum sekolah dan SPMB (penerimaan murid baru).";
  return {
    title: "Tanya Jawab (FAQ)",
    description,
    alternates: { canonical: "/faq" },
    robots: !home?.length && !spmb?.length ? { index: false, follow: true } : undefined,
    openGraph: pageOpenGraph({
      title: "Tanya Jawab (FAQ)",
      description,
      url: "/faq",
      image: await ogImageOverride(),
    }),
  };
}

export default async function FaqPage() {
  const [homeFaq, spmbFaq] = await Promise.all([getActiveFaqs("home"), getActiveFaqs("spmb")]);
  const hasAny = Boolean(homeFaq?.length || spmbFaq?.length);

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Tanya Jawab (FAQ)", item: `${SITE_URL}/faq` },
            ],
          }),
        }}
      />
      {hasAny && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                ...(homeFaq ?? []),
                ...(spmbFaq ?? []),
              ].map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      )}

      <PageHero
        variant="compact"
        eyebrow="Bantuan"
        title="Tanya Jawab (FAQ)"
        description="Kumpulan pertanyaan yang sering diajukan seputar sekolah dan SPMB."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Tanya Jawab (FAQ)" }]}
      />

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        {!hasAny ? (
          <EmptyState
            icon={Info}
            title="Belum ada tanya jawab."
            description="Daftar pertanyaan yang sering diajukan akan tampil di halaman ini."
            action={{ href: "/contact", label: "Hubungi kami" }}
          />
        ) : (
          <div className="space-y-12">
            {homeFaq && homeFaq.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-bold text-[var(--brand-primary)]">Pertanyaan Umum</h2>
                <FaqList items={homeFaq} />
              </div>
            )}

            {spmbFaq && spmbFaq.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-bold text-[var(--brand-primary)]">
                  SPMB &amp; Penerimaan Murid
                </h2>
                <FaqList items={spmbFaq} />
                <p className="mt-4 text-sm text-slate-500">
                  Tertarik mendaftar?{" "}
                  <Link
                    href="/admission"
                    className="font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]"
                  >
                    Lihat informasi SPMB
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
