import Link from "next/link";
import { ArrowUpRight, Newspaper, Clock } from "@/components/icons";
import { getNewsList } from "@/lib/queries";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/animations";
import ImageWithLoader from "@/components/ImageWithLoader";

export default async function BeritaPage() {
  const berita = await getNewsList();

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <Newspaper className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <Clock className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <FadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Berita</h1>
            <p className="mt-3 text-base text-white/70">Informasi terkini dari SMP Muhammadiyah 4 Tanggul</p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        {berita.length === 0 ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
              <Newspaper className="h-14 w-14 text-[#082b59]/20" />
              <p className="mt-5 text-base text-slate-500">Berita masih kosong.</p>
              <p className="mt-1 text-sm text-slate-400">Nantikan informasi terbaru dari sekolah.</p>
            </div>
          </FadeIn>
        ) : (
          <>
            {/* Featured + Grid */}
            {berita.length >= 1 && (
              <FadeIn>
                <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                  {/* Featured Article */}
                  <Link
                    href={`/news/${berita[0].slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:shadow-xl hover:shadow-[#082b59]/8"
                  >
                    <div className="relative h-64 overflow-hidden lg:h-80">
                      {berita[0].image_url ? (
                        <ImageWithLoader
                          src={berita[0].image_url}
                          alt={berita[0].title}
                          className="h-full w-full"
                          imgClassName="transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#082b59] to-[#1767b1]">
                          <span className="text-6xl font-bold text-white/80">{berita[0].title[0]}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#082b59]/80 via-[#082b59]/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                        <span className="inline-block rounded-full bg-[#f4d21f] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#082b59]">
                          {berita[0].category}
                        </span>
                        <h2 className="mt-3 text-2xl font-bold text-white lg:text-3xl">{berita[0].title}</h2>
                        <div className="mt-3 flex items-center gap-2 text-white/60">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {new Date(berita[0].published_at || berita[0].created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Side Articles */}
                  {berita.length >= 2 && (
                    <StaggerChildren stagger={0.1} className="flex flex-col gap-4">
                      {berita.slice(1, 4).map((item) => (
                        <StaggerItem key={item.id}>
                          <Link
                            href={`/news/${item.slug}`}
                            className="group flex gap-4 overflow-hidden rounded-2xl border border-[#dce3ed] bg-white p-3 transition-all hover:border-[#1767b1]/30 hover:shadow-lg hover:shadow-[#082b59]/5"
                          >
                            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f4f7fb]">
                              {item.image_url ? (
                                <ImageWithLoader
                                  src={item.image_url}
                                  alt={item.title}
                                  className="h-full w-full"
                                  imgClassName="transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#082b59] to-[#1767b1]">
                                  <span className="text-xl font-bold text-white/80">{item.title[0]}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-1 flex-col justify-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1767b1]">{item.category}</span>
                              <h3 className="mt-1 text-sm font-semibold text-[#082b59] transition-colors group-hover:text-[#1767b1] line-clamp-2">{item.title}</h3>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                          </Link>
                        </StaggerItem>
                      ))}
                    </StaggerChildren>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Remaining Grid */}
            {berita.length >= 5 && (
              <FadeIn delay={0.2}>
                <div className="mt-8 border-t border-[#dce3ed] pt-8">
                  <h3 className="mb-6 text-lg font-semibold text-[#082b59]">Berita Lainnya</h3>
                  <StaggerChildren stagger={0.08} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {berita.slice(4).map((item) => (
                      <StaggerItem key={item.id}>
                        <Link
                          href={`/news/${item.slug}`}
                          className="group block overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[#1767b1]/30 hover:shadow-lg"
                        >
                          <div className="relative h-36 overflow-hidden bg-[#f4f7fb]">
                            {item.image_url ? (
                              <ImageWithLoader
                                src={item.image_url}
                                alt={item.title}
                                className="h-full w-full"
                                imgClassName="transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#082b59] to-[#1767b1]">
                                <span className="text-2xl font-bold text-white/80">{item.title[0]}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1767b1]">{item.category}</span>
                            <h4 className="mt-1 text-sm font-semibold text-[#082b59] transition-colors group-hover:text-[#1767b1] line-clamp-2">{item.title}</h4>
                          </div>
                        </Link>
                      </StaggerItem>
                    ))}
                  </StaggerChildren>
                </div>
              </FadeIn>
            )}
          </>
        )}
      </section>
    </div>
  );
}
