import Link from "next/link";
import { getNewsList } from "@/lib/queries";

export default async function BeritaPage() {
  const berita = await getNewsList();

  return (
    <div>
      <section className="bg-[#082b59] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Berita & Pengumuman</h1>
          <p className="text-white/70">Informasi terkini dari SMP Muhammadiyah 4 Tanggul</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        {berita.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Belum ada berita yang diterbitkan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {berita.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.slug}`}
                className="bg-white rounded-xl shadow-sm border border-[#dce3ed] overflow-hidden hover:shadow-md transition-shadow group"
              >
                {item.image_url ? (
                  <div className="h-48 bg-gray-200">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-[#082b59] to-[#1767b1] flex items-center justify-center">
                    <span className="text-white text-4xl font-bold">{item.title[0]}</span>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-[#082b59]/10 text-[#082b59] px-2 py-1 rounded-full font-medium uppercase">
                      {item.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h2 className="font-semibold text-lg mb-2 line-clamp-2 text-[#082b59] group-hover:text-[#1767b1] transition-colors">{item.title}</h2>
                  <p className="text-sm text-gray-600 line-clamp-3">{item.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
