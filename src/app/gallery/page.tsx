import { ImageSquare, Star } from "@/components/icons";
import { getGalleryList } from "@/lib/queries";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/Animations";
import ImageWithLoader from "@/components/ImageWithLoader";

export default async function GalleryPage() {
  const gallery = await getGalleryList();

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <ImageSquare className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <Star className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <FadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Galeri</h1>
            <p className="mt-3 text-base text-white/70">Dokumentasi kegiatan SMP Muhammadiyah 4 Tanggul</p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        {gallery.length === 0 ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
              <ImageSquare className="h-14 w-14 text-[#082b59]/20" />
              <p className="mt-5 text-base text-slate-500">Galeri masih kosong.</p>
              <p className="mt-1 text-sm text-slate-400">Nantikan dokumentasi dari sekolah kami.</p>
            </div>
          </FadeIn>
        ) : (
          <StaggerChildren stagger={0.08} className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {gallery.map((item) => (
              <StaggerItem key={item.id}>
                <div className="group relative aspect-square overflow-hidden rounded-2xl border border-[#dce3ed] bg-[#f4f7fb]">
                  {item.media_type === "foto" ? (
                    <ImageWithLoader
                      src={item.thumbnail_url || item.url}
                      alt={item.title}
                      className="h-full w-full"
                      imgClassName="transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#082b59]">
                      <span className="text-4xl text-white/80">&#9654;</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#082b59]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.category && (
                      <p className="mt-1 text-xs text-white/70">{item.category}</p>
                    )}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </section>
    </div>
  );
}
