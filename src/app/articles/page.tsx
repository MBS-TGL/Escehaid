import Link from "next/link";
import { ArrowUpRight, BookOpen } from "@/components/icons";
import { getArticleList } from "@/lib/queries";

export default async function ArtikelPage() {
  const articles = await getArticleList();

  return (
    <div>
      <section className="bg-[#082b59] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="mb-4 text-3xl font-bold md:text-4xl">Artikel</h1>
          <p className="text-white/70">Tulisan dan pemikiran dari guru serta pegiat pendidikan</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
            <BookOpen className="h-14 w-14 text-[#082b59]/20" />
            <p className="mt-5 text-base text-slate-500">Artikel masih kosong.</p>
            <p className="mt-1 text-sm text-slate-400">Nantikan tulisan dan tips dari guru kami.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((item) => (
              <Link
                key={item.slug}
                href={`/articles/${item.slug}`}
                className="group rounded-xl border border-[#dce3ed] bg-white p-6 transition-all hover:border-[#1767b1]/20 hover:shadow-lg"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-[#082b59]/5 px-3 py-1 text-xs font-medium text-[#082b59]">
                    {item.category}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[#082b59] transition-colors group-hover:text-[#1767b1]">
                  {item.title} <ArrowUpRight className="inline h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.excerpt}</p>
                <p className="mt-3 text-xs font-medium text-slate-400">Oleh {item.author}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
