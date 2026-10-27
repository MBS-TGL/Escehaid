import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { ArrowUpRight, CaretRight, Star, GraduationCap, BookOpen, ImageSquare, House, ChatCircle, ChartBar, Megaphone, CalendarBlank, Trophy, Clock, Quotes, Eye } from "@/components/Icons";
import { getNewsList, getFacilityList, getActivityList, getArticleList, getTeacherList, getSchoolProfile, getAchievementList, getActiveAgendaEvents, filterUpcomingEvents, getEkskulList } from "@/lib/queries";
import { detectPrincipalGreeting, keepTogether } from "@/lib/principal-quote";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
// EkskulCard tidak dipakai di beranda — diganti EkskulCarousel (carousel portrait 9:16)
import HeroBackground from "./HeroBackground";
import HeroVideoModal from "./HeroVideoModal";
import {
  SITE,
  capitalizeCategory,
  achievementCategoryMeta,
  achievementLevelLabel,
  newsCategory,
} from "@/lib/site-config";
import { activityTypeLabel, activityTypeBadge } from "@/lib/activity-types";
import type { Achievement } from "@/lib/supabase";
import { BLOCKS } from "@/lib/data/mbs-schedule";
import { getAgendaBlocksList, blockRowToSummary, getActiveFaqs } from "@/lib/queries";
import { resolveVision, parseMissionItems } from "@/lib/queries/profile";

const FAQ = dynamic(() => import("./FAQ"), { loading: () => <div className="h-96" /> });
const WhatsAppButton = dynamic(() => import("./WhatsAppButton"));
// HeroBackground & HeroVideoModal diimpor statis untuk LCP optimal di layar pertama.
// Video dimuat lazy saat mendekati viewport dengan fallback poster image statis di mobile.
const TeacherCarousel = dynamic(() => import("./TeacherCarousel"), { loading: () => <div className="h-64 rounded-2xl bg-slate-100" /> });
const EkskulCarousel = dynamic(() => import("./EkskulCarousel"), { loading: () => <div className="h-[420px] rounded-2xl bg-slate-100" /> });
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

/**
 * Layout bento grid fasilitas beranda:
 * 5 item: 1 foto besar di kiri (span 2 kolom, 2 baris di desktop) + 4 foto kecil di kanan (2x2).
 * Di mobile: foto besar span 2 kolom di baris pertama, sisanya 2 kolom di bawahnya.
 * Adaptasi dinamis untuk total < 5 item agar tidak ada kotak kosong.
 */
