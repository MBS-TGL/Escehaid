import Link from "next/link";
import Image from "next/image";
import { Users, GraduationCap, Eye, Checks, ArrowUpRight, Trophy, MapPin, Quotes } from "@/components/Icons";
import { getSchoolProfile, getTeacherList, getFacilityList, getAchievementList, getGalleryList, getEkskulList, registrationHref } from "@/lib/queries";
import { resolveVision, parseMissionItems } from "@/lib/queries/profile";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import TeacherGrid from "./TeacherGrid";
import FacilityGrid from "./FacilityGrid";
import EkskulCard from "@/components/EkskulCard";
import HistoryCarousel from "./HistoryCarousel";
import { detectPrincipalGreeting, keepTogether } from "@/lib/principal-quote";

export const metadata = {
  title: "Profil",
  description: "Kenali SMP Muhammadiyah 4 Tanggul - Visi, misi, tenaga pengajar, dan fasilitas sekolah unggulan di Tanggul, Jember.",
  alternates: { canonical: "/profile" },
};

export const revalidate = 3600;

const SALAM_BUKA = "Assalamu'alaikum Warahmatullahi Wabarakatuh.";
const SALAM_TUTUP = "Wassalamu'alaikum Warahmatullahi Wabarakatuh.";
const PRINCIPAL_QUOTE_FALLBACK =
  "Selamat datang di SMP Muhammadiyah 4 Tanggul. Kami berkomitmen mendampingi setiap peserta didik bertumbuh dengan memadukan keunggulan akademik, akhlak karimah, dan pembentukan karakter Islami menuju generasi yang berilmu dan berdaya saing.";

const CV = { contentVisibility: "auto", containIntrinsicSize: "auto 720px" } as React.CSSProperties;

