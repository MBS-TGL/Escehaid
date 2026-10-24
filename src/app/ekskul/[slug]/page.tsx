import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Clock, User, ArrowLeft, Trophy, ArrowRight, House } from "@/components/Icons";
import { getEkskulBySlug, getAchievementsByEkskul } from "@/lib/queries";
import { formatEkskulSchedule } from "@/app/ekskul-data";
import EkskulGlyph from "@/components/EkskulIcon";
import ImageZoom from "@/app/news/[slug]/ImageZoom";
import { CSSFadeIn } from "@/components/CSSAnimations";
import { AchievementItemsCardPreview } from "@/components/AchievementItemsList";
import { dynamicOgImageUrl, ogImageEntry } from "@/lib/seo";

/**
 * Halaman detail ekskul `/ekskul/[slug]` — hero (ikon + nama + jadwal +
 * pembina), sejarah (kolom `history`, paragraf dipisah baris kosong) dan
 * prestasi terkait dari tabel `achievements` (FK `ekskul_id` → supabase/
 * ekskul.sql). Dynamic (ƒ) tanpa ISR — DB dipanggil tiap request, jadi
 * suntingan admin langsung terlihat tanpa revalidate tambahan.
 */

/** Split teks sejarah → paragraf (pisah baris kosong). Null/kolom belum ada → []. */
function historyParagraphs(history?: string | null): string[] {
  if (!history) return [];
  return history
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim().replace(/\r?\n\s*/g, " "))
    .filter(Boolean);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ekskul = await getEkskulBySlug(slug);
  if (!ekskul) return { title: "Ekstrakurikuler Tidak Ditemukan" };
  const description =
    ekskul.description || historyParagraphs(ekskul.history)[0] || ekskul.name;
  return {
    title: `${ekskul.name} — Ekstrakurikuler`,
    description,
    openGraph: {
      title: `${ekskul.name} — Ekstrakurikuler`,
      description,
      url: `/ekskul/${ekskul.slug}`,
      images: [
        ekskul.image_url
          ? { url: ekskul.image_url, alt: ekskul.image_alt || ekskul.name }
          : ogImageEntry(
              dynamicOgImageUrl({ title: ekskul.name, kind: "Ekstrakurikuler" }),
              ekskul.image_alt || ekskul.name
            ),
      ],
    },
    alternates: { canonical: `/ekskul/${ekskul.slug}` },
  };
}

