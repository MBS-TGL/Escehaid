import Link from "next/link";
import Image from "next/image";
import { BookOpen, Clock, Play, User } from "@/components/Icons";
import { getArticleListPaginated, getArticleCategories } from "@/lib/queries";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import FilterBar, { type FilterChip } from "@/components/public/FilterBar";
import FeaturedCard from "@/components/public/FeaturedCard";
import EmptyState from "@/components/public/EmptyState";
import Pagination from "@/components/public/Pagination";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artikel",
  description:
    "Artikel dan tips pendidikan dari guru SMP Muhammadiyah 4 Tanggul - Trik belajar, parenting, dan Islam terapan.",
  alternates: { canonical: "/articles" },
};

export const revalidate = 300;

const PAGE_SIZE = 8;

export default async function ArtikelPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; category?: string }>;
}) {
  const { search, page: pageParam, category: categoryParam } = await searchParams;
  // ?page=abc / negatif → halaman 1 (parseInt NaN membuat rendering rusak).
  const parsedPage = parseInt(pageParam || "1", 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 500) : 1;
  const q = (search || "").trim().slice(0, 100);
  const category = (categoryParam || "").trim().slice(0, 80);

  const [{ items: articles, total, totalPages }, categories] = await Promise.all([
    getArticleListPaginated(currentPage, PAGE_SIZE, q || undefined, category || undefined),
    getArticleCategories(),
  ]);

  /** Link /articles dengan search + kategori + halaman aktif. */
  const buildHref = (page: number, cat: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("search", q);
    if (cat) sp.set("category", cat);
    if (page > 1) sp.set("page", String(page));
    const s = sp.toString();
    return `/articles${s ? `?${s}` : ""}`;
  };

  const chips: FilterChip[] = [
    { key: "", label: "Semua", href: buildHref(1, ""), active: !category },
    ...categories.slice(0, 6).map((c) => ({
      key: c,
      label: c,
      href: buildHref(1, c),
      active: category === c,
    })),
  ];

  return (
    <div className="min-h-screen bg-white">
      {currentPage > 1 && <link rel="prev" href={buildHref(currentPage - 1, category)} />}
      {currentPage < totalPages && <link rel="next" href={buildHref(currentPage + 1, category)} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
              { "@type": "ListItem", position: 2, name: "Artikel", item: "https://www.smpmuh4tanggul.sch.id/articles" },
            ],
          }),
        }}
      />

      {/* Hero — editorial split, khas dari /news */}
      <PageHero
        variant="split"
        eyebrow="Guru Menulis"
        title="Artikel"
        description="Tulisan dan pemikiran dari guru serta pegiat pendidikan: trik belajar, parenting, dan Islam terapan."
        image="/images/Lab-Komputer.jpeg"
        imageAlt="Laboratorium komputer SMP Muhammadiyah 4 Tanggul"
        icon={BookOpen}
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Artikel" }]}
      >
        {q && <p className="text-sm font-medium text-slate-500">Hasil pencarian: &quot;{q}&quot;</p>}
      </PageHero>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <FilterBar
          action="/articles"
          searchId="article-search"
          searchValue={q}
          searchPlaceholder="Cari artikel..."
          hiddenFields={category ? { category } : {}}
          chips={chips}
        />

        {articles.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={q || category ? "Tidak ada artikel yang cocok." : "Artikel masih kosong."}
            description={
              q
                ? `Hasil pencarian "${q}" tidak ditemukan.`
                : category
                  ? "Belum ada artikel pada kategori ini."
                  : currentPage > 1
                    ? "Halaman tidak ditemukan. Coba buka halaman pertama."
                    : "Nantikan tulisan dan tips dari guru kami."
            }
            action={q || category || currentPage > 1 ? { href: "/articles", label: "Lihat semua artikel" } : undefined}
          />
        ) : (
          <>
            {/* Headline — pembuka majurna, halaman 1 saja */}
            {currentPage === 1 && (
              <CSSFadeIn>
                <FeaturedCard
                  href={`/articles/${articles[0].slug}`}
                  title={articles[0].title}
                  description={articles[0].excerpt}
                  imageUrl={articles[0].image_url}
                  imageAlt={articles[0].image_alt || articles[0].title}
                  badges={
                    <span className="inline-flex w-fit items-center rounded-md border border-[var(--brand-accent)]/20 bg-[var(--brand-accent)]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-accent)]">
                      {articles[0].category}
                    </span>
                  }
                  meta={
                    <>
                      <span className="flex items-center gap-1 text-xs">
                        <User className="h-3 w-3" />
                        {articles[0].author_name ?? "Tim MBS"}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {new Date(articles[0].published_at || articles[0].created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </span>
                    </>
                  }
                  ctaLabel="Baca artikel"
                />
              </CSSFadeIn>
            )}

            {/* Baris editorial — identitas artikel: foto kecil kiri + teks kanan,
                silang dengan garis pemisah (bukan grid kotak identik) */}
            <CSSStagger stagger={70} className="mt-10 divide-y divide-[#dce3ed] border-y border-[#dce3ed]">
              {(currentPage === 1 ? articles.slice(1) : articles).map((item) => (
                <Link
                  key={item.id}
                  href={`/articles/${item.slug}`}
                  className="group flex gap-4 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] sm:gap-6"
                >
                  <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-44 md:w-52">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.image_alt || item.title}
                        fill
                        sizes="(max-width: 640px) 112px, (max-width: 768px) 176px, 208px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)]">
                        <span className="text-2xl font-bold text-white/25">{item.title[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-[var(--brand-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-accent)]">
                        {item.category}
                      </span>
                      {item.video_url && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                          <Play weight="fill" className="h-3 w-3 text-[var(--brand-accent)]" /> Video
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1.5 text-base font-bold leading-snug text-[var(--brand-primary)] line-clamp-2 transition-colors group-hover:text-[var(--brand-accent)] sm:text-lg">
                      {item.title}
                    </h2>
                    {item.excerpt && <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2">{item.excerpt}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.author_name ?? "Tim MBS"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </CSSStagger>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={total}
              unit="artikel"
              makeHref={(p) => buildHref(p, category)}
            />
          </>
        )}
      </section>
    </div>
  );
}
