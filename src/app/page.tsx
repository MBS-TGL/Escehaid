import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { ArrowUpRight, CaretRight, Star, GraduationCap, BookOpen, ImageSquare, House, ChatCircle, ChartBar, Users, Checks, Megaphone, CalendarBlank, Trophy, Clock, Quotes } from "@/components/Icons";
import { getNewsList, getFacilityList, getActivityList, getArticleList, getTeacherList, getSchoolProfile, getAchievementList } from "@/lib/queries";
import { detectPrincipalGreeting, keepTogether } from "@/lib/principal-quote";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import { faqs } from "./faq-data";
import { ekskul } from "./ekskul-data";
import EkskulCard from "@/components/EkskulCard";
import HeroBackground from "./HeroBackground";
import HeroVideoModal from "./HeroVideoModal";
import {
  SITE,
  capitalizeCategory,
  achievementCategoryMeta,
  achievementLevelLabel,
  newsCategory,
} from "@/lib/site-config";
import type { Achievement } from "@/lib/supabase";

const FAQ = dynamic(() => import("./FAQ"), { loading: () => <div className="h-96" /> });
const WhatsAppButton = dynamic(() => import("./WhatsAppButton"));
// HeroBackground & HeroVideoModal diimpor statis untuk LCP optimal di layar pertama.
// Video dimuat lazy saat mendekati viewport dengan fallback poster image statis di mobile.
const TeacherCarousel = dynamic(() => import("./TeacherCarousel"), { loading: () => <div className="h-64 rounded-2xl bg-slate-100" /> });
const CountdownEvent = dynamic(() => import("@/components/CountdownEvent"));

/**
 * Baris meta prestasi "Peringkat · Tingkat · Kategori · Tahun" — label diambil
 * dari konstanta bersama di site-config, sama persis dengan halaman /achievements.
 */
function prestasiMeta(a?: Achievement): string {
  if (!a) return "";
  const parts = [
    a.rank_label?.trim() || null,
    achievementLevelLabel(a.level) || a.level?.trim() || null,
    achievementCategoryMeta(a.category)?.label || capitalizeCategory(a.category || "Prestasi"),
    String(a.year || "-"),
  ];
  return parts.filter(Boolean).join(" · ");
}

/** Ikon kategori prestasi dari sumber bersama; fallback Trophy. */
function PrestasiIcon({ category, className }: { category?: string | null; className?: string }) {
  const Icon = achievementCategoryMeta(category)?.icon || Trophy;
  return <Icon className={className} />;
}

/** Gaya badge kategori berita — dari sumber bersama (src/lib/site-config). */
const NEWS_BADGE = (key?: string | null) => {
  const c = newsCategory(key);
  return `${c.border} ${c.bg} ${c.color}`;
};

/** content-visibility: lewati render section di luar layar; containIntrinsicSize mencegah scroll loncat. */
const CV = { contentVisibility: "auto", containIntrinsicSize: "auto 720px" } as React.CSSProperties;

const FACILITY_FALLBACKS: Record<string, string> = {
  "Ruang Kelas": "/images/Ruang-Kelas.jpg",
  "Lab Komputer": "/images/Lab-Komputer.jpeg",
  Masjid: "/images/Masjid.jpg",
  "Lapangan Olahraga": "/images/Lapangan-Olahraga.jpg",
};

const SALAM_BUKA = "Assalamu'alaikum Warahmatullahi Wabarakatuh.";
const SALAM_TUTUP = "Wassalamu'alaikum Warahmatullahi Wabarakatuh.";
const PRINCIPAL_QUOTE_FALLBACK =
  "Setiap anak datang dengan bakat dan caranya sendiri. Tugas kami di SMP Muhammadiyah 4 Tanggul adalah menuntunnya tumbuh berilmu, berakhlak, dan berkemajuan - menjadi pribadi yang bermanfaat bagi keluarga, masyarakat, dan umat.";