export default async function EkskulDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ekskul = await getEkskulBySlug(slug);

  if (!ekskul) {
    notFound();
  }

  const [achievements, paragraphs] = await Promise.all([
    getAchievementsByEkskul(ekskul.id),
    Promise.resolve(historyParagraphs(ekskul.history)),
  ]);
  const schedule = formatEkskulSchedule(ekskul.schedule_day, ekskul.schedule_time, ekskul.schedule_note);
  const coaches = (ekskul.coach ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
      { "@type": "ListItem", position: 2, name: "Profil Sekolah", item: "https://www.smpmuh4tanggul.sch.id/profile" },
      { "@type": "ListItem", position: 3, name: ekskul.name, item: `https://www.smpmuh4tanggul.sch.id/ekskul/${ekskul.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {/* Breadcrumb ala detail berita */}
      <div className="border-b border-[#dce3ed] bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <nav className="flex items-center gap-1.5 py-2.5 text-xs text-slate-400">
            <House className="h-3 w-3" />
            <Link href="/" className="transition-colors hover:text-[var(--brand-accent)]">
              Beranda
            </Link>
            <span>/</span>
            <Link href="/profile" className="transition-colors hover:text-[var(--brand-accent)]">
              Profil Sekolah
            </Link>
            <span>/</span>
            <span className="truncate text-slate-600">{ekskul.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero — tile ikon + nama + deskripsi + jadwal + pembina */}
      <section className="bg-[var(--brand-primary)]">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg shadow-black/10 ring-1 ring-white/15">
              <EkskulGlyph slug={ekskul.slug} iconKey={ekskul.icon} className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black leading-tight text-white md:text-3xl">{ekskul.name}</h1>
              {ekskul.description && (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                  {ekskul.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm">
                {schedule && (
                  <span className="inline-flex items-center gap-1.5 text-white/60">
                    <Clock className="h-3.5 w-3.5" />
                    {schedule}
                  </span>
                )}
                {coaches.map((coach) => (
                  <span key={coach} className="inline-flex items-center gap-1.5 text-white/60">
                    <User className="h-3.5 w-3.5" />
                    {coach}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-10">
        {/* Hero visual — foto portrait 9:16 + info panel (desktop: side-by-side) */}
        {ekskul.image_url && (
          <CSSFadeIn className="mb-8 md:mb-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              {/* Foto portrait 9:16 */}
              <div className="mx-auto w-full max-w-xs shrink-0 sm:mx-0 sm:w-52 md:w-64">
                <ImageZoom src={ekskul.image_url} alt={ekskul.image_alt || ekskul.name}>
                  <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-[#dce3ed] shadow-md">
                    <Image
                      src={ekskul.image_url}
                      alt={ekskul.image_alt || ekskul.name}
                      fill
                      priority
                      sizes="(min-width: 768px) 256px, (min-width: 640px) 208px, 320px"
                      className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                </ImageZoom>
              </div>

              {/* Info ekskul di samping foto (tampil hanya bila ada sejarah, sebagai pengantar) */}
              {paragraphs.length > 0 && (
                <div className="flex-1 sm:pt-2">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-1 w-8 bg-[var(--brand-accent)]" />
                    <h2 id="ekskul-history-heading" className="text-lg font-bold text-[var(--brand-primary)] md:text-xl">
                      Sejarah
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {paragraphs.map((p, i) => (
                      <p key={i} className="text-[15px] leading-relaxed text-slate-600">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CSSFadeIn>
        )}
        {/* Sejarah — tampil standalone hanya bila tidak ada foto (foto sudah menampilkan sejarah di sampingnya) */}
        {paragraphs.length > 0 && !ekskul.image_url && (
          <CSSFadeIn>
            <section aria-labelledby="ekskul-history-heading">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-1 w-8 bg-[var(--brand-accent)]" />
                <h2 id="ekskul-history-heading" className="text-lg font-bold text-[var(--brand-primary)] md:text-xl">
                  Sejarah
                </h2>
              </div>
              <div className="space-y-4">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-slate-600">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          </CSSFadeIn>
        )}

        {achievements.length > 0 && (
          <CSSFadeIn className={paragraphs.length > 0 ? "mt-10 md:mt-12" : ""}>
            <section aria-labelledby="ekskul-achievements-heading">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-1 w-8 bg-[var(--brand-accent)]" />
                <h2 id="ekskul-achievements-heading" className="text-lg font-bold text-[var(--brand-primary)] md:text-xl">
                  Prestasi {ekskul.name}
                </h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((a) => (
                  <div
                    key={a.id}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-md hover:shadow-[var(--brand-primary)]/5"
                  >
                    {/* Gambar Prestasi di Bagian Atas */}
                    {a.image_url ? (
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                        <Image
                          src={a.image_url}
                          alt={a.image_alt || a.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[var(--brand-accent)]/15 to-[var(--brand-accent)]/5 text-[var(--brand-accent)]">
                        <Trophy className="h-10 w-10" weight="fill" />
                      </div>
                    )}

                    {/* Konten Prestasi */}
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.rank_label && (
                          <span className="rounded-md bg-[var(--brand-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            {a.rank_label}
                          </span>
                        )}
                        {a.level && (
                          <span className="rounded-md bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                            {a.level}
                          </span>
                        )}
                        {a.year > 0 && (
                          <span className="text-[11px] font-medium text-slate-400">
                            {a.year}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 text-sm font-bold leading-snug text-[var(--brand-primary)]">
                        {a.title}
                      </h3>

                      {a.organizer && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                          {a.organizer}
                        </p>
                      )}

                      <div className="mt-2 flex-1">
                        <AchievementItemsCardPreview description={a.description} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/achievements"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-primary)]"
              >
                Lihat semua prestasi <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </CSSFadeIn>
        )}

        {/* Kembali */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-primary)]"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Profil Sekolah
          </Link>
        </div>
      </div>
    </>
  );
}
