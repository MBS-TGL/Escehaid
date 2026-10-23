import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Clock, User, ArrowLeft, BookOpen, MagnifyingGlass, BookmarkSimple } from "@/components/Icons";
import { getArticleBySlug, getArticleList, getRelatedArticles, getArticleCategories } from "@/lib/queries";
import { RichContent } from "@/components/RichContent";
import CoverImage from "@/components/CoverImage";
import VideoEmbed from "@/components/VideoEmbed";
import { resolveVideoUrl } from "@/lib/video-embed";
import ReadingProgress from "@/components/public/ReadingProgress";
import ShareButtons from "@/components/public/ShareButtons";
import SidebarCTA from "@/components/public/SidebarCTA";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";

export const revalidate = 300;

/** Potongan konten (teks polos) untuk fallback deskripsi OG. */
function contentExcerpt(html: string | null | undefined): string {
  if (!html) return "";
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  // 404 sejati (bukan panel 200) — status & not-found page yang benar untuk SEO.
  if (!article) notFound();
  const description = article.excerpt || contentExcerpt(article.content) || article.title;
  const imageAlt = article.image_alt || article.title;
  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article",
      publishedTime: article.published_at || undefined,
      images: article.image_url ? [{ url: article.image_url, alt: imageAlt }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.image_url ? [{ url: article.image_url, alt: imageAlt }] : [],
    },
    alternates: { canonical: `/articles/${article.slug}` },
  };
}

function estimateReadingTime(content: string | null): number {
  if (!content) return 1;
  const text = content.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default async function ArtikelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const [recentArticles, relatedArticles, categories] = await Promise.all([
    getArticleList(5),
    getRelatedArticles(article.category, article.id, 4),
    getArticleCategories(),
  ]);

  const filteredRecent = recentArticles.filter((a) => a.id !== article.id).slice(0, 5);
  // Video eksternal (opsional) — resolve TikTok pendek di server
  const video = article.video_url ? await resolveVideoUrl(article.video_url) : null;
  const readTime = estimateReadingTime(article.content);
  const publishDate = new Date(article.published_at || article.created_at);

  const articleUrl = `https://www.smpmuh4tanggul.sch.id/articles/${article.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt || article.title,
    image: article.image_url || undefined,
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at || article.published_at || article.created_at,
    author: {
      "@type": "Person",
      name: article.author_name || "Tim MBS",
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
      "@id": articleUrl,
    },
    articleSection: article.category,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
      { "@type": "ListItem", position: 2, name: "Artikel", item: "https://www.smpmuh4tanggul.sch.id/articles" },
      { "@type": "ListItem", position: 3, name: article.title, item: articleUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <ReadingProgress />
      {/* Sticky top bar */}
      <div className="sticky top-16 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md md:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-slate-400">
            <Link href="/" className="shrink-0 transition-colors hover:text-[var(--brand-accent)]">Beranda</Link>
            <span className="shrink-0">/</span>
            <Link href="/articles" className="shrink-0 transition-colors hover:text-[var(--brand-accent)]">Artikel</Link>
            <span className="shrink-0">/</span>
            <span className="min-w-0 truncate text-slate-600">{article.title}</span>
          </nav>
          <ShareButtons url={articleUrl} title={article.title} variant="icons" className="ml-2 shrink-0" />
        </div>
      </div>

      {/* Hero — judul & metadata saja, tanpa gambar */}
      <section className="bg-[var(--brand-primary)]">
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-3 md:pt-10 md:pb-4">
          <div className="max-w-4xl">
            {/* Category + Meta */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-accent)]">
                <BookOpen className="h-3 w-3" />
                {article.category}
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
              {article.title}
            </h1>
            {/* Author */}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                  <User className="h-3.5 w-3.5 text-white/70" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white/90">{article.author_name || "Tim MBS"}</span>
                  <span className="text-[11px] text-white/40 ml-1.5">Penulis</span>
                </div>
              </div>
              {article.editor_name && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                    <User className="h-3.5 w-3.5 text-white/70" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white/90">{article.editor_name}</span>
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
            {/* Cover Image — di atas excerpt, rata tengah (rasio mengikuti gambar) */}
            {article.image_url && (
              <div className="mb-6 md:mb-8">
                <CoverImage
                  src={article.image_url}
                  alt={article.image_alt || article.title}
                  priority
                />
              </div>
            )}

            {/* Excerpt */}
            {article.excerpt && (
              <CSSFadeIn className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <BookmarkSimple className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                  <p className="text-sm font-medium leading-relaxed text-slate-600">{article.excerpt}</p>
                </div>
              </CSSFadeIn>
            )}

            {/* Content — RichContent: kelas identik semua tampilan */}
            <RichContent content={article.content} />

            {/* Video eksternal (opsional) — embed click-to-load, setelah konten */}
            {video && (
              <CSSFadeIn>
                <section className="mt-8" aria-labelledby="art-video-heading">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-1 w-8 bg-[var(--brand-accent)]" />
                    <h3 id="art-video-heading" className="text-lg font-bold text-[var(--brand-primary)]">Video</h3>
                  </div>
                  <VideoEmbed
                    url={video.parsed.canonicalUrl || article.video_url || ""}
                    poster={article.image_url || video.thumbnailUrl}
                    title={article.title}
                  />
                </section>
              </CSSFadeIn>
            )}

            {/* Share + Back */}
            <CSSFadeIn className="mt-10 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/articles" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-primary)]">
                <ArrowLeft className="h-4 w-4" /> Semua Artikel
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bagikan</span>
                <ShareButtons url={articleUrl} title={article.title} variant="solid" />
              </div>
            </CSSFadeIn>

            {/* Related */}
            {relatedArticles.length > 0 && (
              <div className="mt-10">
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-1 w-8 bg-[var(--brand-accent)]" />
                  <h3 className="text-lg font-bold text-[var(--brand-primary)]">Artikel Terkait</h3>
                </div>
                <CSSStagger stagger={60} className="grid gap-4 sm:grid-cols-2">
                  {relatedArticles.map((item) => (
                    <Link key={item.id} href={`/articles/${item.slug}`}
                      className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-md">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.image_alt || item.title} width={80} height={80} sizes="80px" className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <BookOpen className="h-6 w-6 text-slate-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase text-[var(--brand-accent)]">{item.category}</span>
                        <h4 className="mt-0.5 text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-[var(--brand-accent)]">{item.title}</h4>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </CSSStagger>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-80">
            <div className="sticky top-[128px] space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Cari Artikel</h3>
                <form action="/articles" method="get" className="relative">
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
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Artikel Terbaru</h3>
                  </div>
                  <div className="space-y-3.5">
                    {filteredRecent.map((item, i) => (
                      <Link key={item.id} href={`/articles/${item.slug}`} className="group flex gap-3">
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

              {categories.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-1 w-6 bg-[var(--brand-accent)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Kategori</h3>
                  </div>
                  <div className="space-y-1.5">
                    {categories.slice(0, 6).map((cat) => (
                      <Link key={cat} href={`/articles?category=${encodeURIComponent(cat)}`}
                        aria-current={article.category === cat ? "page" : undefined}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--brand-accent)]" />
                        <span className="font-medium">{cat}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <SidebarCTA />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
