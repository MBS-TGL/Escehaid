import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CaretRight, Star, GraduationCap, BookOpen, FileText, Newspaper, ImageSquare, House, Clock, User } from "@/components/icons";
import { getNewsList, getTeacherList, getFacilityList, getArticleList } from "@/lib/queries";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/animations";
import ImageWithLoader from "@/components/ImageWithLoader";
import FAQ from "@/components/FAQ";
import WhatsAppButton from "@/components/WhatsAppButton";
import HeroCarousel from "@/components/HeroCarousel";

type NewsItem = { id: string | number; slug: string; title: string; summary: string; category: string; image_url?: string | null; published_at?: string };

export default async function Home() {
  const [beritaRaw, dbFacilities, articles] = await Promise.all([
    getNewsList(4) as Promise<NewsItem[]>,
    getFacilityList(),
    getArticleList(4),
  ]);

  const fallbackFacilities: [string, string, string?, string?][] = [
    ["Ruang Kelas", "Ruang nyaman dengan Projector, Whiteboard, dan IFP interaktif", "/images/Ruang-Kelas.jpg"],
    ["Lab Komputer", "Ruang lab yang nyaman dengan komputer dan internet untuk belajar serta variasi materi", "/images/Lab-Komputer.jpeg"],
    ["Masjid", "Pusat ibadah, kajian keislaman, dan kegiatan tahfidz Qur'an", "/images/Masjid.jpg"],
    ["Lapangan Olahraga", "Lapangan terawat untuk kegiatan olahraga dan aktivitas fisik siswa", "/images/Lapangan-Olahraga.jpg", "object-bottom"],
  ];
  const facilities: [string, string, string?, string?][] = dbFacilities.length > 0 && dbFacilities.some(f => f.image_url)
    ? dbFacilities.map((f) => [f.name, f.description, f.image_url || undefined])
    : fallbackFacilities;

  return (
    <div className="bg-white text-[#172033]">
      {/* ── HERO ──────────────────────────────────────────── */}
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
              <div className="mt-8 flex gap-8">
                {[
                  ["A", "Akreditasi"],
                  ["14", "Guru"],
                  ["164", "Siswa"],
                  ["7", "Rombel"],
                ].map(([value, label]) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-bold text-[#f4d21f] md:text-3xl">{value}</p>
                    <p className="mt-1 text-xs text-white/50">{label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.45}>
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

      {/* ── SAMBUTAN (2 kolom: foto + teks) ──────────────── */}
      <section className="relative overflow-hidden bg-[#f4f7fb]">
        <div className="mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
            {/* Foto Kepala Sekolah */}
            <FadeIn>
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-[#f4d21f]/30 to-[#1767b1]/20 blur-xl" />
                  <div className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-[#f4d21f] md:h-72 md:w-72">
                    <ImageWithLoader
                      src="/images/Kepala-Sekolah.jpg"
                      alt="Khoirul Anwar, S.Pd - Kepala Sekolah"
                      className="h-full w-full object-cover object-[center_15%]"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 rounded-2xl bg-[#082b59] px-4 py-2 shadow-lg">
                    <p className="text-xs font-bold text-white">Kepala Sekolah</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Teks Sambutan */}
            <FadeIn direction="left">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Sambutan Kepala Sekolah</p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#082b59] md:text-4xl">
                  Belajar dengan arah, tumbuh dengan nilai.
                </h2>
                <blockquote className="relative mt-6 border-l-2 border-[#f4d21f] pl-6">
                  <div className="absolute -left-3.5 top-0 h-7 w-7 rounded-full border-2 border-[#f4d21f] bg-[#f4f7fb]" />
                  <p className="text-base leading-relaxed text-slate-600 md:text-lg">
                    &ldquo;Selamat datang di SMP Muhammadiyah 4 Tanggul. Kami berkomitmen mencerdaskan kehidupan bangsa melalui pendidikan berkualitas yang memadukan keunggulan akademik dan pembentukan karakter Islami.&rdquo;
                  </p>
                </blockquote>
                <footer className="mt-6 flex items-center gap-3 pl-6">
                  <div>
                    <p className="text-sm font-semibold text-[#082b59]">Khoirul Anwar, S.Pd</p>
                    <p className="text-xs text-slate-500">Kepala Sekolah</p>
                  </div>
                </footer>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── GURU & STAFF ────────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
          <FadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Tim Pengajar</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Guru & Staff</h2>
            </div>
          </FadeIn>

          <StaggerChildren stagger={0.1} className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Durrotun Nasyihin, S.Ag", "Guru PAI"],
              ["Ainul Farhan, S.Pd", "Guru Matematika"],
              ["Rudi Hartono, S.Pd", "Guru Bahasa Inggris"],
              ["Jimi Priyo Assiddiq, S.Pd., M.Pd", "Guru TIK"],
              ["Muhammad Arif, S.Pd., M.Pd", "Guru IPA"],
            ].map(([name, role]) => (
              <StaggerItem key={name}>
                <div className="group text-center">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-3 border-[#f4f7fb] bg-[#f4f7fb] transition-all group-hover:border-[#f4d21f] group-hover:bg-[#f4d21f]/10 md:h-32 md:w-32">
                    <User className="h-12 w-12 text-[#082b59]/40 transition-colors group-hover:text-[#082b59]" weight="light" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[#082b59]">{name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{role}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── PROGRAM UNGGULAN ──────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
          <FadeIn>
            <div className="mb-12 flex items-end justify-between gap-6">
              <h2 className="text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Program unggulan</h2>
               <Link href="/profile" className="hidden text-sm font-semibold text-[#1767b1] md:inline-flex md:items-center md:gap-1">
                Selengkapnya <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>

          <StaggerChildren stagger={0.12} className="grid gap-5 md:grid-cols-2">
            {([
              ["Boarding School", "Program asrama yang membentuk kedisiplinan, kemandirian, dan kebersamaan siswa dalam lingkungan Islami.", House],
              ["Full-day School", "Pembelajaran sehari penuh dari pagi hingga sore dengan pembiasaan ibadah dan kegiatan positif.", Clock],
            ] as [string, string, typeof Star][]).map(([title, description, Icon]) => (
              <StaggerItem key={title}>
                <div className="group relative overflow-hidden rounded-2xl border border-[#dce3ed] bg-white p-6 transition-all hover:border-[#1767b1]/30 hover:shadow-xl hover:shadow-[#082b59]/5">
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#f4d21f] to-[#1767b1] opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="flex gap-5">
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#082b59] to-[#0d4a8a] text-white shadow-lg shadow-[#082b59]/20 transition-transform group-hover:scale-110">
                      <Icon weight="fill" className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#082b59]">{title}</h3>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── FASILITAS ─────────────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
          <FadeIn>
            <div className="mb-12 flex items-end justify-between">
              <h2 className="text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Fasilitas untuk bertumbuh</h2>
              <Link href="/gallery" className="text-sm font-semibold text-[#1767b1] transition-colors hover:text-[#082b59]">
                Lihat galeri <ArrowUpRight className="inline h-4 w-4" />
              </Link>
            </div>
          </FadeIn>

          <StaggerChildren stagger={0.12} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {facilities.map(([title, description, image, pos]) => (
              <StaggerItem key={title}>
                <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] transition-all hover:shadow-lg hover:shadow-[#082b59]/5">
                  <div className="relative h-40 overflow-hidden bg-[#f4f7fb]">
                    <ImageWithLoader
                      src={image || `https://picsum.photos/seed/${encodeURIComponent(title)}/400/300`}
                      alt={title}
                      className="h-full w-full"
                      imgClassName={`transition-transform duration-500 group-hover:scale-105 ${pos || ""}`}
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-semibold text-[#082b59]">{title}</h3>
                    <p className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-600">{description}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── WHY MUH4TA (dark, full-width) ────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f4d21f]">Mengapa MUH4TA</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
                Sekolah yang dekat, terarah, dan terus bergerak maju.
              </h2>
            </div>
          </FadeIn>

          <StaggerChildren stagger={0.12} className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              ["Pendampingan dekat", "Guru hadir mendampingi proses belajar dan perkembangan setiap peserta didik."],
              ["Nilai yang terintegrasi", "Pembelajaran akademik berjalan bersama pembiasaan ibadah dan akhlak."],
              ["Berani mencoba", "Siswa mendapat ruang untuk bertanya, berkarya, dan mengembangkan potensi."],
            ].map(([title, description]) => (
              <StaggerItem key={title}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── VISI DAN MISI (bento-style, alternating) ────── */}
      <section className="bg-[#f4f7fb]">
        <div className="mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
          <FadeIn>
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-[#082b59] md:text-4xl">
                Kader umat yang berakhlak, berilmu, dan siap bersaing global.
              </h2>
            </div>
          </FadeIn>

          <StaggerChildren stagger={0.1} className="grid gap-6 md:grid-cols-2">
            <StaggerItem>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-[#dce3ed] bg-white p-8">
                <div>
                  <p className="text-sm font-bold text-[#1767b1]">Visi</p>
                  <p className="mt-4 text-base leading-relaxed text-slate-600">
                    Mendidik kader umat Islam yang berakhlak mulia, berilmu pengetahuan dan teknologi, serta mampu bersaing secara global.
                  </p>
                </div>
                <div className="mt-6 h-1 w-12 rounded-full bg-[#f4d21f]" />
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-[#dce3ed] bg-white p-8">
                <div>
                  <p className="text-sm font-bold text-[#1767b1]">Fokus pendidikan</p>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600">
                    {["Keunggulan akademik", "Keislaman yang terintegrasi", "Karakter dan daya saing global"].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4d21f]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 h-1 w-12 rounded-full bg-[#f4d21f]" />
              </div>
            </StaggerItem>
          </StaggerChildren>
        </div>
      </section>

      {/* ── LAYANAN SEKOLAH (icons, not text-only) ────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-24">
          <FadeIn>
            <div className="mb-12">
              <h2 className="text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">
                Semua informasi dalam satu tempat.
              </h2>
            </div>
          </FadeIn>

          <StaggerChildren stagger={0.12} className="grid gap-6 md:grid-cols-3">
            {([
              ["SPMB online", "Informasi jalur, jadwal, dan pendaftaran peserta didik baru.", "/admission", FileText],
              ["Berita & pengumuman", "Ikuti kabar, kegiatan, dan pencapaian terbaru sekolah.", "/news", Newspaper],
              ["Galeri sekolah", "Lihat dokumentasi aktivitas dan lingkungan belajar kami.", "/gallery", ImageSquare],
            ] as [string, string, string, typeof FileText][]).map(([title, description, href, Icon]) => (
              <StaggerItem key={title}>
                <Link href={href} className="group block rounded-2xl border border-[#dce3ed] p-6 transition-all hover:border-[#1767b1]/30 hover:shadow-lg hover:shadow-[#082b59]/5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#082b59]/5 text-[#1767b1] transition-colors group-hover:bg-[#082b59] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#082b59] transition-colors group-hover:text-[#1767b1]">
                    {title} <ArrowUpRight className="inline h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">{description}</p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <FAQ />

      {/* ── BERITA (with images) ──────────────────────────── */}
      <section className="bg-[#082b59] text-white">
          <div className="mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
            <FadeIn>
              <div className="mb-12 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f4d21f]">Informasi terbaru</p>
                  <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Berita sekolah</h2>
                </div>
                 <Link href="/news" className="text-sm font-semibold text-white/70 hover:text-white transition-colors">
                  Semua berita <ArrowUpRight className="inline h-4 w-4" />
                </Link>
              </div>
            </FadeIn>

            <StaggerChildren stagger={0.1} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {beritaRaw.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
                  <Newspaper className="h-12 w-12 text-white/20" />
                  <p className="mt-4 text-sm text-white/50">Berita masih kosong.</p>
                  <p className="mt-1 text-xs text-white/30">Nantikan informasi terbaru dari sekolah.</p>
                </div>
              ) : beritaRaw.map((item) => (
                <StaggerItem key={item.id}>
                  <Link href={`/news/${item.slug}`} className="group block overflow-hidden rounded-2xl border border-white/10 transition-all hover:border-[#f4d21f]/30">
                    <div className="relative h-36 overflow-hidden bg-white/5">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <img
                          src={`https://picsum.photos/seed/${encodeURIComponent(item.title)}/400/300`}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-60"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#082b59]/60 to-transparent" />
                      <span className="absolute left-3 top-3 rounded-full bg-[#f4d21f] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#082b59]">
                        {item.category}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold leading-snug transition-colors group-hover:text-[#f4d21f] line-clamp-2">{item.title}</h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/50">{item.summary}</p>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </section>

      {/* ── ARTIKEL ──────────────────────────────────────── */}
      <section className="bg-[#f4f7fb]">
        <div className="mx-auto max-w-[1296px] px-6 py-20 md:px-10 md:py-28">
          <FadeIn>
            <div className="mb-12 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Artikel & Tips</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Artikel Sekolah</h2>
              </div>
               <Link href="/articles" className="text-sm font-semibold text-[#1767b1] transition-colors hover:text-[#082b59]">
                Semua artikel <ArrowUpRight className="inline h-4 w-4" />
              </Link>
            </div>
          </FadeIn>

          <StaggerChildren stagger={0.1} className="grid gap-6 md:grid-cols-2">
            {articles.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-16 text-center">
                <BookOpen className="h-12 w-12 text-[#082b59]/20" />
                <p className="mt-4 text-sm text-slate-500">Artikel masih kosong.</p>
                <p className="mt-1 text-xs text-slate-400">Nantikan tulisan dan tips dari guru kami.</p>
              </div>
            ) : articles.map((item) => (
              <StaggerItem key={item.slug}>
                <Link href={`/articles/${item.slug}`} className="group block rounded-2xl border border-[#dce3ed] bg-white p-6 transition-all hover:shadow-lg hover:shadow-[#082b59]/5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#1767b1]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1767b1]">{item.category}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-[#082b59] transition-colors group-hover:text-[#1767b1]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-2">{item.excerpt}</p>
                  <p className="mt-3 text-xs text-slate-400">oleh {item.author}</p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t-8 border-[#f4d21f] bg-white">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f]/10 blur-[100px]" />
        <div className="relative mx-auto flex max-w-[1296px] flex-col gap-7 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-10">
          <FadeIn>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-[#082b59]">Mulai langkah baru bersama kami.</h2>
            </div>
          </FadeIn>
          <FadeIn direction="left" delay={0.2}>
            <Link href="/admission/register" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#082b59] px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#1767b1] hover:shadow-lg">
              Daftar sekarang <ArrowUpRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── WHATSAPP ──────────────────────────────────────── */}
      <WhatsAppButton />
    </div>
  );
}
