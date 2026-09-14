import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowUpRight, CaretRight, Star, GraduationCap, BookOpen, ImageSquare, House, ChatCircle, ChartBar, Users, Checks, Megaphone, CalendarBlank, Trophy } from "@/components/Icons";
import { getNewsList, getFacilityList, getActivityList, getArticleList, getTeacherList, getSchoolProfile, getAchievementList } from "@/lib/queries";
import { FadeIn } from "@/components/Animations";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";

const FAQ = dynamic(() => import("./FAQ"), { loading: () => <div className="h-96" /> });
const WhatsAppButton = dynamic(() => import("./WhatsAppButton"));
const HeroCarousel = dynamic(() => import("./HeroCarousel"), { loading: () => <div className="h-[480px] md:h-[600px] rounded-2xl bg-[#082b59]/10" /> });
const TeacherCarousel = dynamic(() => import("./TeacherCarousel"), { loading: () => <div className="h-64 rounded-2xl bg-slate-100" /> });
const CountdownEvent = dynamic(() => import("@/components/CountdownEvent"));

function capitalizeCategory(cat: string): string {
  return cat
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}

const FACILITY_FALLBACKS: Record<string, string> = {
  "Ruang Kelas": "/images/Ruang-Kelas.jpg",
  "Lab Komputer": "/images/Lab-Komputer.jpeg",
  Masjid: "/images/Masjid.jpg",
  "Lapangan Olahraga": "/images/Lapangan-Olahraga.jpg",
};

export const metadata = {
  title: "Beranda | SMP Muhammadiyah 4 Tanggul",
  description: "SMP Muhammadiyah 4 Tanggul - Sekolah unggulan dengan program Tahfidz, keberbakatan, dan kepesantrenan. Daftar SPMB online sekarang.",
  alternates: { canonical: "/" },
};

export const revalidate = 3600;

type NewsItem = { id: string | number; slug: string; title: string; summary: string; category: string; image_url?: string | null; published_at?: string };

