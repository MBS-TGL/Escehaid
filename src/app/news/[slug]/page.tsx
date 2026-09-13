import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Clock, User, ArrowLeft, Newspaper, MagnifyingGlass, BookmarkSimple, ShareNetwork, WhatsappLogo, FacebookLogo, TwitterLogo } from "@/components/Icons";
import { getNewsBySlug, getNewsList, getRelatedNews } from "@/lib/queries";
import { sanitize } from "@/lib/sanitize";
import ImageZoom from "./ImageZoom";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const berita = await getNewsBySlug(slug);
  if (!berita) return { title: "Berita Tidak Ditemukan" };
  const description = berita.summary || berita.title;
  return {
    title: berita.title,
    description,
    openGraph: {
      title: berita.title,
      description,
      type: "article",
      images: berita.image_url ? [{ url: berita.image_url, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: berita.title,
      description,
      images: berita.image_url ? [berita.image_url] : [],
    },
    alternates: { canonical: `/news/${berita.slug}` },
  };
}

const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  berita: { label: "Berita", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  pengumuman: { label: "Pengumuman", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  agenda: { label: "Agenda", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
};

const positionMap: Record<string, string> = {
  top: "center 20%",
  center: "center center",
  bottom: "center 80%",
};

function EstimateReadingTime(content: string | null): number {
  if (!content) return 1;
  const text = content.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default async function BeritaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const berita = await getNewsBySlug(slug);

  if (!berita) {
    notFound();
  }

  const [recentNews, relatedNews] = await Promise.all([
    getNewsList(5),
    getRelatedNews(berita.category, berita.id, 4),
  ]);

  const filteredRecent = recentNews.filter((n) => n.id !== berita.id).slice(0, 5);
  const cat = categoryConfig[berita.category] || { label: berita.category, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" };
  const readTime = EstimateReadingTime(berita.content);
  const publishDate = new Date(berita.published_at || berita.created_at);
  const objectPosition = positionMap[berita.cover_image_position || "center"] || positionMap.center;

  const shareUrl = `https://smpmuh4tanggul.web.id/news/${berita.slug}`;
  const shareText = encodeURIComponent(berita.title);

  const newsJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: berita.title,
    description: berita.summary || berita.title,
    image: berita.image_url || undefined,
    datePublished: berita.published_at || berita.created_at,
    dateModified: berita.updated_at || berita.published_at || berita.created_at,
    author: {
      "@type": "Person",
      name: berita.writer_name || berita.author_name || "Admin MBS",
    },
    publisher: {
      "@type": "Organization",
      name: "SMP Muhammadiyah 4 Tanggul",
      logo: {
        "@type": "ImageObject",
        url: "https://smpmuh4tanggul.web.id/images/Logo-Sekolah.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": shareUrl,
    },
    articleSection: cat.label,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://smpmuh4tanggul.web.id" },
      { "@type": "ListItem", position: 2, name: "Berita", item: "https://smpmuh4tanggul.web.id/news" },
      { "@type": "ListItem", position: 3, name: berita.title, item: shareUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {/* Sticky top bar */}
      <div className="sticky top-16 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md md:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/" className="transition-colors hover:text-[#1767b1]">Beranda</Link>
            <span>/</span>
            <Link href="/news" className="transition-colors hover:text-[#1767b1]">Berita</Link>
            <span>/</span>
            <span className="max-w-[200px] truncate text-slate-600">{berita.title}</span>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600">
              <WhatsappLogo className="h-3.5 w-3.5" />
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
              <FacebookLogo className="h-3.5 w-3.5" />
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600">
              <TwitterLogo className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Hero — CNN/Kompas-style */}
      <section className="relative bg-[#082b59]">
        {berita.image_url ? (
          <div className="relative">
            {/* Image with gradient overlay */}
            <ImageZoom src={berita.image_url} alt={berita.title} objectPosition={objectPosition} />
            {/* Gradient fade to title area */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#082b59] to-transparent pointer-events-none" />
          </div>
        ) : null}
        <div className={`relative mx-auto max-w-7xl px-4 ${berita.image_url ? "-mt-12 pb-3 md:-mt-16 md:pb-4" : "pt-8 pb-3 md:pt-10 md:pb-4"}`}>
          <div className="max-w-4xl">
            {/* Category + Meta */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${cat.bg} ${cat.color} ${cat.border}`}>
                {cat.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/50">
                <Clock className="h-3 w-3" />
                {publishDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="text-xs text-white/30">·</span>
              <span className="text-xs text-white/50">{readTime} menit baca</span>
            </div>
            {/* Title */}
            <h1 className="mt-2 text-2xl font-black leading-snug text-white md:text-4xl md:leading-tight">
              {berita.title}
            </h1>
            {/* Author */}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
              {(berita.writer_name || berita.author_name) && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                    <User className="h-3.5 w-3.5 text-white/70" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white/90">{berita.writer_name || berita.author_name}</span>
                    <span className="text-[11px] text-white/40 ml-1.5">Penulis</span>
                  </div>
                </div>
              )}
              {berita.editor_name && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                    <User className="h-3.5 w-3.5 text-white/70" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white/90">{berita.editor_name}</span>
                    <span className="text-[11px] text-white/40 ml-1.5">Editor</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 md:pt-6 md:pb-10">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Article Body */}
          <article className="min-w-0 flex-1">
            {/* Summary */}
            {berita.summary && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <BookmarkSimple className="mt-0.5 h-4 w-4 shrink-0 text-[#f4d21f]" />
                  <p className="text-sm font-medium leading-relaxed text-slate-600">{berita.summary}</p>
                </div>
              </div>
            )}

            {/* Content */}
            {berita.content ? (
              <div
                className="prose prose-lg prose-slate max-w-none
                  prose-headings:text-[#082b59] prose-headings:font-extrabold prose-headings:scroll-mt-24
                  prose-p:text-gray-700 prose-p:leading-[1.9] prose-p:text-justify prose-p:mb-5
                  prose-a:text-[#1767b1] prose-a:no-underline prose-a:font-medium hover:prose-a:underline
                  prose-strong:text-[#082b59] prose-strong:font-bold
                  prose-em:text-slate-600
                  prose-img:rounded-2xl prose-img:shadow-md prose-img:my-8
                  prose-blockquote:border-l-4 prose-blockquote:border-[#f4d21f] prose-blockquote:bg-gradient-to-r prose-blockquote:from-amber-50 prose-blockquote:to-transparent prose-blockquote:py-4 prose-blockquote:pr-6 prose-blockquote:pl-6 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-slate-600
                  prose-li:text-gray-700 prose-li:leading-relaxed prose-li:mb-1
                  prose-ol:my-5 prose-ol:pl-6 prose-ul:my-5 prose-ul:pl-6
                  prose-code:text-[#1767b1] prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-[#082b59] prose-pre:text-white prose-pre:rounded-xl prose-pre:border prose-pre:border-slate-700
                  prose-hr:border-slate-200 prose-hr:my-12
                  prose-table:text-sm prose-table:border-collapse
                  prose-th:bg-slate-50 prose-th:text-left prose-th:font-semibold prose-th:px-4 prose-th:py-3 prose-th:border prose-th:border-slate-200
                  prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-slate-200"
                dangerouslySetInnerHTML={{ __html: sanitize(berita.content) }}
              />
            ) : (
              <p className="text-gray-500">Konten belum tersedia.</p>
            )}

            {/* Share + Back */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <Link href="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1767b1] hover:text-[#082b59]">
                <ArrowLeft className="h-4 w-4" /> Semua Berita
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bagikan</span>
                <div className="flex items-center gap-1.5">
                  <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white transition-colors hover:bg-emerald-600">
                    <WhatsappLogo className="h-3.5 w-3.5" />
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700">
                    <FacebookLogo className="h-3.5 w-3.5" />
                  </a>
                  <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white transition-colors hover:bg-sky-600">
                    <TwitterLogo className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Related */}
            {relatedNews.length > 0 && (
              <div className="mt-10">
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-1 w-8 bg-[#f4d21f]" />
                  <h3 className="text-lg font-bold text-[#082b59]">Berita Terkait</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedNews.map((item) => {
                    const rc = categoryConfig[item.category] || { label: item.category, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" };
                    return (
                      <Link key={item.id} href={`/news/${item.slug}`}
                        className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[#1767b1]/30 hover:shadow-md">
                        {item.image_url ? (
                          <Image src={item.image_url} alt="" width={80} height={80} className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <Newspaper className="h-6 w-6 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className={`text-[10px] font-semibold uppercase ${rc.color}`}>{rc.label}</span>
                          <h4 className="mt-0.5 text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-[#1767b1]">{item.title}</h4>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-80">
            <div className="sticky top-[128px] space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Cari Berita</h3>
                <form action="/news" method="get" className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="search"
                    placeholder="Ketik kata kunci..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
                  />
                </form>
              </div>

              {filteredRecent.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-1 w-6 bg-[#f4d21f]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Berita Terbaru</h3>
                  </div>
                  <div className="space-y-3.5">
                    {filteredRecent.map((item, i) => (
                      <Link key={item.id} href={`/news/${item.slug}`} className="group flex gap-3">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#082b59] text-[10px] font-bold text-white">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-slate-700 line-clamp-2 group-hover:text-[#1767b1] leading-snug">{item.title}</h4>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-1 w-6 bg-[#f4d21f]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Kategori</h3>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(categoryConfig).map(([key, cfg]) => (
                    <Link key={key} href={`/news?category=${key}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50">
                      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${key === "berita" ? "bg-blue-500" : key === "pengumuman" ? "bg-amber-500" : "bg-purple-500"}`} />
                      <span className="font-medium">{cfg.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#082b59]/10 bg-gradient-to-br from-[#082b59] to-[#0d4a8a] p-5 text-white">
                <h3 className="text-sm font-bold">SMP Muhammadiyah 4 Tanggul</h3>
                <p className="mt-1.5 text-xs text-white/60 leading-relaxed">Mari bergabung bersama kami untuk masa depan yang lebih cerah.</p>
                <Link href="/admission"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#f4d21f] px-4 py-2.5 text-xs font-bold text-[#082b59] transition-colors hover:bg-[#e6c51a]">
                  Daftar Sekarang
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
