import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { getArticleBySlug } from "@/lib/queries";

export default async function ArtikelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-[#082b59]">Artikel tidak ditemukan</h1>
        <p className="mt-4 text-slate-500">Artikel yang Anda cari tidak tersedia.</p>
        <Link href="/articles" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1767b1] hover:text-[#082b59]">
          Kembali ke artikel <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-[#082b59] py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <span className="mb-4 inline-block rounded-full bg-[#f4d21f]/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#f4d21f]">
            {article.category}
          </span>
          <h1 className="mb-4 text-3xl font-bold md:text-4xl">{article.title}</h1>
          <p className="text-white/70">Oleh {article.author}</p>
          {article.published_at && (
            <p className="mt-1 text-sm text-white/50">
              {new Date(article.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        {article.excerpt && (
          <p className="mb-8 text-lg leading-relaxed text-slate-600 italic border-l-4 border-[#f4d21f] pl-4">
            {article.excerpt}
          </p>
        )}
        <div className="prose prose-slate max-w-none text-[17px] leading-relaxed text-slate-700">
          {article.content.split("\n").map((paragraph, i) => (
            <p key={i} className="mb-4">{paragraph}</p>
          ))}
        </div>
        <div className="mt-12 border-t border-[#dce3ed] pt-8">
          <Link href="/articles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1767b1] hover:text-[#082b59]">
            <ArrowUpRight className="h-4 w-4 rotate-[-90deg]" /> Kembali ke daftar artikel
          </Link>
        </div>
      </section>
    </div>
  );
}
