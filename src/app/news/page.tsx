import Link from "next/link";
import Image from "next/image";
import { Newspaper, Clock, CaretLeft, CaretRight } from "@/components/Icons";
import { getNewsListPaginated } from "@/lib/queries";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Berita",
  description: "Berita terbaru dari SMP Muhammadiyah 4 Tanggul - Informasi kegiatan, pengumuman, dan agenda sekolah.",
  alternates: { canonical: "/news" },
};

export const revalidate = 3600;

const PAGE_SIZE = 9;

const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  berita: { label: "Berita", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  pengumuman: { label: "Pengumuman", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  agenda: { label: "Agenda", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
};

export default async function BeritaPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const { search, page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10));
  const { items: berita, total, totalPages } = await getNewsListPaginated(currentPage, PAGE_SIZE, search);

  return (
    <div className="min-h-screen bg-slate-50">
      {currentPage > 1 && <link rel="prev" href={`/news?page=${currentPage - 1}${search ? `&search=${search}` : ""}`} />}
      {currentPage < totalPages && <link rel="next" href={`/news?page=${currentPage + 1}${search ? `&search=${search}` : ""}`} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: "https://smpmuh4tanggul.web.id" },
          { "@type": "ListItem", position: 2, name: "Berita", item: "https://smpmuh4tanggul.web.id/news" },
        ],
      }) }} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <Newspaper className="absolute -left-10 -top-10 h-64 w-64 -rotate-12" weight="fill" />
          <Newspaper className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <CSSFadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Berita</h1>
            <p className="mt-3 text-base text-white/70">Informasi terkini dari SMP Muhammadiyah 4 Tanggul</p>
            {search && (
              <p className="mt-2 text-sm text-white/50">Hasil pencarian: &quot;{search}&quot;</p>
            )}
          </CSSFadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        {berita.length === 0 ? (
          <CSSFadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center">
              <Newspaper className="h-14 w-14 text-slate-300" />
              <p className="mt-5 text-base text-slate-500">Berita masih kosong.</p>
              <p className="mt-1 text-sm text-slate-400">Nantikan informasi terbaru dari sekolah.</p>
            </div>
          </CSSFadeIn>
        ) : (
          <>
            {/* Featured — full width (only on page 1) */}
            {currentPage === 1 && berita.length >= 1 && (
              <CSSFadeIn>
                <Link
                  href={`/news/${berita[0].slug}`}
                  className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg"
                >
                  <div className="relative h-[280px] overflow-hidden md:h-[400px]">
                    {berita[0].image_url ? (
                      <Image
                        src={berita[0].image_url}
                        alt={berita[0].title}
                        fill
                        sizes="(max-width: 768px) 100vw, 1280px"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#082b59] to-[#1767b1]">
                        <span className="text-7xl font-bold text-white/20">{berita[0].title[0]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${categoryConfig[berita[0].category]?.bg || "bg-slate-100"} ${categoryConfig[berita[0].category]?.color || "text-slate-600"} ${categoryConfig[berita[0].category]?.border || "border-slate-200"}`}>
                        {categoryConfig[berita[0].category]?.label || berita[0].category}
                      </span>
                      <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">{berita[0].title}</h2>
                      {berita[0].summary && (
                        <p className="mt-2 max-w-2xl text-sm text-white/70 line-clamp-2">{berita[0].summary}</p>
                      )}
                      <div className="mt-3 flex items-center gap-3 text-white/50">
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {new Date(berita[0].published_at || berita[0].created_at).toLocaleDateString("id-ID", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </CSSFadeIn>
            )}

            {/* Grid — 3 columns */}
            <div className={currentPage === 1 ? "mt-8" : ""}>
              <CSSStagger stagger={60} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(currentPage === 1 ? berita.slice(1) : berita).map((item) => {
                  const cat = categoryConfig[item.category] || { label: item.category, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" };
                  return (
                    <div key={item.id}>
                      <Link
                        href={`/news/${item.slug}`}
                        className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-[#1767b1]/30 hover:shadow-lg"
                      >
                        <div className="relative h-44 overflow-hidden bg-slate-100">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#082b59] to-[#1767b1]">
                              <span className="text-3xl font-bold text-white/20">{item.title[0]}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cat.bg} ${cat.color} ${cat.border}`}>
                              {cat.label}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock className="h-3 w-3" />
                              {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <h3 className="mt-2 text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-[#1767b1]">{item.title}</h3>
                          {item.summary && (
                            <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{item.summary}</p>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </CSSStagger>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <CSSFadeIn delay={150}>
                <div className="mt-10 flex flex-col items-center gap-3">
                  <p className="text-xs text-slate-400">
                    Halaman {currentPage} dari {totalPages} · {total} berita
                  </p>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/news?page=${Math.max(1, currentPage - 1)}${search ? `&search=${search}` : ""}`}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${currentPage === 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <CaretLeft className="h-4 w-4" />
                    </Link>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .reduce<(number | "...")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`dots-${i}`} className="flex h-9 w-9 items-center justify-center text-xs text-slate-400">…</span>
                        ) : (
                          <Link
                            key={p}
                            href={`/news?page=${p}${search ? `&search=${search}` : ""}`}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === currentPage ? "bg-[#082b59] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                          >
                            {p}
                          </Link>
                        )
                      )}
                    <Link
                      href={`/news?page=${Math.min(totalPages, currentPage + 1)}${search ? `&search=${search}` : ""}`}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${currentPage === totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <CaretRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </CSSFadeIn>
            )}
          </>
        )}
      </section>
    </div>
  );
}
