import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Clock, User, ArrowLeft, Newspaper, MagnifyingGlass, BookmarkSimple } from "@/components/Icons";
import { getNewsBySlug, getNewsList, getRelatedNews } from "@/lib/queries";
import { RichContent } from "@/components/RichContent";
import CoverImage from "@/components/CoverImage";
import AttachmentPanel from "./AttachmentPanel";
import VideoEmbed from "@/components/VideoEmbed";
import { resolveVideoUrl } from "@/lib/video-embed";
import ReadingProgress from "@/components/public/ReadingProgress";
import ShareButtons from "@/components/public/ShareButtons";
import SidebarCTA from "@/components/public/SidebarCTA";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import { newsCategory, NEWS_CATEGORIES } from "@/lib/site-config";

export const revalidate = 300;

/** Potongan konten (teks polos) untuk fallback deskripsi OG. */
function contentExcerpt(html: string | null | undefined): string {
  if (!html) return "";
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const berita = await getNewsBySlug(slug);
  if (!berita) return { title: "Berita Tidak Ditemukan" };
  const description = berita.summary || contentExcerpt(berita.content) || berita.title;
  const imageAlt = berita.image_alt || berita.title;
  return {
    title: berita.title,
    description,
    openGraph: {
      title: berita.title,
      description,
      type: "article",
      // Next 16: publishedTime FLAT di objek openGraph (→ article:published_time)
      publishedTime: berita.published_at || undefined,
      // Ukuran gambar TANPA hardcode — biar crawler baca dimensi asli
      images: berita.image_url ? [{ url: berita.image_url, alt: imageAlt }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: berita.title,
      description,
      images: berita.image_url ? [{ url: berita.image_url, alt: imageAlt }] : [],
    },
    alternates: { canonical: `/news/${berita.slug}` },
  };
}

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
  // Video eksternal (opsional) — resolve TikTok pendek di server
  const video = berita.video_url ? await resolveVideoUrl(berita.video_url) : null;
  const cat = newsCategory(berita.category);
  const readTime = EstimateReadingTime(berita.content);
  const publishDate = new Date(berita.published_at || berita.created_at);

  const shareUrl = `https://www.smpmuh4tanggul.sch.id/news/${berita.slug}`;

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
        url: "https://www.smpmuh4tanggul.sch.id/images/Logo-Sekolah.png",
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
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
      { "@type": "ListItem", position: 2, name: "Berita", item: "https://www.smpmuh4tanggul.sch.id/news" },
      { "@type": "ListItem", position: 3, name: berita.title, item: shareUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <ReadingProgress />
      {/* Sticky top bar */}
      <div className="sticky top-16 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md md:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-slate-400">
            <Link href="/" className="shrink-0 transition-colors hover:text-[var(--brand-accent)]">Beranda</Link>
            <span className="shrink-0">/</span>
            <Link href="/news" className="shrink-0 transition-colors hover:text-[var(--brand-accent)]">Berita</Link>
            <span className="shrink-0">/</span>
            <span className="min-w-0 truncate text-slate-600">{berita.title}</span>
          </nav>
          <ShareButtons url={shareUrl} title={berita.title} variant="icons" className="ml-2 shrink-0" />
        </div>
      </div>

      {/* Hero — judul & metadata saja, tanpa gambar */}
      <section className="bg-[var(--brand-primary)]">
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-3 md:pt-10 md:pb-4">
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
            {/* Cover Image — di atas summary, rata tengah (rasio mengikuti gambar) */}
            {berita.image_url && (
              <div className="mb-6 md:mb-8">
                <CoverImage
                  src={berita.image_url}
                  alt={berita.image_alt || berita.title}
                  priority
                />
              </div>
            )}

            {/* Summary */}
            {berita.summary && (
              <CSSFadeIn className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <BookmarkSimple className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                  <p className="text-sm font-medium leading-relaxed text-slate-600">{berita.summary}</p>
                </div>
              </CSSFadeIn>
            )}

            {/* Content — RichContent: kelas identik semua tampilan */}
            <RichContent content={berita.content} />

            {/* Lampiran file (PDF dsb.) — pratinjau tertanam */}
            {berita.attachment_url && (
              <AttachmentPanel url={berita.attachment_url} name={berita.attachment_name} />
            )}

            {/* Video eksternal (opsional) — embed click-to-load, setelah lampiran & sebelum Share */}
            {video && (
              <CSSFadeIn>
                <section className="mt-8" aria-labelledby="news-video-heading">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-1 w-8 bg-[var(--brand-accent)]" />
                    <h3 id="news-video-heading" className="text-lg font-bold text-[var(--brand-primary)]">Video</h3>
                  </div>
                  <VideoEmbed
                    url={video.parsed.canonicalUrl || berita.video_url || ""}
                    poster={berita.image_url || video.thumbnailUrl}
                    title={berita.title}
                  />
                </section>
              </CSSFadeIn>
            )}

            {/* Share + Back */}
            <CSSFadeIn className="mt-10 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-primary)]">
                <ArrowLeft className="h-4 w-4" /> Semua Berita
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bagikan</span>
                <ShareButtons url={shareUrl} title={berita.title} variant="solid" />
              </div>
            </CSSFadeIn>

            {/* Related */}
            {relatedNews.length > 0 && (
              <div className="mt-10">
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-1 w-8 bg-[var(--brand-accent)]" />
                  <h3 className="text-lg font-bold text-[var(--brand-primary)]">Berita Terkait</h3>
                </div>
                <CSSStagger stagger={60} className="grid gap-4 sm:grid-cols-2">
                  {relatedNews.map((item) => {
                    const rc = newsCategory(item.category);
                    return (
                      <Link key={item.id} href={`/news/${item.slug}`}
                        className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-md">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.image_alt || item.title} width={80} height={80} sizes="80px" className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <Newspaper className="h-6 w-6 text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className={`text-[10px] font-semibold uppercase ${rc.color}`}>{rc.label}</span>
                          <h4 className="mt-0.5 text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-[var(--brand-accent)]">{item.title}</h4>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </CSSStagger>
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
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
                  />
                </form>
              </div>

              {filteredRecent.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-1 w-6 bg-[var(--brand-accent)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Berita Terbaru</h3>
                  </div>
                  <div className="space-y-3.5">
                    {filteredRecent.map((item, i) => (
                      <Link key={item.id} href={`/news/${item.slug}`} className="group flex gap-3">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[var(--brand-primary)] text-[10px] font-bold text-white">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-slate-700 line-clamp-2 group-hover:text-[var(--brand-accent)] leading-snug">{item.title}</h4>
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
                  <div className="h-1 w-6 bg-[var(--brand-accent)]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Kategori</h3>
                </div>
                <div className="space-y-1.5">
                  {NEWS_CATEGORIES.map((cfg) => (
                    <Link key={cfg.key} href={`/news?category=${cfg.key}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50">
                      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${cfg.dot}`} />
                      <span className="font-medium">{cfg.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <SidebarCTA />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
