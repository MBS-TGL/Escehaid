import { notFound } from "next/navigation";
import { getNewsBySlug } from "@/lib/queries";
import Link from "next/link";

export default async function BeritaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const berita = await getNewsBySlug(slug);

  if (!berita) {
    notFound();
  }

  return (
    <div>
      <section className="bg-[#082b59] text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/news" className="text-white/60 hover:text-white text-sm mb-4 inline-block">
            &larr; Kembali ke Berita
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium uppercase">
              {berita.category}
            </span>
            <span className="text-sm text-white/60">
              {new Date(berita.published_at || berita.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <h1 className="text-3xl font-bold">{berita.title}</h1>
          {berita.author && (
            <p className="text-white/60 mt-2">Oleh: {berita.author}</p>
          )}
        </div>
      </section>

      <article className="max-w-4xl mx-auto px-4 py-12">
        {berita.image_url && (
          <img
            src={berita.image_url}
            alt={berita.title}
            className="w-full h-64 md:h-96 object-cover rounded-xl mb-8"
          />
        )}

        {berita.summary && (
          <p className="text-lg text-gray-600 mb-6 font-medium">{berita.summary}</p>
        )}

        <div className="prose prose-lg max-w-none">
          {berita.content ? (
            <div dangerouslySetInnerHTML={{ __html: berita.content }} />
          ) : (
            <p className="text-gray-500">Konten belum tersedia.</p>
          )}
        </div>
      </article>
    </div>
  );
}