function bentoSpanClass(index: number, total: number): string {
  if (total >= 5) {
    if (index === 0) {
      return "col-span-2 lg:col-span-2 lg:row-span-2 min-h-[260px] sm:min-h-[320px] lg:min-h-[440px]";
    }
    return "col-span-1 lg:col-span-1 lg:row-span-1 min-h-[170px] sm:min-h-[190px] lg:min-h-[210px]";
  }
  if (total === 4) {
    return "col-span-1 lg:col-span-1 min-h-[180px] sm:min-h-[220px] lg:min-h-[260px]";
  }
  if (total === 3) {
    if (index === 0) {
      return "col-span-2 lg:col-span-2 lg:row-span-2 min-h-[260px] sm:min-h-[320px] lg:min-h-[440px]";
    }
    return "col-span-1 lg:col-span-2 lg:row-span-1 min-h-[170px] sm:min-h-[190px] lg:min-h-[210px]";
  }
  if (total === 2) {
    return "col-span-2 sm:col-span-1 lg:col-span-2 min-h-[220px] sm:min-h-[260px] lg:min-h-[320px]";
  }
  return "col-span-2 lg:col-span-4 min-h-[280px] sm:min-h-[360px]";
}

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
  // artikel 4, fasilitas 5, prestasi 6, guru 12) supaya payload & waktu render
  // ulang ISR lebih ringan — terutama saat dibuka dari HP.
  const [beritaRaw, dbFacilities, activities, articles, teachers, profile, achievements, settings, agendaEvents, ekskulList, programBlocks, faqDbItems] =
    await Promise.all([
      getNewsList(4) as Promise<NewsItem[]>,
      getFacilityList(5),
      getActivityList(4),
      getArticleList(4),
      getTeacherList(12),
      getSchoolProfile(),
      getAchievementList(undefined, { featuredFirst: true, limit: 6 }),
      getSiteSettings(),
      getActiveAgendaEvents(),
      getEkskulList(),
      getAgendaBlocksList(),
      // FAQ dari tabel `faqs` (scope 'home'); null (tabel kosong/error) →
      // section FAQ tidak dirender.
      getActiveFaqs("home"),
    ]);

  // Kartu agenda harian: dari tabel agenda_blocks (supabase/program.sql); bila
  // SQL belum jalan → fallback data statis (mbs-schedule.ts) — aman dua-duanya.
  const agendaBlocks =
    programBlocks.length > 0 ? programBlocks.map(blockRowToSummary) : BLOCKS;

  // Visi & misi (section "Mengapa MUH4TA") — dari school_profile. Section
  // disembunyikan bila keduanya kosong di DB; misi kosong → grid tak dirender
  // (tanpa fallback), teks lengkap tetap tersedia di /profile#visi-misi.
  const hasVisionMission = Boolean(profile?.vision?.trim() || profile?.mission?.trim());
  const visionText = resolveVision(profile);
  const missionItems = profile?.mission?.trim() ? parseMissionItems(profile.mission) : [];

  // FAQ aktif dari DB (tabel `faqs`); null (tabel kosong/error) → section
  // FAQ dan JSON-LD FAQPage tidak dirender.
  const faqItems = faqDbItems ?? [];

  // Hanya acara yang belum dimulai yang layak ditayangkan di countdown.
  const upcomingEvents = filterUpcomingEvents(agendaEvents);

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
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="bg-white text-[#172033]">
      {faqItems.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
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
                SMP Muhammadiyah 4 Tanggul &middot; {brand.tagline}
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-[1.12] sm:text-5xl lg:text-6xl text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
                Pusat Kaderisasi Da&apos;i &amp; Ulama Hafidz
              </h1>

              <p className="mt-4 sm:mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-slate-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
                Menjadi lembaga pencetak kader da&apos;i dan ulama hafidz yang menguasai ilmu pengetahuan dan teknologi, berwawasan global serta peduli dan berbudaya lingkungan.
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

          </div>
        </div>
      </section>

      <CountdownEvent events={upcomingEvents} />

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
                <div className="flex flex-1 flex-col justify-between">
                  {beritaRaw.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <Megaphone className="h-9 w-9 text-[var(--brand-primary)]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada berita</p>
                      <p className="mt-0.5 text-xs text-slate-400">Nantikan informasi terbaru dari sekolah</p>
                    </div>
                  ) : (
                    <div>
                      <Link
                        href={`/news/${beritaRaw[0].slug}`}
                        className="group block overflow-hidden rounded-xl"
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
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/85 via-[var(--brand-primary)]/25 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3.5">
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs ${NEWS_BADGE(beritaRaw[0]?.category)}`}>
                              {newsCategory(beritaRaw[0]?.category).label || "Berita"}
                            </span>
                            <h4 className="mt-1.5 line-clamp-2 text-sm font-semibold text-white drop-shadow-xs">
                              {beritaRaw[0]?.title || "Berita terbaru sekolah"}
                            </h4>
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/70">
                              <Clock className="h-3 w-3" />
                              {beritaRaw[0]?.published_at ? new Date(beritaRaw[0].published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2.5 space-y-2.5">
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
                    </div>
                  )}
                  <Link href="/news" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--brand-accent)]">
                    Selengkapnya
                  </Link>
                </div>
              </div>
            </CSSFadeIn>

            {/* Kegiatan */}
            <CSSFadeIn delay={0.05}>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--brand-primary)]">Kegiatan Sekolah</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[var(--brand-highlight)]" />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  {activities.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <CalendarBlank className="h-9 w-9 text-[var(--brand-primary)]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada kegiatan</p>
                      <p className="mt-0.5 text-xs text-slate-400">Nantikan info kegiatan dari sekolah kami</p>
                    </div>
                  ) : (
                    <div>
                      <Link href={`/activities/${activities[0]?.slug || ""}`} className="group block overflow-hidden rounded-xl">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f7fb]">
                          {activities[0]?.image_url ? (
                            <Image src={activities[0].image_url} alt={activities[0].title} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <CalendarBlank className="h-12 w-12 text-[var(--brand-primary)]/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/85 via-[var(--brand-primary)]/25 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3.5">
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs ${activityTypeBadge(activities[0]?.activity_type)}`}>
                              {activityTypeLabel(activities[0]?.activity_type)}
                            </span>
                            <h4 className="mt-1.5 line-clamp-2 text-sm font-semibold text-white drop-shadow-xs">
                              {activities[0]?.title || "Kegiatan sekolah terbaru"}
                            </h4>
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
                              <p className="text-[10px] text-slate-400">{activityTypeLabel(item.activity_type)}</p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">{item.title}</h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  <Link href="/activities" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--brand-accent)]">
                    Selengkapnya
                  </Link>
                </div>
              </div>
            </CSSFadeIn>

            {/* Artikel */}
            <CSSFadeIn delay={0.1}>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--brand-primary)]">Artikel</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[var(--brand-highlight)]" />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  {articles.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <BookOpen className="h-9 w-9 text-[var(--brand-primary)]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada artikel</p>
                      <p className="mt-0.5 text-xs text-slate-400">Nantikan tulisan dan tips dari kami</p>
                    </div>
                  ) : (
                    <div>
                      {/* Kartu Unggulan Artikel (Editorial Card aspect-[4/3] Seragam) */}
                      <Link
                        href={`/articles/${articles[0].slug}`}
                        className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[#0c3e75] p-3.5 sm:p-4 text-white shadow-sm transition-all hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
                      >
                        {/* Watermark dekoratif halus */}
                        <div className="pointer-events-none absolute -right-3 -top-3 text-white/[0.07] transition-transform duration-500 group-hover:scale-110">
                          <BookOpen className="h-28 w-28 -rotate-12" />
                        </div>
                        <div className="relative z-10 flex h-full flex-col justify-between">
                          <div>
                            <span className="inline-flex items-center rounded-md border border-[var(--brand-highlight)]/30 bg-[var(--brand-highlight)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-highlight)]">
                              {capitalizeCategory(articles[0].category)}
                            </span>
                            <h4 className="mt-2 line-clamp-3 text-sm font-semibold text-white drop-shadow-xs transition-colors group-hover:text-[var(--brand-highlight)]">
                              {articles[0].title}
                            </h4>
                            {articles[0].excerpt && (
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/70">
                                {articles[0].excerpt}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-white/60">
                            <span className="line-clamp-1 font-medium">oleh {articles[0].author_name ?? "Tim MBS"}</span>
                            {articles[0].published_at && (
                              <span className="shrink-0">
                                {new Date(articles[0].published_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* 2 Item Daftar Kecil */}
                      <div className="mt-2.5 space-y-2.5">
                        {articles.slice(1, 3).map((item) => (
                          <Link key={item.id} href={`/articles/${item.slug}`} className="group flex gap-2.5">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.image_alt || item.title}
                                width={56}
                                height={56}
                                sizes="56px"
                                className="h-14 w-14 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#dce3ed]/80 bg-[#f4f7fb] text-[var(--brand-accent)] transition-colors group-hover:border-[var(--brand-accent)]/30 group-hover:bg-blue-50/50">
                                <BookOpen className="h-6 w-6 text-[var(--brand-primary)]/25 transition-colors group-hover:text-[var(--brand-accent)]" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-accent)]">
                                {capitalizeCategory(item.category)}
                              </p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">
                                {item.title}
                              </h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  <Link
                    href="/articles"
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--brand-accent)]"
                  >
                    Selengkapnya
                  </Link>
                </div>
              </div>
            </CSSFadeIn>

            {/* Prestasi */}
            <CSSFadeIn delay={0.15}>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--brand-primary)]">Prestasi</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[var(--brand-highlight)]" />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  {achievementsSorted.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <Trophy className="h-9 w-9 text-[var(--brand-primary)]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada prestasi</p>
                      <p className="mt-0.5 text-xs text-slate-400">Prestasi siswa akan segera ditampilkan</p>
                    </div>
                  ) : (
                    <div>
                      <Link href="/achievements" className="group block overflow-hidden rounded-xl">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f7fb]">
                          {achievementsSorted[0]?.image_url ? (
                            <Image src={achievementsSorted[0].image_url} alt={achievementsSorted[0].image_alt || achievementsSorted[0].title} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <PrestasiIcon category={achievementsSorted[0]?.category} className="h-12 w-12 text-[var(--brand-primary)]/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/85 via-[var(--brand-primary)]/25 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3.5">
                            <span className="inline-flex items-center rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-xs">
                              {prestasiMeta(achievementsSorted[0]) || "Prestasi"}
                            </span>
                            <h4 className="mt-1.5 line-clamp-2 text-sm font-semibold text-white drop-shadow-xs">
                              {achievementsSorted[0]?.title || "Prestasi sekolah"}
                            </h4>
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
                    </div>
                  )}
                  <Link href="/achievements" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--brand-accent)]">
                    Selengkapnya
                  </Link>
                </div>
              </div>
            </CSSFadeIn>
          </div>
        </div>
      </section>

      {/* ── PROGRAM UNGGULAN ──────────────────────────────── */}
      <section className="bg-[#f4f7fb]" style={CV}>
        <div className="mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
          <CSSFadeIn>
            <div className="mb-12 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Program MBS</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Program unggulan</h2>
              </div>
              {/* Tombol kanan ala Fasilitas: ke halaman /program (desktop). */}
              <Link
                href="/program"
                className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)] md:inline-flex"
              >
                Lihat selengkapnya <ArrowUpRight className="h-4 w-4" />
              </Link>
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

          {/* Preview agenda harian santri — data satu sumber dengan halaman /program. */}
          <CSSStagger stagger={60} className="mt-12">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--brand-accent)]" aria-hidden="true" />
              <h3 className="text-lg font-bold text-[var(--brand-primary)]">Agenda harian santri</h3>
              <span className="text-sm text-slate-500">dari dini hari hingga istirahat malam</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {agendaBlocks.map((block) => (
                <Link
                  key={block.key}
                  href="/program#agenda"
                  className="group flex min-h-[150px] flex-col rounded-2xl bg-white p-6 transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-primary)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/10 motion-safe:duration-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--brand-primary)] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors group-hover:bg-white group-hover:text-[var(--brand-primary)]">
                      {block.title}
                    </span>
                    <span className="min-w-0 overflow-hidden text-ellipsis rounded-full border border-[#dce3ed] bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--brand-primary)] transition-colors group-hover:border-white/30 group-hover:bg-white/10 group-hover:text-white">
                      <span className="whitespace-nowrap">{block.timeLabel}</span>
                    </span>
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-slate-600 line-clamp-3 transition-colors group-hover:text-white/80">
                    {block.summary}
                  </p>
                </Link>
              ))}
            </div>
          </CSSStagger>

          {/* Tombol mobile full-width ala Fasilitas. */}
          <div className="mt-6 md:hidden">
            <Link
              href="/program"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-accent)]"
            >
              Lihat selengkapnya <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FASILITAS SEKOLAH ──────────────────────────────── */}
      {dbFacilities.length > 0 && (
        <section className="bg-white" style={CV}>
          <div className="mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
            <CSSFadeIn>
              <div className="mb-8 flex items-end justify-between md:mb-12">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Fasilitas</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Fasilitas Sekolah</h2>
                </div>
                <Link
                  href="/profile#fasilitas"
                  className="hidden items-center gap-1.5 text-sm font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)] md:inline-flex"
                >
                  Lihat semua fasilitas <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </CSSFadeIn>

            <CSSFadeIn delay={0.05}>
              <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                {dbFacilities.map((f, index) => {
                  const imgSrc = f.image_url?.trim() || FACILITY_FALLBACKS[f.name];
                  const isLarge = index === 0 && (dbFacilities.length >= 5 || dbFacilities.length === 3);
                  return (
                    <Link
                      key={f.id}
                      href="/profile#fasilitas"
                      className={`group relative flex flex-col justify-end overflow-hidden rounded-3xl border border-white/80 bg-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/[0.06] transition-all duration-500 ease-out hover:border-white hover:shadow-2xl hover:shadow-[var(--brand-primary)]/20 motion-safe:hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${bentoSpanClass(index, dbFacilities.length)}`}
                    >
                      {/* Badge Kategori Glassmorphism (Pojok Kiri Atas) */}
                      <div className="absolute left-3.5 top-3.5 z-20 sm:left-4 sm:top-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-highlight)]" />
                          Fasilitas
                        </span>
                      </div>

                      {/* Tombol Aksi Panah Mini (Pojok Kanan Atas) */}
                      <div className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md opacity-85 transition-all duration-300 group-hover:scale-110 group-hover:border-white group-hover:bg-white group-hover:text-[var(--brand-primary)] group-hover:opacity-100 sm:right-4 sm:top-4">
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>

                      {/* Foto Fasilitas atau Placeholder Estetik */}
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={f.name}
                          fill
                          sizes={
                            isLarge
                              ? "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 640px"
                              : "(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 320px"
                          }
                          priority={false}
                          className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] via-[#0a3570] to-[#0c4482] p-4 text-white">
                          <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[var(--brand-highlight)]/15 blur-2xl" />
                          <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-[var(--brand-accent)]/25 blur-2xl" />
                          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-xs backdrop-blur-md transition-transform duration-500 group-hover:scale-110">
                            <ImageSquare className="h-6 w-6 text-[var(--brand-highlight)]" />
                          </div>
                          <span className="relative z-10 mt-2 text-[10px] font-semibold tracking-wider text-white/50 uppercase">SMP Muhammadiyah 4</span>
                        </div>
                      )}

                      {/* Cinematic Scrim Gradient Overlay */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 via-35% to-black/10 transition-opacity duration-300 group-hover:from-slate-950/95" />

                      {/* Info & Nama Fasilitas */}
                      <div className="relative z-10 p-4 sm:p-5 lg:p-6">
                        <h3 className={`font-bold text-white drop-shadow-sm leading-snug transition-colors group-hover:text-[var(--brand-highlight)] ${isLarge ? "text-lg sm:text-2xl lg:text-[26px]" : "text-sm sm:text-base line-clamp-1"}`}>
                          {f.name}
                        </h3>
                        {f.description && (
                          <p className={`mt-1 font-normal text-slate-200/85 leading-relaxed ${isLarge ? "text-xs sm:text-sm line-clamp-2 max-w-xl" : "hidden sm:line-clamp-1 text-[11px]"}`}>
                            {f.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CSSFadeIn>

            <div className="mt-6 md:hidden">
              <Link
                href="/profile#fasilitas"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-accent)]"
              >
                Lihat semua fasilitas <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── GURU & STAFF ────────────────────────────────── */}
      <section className="bg-[#f4f7fb]" style={CV}>
        <div className="mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
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

      {/* ── EKSTRAKURIKULER ─────────────────────────────── */}
      {ekskulList.length > 0 && (
        <section className="bg-white" style={CV}>
          <div className="mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
            <CSSFadeIn>
              <div className="mb-12 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Kegiatan Siswa</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Ekstrakurikuler</h2>
                <p className="mt-3 text-sm text-slate-500">
                  Wadah pengembangan bakat dan potensi siswa di luar kegiatan akademik.
                </p>
              </div>
            </CSSFadeIn>

            <CSSFadeIn delay={0.05}>
              <EkskulCarousel ekskuls={ekskulList} />
            </CSSFadeIn>

            <div className="mt-8 flex justify-center">
              <Link
                href="/profile#ekstrakurikuler"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand-primary)]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--brand-primary)] shadow-sm transition-all hover:border-[var(--brand-accent)]/40 hover:bg-[var(--brand-primary)] hover:text-white hover:shadow-md"
              >
                Lihat semua ekstrakurikuler <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── WHY MUH4TA — Visi & Misi (dari school_profile) ── */}
      {hasVisionMission && (
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)] text-white" style={CV}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 select-none text-white/[0.04] md:-right-12 md:-top-12">
          <Quotes weight="fill" className="h-64 w-64 md:h-80 md:w-80" />
        </div>
        <div className="absolute inset-0 hidden opacity-10 md:block">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--brand-highlight)] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
          <CSSFadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--brand-highlight)] backdrop-blur-md">
                <Eye className="h-4 w-4" weight="bold" />
                <span>Mengapa MUH4TA — Visi Kami</span>
              </span>
              <h2 className="mt-6 font-serif-quote text-xl font-normal leading-relaxed text-white sm:text-2xl md:text-3xl text-pretty">
                &ldquo;{visionText}&rdquo;
              </h2>
            </div>
          </CSSFadeIn>

          {missionItems.length > 0 && (
          <CSSStagger stagger={100} className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {missionItems.map((item, idx) => (
              <div key={idx} className="group flex h-full items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 md:backdrop-blur-sm hover:border-white/20 hover:bg-white/10">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-highlight)] text-xs font-black tabular-nums text-[var(--brand-primary)]">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <p className="line-clamp-3 text-sm font-medium leading-relaxed text-white/80" title={item}>{item}</p>
              </div>
            ))}
          </CSSStagger>
          )}

          <CSSFadeIn delay={0.1}>
            <div className="mt-10 text-center">
              <Link
                href="/profile#visi-misi"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-highlight)]"
              >
                Lihat visi &amp; misi lengkap <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </CSSFadeIn>
        </div>
      </section>
      )}

      {/* ── FAQ ───────────────────────────────────────────── */}
      {faqItems.length > 0 && <FAQ items={faqItems} />}

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