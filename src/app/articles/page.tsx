import Link from "next/link";
import { ArrowUpRight, BookOpen, FileText } from "@/components/Icons";
import { getArticleList } from "@/lib/queries";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artikel",
  description: "Artikel dan tips pendidikan dari guru SMP Muhammadiyah 4 Tanggul - Trik belajar, parenting, dan Islam terapan.",
  alternates: { canonical: "/articles" },
};

export const revalidate = 3600;

export default async function ArtikelPage() {
  const articles = await getArticleList();

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: "https://smpmuh4tanggul.web.id" },
          { "@type": "ListItem", position: 2, name: "Artikel", item: "https://smpmuh4tanggul.web.id/articles" },
        ],
      }) }} />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <BookOpen className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <FileText className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <CSSFadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Artikel</h1>
            <p className="mt-3 text-base text-white/70">Tulisan dan pemikiran dari guru serta pegiat pendidikan</p>
          </CSSFadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        {articles.length === 0 ? (
          <CSSFadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
              <BookOpen className="h-14 w-14 text-[#082b59]/20" />
              <p className="mt-5 text-base text-slate-500">Artikel masih kosong.</p>
              <p className="mt-1 text-sm text-slate-400">Nantikan tulisan dan tips dari guru kami.</p>
            </div>
          </CSSFadeIn>
        ) : (
          <CSSStagger stagger={120} className="space-y-5">
            {articles.map((item, i) => (
              <div key={item.slug}>
                <Link
                  href={`/articles/${item.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[#1767b1]/30 hover:shadow-lg hover:shadow-[#082b59]/5 sm:flex-row"
                >
                  {/* Number Badge */}
                  <div className="flex shrink-0 items-center justify-center bg-gradient-to-br from-[#082b59] to-[#1767b1] px-6 sm:px-8">
                    <span className="text-3xl font-bold text-white/80">{String(i + 1).padStart(2, "0")}</span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#1767b1]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1767b1]">
                        {item.category}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[#082b59] transition-colors group-hover:text-[#1767b1]">
                      {item.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500 line-clamp-2">{item.excerpt}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">oleh {item.author_name ?? "Tim MBS"}</span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-[#1767b1] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </CSSStagger>
        )}
      </section>
    </div>
  );
}
