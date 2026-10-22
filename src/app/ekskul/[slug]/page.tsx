import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Clock, User, ArrowLeft, Trophy, ArrowRight, House } from "@/components/Icons";
import { getEkskulBySlug, getAchievementsByEkskul } from "@/lib/queries";
import { formatEkskulSchedule } from "@/app/ekskul-data";
import EkskulGlyph from "@/components/EkskulIcon";
import CoverImage from "@/components/CoverImage";
import { CSSFadeIn } from "@/components/CSSAnimations";

/**
 * Halaman detail ekskul `/ekskul/[slug]` — hero (ikon + nama + jadwal +
 * pembina), sejarah (kolom `history`, paragraf dipisah baris kosong) dan
 * prestasi terkait dari tabel `achievements` (FK `ekskul_id` → supabase/
 * ekskul.sql). Dynamic (ƒ) tanpa ISR — DB dipanggil tiap request, jadi
 * suntingan admin langsung terlihat tanpa revalidate tambahan.
 */

/** Split teks sejarah → paragraf (pisah baris kosong). */
function historyParagraphs(history: string): string[] {
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
      images: ekskul.image_url ? [{ url: ekskul.image_url, alt: ekskul.image_alt || ekskul.name }] : [],
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
  const coaches = ekskul.coach
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <>
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
        {/* Foto */}
        {ekskul.image_url && (
          <CSSFadeIn className="mb-8 md:mb-10">
            <div className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-[#f4f7fb]">
              <CoverImage src={ekskul.image_url} alt={ekskul.image_alt || ekskul.name} priority />
            </div>
          </CSSFadeIn>
        )}

        {/* Sejarah — hanya bila terisi */}
        {paragraphs.length > 0 && (
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

        {/* Prestasi terkait — dari kolom ekskul_id di achievements */}
        {achievements.length > 0 && (
          <CSSFadeIn className={paragraphs.length > 0 ? "mt-10 md:mt-12" : ""}>
            <section aria-labelledby="ekskul-achievements-heading">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-1 w-8 bg-[var(--brand-accent)]" />
                <h2 id="ekskul-achievements-heading" className="text-lg font-bold text-[var(--brand-primary)] md:text-xl">
                  Prestasi {ekskul.name}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {achievements.map((a) => (
                  <div
                    key={a.id}
                    className="flex h-full items-start gap-4 rounded-2xl border border-[#dce3ed] bg-white p-4 transition-colors hover:border-[var(--brand-accent)]/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf6d9] text-[#b39010]">
                      <Trophy className="h-5 w-5" weight="fill" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-[var(--brand-primary)]">{a.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        {a.rank_label && (
                          <span className="font-semibold text-[var(--brand-accent)]">{a.rank_label}</span>
                        )}
                        {a.level && <span>{a.level}</span>}
                        {a.organizer && <span className="truncate">{a.organizer}</span>}
                        {a.year > 0 && <span>· {a.year}</span>}
                      </div>
                      {a.image_url && (
                        <div className="relative mt-2 h-24 w-36 overflow-hidden rounded-lg bg-[#f4f7fb]">
                          <Image
                            src={a.image_url}
                            alt={a.image_alt || a.title}
                            fill
                            sizes="144px"
                            className="object-cover"
                          />
                        </div>
                      )}
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