export default async function ProfilPage() {
  const [profil, teachers, facilities, achievements, gallery, settings, ekskulList] = await Promise.all([
    getSchoolProfile(),
    getTeacherList(),
    getFacilityList(),
    getAchievementList(),
    getGalleryList(8),
    getSiteSettings(),
    getEkskulList(),
  ]);
  const brand = toPublicBrand(settings);
  const schoolName = settings.values.site_name.trim() || profil?.school_name || "SMP Muhammadiyah 4 Tanggul";

  const principalQuote = (profil?.principal_quote || PRINCIPAL_QUOTE_FALLBACK).trim();
  const { startsWithGreeting, endsWithGreeting } = detectPrincipalGreeting(principalQuote);
  const quoteTypeClass =
    principalQuote.length <= 140
      ? "text-xl sm:text-2xl lg:text-[26px]"
      : principalQuote.length <= 300
        ? "text-lg sm:text-xl lg:text-[22px]"
        : "text-base sm:text-lg";

  const principalQuoteWords = (() => {
    const trimmed = principalQuote.trim();
    const tokens = trimmed.split(/\s+/);
    const tail = tokens[tokens.length - 1] || "";
    return { head: trimmed.slice(0, trimmed.length - tail.length), tail };
  })();

  const visionText = resolveVision(profil);
  const missionItems = parseMissionItems(profil?.mission);

  const daftarHref = registrationHref(profil).trim();

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "Profil", item: "https://www.smpmuh4tanggul.sch.id/profile" },
          ],
        })
      }} />
      {/* Hero — compact */}
      <PageHero
        variant="compact"
        eyebrow="Tentang Kami"
        title="Profil Sekolah"
        description={`Mengenal ${profil?.school_name || "SMP Muhammadiyah 4 Tanggul"} lebih dekat`}
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Profil" }]}
      />

      {/* Tentang Kami */}
      <section id="sejarah" className="scroll-mt-24 bg-white py-12 sm:py-20 md:scroll-mt-28" style={CV}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Left — Narasi Sejarah (7 cols) */}
            <CSSFadeIn className="lg:col-span-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Tentang Kami</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">
                  Sejarah Singkat
                </h2>
                <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-600">
                  {profil?.history ? (
                    <p>{profil.history}</p>
                  ) : (
                    <>
                      <p>
                        SMP Muhammadiyah 4 Tanggul adalah sekolah menengah pertama berasrama di bawah naungan Persyarikatan Muhammadiyah yang berkomitmen mencerdaskan generasi muda yang unggul dalam bidang akademik maupun keagamaan.
                      </p>
                      <p>
                        Didirikan dengan semangat kaderisasi Da&apos;i dan Ulama Hafidz, sekolah ini hadir sebagai pusat pendidikan yang memadukan Kurikulum Merdeka dengan ISMUBA (Al-Islam, Kemuhammadiyahan, dan Bahasa Arab).
                      </p>
                      <p>
                        Berlokasi di Jl. Pemandian No. 88, Patemon, Tanggul, Jember, sekolah ini menyediakan lingkungan belajar yang kondusif bagi siswa untuk tumbuh dan berkembang secara holistik.
                      </p>
                    </>
                  )}
                </div>

                {/* Badges Akreditasi & NPSN */}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={
                      brand.npsn.trim()
                        ? `https://dapo.kemendikdasmen.go.id/sekolah?npsn=${brand.npsn.trim()}`
                        : "https://dapo.kemendikdasmen.go.id/"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#f4f7fb] px-4 py-2.5 text-sm font-semibold text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)]/10"
                  >
                    <GraduationCap className="h-4 w-4 text-[var(--brand-accent)]" />
                    Akreditasi {brand.accreditation.trim() || profil?.accreditation || "A"}
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>

                  {brand.npsn.trim() && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce3ed] px-4 py-2.5 text-sm font-medium text-slate-600">
                      NPSN: <span className="font-semibold text-slate-900">{brand.npsn.trim()}</span>
                    </span>
                  )}
                </div>
              </div>
            </CSSFadeIn>

            {/* Right — Carousel Kilas Balik Sejarah (5 cols) */}
            <CSSFadeIn delay={0.12} className="lg:col-span-5">
              <HistoryCarousel />
            </CSSFadeIn>
          </div>
        </div>
      </section>

      {/* ── SAMBUTAN KEPALA SEKOLAH ───────────────────────── */}
      <section id="sambutan" className="relative overflow-hidden bg-[#f4f7fb] py-12 sm:py-16 md:scroll-mt-28 md:py-24" style={CV}>
        {/* Watermark kutipan halus di pojok kanan atas */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-4 select-none text-slate-200/60 hidden sm:block lg:right-16 lg:top-8"
        >
          <Quotes weight="fill" className="h-44 w-44 md:h-60 md:w-60" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-10 sm:gap-14 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[360px_minmax(0,1fr)]">
            {/* Kolom Foto Kepala Sekolah — Portrait Elegan Berwibawa */}
            <CSSFadeIn>
              <div className="relative mx-auto w-full max-w-[240px] sm:max-w-[320px] lg:max-w-none">
                {/* Backdrop offset lembut */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-2.5 -rotate-1 rounded-3xl bg-gradient-to-br from-[var(--brand-primary)]/15 via-[var(--brand-accent)]/10 to-transparent sm:rounded-[28px]"
                />

                {/* Frame foto utama: kurva rounded-3xl modern, aspect 4/5 profesional */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-xl ring-1 ring-black/5 sm:rounded-3xl">
                  <Image
                    src={profil?.principal_photo_url || "/images/Kepala-Sekolah.jpg"}
                    alt={`${profil?.principal_name || "Khoirul Anwar, S.Pd"} - Kepala Sekolah`}
                    fill
                    sizes="(min-width: 1280px) 360px, (min-width: 1024px) 320px, (min-width: 640px) 320px, 280px"
                    className="object-cover object-[center_16%] transition-transform duration-700 hover:scale-105"
                  />

                  {/* Overlay gradien halus di mobile */}
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent sm:hidden" />
                  <div className="absolute inset-x-4 bottom-4 sm:hidden">
                    <p className="text-base font-bold text-white drop-shadow-sm">
                      {profil?.principal_name || "Khoirul Anwar, S.Pd"}
                    </p>
                    <p className="text-xs text-slate-200 drop-shadow-sm">
                      Kepala {schoolName}
                    </p>
                  </div>
                </div>

                {/* Floating badge resmi di bawah foto (tablet & desktop) */}
                <div className="absolute -bottom-3.5 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200/90 bg-white/95 px-4 py-1.5 shadow-md shadow-slate-900/5 backdrop-blur-sm sm:inline-flex">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-700">Kepala Sekolah</span>
                </div>
              </div>
            </CSSFadeIn>

            {/* Kolom Teks Sambutan — Tipografi Editorial Bermartabat */}
            <CSSFadeIn delay={0.1}>
              <div className="flex flex-col justify-center">
                {/* Eyebrow badge */}
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--brand-primary)]/15 bg-white/90 px-3.5 py-1 text-xs font-semibold text-[var(--brand-primary)] shadow-xs">
                  <Quotes weight="fill" className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
                  <span>Sambutan Kepala Sekolah</span>
                </div>

                {/* Salam Pembuka */}
                {!startsWithGreeting && (
                  <p className="mt-5 text-sm font-medium text-slate-600 sm:text-base">
                    {SALAM_BUKA}
                  </p>
                )}

                {/* Kutipan Utama */}
                <blockquote className={startsWithGreeting ? "mt-4" : "mt-3"}>
                  <p className={`${quoteTypeClass} font-normal leading-[1.7] tracking-normal text-slate-800 text-pretty`}>
                    &ldquo;{endsWithGreeting ? (
                      <>
                        {keepTogether(principalQuoteWords.head)}
                        <span className="whitespace-nowrap">
                          {keepTogether(principalQuoteWords.tail)} <span aria-hidden="true" className="font-bold text-[var(--brand-highlight)]">&rdquo;</span>
                        </span>
                      </>
                    ) : (
                      <>
                        {keepTogether(principalQuote)} <span aria-hidden="true" className="font-bold text-[var(--brand-highlight)]">&rdquo;</span>
                      </>
                    )}
                  </p>
                </blockquote>

                {/* Salam Penutup */}
                {!endsWithGreeting && (
                  <p className="mt-4 text-sm font-medium text-slate-600 sm:text-base">
                    {SALAM_TUTUP}
                  </p>
                )}

                {/* Identitas Pimpinan & Komitmen Kurikulum */}
                <div className="mt-8 border-t border-slate-200/80 pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="hidden sm:block">
                      <h3 className="text-lg font-bold text-[var(--brand-primary)] sm:text-xl">
                        {profil?.principal_name || "Khoirul Anwar, S.Pd"}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 sm:text-sm">
                        Kepala {schoolName}
                      </p>
                    </div>

                    {/* Chips Komitmen Pendidikan Terintegrasi */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-primary)]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] shadow-xs">
                        <GraduationCap className="h-3.5 w-3.5 text-[var(--brand-accent)]" /> Kurikulum Merdeka
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-primary)]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] shadow-xs">
                        <Checks className="h-3.5 w-3.5 text-emerald-600" /> ISMUBA Unggulan
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CSSFadeIn>
          </div>
        </div>
      </section>

      {/* ── VISI & MISI SEKOLAH ───────────────────────────── */}
      <section id="visi-misi" className="scroll-mt-24 bg-white py-12 sm:py-16 md:scroll-mt-28 md:py-24" style={CV}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <CSSFadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Arah & Landasan</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">
                Visi & Misi Sekolah
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 md:text-base">
                Kompas nilai dan komitmen strategis kami dalam mencetak generasi unggul berkarakter Islami.
              </p>
            </div>
          </CSSFadeIn>

          {/* 1. Hero Visi Card (Full Width Banner) */}
          <CSSFadeIn delay={0.05}>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)] p-5 text-white shadow-xl shadow-[var(--brand-primary)]/15 sm:p-8 md:p-12 lg:p-14">
              {/* Watermark aksen latar belakang */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 select-none text-white/[0.04] lg:-right-12 lg:-top-12"
              >
                <Quotes weight="fill" className="h-64 w-64 md:h-80 md:w-80" />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[var(--brand-highlight)]/10 blur-3xl"
              />

              <div className="relative z-10">
                {/* Header Badge Visi */}
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--brand-highlight)] backdrop-blur-md">
                  <Eye className="h-4 w-4" weight="bold" />
                  <span>Visi Utama Sekolah</span>
                </div>

                {/* Teks Visi Utama */}
                <h3 className="mt-6 font-serif-quote text-xl font-normal leading-relaxed text-white sm:text-2xl md:text-3xl lg:text-[34px] lg:leading-[1.4] text-pretty">
                  &ldquo;{visionText}&rdquo;
                </h3>

                {/* 3 Pilar Inti Penjabaran Visi — hanya bila visi terisi di DB
                    (pilar adalah penjabaran visi; tanpa visi asli janggal) */}
                {Boolean(profil?.vision?.trim()) && (
                <div className="mt-7 grid gap-4 border-t border-white/15 pt-6 sm:mt-10 sm:grid-cols-3 sm:pt-8">
                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 backdrop-blur-xs">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-highlight)] text-xs font-black text-[var(--brand-primary)]">
                      01
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Kader Da&apos;i & Ulama</h4>
                      <p className="mt-0.5 text-xs text-slate-300">Berakhlak mulia, hafidz Al-Qur&apos;an, dan berilmu amaliyah.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 backdrop-blur-xs">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-highlight)] text-xs font-black text-[var(--brand-primary)]">
                      02
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Berwawasan Global</h4>
                      <p className="mt-0.5 text-xs text-slate-300">Penguasaan sains, teknologi, serta bahasa asing aktif.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 backdrop-blur-xs">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-highlight)] text-xs font-black text-[var(--brand-primary)]">
                      03
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Berbudaya Lingkungan</h4>
                      <p className="mt-0.5 text-xs text-slate-300">Peduli kebersihan, keberlanjutan, dan cinta lingkungan hidup.</p>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </CSSFadeIn>

          {/* 2. Grid Kartu Misi (6 Butir Terstruktur) */}
          <div className="mt-14">
            <CSSFadeIn delay={0.08}>
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm">
                    <Checks className="h-5 w-5 text-[var(--brand-highlight)]" weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--brand-primary)] md:text-2xl">Misi Strategis</h3>
                    <p className="text-xs text-slate-500">Langkah nyata mewujudkan visi sekolah sehari-hari</p>
                  </div>
                </div>
                <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline-block">
                  {missionItems.length} Misi Pokok
                </span>
              </div>
            </CSSFadeIn>

            <CSSStagger stagger={50} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {missionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--brand-accent)]/40 hover:bg-white hover:shadow-lg hover:shadow-[var(--brand-primary)]/5"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold tabular-nums text-[var(--brand-primary)] shadow-xs transition-colors group-hover:border-[var(--brand-accent)]/30 group-hover:bg-[var(--brand-primary)] group-hover:text-white">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[14px] font-medium leading-relaxed text-slate-700 transition-colors group-hover:text-slate-900">
                      {item}
                    </p>
                  </div>
                  <div className="mt-4 h-0.5 w-6 rounded-full bg-[var(--brand-highlight)] opacity-60 transition-all duration-300 group-hover:w-12 group-hover:opacity-100 sm:opacity-0" />
                </div>
              ))}
            </CSSStagger>
          </div>
        </div>
      </section>

      {/* Fasilitas Sekolah */}
      {facilities.length > 0 && (
        <section id="fasilitas" className="scroll-mt-24 bg-[#f4f7fb] py-12 sm:py-20 md:scroll-mt-28" style={CV}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <CSSFadeIn>
              <div className="mb-12">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Infrastruktur</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Fasilitas Sekolah</h2>
              </div>
            </CSSFadeIn>

            <FacilityGrid facilities={facilities} />

            {/* Ajakan lanjut — teks statis, tombol daftar hanya bila href valid */}
            <CSSFadeIn delay={0.1}>
              <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl border border-[#dce3ed] bg-white p-6 sm:flex-row">
                <p className="text-center text-sm font-medium text-[var(--brand-primary)] sm:text-left sm:text-base">
                  Ingin melihat langsung suasana sekolah?
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/contact"
                    className="rounded-xl border border-[#dce3ed] px-5 py-3 text-sm font-semibold text-[var(--brand-primary)] transition hover:border-[var(--brand-primary)] hover:bg-[#f4f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
                  >
                    Hubungi Panitia
                  </Link>
                  {daftarHref && (
                    <Link
                      href={daftarHref}
                      className="rounded-xl bg-[var(--brand-accent)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
                    >
                      Daftar SPMB
                    </Link>
                  )}
                </div>
              </div>
            </CSSFadeIn>
          </div>
        </section>
      )}

      {/* Ekstrakurikuler — hanya dirender bila ada data ekskul aktif */}
      {ekskulList.length > 0 && (
        <section id="ekstrakurikuler" className="scroll-mt-24 bg-white py-12 sm:py-20 md:scroll-mt-28" style={CV}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <CSSFadeIn>
              <div className="mb-12">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Pengembangan Diri</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Ekstrakurikuler</h2>
              </div>
            </CSSFadeIn>

            <CSSStagger stagger={80} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
              {ekskulList.map((item) => (
                <EkskulCard key={item.id} item={item} />
              ))}
            </CSSStagger>
          </div>
        </section>
      )}

      {/* Prestasi Highlights */}
      {achievements.length > 0 && (
        <section id="prestasi" className="scroll-mt-24 bg-[#f4f7fb] py-12 sm:py-20 md:scroll-mt-28" style={CV}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <CSSFadeIn>
              <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-[#dce3ed] bg-white p-6 sm:flex-row">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20">
                    <Trophy className="h-6 w-6 text-[var(--brand-highlight)]" weight="fill" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Pencapaian</p>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--brand-primary)]">Prestasi Sekolah</h3>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {achievements.slice(0, 2).map((a) => (
                    <span key={a.id} className="hidden rounded-full bg-[var(--brand-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-accent)] sm:inline-block">
                      {a.title.length > 30 ? a.title.substring(0, 30) + "..." : a.title}
                    </span>
                  ))}
                  <Link href="/achievements" className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--brand-accent)]">
                    Lihat semua <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </CSSFadeIn>
          </div>
        </section>
      )}

      {/* Guru & Staff */}
      <section id="guru" className="scroll-mt-24 bg-white md:scroll-mt-28" style={CV}>
        <div className="mx-auto max-w-[1296px] px-4 py-10 sm:px-6 sm:py-12 md:px-10 md:py-16">
          <CSSFadeIn>
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Guru & Staff</h2>
              <p className="mt-2 text-sm text-slate-500">{teachers.length} pendidik & tenaga kependidikan</p>
            </div>
          </CSSFadeIn>

          {teachers.length === 0 ? (
            <CSSFadeIn>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] py-16 text-center">
                <Users className="h-12 w-12 text-[var(--brand-primary)]/20" />
                <p className="mt-4 text-sm text-slate-500">Data guru masih kosong.</p>
              </div>
            </CSSFadeIn>
          ) : (
            <TeacherGrid teachers={teachers} />
          )}
        </div>
      </section>

      {/* Galeri Preview */}
      {gallery.length > 0 && (
        <section id="galeri" className="scroll-mt-24 bg-[#f4f7fb] py-12 sm:py-20 md:scroll-mt-28" style={CV}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <CSSFadeIn>
              <div className="mb-12 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Dokumentasi</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">Galeri Sekolah</h2>
                </div>
                <Link href="/gallery" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]">
                  Lihat semua <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </CSSFadeIn>

            <CSSStagger stagger={60} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {gallery.slice(0, 8).map((g) => (
                <Link key={g.id} href="/gallery" className="group relative block aspect-square overflow-hidden rounded-xl transition-transform duration-150 active:scale-[0.99]">
                  <Image
                    src={g.thumbnail_url || g.url || "/images/Ruang-Kelas.jpg"}
                    alt={g.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/60 via-transparent to-transparent transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                    <p className="text-xs font-semibold text-white line-clamp-1">{g.title}</p>
                    {g.category && (
                      <span className="mt-1 inline-block rounded-full bg-[var(--brand-accent)]/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{g.category}</span>
                    )}
                  </div>
                </Link>
              ))}
            </CSSStagger>
          </div>
        </section>
      )}

      {/* Kontak & Lokasi */}
      <section id="kontak" className="scroll-mt-24 bg-white py-12 sm:py-20 md:scroll-mt-28" style={CV}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <CSSFadeIn>
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-6 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20">
                  <MapPin className="h-6 w-6 text-[var(--brand-highlight)]" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Lokasi Kami</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {profil?.address || "Jl. Pemandian No. 88, Patemon, Tanggul, Jember, Jawa Timur"}
                  </p>
                </div>
              </div>
              <Link href="/contact" className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--brand-accent)] sm:w-auto">
                Hubungi Kami <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </CSSFadeIn>
        </div>
      </section>

      {/* CTA SPMB */}
      <section className="relative overflow-hidden border-t-8 border-[var(--brand-highlight)] bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--brand-highlight)] blur-[120px]" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-7 px-4 py-12 text-center sm:py-16 md:flex-row md:justify-between md:text-left">
          <CSSFadeIn>
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-highlight)]">Penerimaan Peserta Didik Baru</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Mulai langkah baru bersama kami.</h2>
              <p className="mt-3 text-sm text-white/70">Bergabunglah menjadi bagian dari keluarga besar SMP Muhammadiyah 4 Tanggul.</p>
            </div>
          </CSSFadeIn>
          <CSSFadeIn delay={0.1}>
            <Link href={registrationHref(profil)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-accent)] px-7 py-4 text-sm font-bold text-white transition-all hover:bg-white hover:text-[var(--brand-primary)] hover:shadow-lg hover:shadow-[var(--brand-accent)]/20 sm:w-fit">
              Daftar sekarang <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CSSFadeIn>
        </div>
      </section>
    </div>
  );
}