export default async function Home() {
  const [beritaRaw, dbFacilities, activities, articles, teachers, profile, achievements] = await Promise.all([
    getNewsList(4) as Promise<NewsItem[]>,
    getFacilityList(),
    getActivityList(4),
    getArticleList(4),
    getTeacherList(),
    getSchoolProfile(),
    getAchievementList(),
  ]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Bagaimana cara mendaftarkan anak ke SMP Muhammadiyah 4 Tanggul?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pendaftaran dapat dilakukan secara online melalui halaman SPMB kami. Isi data calon peserta didik, lengkapi dokumen yang diperlukan, dan ikuti tahapan seleksi yang akan diinformasikan oleh panitia.",
        },
      },
      {
        "@type": "Question",
        name: "Apa saja program unggulan yang tersedia?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kami memiliki 6 program unggulan: Program Tahfidz, Program Keberbakatan, Program Bahasa, Program Kepesantrenan, Program Akademik, dan 7 Golden Habits.",
        },
      },
      {
        "@type": "Question",
        name: "Berapa biaya masuk dan SPP per bulan?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Informasi lengkap mengenai biaya pendidikan dapat dilihat di halaman SPMB atau menghubungi bagian administrasi sekolah. Kami juga menyediakan beasiswa bagi siswa berprestasi.",
        },
      },
      {
        "@type": "Question",
        name: "Apakah tersedia fasilitas asrama?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ya, kami menyediakan fasilitas asrama yang nyaman dan aman bagi siswa program Boarding School. Asrama dilengkapi dengan fasilitas penunjang pembelajaran dan pembiasaan ibadah.",
        },
      },
      {
        "@type": "Question",
        name: "Bagaimana dengan kurikulum yang diterapkan?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kami menggunakan Kurikulum Merdeka yang dipadukan dengan ISMUBA (Al-Islam, Kemuhammadiyahan, dan Bahasa Arab) sebagai kurikulum khas Muhammadiyah.",
        },
      },
      {
        "@type": "Question",
        name: "Apakah ada kegiatan ekstrakurikuler?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tentu! Kami menyediakan berbagai kegiatan ekstrakurikuler seperti Sepak Bola, Futsal, Bulu Tangkis, Hizbul Wathan, Catur, Qiroah, dan masih banyak lagi.",
        },
      },
    ],
  };

  return (
    <div className="bg-white text-[#172033]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {/* ── HERO — only section using Framer Motion ───────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a]" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f4d21f] blur-[150px]" />
          <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#1767b1] blur-[180px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f4d21f]/30 to-transparent" />

        <div className="relative mx-auto grid max-w-[1296px] gap-12 px-6 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="text-white">
            <FadeIn delay={0.1}>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#f4d21f]/30 bg-[#f4d21f]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#f4d21f]">
                Pusat Kaderisasi Da&apos;i &amp; Ulama Hafidz &middot; School of Talents
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] md:text-5xl lg:text-6xl">
                Pendidikan yang menumbuhkan{" "}
                <span className="relative inline-block">
                  <span className="gradient-text">ilmu, iman,</span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 12" fill="none">
                    <path d="M2 8C40 2 80 2 100 6C120 10 160 10 198 4" stroke="#f4d21f" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>{" "}
                dan keberanian.
              </h1>
            </FadeIn>

            <FadeIn delay={0.35}>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70">
                SMP Muhammadiyah 4 Tanggul memadukan keunggulan akademik dan keislaman secara terintegrasi untuk membentuk kader umat yang berakhlak mulia.
              </p>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Link
                  href="/admission/register"
                  className="group inline-flex items-center gap-2 rounded-xl bg-[#f4d21f] px-6 py-3.5 text-sm font-bold text-[#082b59] transition-all hover:bg-white hover:shadow-lg hover:shadow-[#f4d21f]/20"
                >
                  Daftar
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link
                  href="/profile"
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 transition-colors hover:text-[#f4d21f]"
                >
                  Kenali sekolah
                  <CaretRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </FadeIn>
          </div>

          <FadeIn direction="left" delay={0.3}>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#f4d21f]/20 to-[#1767b1]/20 blur-2xl" />
              <HeroCarousel />
            </div>
          </FadeIn>
        </div>
      </section>

      <CountdownEvent />

      {/* ── SAMBUTAN ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#f4f7fb]" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <div className="mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
            <CSSFadeIn>
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-[#f4d21f]/30 to-[#1767b1]/20 blur-xl" />
                  <div className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-[#f4d21f] md:h-72 md:w-72">
                    <Image
                      src={profile?.principal_photo_url || "/images/Kepala-Sekolah.jpg"}
                      alt={`${profile?.principal_name || "Kepala Sekolah"} - Kepala Sekolah`}
                      fill
                      sizes="288px"
                      className="object-cover object-[center_15%]"
                      priority
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 rounded-2xl bg-[#082b59] px-4 py-2 shadow-lg">
                    <p className="text-xs font-bold text-white">Kepala Sekolah</p>
                  </div>
                </div>
              </div>
            </CSSFadeIn>

            <CSSFadeIn delay={0.1}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Sambutan Kepala Sekolah</p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#082b59] md:text-4xl">
                  Belajar dengan arah, tumbuh dengan nilai.
                </h2>
                <blockquote className="relative mt-6 border-l-2 border-[#f4d21f] pl-6">
                  <div className="absolute -left-3.5 top-0 h-7 w-7 rounded-full border-2 border-[#f4d21f] bg-[#f4f7fb]" />
                  <p className="text-base leading-relaxed text-slate-600 md:text-lg">
                    &ldquo;{profile?.principal_quote || "Selamat datang di SMP Muhammadiyah 4 Tanggul. Kami berkomitmen mencerdaskan kehidupan bangsa melalui pendidikan berkualitas yang memadukan keunggulan akademik dan pembentukan karakter Islami."}&rdquo;
                  </p>
                </blockquote>
                <footer className="mt-6 flex items-center gap-3 pl-6">
                  <div>
                    <p className="text-sm font-semibold text-[#082b59]">{profile?.principal_name || "Khoirul Anwar, S.Pd"}</p>
                    <p className="text-xs text-slate-500">Kepala Sekolah</p>
                  </div>
                </footer>
              </div>
            </CSSFadeIn>
          </div>
        </div>
      </section>

      {/* ── QUICK NAV (4 kolom) ────────────────────────────── */}
      <section className="bg-white" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
            {/* Berita */}
            <CSSFadeIn>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[#082b59]">Berita</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[#f4d21f]" />
                </div>
                <div className="flex flex-1 flex-col">
                  {beritaRaw.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <Megaphone className="h-9 w-9 text-[#082b59]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada berita</p>
                      <p className="mt-0.5 text-xs text-slate-400">Nantikan informasi terbaru dari sekolah</p>
                    </div>
                  ) : (
                    <>
                      <Link href="/news" className="group block overflow-hidden rounded-xl">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f7fb]">
                          {beritaRaw[0]?.image_url ? (
                            <Image src={beritaRaw[0].image_url} alt={beritaRaw[0].title} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Megaphone className="h-12 w-12 text-[#082b59]/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#082b59]/80 via-[#082b59]/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3.5">
                            <p className="text-[10px] font-bold text-white/70">Terbit: {beritaRaw[0]?.published_at ? new Date(beritaRaw[0].published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</p>
                            <h4 className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{beritaRaw[0]?.title || "Berita terbaru sekolah"}</h4>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2.5 space-y-2.5">
                        {beritaRaw.slice(1, 3).map((item) => (
                          <Link key={item.id} href={`/news/${item.slug}`} className="group flex gap-2.5">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f4f7fb]">
                              {item.image_url ? (
                                <Image src={item.image_url} alt={item.title} width={56} height={56} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Megaphone className="h-5 w-5 text-[#082b59]/15" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400">Terbit: {item.published_at ? new Date(item.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[#082b59] transition-colors group-hover:text-[#1767b1]">{item.title}</h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <Link href="/news" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#082b59] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1767b1]">
                  Selengkapnya
                </Link>
              </div>
            </CSSFadeIn>

            {/* Kegiatan */}
            <CSSFadeIn delay={0.05}>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[#082b59]">Kegiatan Sekolah</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[#f4d21f]" />
                </div>
                <div className="flex flex-1 flex-col">
                  {activities.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <CalendarBlank className="h-9 w-9 text-[#082b59]/15" />
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
                              <CalendarBlank className="h-12 w-12 text-[#082b59]/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#082b59]/80 via-[#082b59]/20 to-transparent" />
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
                                <Image src={item.image_url} alt={item.title} width={56} height={56} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <CalendarBlank className="h-5 w-5 text-[#082b59]/15" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400">{item.activity_type}</p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[#082b59] transition-colors group-hover:text-[#1767b1]">{item.title}</h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <Link href="/activities" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#082b59] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1767b1]">
                  Selengkapnya
                </Link>
              </div>
            </CSSFadeIn>

            {/* Fasilitas */}
            <CSSFadeIn delay={0.1}>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[#082b59]">Fasilitas</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[#f4d21f]" />
                </div>
                <div className="flex flex-1 flex-col">
                  {dbFacilities.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <ImageSquare className="h-9 w-9 text-[#082b59]/15" />
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
                          <div className="absolute inset-0 bg-gradient-to-t from-[#082b59]/80 via-[#082b59]/20 to-transparent" />
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
                                <Image src={f.image_url} alt={f.name} width={56} height={56} className="h-full w-full object-cover" />
                              ) : (
                                <Image src={FACILITY_FALLBACKS[f.name] || "/images/Ruang-Kelas.jpg"} alt={f.name} width={56} height={56} className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400">Fasilitas</p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[#082b59] transition-colors group-hover:text-[#1767b1]">{f.name}</h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <Link href="/profile#fasilitas" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#082b59] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1767b1]">
                  Selengkapnya
                </Link>
              </div>
            </CSSFadeIn>

            {/* Prestasi */}
            <CSSFadeIn delay={0.15}>
              <div className="flex h-full flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[#082b59]">Prestasi</h3>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-[#f4d21f]" />
                </div>
                <div className="flex flex-1 flex-col">
                  {achievements.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce3ed] bg-[#f4f7fb] py-10 text-center">
                      <Trophy className="h-9 w-9 text-[#082b59]/15" />
                      <p className="mt-2.5 text-sm font-medium text-slate-500">Belum ada prestasi</p>
                      <p className="mt-0.5 text-xs text-slate-400">Prestasi siswa akan segera ditampilkan</p>
                    </div>
                  ) : (
                    <>
                      <Link href="/achievements" className="group block overflow-hidden rounded-xl">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f7fb]">
                          {achievements[0]?.image_url ? (
                            <Image src={achievements[0].image_url} alt={achievements[0].title} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Trophy className="h-12 w-12 text-[#082b59]/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#082b59]/80 via-[#082b59]/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3.5">
                            <p className="text-[10px] font-bold text-white/70">{capitalizeCategory(achievements[0]?.category || "Prestasi")} · {achievements[0]?.year || "-"}</p>
                            <h4 className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{achievements[0]?.title || "Prestasi sekolah"}</h4>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2.5 space-y-2.5">
                        {achievements.slice(1, 3).map((a) => (
                          <Link key={a.id} href="/achievements" className="group flex gap-2.5">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f4f7fb]">
                              {a.image_url ? (
                                <Image src={a.image_url} alt={a.title} width={56} height={56} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Trophy className="h-5 w-5 text-[#082b59]/15" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400">{capitalizeCategory(a.category)} · {a.year}</p>
                              <h5 className="mt-0.5 line-clamp-2 text-xs font-medium text-[#082b59] transition-colors group-hover:text-[#1767b1]">{a.title}</h5>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <Link href="/achievements" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#082b59] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1767b1]">
                  Selengkapnya
                </Link>
              </div>
            </CSSFadeIn>
          </div>
        </div>
      </section>

      {/* ── PROGRAM UNGGULAN ──────────────────────────────── */}
      <section className="bg-white" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <CSSFadeIn>
            <div className="mb-12">
              <h2 className="text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Program unggulan</h2>
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
              <div key={title} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white p-5 transition-all hover:border-[#1767b1]/30 hover:shadow-xl hover:shadow-[#082b59]/5">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#f4d21f] to-[#1767b1] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#082b59] to-[#0d4a8a] text-white shadow-lg shadow-[#082b59]/20 transition-transform group-hover:scale-110">
                    <Icon weight="fill" className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-semibold text-[#082b59]">{title}</h3>
                    <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-slate-500">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </CSSStagger>
        </div>
      </section>

      {/* ── GURU & STAFF ────────────────────────────────── */}
      <section className="bg-white" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <CSSFadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Tim Pengajar</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Guru & Staff</h2>
            </div>
          </CSSFadeIn>

          <CSSFadeIn>
            <TeacherCarousel teachers={teachers.filter((t) => t.position !== "Kepala Sekolah")} />
          </CSSFadeIn>
        </div>
      </section>

      {/* ── ARTIKEL ──────────────────────────────────────── */}
      <section className="bg-[#f4f7fb]" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <div className="mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
          <CSSFadeIn>
            <div className="mb-12 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Artikel & Tips</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Artikel Sekolah</h2>
              </div>
               <Link href="/articles" className="text-sm font-semibold text-[#1767b1] transition-colors hover:text-[#082b59]">
                Semua artikel <ArrowUpRight className="inline h-4 w-4" />
              </Link>
            </div>
          </CSSFadeIn>

          <CSSStagger stagger={100} className="grid gap-6 md:grid-cols-2">
            {articles.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-16 text-center">
                <BookOpen className="h-12 w-12 text-[#082b59]/20" />
                <p className="mt-4 text-sm text-slate-500">Artikel masih kosong.</p>
                <p className="mt-1 text-xs text-slate-400">Nantikan tulisan dan tips dari guru kami.</p>
              </div>
            ) : articles.map((item) => (
              <Link key={item.slug} href={`/articles/${item.slug}`} className="group block rounded-2xl border border-[#dce3ed] bg-white p-6 transition-all hover:shadow-lg hover:shadow-[#082b59]/5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#1767b1]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1767b1]">{capitalizeCategory(item.category)}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[#082b59] transition-colors group-hover:text-[#1767b1]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-2">{item.excerpt}</p>
                <p className="mt-3 text-xs text-slate-400">oleh {item.author_name ?? "Tim MBS"}</p>
              </Link>
            ))}
          </CSSStagger>
        </div>
      </section>

      {/* ── WHY MUH4TA ────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] text-white" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1296px] px-6 py-14 md:px-10 md:py-20">
          <CSSFadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f4d21f]">Mengapa MUH4TA</p>
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
              <div key={title} className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4d21f]/10 text-[#f4d21f]">
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
      <section className="relative overflow-hidden border-t-8 border-[#f4d21f] bg-white">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f]/10 blur-[100px]" />
        <div className="relative mx-auto flex max-w-[1296px] flex-col gap-7 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-10">
          <CSSFadeIn>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-[#082b59]">Mulai langkah baru bersama kami.</h2>
            </div>
          </CSSFadeIn>
          <CSSFadeIn delay={0.1}>
            <Link href="/admission/register" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#082b59] px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#1767b1] hover:shadow-lg">
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