export async function generateMetadata(): Promise<Metadata> {
  // Judul beranda memakai `absolute` agar TIDAK ikut template `%s | <nama>`
  // dari root layout — kalau tidak, nama sekolah muncul dua kali.
  const settings = await getSiteSettings();
  const schoolName = settings.values.site_name.trim() || "SMP Muhammadiyah 4 Tanggul";
  return {
    title: { absolute: `${schoolName} | SPMB ${SITE.spmb.academicYear}, Tahfidz & Boarding di Jember` },
    description:
      "SMP Muhammadiyah 4 Tanggul - Sekolah unggulan dengan program Tahfidz, keberbakatan, dan kepesantrenan. Daftar SPMB online sekarang.",
    alternates: { canonical: "/" },
  };
}

export const revalidate = 300;

type NewsItem = { id: string | number; slug: string; title: string; summary: string; category: string; image_url?: string | null; image_alt?: string | null; published_at?: string };

export default async function Home() {
  // Batasi jumlah baris sesuai yang benar-benar dipakai beranda (berita/kegiatan/
  // artikel 4, fasilitas 3, prestasi 6, guru 12) supaya payload & waktu render
  // ulang ISR lebih ringan — terutama saat dibuka dari HP.
  const [beritaRaw, dbFacilities, activities, articles, teachers, profile, achievements, settings] =
    await Promise.all([
      getNewsList(4) as Promise<NewsItem[]>,
      getFacilityList(3),
      getActivityList(4),
      getArticleList(4),
      getTeacherList(12),
      getSchoolProfile(),
      getAchievementList(undefined, { featuredFirst: true, limit: 6 }),
      getSiteSettings(),
    ]);

  // Tagline & identitas dari Pengaturan Situs (bukan lagi konstanta kode).
  const brand = toPublicBrand(settings);
  const schoolName = settings.values.site_name.trim() || profile?.school_name || "SMP Muhammadiyah 4 Tanggul";

  const principalQuote = (profile?.principal_quote || PRINCIPAL_QUOTE_FALLBACK).trim();
  const { startsWithGreeting, endsWithGreeting } = detectPrincipalGreeting(principalQuote);
  const quoteTypeClass =
    principalQuote.length <= 140
      ? "text-2xl md:text-[28px]"
      : principalQuote.length <= 320
        ? "text-lg md:text-[22px]"
        : "text-base md:text-lg";

  // Kata terakhir kutipan dipisahkan untuk merapatkan glyph petik penutup
  // [&rdquo;] pada kata itu sendiri (span whitespace-nowrap), hanya dipakai
  // saat data kutipan sudah menyertakan salam penutupnya sendiri.
  const principalQuoteWords = (() => {
    const trimmed = principalQuote.trim();
    const tokens = trimmed.split(/\s+/);
    const tail = tokens[tokens.length - 1] || "";
    return { head: trimmed.slice(0, trimmed.length - tail.length), tail };
  })();

  // Urutan prestasi di beranda disamakan dengan halaman /achievements:
  // unggulan dulu, lalu tahun menurun, lalu terbit menurun. Urutan yang sama
  // sudah dipakai di query (`featuredFirst`), jadi 6 baris teratas yang diambil
  // sudah tepat; sort ulang di sini tetap dipertahankan sebagai pengaman.
  const achievementsSorted = [...achievements].sort(
    (a, b) =>
      Number(b.is_featured || false) - Number(a.is_featured || false) ||
      (b.year || 0) - (a.year || 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="bg-white text-[#172033]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {/* ── HERO — Full Bleed Video Background ───────── */}
      <section className="relative min-h-[580px] sm:min-h-[640px] lg:min-h-[700px] flex items-center overflow-hidden">
        {/* Full-bleed video background */}
        <HeroBackground
          ytId={process.env.HERO_VIDEO_YT ?? ""}
          videoUrl={process.env.HERO_VIDEO_URL || undefined}
        />

        {/* Cinematic Scrim Overlay: Transparan netral (bukan biru pekat) agar video profil terlihat jelas & hidup */}
        <div
          className="absolute inset-0 z-10 bg-gradient-to-r from-black/80 via-black/45 to-black/20 lg:from-black/75 lg:via-black/35 lg:to-transparent"
          aria-hidden="true"
        />
        {/* Soft bottom vignette untuk transisi halus ke section berikutnya */}
        <div
          className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none"
          aria-hidden="true"
        />
        <div className="absolute bottom-0 left-0 right-0 z-10 h-px bg-gradient-to-r from-transparent via-[var(--brand-highlight)]/30 to-transparent" />

        {/* Content Container (z-20) */}
        <div className="relative z-20 mx-auto w-full max-w-[1296px] px-6 py-16 sm:py-20 md:px-10 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            {/* Left Column: Heading, Tagline, CTAs */}
            <div className="text-white">
              <div className="mb-4 sm:mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--brand-highlight)]/30 bg-[var(--brand-highlight)]/15 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-highlight)] backdrop-blur-xs">
                Pusat Kaderisasi Da&apos;i &amp; Ulama Hafidz &middot; {brand.tagline}
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-[1.12] sm:text-5xl lg:text-6xl text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
                Pendidikan yang menumbuhkan{" "}
                <span className="relative inline-block">
                  <span className="text-[var(--brand-highlight)]">ilmu, iman,</span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 12" fill="none" aria-hidden="true">
                    <path d="M2 8C40 2 80 2 100 6C120 10 160 10 198 4" stroke="var(--brand-highlight)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>{" "}
                dan keberanian.
              </h1>

              <p className="mt-4 sm:mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-slate-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
                SMP Muhammadiyah 4 Tanggul memadukan keunggulan akademik dan keislaman secara terintegrasi untuk membentuk kader umat yang berakhlak mulia.
              </p>

              {/* Action Buttons: SPMB CTA + Tonton Video Profil Modal + Kenali Sekolah */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4">
                <Link
                  href="/admission"
                  className="group inline-flex items-center gap-2 rounded-xl bg-[var(--brand-accent)] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition-all hover:bg-white hover:text-[var(--brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
                >
                  Daftar SPMB
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <HeroVideoModal
                  ytId={process.env.HERO_VIDEO_YT ?? ""}
                  videoUrl={process.env.HERO_VIDEO_URL || undefined}
                />

                <Link
                  href="/profile"
                  className="group inline-flex items-center gap-1.5 px-3 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:text-[var(--brand-highlight)]"
                >
                  Kenali sekolah
                  <CaretRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Right Column: Premium Highlights Card (Glassmorphism) */}
            <div className="hidden lg:block">
              <div className="relative rounded-3xl border border-white/15 bg-white/[0.08] p-7 backdrop-blur-md shadow-2xl shadow-black/30">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-highlight)]">Profil Unggulan</p>
                    <h2 className="text-base font-bold text-white">SMP Muhammadiyah 4 Tanggul</h2>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Aktif
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3.5 rounded-2xl bg-white/[0.05] p-3.5 transition-colors hover:bg-white/[0.1]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-highlight)]/20 text-[var(--brand-highlight)]">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Terakreditasi A</p>
                      <p className="text-xs text-slate-300 leading-relaxed">Standar mutu pendidikan nasional dengan fasilitas terpadu.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 rounded-2xl bg-white/[0.05] p-3.5 transition-colors hover:bg-white/[0.1]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Tahfidz &amp; Kepesantrenan</p>
                      <p className="text-xs text-slate-300 leading-relaxed">Program intensif hafalan Al-Qur&apos;an dan pembinaan akhlak mulia.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 rounded-2xl bg-white/[0.05] p-3.5 transition-colors hover:bg-white/[0.1]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/20 text-sky-300">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Kurikulum Terpadu</p>
                      <p className="text-xs text-slate-300 leading-relaxed">Integrasi Kurikulum Nasional dan kurikulum Al-Islam Kemuhammadiyahan.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span>Penerimaan Santri Baru (SPMB)</span>
                  <Link href="/admission" className="font-semibold text-[var(--brand-highlight)] hover:underline inline-flex items-center gap-1">
                    Informasi &amp; Alur <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CountdownEvent />

      {/* ── SAMBUTAN KEPALA SEKOLAH ───────────────────────── */}
      <section className="relative overflow-hidden bg-[var(--surface-muted)] py-16 md:py-24" style={CV}>
        {/* Watermark kutipan halus di pojok kanan atas latar belakang section */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-4 select-none text-slate-200/50 lg:right-16 lg:top-8"
        >
          <Quotes weight="fill" className="h-44 w-44 md:h-56 md:w-56" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 md:px-10">
          <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
            {/* Kolom Foto Kepala Sekolah — Modern Portrait Card */}
            <CSSFadeIn>
              <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[280px] lg:max-w-none">
                {/* Backdrop offset lembut */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 -rotate-1 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)]/10 via-[var(--brand-accent)]/5 to-transparent sm:rounded-3xl"
                />

                {/* Frame foto utama: kurva rounded-2xl modern, aspect 4/5 profesional */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-md ring-1 ring-black/5 sm:rounded-3xl">
                  <Image
                    src={profile?.principal_photo_url || "/images/Kepala-Sekolah.jpg"}
                    alt={`${profile?.principal_name || "Khoirul Anwar, S.Pd"} - Kepala Sekolah`}
                    fill
                    sizes="(min-width: 1024px) 280px, (min-width: 640px) 280px, 260px"
                    className="object-cover object-[center_16%] transition-transform duration-500 hover:scale-105"
                  />

                  {/* Overlay gradien halus di mobile */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 via-black/20 to-transparent sm:hidden" />
                  <div className="absolute inset-x-3 bottom-3 sm:hidden">
                    <p className="text-sm font-semibold text-white drop-shadow-sm">
                      {profile?.principal_name || "Khoirul Anwar, S.Pd"}
                    </p>
                    <p className="text-xs text-white/80 drop-shadow-sm">
                      Kepala {schoolName}
                    </p>
                  </div>
                </div>

                {/* Floating badge resmi di bawah foto (tablet & desktop) */}
                <div className="absolute -bottom-3 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 shadow-md shadow-slate-900/5 backdrop-blur-sm sm:inline-flex">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-700">Kepala Sekolah</span>
                </div>
              </div>
            </CSSFadeIn>

            {/* Kolom Teks Sambutan — Tipografi Editorial Bermartabat */}
            <CSSFadeIn delay={0.1}>
              <div className="flex flex-col justify-center">
                {/* Eyebrow badge */}
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--brand-primary)]/15 bg-white/80 px-3.5 py-1 text-xs font-semibold text-[var(--brand-primary)] shadow-xs">
                  <Quotes weight="fill" className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
                  <span>Sambutan Kepala Sekolah</span>
                </div>

                {/* Salam Pembuka */}
                {!startsWithGreeting && (
                  <p className="mt-5 text-sm text-slate-600 sm:text-base">
                    {SALAM_BUKA}
                  </p>
                )}

                {/* Kutipan Utama */}
                <blockquote className={startsWithGreeting ? "mt-4" : "mt-3"}>
                  <p className={`${quoteTypeClass} font-normal leading-[1.65] tracking-normal text-slate-800 text-pretty`}>
                    &ldquo;{endsWithGreeting ? (
                      <>
                        {keepTogether(principalQuoteWords.head)}
                        <span className="whitespace-nowrap">
                          {keepTogether(principalQuoteWords.tail)} <span aria-hidden="true" className="font-bold text-[var(--brand-gold)]">&rdquo;</span>
                        </span>
                      </>
                    ) : (
                      <>
                        {keepTogether(principalQuote)} <span aria-hidden="true" className="font-bold text-[var(--brand-gold)]">&rdquo;</span>
                      </>
                    )}
                  </p>
                </blockquote>

                {/* Salam Penutup */}
                {!endsWithGreeting && (
                  <p className="mt-4 text-sm text-slate-600 sm:text-base">
                    {SALAM_TUTUP}
                  </p>
                )}

                {/* Signoff / Identitas Pimpinan */}
                <figcaption className="mt-8 border-t border-slate-200/80 pt-5">
                  <p className="text-base font-bold tracking-tight text-[var(--brand-primary)] sm:text-lg">
                    {profile?.principal_name || "Khoirul Anwar, S.Pd"}
                  </p>
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">
                    Kepala {schoolName}
                  </p>
                </figcaption>
              </div>
            </CSSFadeIn>
          </div>
        </div>
      </section>

      {/* ── QUICK NAV (4 kolom) ────────────────────────────── */}
      <section className="bg-white" style={CV}>
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
            {/* Berita */}
            <CSSFadeIn>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--brand-primary)]">Berita</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[var(--brand-highlight)]" />
                </div>
                {/* Tanpa flex-1: sisa ruang kolom jatuh SETELAH tombol, bukan
                    memecah jarak antara kartu berita dan "Selengkapnya". */}
                <div className="flex flex-col">
                  {beritaRaw.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <Megaphone className="h-9 w-9 text-[var(--brand-primary)]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada berita</p>
                      <p className="mt-0.5 text-xs text-slate-400">Nantikan informasi terbaru dari sekolah</p>
                    </div>
                  ) : (
                    <>
                      <Link
                        href={`/news/${beritaRaw[0].slug}`}
                        className="group block overflow-hidden rounded-xl border border-[#dce3ed] bg-white transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f7fb]">
                          {beritaRaw[0]?.image_url ? (
                            <Image
                              src={beritaRaw[0].image_url}
                              alt={beritaRaw[0].image_alt || beritaRaw[0].title}
                              fill
                              sizes="(max-width: 768px) 100vw, 320px"
                              className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Megaphone className="h-12 w-12 text-[var(--brand-primary)]/10" />
                            </div>
                          )}
                        </div>
                        <div className="p-3.5">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${NEWS_BADGE(beritaRaw[0]?.category)}`}>
                            {newsCategory(beritaRaw[0]?.category).label || "Berita"}
                          </span>
                          <h4 className="mt-2 line-clamp-2 text-sm font-bold text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">
                            {beritaRaw[0]?.title || "Berita terbaru sekolah"}
                          </h4>
                          {beritaRaw[0]?.summary && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{beritaRaw[0].summary}</p>
                          )}
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            {beritaRaw[0]?.published_at ? new Date(beritaRaw[0].published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                          </div>
                        </div>
                      </Link>
                      <div className="mt-6 space-y-3">
                        {beritaRaw.slice(1, 3).map((item) => (
                          <Link key={item.id} href={`/news/${item.slug}`} className="group flex gap-2.5">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f4f7fb]">
                              {item.image_url ? (
                                <Image src={item.image_url} alt={item.image_alt || item.title} width={56} height={56} sizes="56px" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Megaphone className="h-5 w-5 text-[var(--brand-primary)]/15" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400">Terbit: {item.published_at ? new Date(item.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">{item.title}</h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <Link href="/news" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--brand-accent)]">
                  Selengkapnya
                </Link>
              </div>
            </CSSFadeIn>

            {/* Kegiatan */}
            <CSSFadeIn delay={0.05}>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--brand-primary)]">Kegiatan Sekolah</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[var(--brand-highlight)]" />
                </div>
                <div className="flex flex-1 flex-col">
                  {activities.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <CalendarBlank className="h-9 w-9 text-[var(--brand-primary)]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada kegiatan</p>
                      <p className="mt-0.5 text-xs text-slate-400">Nantikan info kegiatan dari sekolah kami</p>
                    </div>
                  ) : (
                    <>
                      <Link href="/activities" className="group block overflow-hidden rounded-xl">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f7fb]">
                          {activities[0]?.image_url ? (
                            <Image src={activities[0].image_url} alt={activities[0].title} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <CalendarBlank className="h-12 w-12 text-[var(--brand-primary)]/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/80 via-[var(--brand-primary)]/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3.5">
                            <p className="text-[10px] font-bold text-white/70">Kegiatan</p>
                            <h4 className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{activities[0]?.title || "Kegiatan sekolah terbaru"}</h4>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2.5 space-y-2.5">
                        {activities.slice(1, 3).map((item) => (
                          <Link key={item.slug} href={`/activities/${item.slug}`} className="group flex gap-2.5">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f4f7fb]">
                              {item.image_url ? (
                                <Image src={item.image_url} alt={item.title} width={56} height={56} sizes="56px" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <CalendarBlank className="h-5 w-5 text-[var(--brand-primary)]/15" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400">{item.activity_type}</p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">{item.title}</h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <Link href="/activities" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--brand-accent)]">
                  Selengkapnya
                </Link>
              </div>
            </CSSFadeIn>

            {/* Fasilitas */}
            <CSSFadeIn delay={0.1}>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--brand-primary)]">Fasilitas</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[var(--brand-highlight)]" />
                </div>
                <div className="flex flex-1 flex-col">
                  {dbFacilities.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <ImageSquare className="h-9 w-9 text-[var(--brand-primary)]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada fasilitas</p>
                      <p className="mt-0.5 text-xs text-slate-400">Fasilitas sekolah akan segera ditambahkan</p>
                    </div>
                  ) : (
                    <>
                      <Link href="/profile#fasilitas" className="group block overflow-hidden rounded-xl">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f7fb]">
                          {dbFacilities[0]?.image_url ? (
                            <Image src={dbFacilities[0].image_url} alt={dbFacilities[0].name} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <Image src={FACILITY_FALLBACKS[dbFacilities[0]?.name] || "/images/Ruang-Kelas.jpg"} alt={dbFacilities[0]?.name || "Fasilitas"} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/80 via-[var(--brand-primary)]/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3.5">
                            <p className="text-[10px] font-bold text-white/70">Fasilitas</p>
                            <h4 className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{dbFacilities[0]?.name || "Fasilitas sekolah"}</h4>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2.5 space-y-2.5">
                        {dbFacilities.slice(1, 3).map((f) => (
                          <Link key={f.id} href="/profile#fasilitas" className="group flex gap-2.5">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f4f7fb]">
                              {f.image_url ? (
                                <Image src={f.image_url} alt={f.name} width={56} height={56} sizes="56px" className="h-full w-full object-cover" />
                              ) : (
                                <Image src={FACILITY_FALLBACKS[f.name] || "/images/Ruang-Kelas.jpg"} alt={f.name} width={56} height={56} sizes="56px" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400">Fasilitas</p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">{f.name}</h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <Link href="/profile#fasilitas" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--brand-accent)]">
                  Selengkapnya
                </Link>
              </div>
            </CSSFadeIn>

            {/* Prestasi */}
            <CSSFadeIn delay={0.15}>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--brand-primary)]">Prestasi</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[var(--brand-highlight)]" />
                </div>
                <div className="flex flex-1 flex-col">
                  {achievementsSorted.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <Trophy className="h-9 w-9 text-[var(--brand-primary)]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada prestasi</p>
                      <p className="mt-0.5 text-xs text-slate-400">Prestasi siswa akan segera ditampilkan</p>
                    </div>
                  ) : (
                    <>
                      <Link href="/achievements" className="group block overflow-hidden rounded-xl">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f7fb]">
                          {achievementsSorted[0]?.image_url ? (
                            <Image src={achievementsSorted[0].image_url} alt={achievementsSorted[0].image_alt || achievementsSorted[0].title} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <PrestasiIcon category={achievementsSorted[0]?.category} className="h-12 w-12 text-[var(--brand-primary)]/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/80 via-[var(--brand-primary)]/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3.5">
                            <p className="text-[10px] font-bold text-white/70">{prestasiMeta(achievementsSorted[0])}</p>
                            <h4 className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{achievementsSorted[0]?.title || "Prestasi sekolah"}</h4>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2.5 space-y-2.5">
                        {achievementsSorted.slice(1, 3).map((a) => (
                          <Link key={a.id} href="/achievements" className="group flex gap-2.5">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f4f7fb]">
                              {a.image_url ? (
                                <Image src={a.image_url} alt={a.image_alt || a.title} width={56} height={56} sizes="56px" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <PrestasiIcon category={a.category} className="h-5 w-5 text-[var(--brand-primary)]/15" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400">{prestasiMeta(a)}</p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">{a.title}</h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <Link href="/achievements" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--brand-accent)]">
                  Selengkapnya
                </Link>
              </div>
            </CSSFadeIn>
          </div>
        </div>
      </section>

      {/* ── PROGRAM UNGGULAN ──────────────────────────────── */}
      <section className="bg-white" style={CV}>
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <CSSFadeIn>
            <div className="mb-12">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Program unggulan</h2>
            </div>
          </CSSFadeIn>

          <CSSStagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {([
              ["Program Tahfidz", "Hafalan Al-Qur'an 30 Juz Dengan Bimbingan Intensif Dan Karantina Khusus Bagi Santri Berbakat Menghafal.", BookOpen],
              ["Program Keberbakatan", "Pembelajaran fokus sesuai bakat: Tahfidz, Akademik, atau Ketrampilan (Seni/Olahraga) — 75% porsi belajar di bidang unggulan.", GraduationCap],
              ["Program Bahasa", "Muhadhoroh 3 Bahasa (Arab, Inggris, Indonesia), Arabic Practice, Muhadasah, Dan Bimbingan Intensif Bahasa.", ChatCircle],
              ["Program Kepesantrenan", "Baca Tulis Al-Qur'an Metode Wafa, Kajian Menjelang Berbuka, Dan Pembiasaan Golden Habit Sehari-hari.", House],
              ["Program Akademik", "Bimbingan Belajar Semua Mapel Ujian Sekolah Dan Klinik Akademik Untuk Olimpiade IPA & Matematika.", ChartBar],
              ["7 Golden Habits", "Pembiasaan Harian: Muraja'ah, Mufrodhat, Shalat Jama'ah Lima Waktu, Shalat Rawatib, Dhuha, Tahajjud, Dan Puasa Senin-Kamis.", Star],
            ] as [string, string, typeof Star][]).map(([title, description, Icon]) => (
              <div key={title} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white p-5 transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-xl hover:shadow-[var(--brand-primary)]/5">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[var(--brand-accent)] to-[var(--brand-accent)] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-light)] text-white shadow-lg shadow-[var(--brand-primary)]/20 transition-transform group-hover:scale-110">
                    <Icon weight="fill" className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-semibold text-[var(--brand-primary)]">{title}</h3>
                    <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-slate-500">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </CSSStagger>
        </div>
      </section>

      {/* ── EKSTRAKURIKULER ─────────────────────────────── */}
      <section className="bg-[#f4f7fb]" style={CV}>
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <CSSFadeIn>
            <div className="mb-12 flex items-end justify-between">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Ekstrakurikuler</h2>
              <Link href="/profile#ekstrakurikuler" className="text-sm font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">
                Lihat semua <ArrowUpRight className="inline h-4 w-4" />
              </Link>
            </div>
          </CSSFadeIn>

          <CSSStagger className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
            {ekskul.map((item) => (
              <EkskulCard key={item.slug} item={item} />
            ))}
          </CSSStagger>
        </div>
      </section>

      {/* ── GURU & STAFF ────────────────────────────────── */}
      <section className="bg-white" style={CV}>
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <CSSFadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Tim Pengajar</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Guru & Staff</h2>
            </div>
          </CSSFadeIn>

          <CSSFadeIn>
            <TeacherCarousel teachers={teachers.filter((t) => t.position !== "Kepala Sekolah")} />
          </CSSFadeIn>
        </div>
      </section>

      {/* ── ARTIKEL ──────────────────────────────────────── */}
      <section className="bg-[#f4f7fb]" style={CV}>
        <div className="mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
          <CSSFadeIn>
            <div className="mb-12 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Artikel & Tips</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Artikel Sekolah</h2>
              </div>
              <Link href="/articles" className="text-sm font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">
                Semua artikel <ArrowUpRight className="inline h-4 w-4" />
              </Link>
            </div>
          </CSSFadeIn>

          <CSSStagger stagger={100} className="grid gap-6 md:grid-cols-2">
            {articles.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-16 text-center">
                <BookOpen className="h-12 w-12 text-[var(--brand-primary)]/20" />
                <p className="mt-4 text-sm text-slate-500">Artikel masih kosong.</p>
                <p className="mt-1 text-xs text-slate-400">Nantikan tulisan dan tips dari guru kami.</p>
              </div>
            ) : articles.map((item) => (
              <Link key={item.slug} href={`/articles/${item.slug}`} className="group block rounded-2xl border border-[#dce3ed] bg-white p-6 transition-all hover:shadow-lg hover:shadow-[var(--brand-primary)]/5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--brand-accent)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-accent)]">{capitalizeCategory(item.category)}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-2">{item.excerpt}</p>
                <p className="mt-3 text-xs text-slate-400">oleh {item.author_name ?? "Tim MBS"}</p>
              </Link>
            ))}
          </CSSStagger>
        </div>
      </section>

      {/* ── WHY MUH4TA ────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)] text-white" style={CV}>
        <div className="absolute inset-0 hidden opacity-10 md:block">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--brand-highlight)] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
          <CSSFadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-highlight)]">Mengapa MUH4TA</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
                Sekolah yang dekat, terarah, dan terus bergerak maju.
              </h2>
            </div>
          </CSSFadeIn>

          <CSSStagger stagger={120} className="mt-14 grid gap-6 md:grid-cols-3">
            {([
              ["Pendampingan dekat", "Guru hadir mendampingi proses belajar dan perkembangan setiap peserta didik.", Users],
              ["Nilai yang terintegrasi", "Pembelajaran akademik berjalan bersama pembiasaan ibadah dan akhlak.", Checks],
              ["Berani mencoba", "Siswa mendapat ruang untuk bertanya, berkarya, dan mengembangkan potensi.", Star],
            ] as [string, string, React.ElementType][]).map(([title, description, Icon]) => (
              <div key={title} className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all md:backdrop-blur-sm duration-300 hover:border-white/20 hover:bg-white/10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]">
                  <Icon className="h-5 w-5" weight="fill" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
              </div>
            ))}
          </CSSStagger>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <FAQ />

      {/* ── FINAL CTA ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t-8 border-[var(--brand-highlight)] bg-white">
        <div className="absolute -right-20 -top-20 hidden h-64 w-64 rounded-full bg-[var(--brand-accent)]/10 blur-[100px] md:block" />
        <div className="relative mx-auto flex max-w-[1296px] flex-col gap-7 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-10">
          <CSSFadeIn>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--brand-primary)]">Mulai langkah baru bersama kami.</h2>
            </div>
          </CSSFadeIn>
          <CSSFadeIn delay={0.1}>
            <Link href="/admission" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-[var(--brand-accent)] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]">
              Daftar sekarang <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CSSFadeIn>
        </div>
      </section>

      {/* ── WHATSAPP ──────────────────────────────────────── */}
      <WhatsAppButton />
    </div>
  );
}