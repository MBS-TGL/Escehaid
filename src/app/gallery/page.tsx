import { getGalleryList } from "@/lib/queries";

export default async function GalleryPage() {
  const gallery = await getGalleryList();

  return (
    <div>
      <section className="bg-[#082b59] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Gallery</h1>
          <p className="text-white/70">Dokumentasi kegiatan SMP Muhammadiyah 4 Tanggul</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        {gallery.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Belum ada foto/video di gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="aspect-square bg-gray-200 rounded-xl overflow-hidden hover:opacity-90 transition-opacity cursor-pointer group relative"
              >
                {item.media_type === "foto" ? (
                  <img
                    src={item.thumbnail_url || item.url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <span className="text-white text-4xl">&#9654;</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="text-white">
                    <div className="font-medium text-sm">{item.title}</div>
                    {item.category && (
                      <div className="text-xs text-gray-300">{item.category}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
