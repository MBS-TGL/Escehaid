import { Newspaper, Clock, Paperclip, Play } from "@/components/Icons";
import { getNewsListPaginated } from "@/lib/queries";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import FilterBar from "@/components/public/FilterBar";
import ContentCard from "@/components/public/ContentCard";
import FeaturedCard from "@/components/public/FeaturedCard";
import EmptyState from "@/components/public/EmptyState";
import Pagination from "@/components/public/Pagination";
import { newsCategory, NEWS_CATEGORIES } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Berita",
  description: "Berita terbaru dari SMP Muhammadiyah 4 Tanggul - Informasi kegiatan, pengumuman, dan agenda sekolah.",
  alternates: { canonical: "/news" },
};

export const revalidate = 300;

const PAGE_SIZE = 9;

export default async function BeritaPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string; category?: string }> }) {
  const { search, page: pageParam, category: categoryParam } = await searchParams;
  // ?page=abc / negatif → halaman 1 (parseInt NaN pernah membuat rendering rusak).
  const parsedPage = parseInt(pageParam || "1", 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 500) : 1;
  const q = (search || "").trim().slice(0, 100);
  const category = ["berita", "pengumuman", "agenda"].includes(categoryParam || "") ? (categoryParam as string) : "";
  const { items: berita, total, totalPages } = await getNewsListPaginated(
    currentPage,
    PAGE_SIZE,
    q || undefined,
    category || undefined
  );

  /** Badge kategori kartu unggulan (kategori tak dikenal → gaya netral). */
  const featuredCat = newsCategory(berita[0]?.category);

  /** Link /news dengan search + kategori + halaman yang sedang aktif. */
  const buildHref = (page: number, cat: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("search", q);
    if (cat) sp.set("category", cat);
    if (page > 1) sp.set("page", String(page));
    const s = sp.toString();
    return `/news${s ? `?${s}` : ""}`;
  };

  const categoryChips: { key: string; label: string }[] = [
    { key: "", label: "Semua" },
    ...NEWS_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {currentPage > 1 && <link rel="prev" href={buildHref(currentPage - 1, category)} />}
      {currentPage < totalPages && <link rel="next" href={buildHref(currentPage + 1, category)} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "Berita", item: "https://www.smpmuh4tanggul.sch.id/news" },
          ],
        })
      }} />
      {/* Hero */}
      <PageHero
        variant="compact"
        eyebrow="Kabar Terbaru"
        title="Berita"
        description="Informasi terkini dari SMP Muhammadiyah 4 Tanggul. Kegiatan, pengumuman, dan agenda sekolah."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Berita" }]}
      >
        {/* Pencarian + filter kategori (GET tanpa JS; ?search sudah didukung metadata SearchAction) */}
        <FilterBar
          action="/news"
          searchId="news-search"
          searchValue={q}
          searchPlaceholder="Cari berita..."
          hiddenFields={category ? { category } : {}}
          chips={categoryChips.map((c) => ({ key: c.key, label: c.label, href: buildHref(1, c.key), active: category === c.key }))}
        />
        {q && <p className="mt-3 text-sm font-medium text-slate-500">Hasil pencarian: &quot;{q}&quot;</p>}
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6" style={{ contentVisibility: "auto" } as React.CSSProperties}>

        {berita.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={q || category ? "Tidak ada berita yang cocok." : "Berita masih kosong."}
            description={
              q
                ? `Hasil pencarian "${q}" tidak ditemukan.`
                : category
                  ? "Belum ada berita pada kategori ini."
                  : currentPage > 1
                    ? "Halaman tidak ditemukan. Coba buka halaman pertama."
                    : "Nantikan informasi terbaru dari sekolah."
            }
            action={q || category || currentPage > 1 ? { href: "/news", label: "Lihat semua berita" } : undefined}
          />
        ) : (
          <>
            {/* Featured — full width (only on page 1) */}
            {currentPage === 1 && berita.length >= 1 && (
              <CSSFadeIn>
                <FeaturedCard
                  href={`/news/${berita[0].slug}`}
                  title={berita[0].title}
                  description={berita[0].summary}
                  imageUrl={berita[0].image_url}
                  imageAlt={berita[0].image_alt || berita[0].title}
                  badges={
                    <span className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${featuredCat.bg} ${featuredCat.color} ${featuredCat.border}`}>
                      {featuredCat.label}
                    </span>
                  }
                  meta={
                    <>
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {new Date(berita[0].published_at || berita[0].created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </span>
                      {berita[0].attachment_url && (
                        <span className="flex items-center gap-1 text-xs">
                          <Paperclip className="h-3 w-3" /> Lampiran
                        </span>
                      )}
                      {berita[0].video_url && (
                        <span className="flex items-center gap-1 text-xs font-medium text-[var(--brand-accent)]">
                          <Play weight="fill" className="h-3 w-3" /> Video
                        </span>
                      )}
                    </>
                  }
                />
              </CSSFadeIn>
            )}

            {/* Grid — 3 columns */}
            <div className={currentPage === 1 ? "mt-8" : ""}>
              <CSSStagger stagger={60} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(currentPage === 1 ? berita.slice(1) : berita).map((item) => {
                  const cat = newsCategory(item.category);
                  return (
                    <div key={item.id}>
                      <ContentCard
                        href={`/news/${item.slug}`}
                        title={item.title}
                        description={item.summary}
                        imageUrl={item.image_url}
                        imageAlt={item.image_alt || item.title}
                        badges={
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cat.bg} ${cat.color} ${cat.border}`}>
                            {cat.label}
                          </span>
                        }
                        meta={
                          <>
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="h-3 w-3" />
                              {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            {item.attachment_url && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Paperclip className="h-3 w-3" /> Lampiran
                              </span>
                            )}
                            {item.video_url && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--brand-accent)]">
                                <Play weight="fill" className="h-3 w-3" /> Video
                              </span>
                            )}
                          </>
                        }
                      />
                    </div>
                  );
                })}
              </CSSStagger>
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={total}
              unit="berita"
              makeHref={(p) => buildHref(p, category)}
            />
          </>
        )}
      </section>
    </div>
  );
}
