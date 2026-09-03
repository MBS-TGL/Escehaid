import Link from "next/link";
import { ArrowLeft, Clock, User, BookOpen } from "@/components/Icons";
import { getArticleBySlug } from "@/lib/queries";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Artikel Tidak Ditemukan" };
  return { title: article.title };
}

export default async function ArtikelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-[#082b59]">Artikel tidak ditemukan</h1>
        <p className="mt-4 text-slate-500">Artikel yang Anda cari tidak tersedia.</p>
        <Link href="/articles" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1767b1] hover:text-[#082b59]">
          Kembali ke artikel <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-12 md:py-16">
          <Link href="/articles" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Artikel
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f4d21f]/20 px-3 py-1 text-xs font-semibold text-[#f4d21f]">
              <BookOpen className="h-3 w-3" />
              {article.category}
            </span>
            {article.published_at && (
              <span className="flex items-center gap-1 text-sm text-white/50">
                <Clock className="h-3.5 w-3.5" />
                {new Date(article.published_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">{article.title}</h1>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <User className="h-4 w-4 text-white/70" />
            </div>
            <span className="text-sm text-white/60">Oleh {article.author_name || "Tim MBS"}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <article className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        {article.image_url && (
          <div className="mb-8 overflow-hidden rounded-2xl">
            <img
              src={article.image_url}
              alt={article.title}
              className="h-auto w-full object-cover"
            />
          </div>
        )}

        {article.excerpt && (
          <div className="mb-8 border-l-4 border-[#f4d21f] bg-amber-50/50 px-5 py-4">
            <p className="text-base font-medium text-slate-700 italic leading-relaxed">{article.excerpt}</p>
          </div>
        )}

        {article.content ? (
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
              prose-ol:my-5 prose-ol:pl-6
              prose-ul:my-5 prose-ul:pl-6
              prose-code:text-[#1767b1] prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-[#082b59] prose-pre:text-white prose-pre:rounded-xl prose-pre:border prose-pre:border-slate-700
              prose-hr:border-slate-200 prose-hr:my-12
              prose-table:text-sm prose-table:border-collapse
              prose-th:bg-slate-50 prose-th:text-left prose-th:font-semibold prose-th:px-4 prose-th:py-3 prose-th:border prose-th:border-slate-200
              prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-slate-200"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : (
          <p className="text-gray-500">Konten belum tersedia.</p>
        )}

        {/* Back link */}
        <div className="mt-12 border-t border-slate-200 pt-8">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1767b1] hover:text-[#082b59]"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Artikel
          </Link>
        </div>
      </article>
    </div>
  );
}
