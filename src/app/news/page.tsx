import Link from "next/link";
import Image from "next/image";
import { Newspaper, Clock, CaretLeft, CaretRight, Paperclip, MagnifyingGlass } from "@/components/Icons";
import { getNewsListPaginated } from "@/lib/queries";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Berita",
  description: "Berita terbaru dari SMP Muhammadiyah 4 Tanggul - Informasi kegiatan, pengumuman, dan agenda sekolah.",
  alternates: { canonical: "/news" },
};

export const revalidate = 300;

const PAGE_SIZE = 9;

const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  berita: { label: "Berita", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  pengumuman: { label: "Pengumuman", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  agenda: { label: "Agenda", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
};

export default async function BeritaPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string; category?: string }> }) {
  const { search, page: pageParam, category: categoryParam } = await searchParams;
  // ?page=abc / negatif → halaman 1 (parseInt NaN pernah membuat rendering rusak).
  const parsedPage = parseInt(pageParam || "1", 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 500) : 1;
  const q = (search || "").trim().slice(0, 100);
  const category = ["berita", "pengumuman", "agenda"].includes(categoryParam || "") ? (categoryParam as string) : "";
  const { items: berita, total, totalPages } = await getNewsListPaginated(
    currentPage,
    PAGE_SIZE,
    q || undefined,
    category || undefined
  );

  /** Link /news dengan search + kategori + halaman yang sedang aktif. */
  const buildHref = (page: number, cat: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("search", q);
    if (cat) sp.set("category", cat);
    if (page > 1) sp.set("page", String(page));
    const s = sp.toString();
    return `/news${s ? `?${s}` : ""}`;
  };

  const categoryChips: { key: string; label: string }[] = [
    { key: "", label: "Semua" },
    { key: "berita", label: "Berita" },
    { key: "pengumuman", label: "Pengumuman" },
    { key: "agenda", label: "Agenda" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {currentPage > 1 && <link rel="prev" href={buildHref(currentPage - 1, category)} />}
      {currentPage < totalPages && <link rel="next" href={buildHref(currentPage + 1, category)} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "Berita", item: "https://www.smpmuh4tanggul.sch.id/news" },
          ],
        })
      }} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-16 text-white">
        <div className="absolute inset-0 hidden opacity-[0.04] sm:block">
          <Newspaper className="absolute -left-10 -top-10 h-64 w-64 -rotate-12" weight="fill" />
          <Newspaper className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <CSSFadeIn>
            <h1 className="text-3xl font-bold md:text-4xl text-balance">Berita</h1>
            <p className="mt-3 text-base text-white/70 text-balance">Informasi terkini dari SMP Muhammadiyah 4 Tanggul</p>
            {q && (
              <p className="mt-2 text-sm text-white/50">Hasil pencarian: &quot;{q}&quot;</p>
            )}
          </CSSFadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        {/* Pencarian + filter kategori (GET tanpa JS; ?search sudah didukung metadata SearchAction) */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form action="/news" method="GET" className="relative w-full sm:max-w-xs">
            <label htmlFor="news-search" className="sr-only">Cari berita</label>
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="news-search"
              type="search"
              name="search"
              defaultValue={q}
              placeholder="Cari berita..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
            />
            {category && <input type="hidden" name="category" value={category} />}
          </form>
          <nav aria-label="Filter kategori berita" className="flex flex-wrap items-center gap-2">
            {categoryChips.map((c) => (
              <Link
                key={c.key}
                href={buildHref(1, c.key)}
                aria-current={category === c.key ? "page" : undefined}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  category === c.key
                    ? "border-[#082b59] bg-[#082b59] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </nav>
        </div>

        {berita.length === 0 ? (
          <CSSFadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center">
              <Newspaper className="h-14 w-14 text-slate-300" />
              <p className="mt-5 text-base text-slate-500">
                {q || category ? "Tidak ada berita yang cocok." : "Berita masih kosong."}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {q
                  ? `Hasil pencarian "${q}" tidak ditemukan.`
                  : category
                    ? "Belum ada berita pada kategori ini."
                    : currentPage > 1
                      ? "Halaman tidak ditemukan — coba buka halaman pertama."
                      : "Nantikan informasi terbaru dari sekolah."}
              </p>
              {(q || category || currentPage > 1) && (
                <Link
                  href="/news"
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#082b59] transition-colors hover:border-[#1767b1] hover:text-[#1767b1]"
                >
                  Lihat semua berita
                </Link>
              )}
            </div>
          </CSSFadeIn>
        ) : (
          <>
            {/* Featured — full width (only on page 1) */}
            {currentPage === 1 && berita.length >= 1 && (
              <CSSFadeIn>
                <Link
                  href={`/news/${berita[0].slug}`}
                  className="group grid overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm transition-all hover:border-[#1767b1]/30 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] lg:grid-cols-5"
                >
                  <div className="relative overflow-hidden bg-slate-100 lg:col-span-3">
                    {berita[0].image_url ? (
                      // Tinggi natural mengikuti rasio poster — tanpa crop
                      <Image
                        src={berita[0].image_url}
                        alt={berita[0].image_alt || berita[0].title}
                        width={1600}
                        height={900}
                        sizes="(max-width: 1024px) 100vw, 60vw"
                        className="h-auto w-full transition-transform duration-700 group-hover:scale-105"
                        priority
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[#082b59] to-[#1767b1]">
                        <span className="text-7xl font-bold text-white/20">{berita[0].title[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-3 p-6 lg:col-span-2 lg:p-8">
                    <span className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${categoryConfig[berita[0].category]?.bg || "bg-slate-100"} ${categoryConfig[berita[0].category]?.color || "text-slate-600"} ${categoryConfig[berita[0].category]?.border || "border-slate-200"}`}>
                      {categoryConfig[berita[0].category]?.label || berita[0].category}
                    </span>
                    <h2 className="text-xl font-bold leading-snug text-[#082b59] line-clamp-2 md:text-2xl">{berita[0].title}</h2>
                    {berita[0].summary && (
                      <p className="text-sm text-slate-600 line-clamp-2">{berita[0].summary}</p>
                    )}
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {new Date(berita[0].published_at || berita[0].created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </span>
                      {berita[0].attachment_url && (
                        <span className="flex items-center gap-1 text-xs">
                          <Paperclip className="h-3 w-3" /> Lampiran
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </CSSFadeIn>
            )}

            {/* Grid — 3 columns */}
            <div className={currentPage === 1 ? "mt-8" : ""}>
              <CSSStagger stagger={60} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(currentPage === 1 ? berita.slice(1) : berita).map((item) => {
                  const cat = categoryConfig[item.category] || { label: item.category, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" };
                  return (
                    <div key={item.id}>
                      <Link
                        href={`/news/${item.slug}`}
                        className="group block overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[#1767b1]/30 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
                      >
                        <div className="overflow-hidden bg-slate-100">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.image_alt || item.title}
                              width={1280}
                              height={720}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="h-auto w-full transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[#082b59] to-[#1767b1]">
                              <span className="text-3xl font-bold text-white/20">{item.title[0]}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cat.bg} ${cat.color} ${cat.border}`}>
                            {cat.label}
                          </span>
                          <h3 className="mt-2 text-sm font-bold text-[#082b59] line-clamp-2 transition-colors group-hover:text-[#1767b1]">{item.title}</h3>
                          {item.summary && (
                            <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">{item.summary}</p>
                          )}
                          <div className="mt-2.5 flex items-center gap-3 text-slate-400">
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="h-3 w-3" />
                              {new Date(item.published_at || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            {item.attachment_url && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Paperclip className="h-3 w-3" /> Lampiran
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </CSSStagger>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <CSSFadeIn delay={150}>
                <div className="mt-10 flex flex-col items-center gap-3">
                  <p className="text-xs text-slate-400">
                    Halaman {currentPage} dari {totalPages} · {total} berita
                  </p>
                  <div className="flex items-center gap-1">
                    <Link
                      href={buildHref(Math.max(1, currentPage - 1), category)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${currentPage === 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <CaretLeft className="h-4 w-4" />
                    </Link>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .reduce<(number | "...")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`dots-${i}`} className="flex h-9 w-9 items-center justify-center text-xs text-slate-400">…</span>
                        ) : (
                          <Link
                            key={p}
                            href={buildHref(p, category)}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === currentPage ? "bg-[#082b59] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                          >
                            {p}
                          </Link>
                        )
                      )}
                    <Link
                      href={buildHref(Math.min(totalPages, currentPage + 1), category)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${currentPage === totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <CaretRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </CSSFadeIn>
            )}
          </>
        )}
      </section>
    </div>
  );
}
