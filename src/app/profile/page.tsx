import Link from "next/link";
import Image from "next/image";
import { Users, BookOpen, GraduationCap, Eye, Checks, ArrowUpRight, Trophy, MapPin } from "@/components/Icons";
import { getSchoolProfile, getTeacherList, getFacilityList, getAchievementList, getGalleryList } from "@/lib/queries";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/Animations";
import TeacherGrid from "./TeacherGrid";
import type { Metadata } from "next";

const FACILITY_FALLBACKS: Record<string, string> = {
  "Ruang Kelas": "/images/Ruang-Kelas.jpg",
  "Lab Komputer": "/images/Lab-Komputer.jpeg",
  Masjid: "/images/Masjid.jpg",
  "Lapangan Olahraga": "/images/Lapangan-Olahraga.jpg",
};

export const metadata: Metadata = {
  title: "Profil",
  description: "Kenali SMP Muhammadiyah 4 Tanggul - Visi, misi, tenaga pengajar, dan fasilitas sekolah unggulan di Tanggul, Jember.",
  alternates: { canonical: "/profile" },
};

export const revalidate = 3600;

export default async function ProfilPage() {
  const [profil, teachers, facilities, achievements, gallery] = await Promise.all([
    getSchoolProfile(),
    getTeacherList(),
    getFacilityList(),
    getAchievementList(),
    getGalleryList(8),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <GraduationCap className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <BookOpen className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <FadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Profil Sekolah</h1>
            <p className="mt-3 text-base text-white/70">Mengenal {profil?.school_name || "SMP Muhammadiyah 4 Tanggul"} lebih dekat</p>
          </FadeIn>
        </div>
      </section>

      {/* Tentang Kami */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Tentang Kami</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Sejarah Singkat</h2>
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
              <Link
                href="https://dapo.kemendikdasmen.go.id/sekolah?npsn=69957381"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#f4f7fb] px-4 py-2 text-sm font-medium text-[#082b59] transition-colors hover:bg-[#082b59]/10"
              >
                <GraduationCap className="h-4 w-4 text-[#f4d21f]" />
                Akreditasi {profil?.accreditation || "A"}
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Kepala Sekolah */}
      <section className="bg-[#f4f7fb] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
            <FadeIn>
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-[#f4d21f]/30 to-[#1767b1]/20 blur-xl" />
                  <div className="relative h-64 w-64 overflow-hidden rounded-full border-4 border-[#f4d21f] md:h-80 md:w-80">
                    <Image
                      src={profil?.principal_photo_url || "/images/Kepala-Sekolah.jpg"}
                      alt={profil?.principal_name || "Kepala Sekolah"}
                      fill
                      sizes="(max-width: 768px) 256px, 320px"
                      className="object-cover object-[center_20%]"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 rounded-2xl bg-[#082b59] px-4 py-2 shadow-lg">
                    <p className="text-xs font-bold text-white">Kepala Sekolah</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn direction="left">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Kepala Sekolah</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">
                  {profil?.principal_name || "Khoirul Anwar, S.Pd"}
                </h2>
                <p className="mt-6 text-[15px] leading-relaxed text-slate-600">
                  {profil?.principal_quote || "Memimpin sekolah dengan visi untuk mencetak kader umat yang berakhlak mulia, cerdas, dan siap menjadi Da'i serta Ulama Hafidz yang bermanfaat bagi masyarakat."}
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="rounded-full bg-[#082b59]/10 px-3 py-1 text-xs font-medium text-[#082b59]">Kurikulum Merdeka</span>
                  <span className="rounded-full bg-[#082b59]/10 px-3 py-1 text-xs font-medium text-[#082b59]">ISMUBA</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Visi & Misi */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Visi & Misi</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Arah dan Tujuan Sekolah</h2>
            </div>
          </FadeIn>

          <div className="grid gap-8 md:grid-cols-2">
            <FadeIn>
              <div className="h-full rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#082b59] shadow-lg shadow-[#082b59]/20">
                  <Eye className="h-5 w-5 text-[#f4d21f]" weight="bold" />
                </div>
                <h3 className="text-xl font-semibold text-[#082b59]">Visi</h3>
                {profil?.vision ? (
                  <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
                    {profil.vision}
                  </p>
                ) : (
                  <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
                    Menjadi lembaga pencetak kader da&apos;i dan ulama hafidz yang menguasai ilmu pengetahuan dan teknologi berwawasan global serta peduli dan berbudaya lingkungan.
                  </p>
                )}
              </div>
            </FadeIn>

            <FadeIn direction="left">
              <div className="h-full rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#082b59] shadow-lg shadow-[#082b59]/20">
                  <Checks className="h-5 w-5 text-[#f4d21f]" weight="bold" />
                </div>
                <h3 className="text-xl font-semibold text-[#082b59]">Misi</h3>
                {profil?.mission ? (
                  <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-slate-600">
                    {(() => {
                      try {
                        const misi = JSON.parse(profil.mission);
                        if (Array.isArray(misi)) {
                          return misi.map((m: string, i: number) => (
                            <li key={i} className="flex gap-3">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4d21f]" />
                              <span>{m}</span>
                            </li>
                          ));
                        }
                      } catch {}
                      const items = profil.mission
                        .split(/\d+\.\s*/)
                        .filter((s: string) => s.trim());
                      return items.map((m: string, i: number) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4d21f]" />
                          <span>{m.trim()}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                ) : (
                  <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-slate-600">
                    {[
                      "Menanamkan kepribadian Islam dan kepedulian terhadap lingkungan",
                      "Menanamkan karakter unggul: lurus aqidah, bagus ibadah, mulia akhlak",
                      "Melaksanakan pembelajaran aktif, inovatif, kreatif, dan menyenangkan",
                      "Menumbuhkan potensi keberbakatan dalam setiap siswa",
                      "Berbasis Boarding School dan Full Day School dengan kurikulum Nasional & Muhammadiyah",
                      "Mewujudkan generasi emas 2045: One Home One Hafidz",
                    ].map((m, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4d21f]" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Fasilitas Sekolah */}
      {facilities.length > 0 && (
        <section id="fasilitas" className="bg-[#f4f7fb] py-20">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn>
              <div className="mb-12">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Infrastruktur</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Fasilitas Sekolah</h2>
              </div>
            </FadeIn>

            <StaggerChildren stagger={0.1} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {facilities.map((f) => (
                <StaggerItem key={f.id}>
                  <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:shadow-xl hover:shadow-[#082b59]/5">
                    <div className="relative h-48 overflow-hidden bg-[#f4f7fb]">
                      <Image
                        src={f.image_url || FACILITY_FALLBACKS[f.name] || "/images/Ruang-Kelas.jpg"}
                        alt={f.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-lg font-semibold text-[#082b59]">{f.name}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{f.description}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </section>
      )}

      {/* Prestasi Highlights */}
      {achievements.length > 0 && (
        <section className="bg-[#f4f7fb] py-20">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn>
              <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-[#dce3ed] bg-white p-6 sm:flex-row">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#082b59] shadow-lg shadow-[#082b59]/20">
                    <Trophy className="h-6 w-6 text-[#f4d21f]" weight="fill" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Pencapaian</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#082b59]">Prestasi Sekolah</h3>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {achievements.slice(0, 2).map((a) => (
                    <span key={a.id} className="hidden rounded-full bg-[#1767b1]/10 px-3 py-1 text-xs font-semibold text-[#1767b1] sm:inline-block">
                      {a.title.length > 30 ? a.title.substring(0, 30) + "..." : a.title}
                    </span>
                  ))}
                  <Link href="/achievements" className="inline-flex items-center gap-1.5 rounded-xl bg-[#082b59] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1767b1]">
                    Lihat semua <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Guru & Staff */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1296px] px-6 py-12 md:px-10 md:py-16">
          <FadeIn>
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Guru & Staff</h2>
            </div>
          </FadeIn>

          {teachers.length === 0 ? (
            <FadeIn>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] py-16 text-center">
                <Users className="h-12 w-12 text-[#082b59]/20" />
                <p className="mt-4 text-sm text-slate-500">Data guru masih kosong.</p>
              </div>
            </FadeIn>
          ) : (
            <TeacherGrid teachers={teachers} />
          )}
        </div>
      </section>

      {/* Galeri Preview */}
      {gallery.length > 0 && (
        <section className="bg-[#f4f7fb] py-20">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn>
              <div className="mb-12 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Dokumentasi</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Galeri Sekolah</h2>
                </div>
                <Link href="/gallery" className="text-sm font-semibold text-[#1767b1] transition-colors hover:text-[#082b59]">
                  Lihat semua <ArrowUpRight className="inline h-4 w-4" />
                </Link>
              </div>
            </FadeIn>

            <StaggerChildren stagger={0.06} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {gallery.slice(0, 8).map((g) => (
                <StaggerItem key={g.id}>
                  <Link href="/gallery" className="group relative block aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={g.thumbnail_url || g.url || "/images/Ruang-Kelas.jpg"}
                      alt={g.title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#082b59]/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <p className="text-xs font-semibold text-white line-clamp-1">{g.title}</p>
                      {g.category && (
                        <span className="mt-1 inline-block rounded-full bg-[#f4d21f]/90 px-2 py-0.5 text-[9px] font-bold uppercase text-[#082b59]">{g.category}</span>
                      )}
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </section>
      )}

      {/* Kontak & Lokasi */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-6 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#082b59] shadow-lg shadow-[#082b59]/20">
                  <MapPin className="h-6 w-6 text-[#f4d21f]" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Lokasi Kami</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {profil?.address || "Jl. Pemandian No. 88, Patemon, Tanggul, Jember, Jawa Timur"}
                  </p>
                </div>
              </div>
              <Link href="/contact" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#082b59] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1767b1]">
                Hubungi Kami <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA SPMB */}
      <section className="relative overflow-hidden border-t-8 border-[#f4d21f] bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-7 px-6 py-16 text-center md:flex-row md:justify-between md:text-left">
          <FadeIn>
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f4d21f]">Penerimaan Peserta Didik Baru</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Mulai langkah baru bersama kami.</h2>
              <p className="mt-3 text-sm text-white/60">Bergabunglah menjadi bagian dari keluarga besar SMP Muhammadiyah 4 Tanggul.</p>
            </div>
          </FadeIn>
          <FadeIn direction="left" delay={0.2}>
            <Link href="/admission/register" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#f4d21f] px-7 py-4 text-sm font-bold text-[#082b59] transition-all hover:bg-white hover:shadow-lg hover:shadow-[#f4d21f]/20">
              Daftar sekarang <ArrowUpRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
