import Link from "next/link";
import Image from "next/image";
import { Users, BookOpen, GraduationCap, Building, Eye, Checks, ArrowUpRight, Trophy, MapPin, Phone, Envelope, Link as LinkIcon, ImageSquare, Star, Medal } from "@/components/Icons";
import { getSchoolProfile, getTeacherList, getFacilityList, getAchievementList, getGalleryList } from "@/lib/queries";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/Animations";
import TeacherGrid from "./TeacherGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil",
};

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
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
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
              </div>
            </FadeIn>

            <FadeIn direction="left">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#f4f7fb] p-6 text-center">
                  <GraduationCap className="mx-auto h-8 w-8 text-[#f4d21f]" />
                  <p className="mt-3 text-3xl font-bold text-[#082b59]">{profil?.accreditation || "A"}</p>
                  <Link
                    href="https://dapo.kemendikdasmen.go.id/sekolah?npsn=69957381"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-[#1767b1]"
                  >
                    Akreditasi
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="rounded-2xl bg-[#f4f7fb] p-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-[#f4d21f]" />
                  <p className="mt-3 text-3xl font-bold text-[#082b59]">{profil?.total_students || 164}</p>
                  <p className="mt-1 text-sm text-slate-500">Siswa</p>
                </div>
                <div className="rounded-2xl bg-[#f4f7fb] p-6 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-[#f4d21f]" />
                  <p className="mt-3 text-3xl font-bold text-[#082b59]">{profil?.total_teachers || 14}</p>
                  <p className="mt-1 text-sm text-slate-500">Guru</p>
                </div>
                <div className="rounded-2xl bg-[#f4f7fb] p-6 text-center">
                  <Building className="mx-auto h-8 w-8 text-[#f4d21f]" />
                  <p className="mt-3 text-3xl font-bold text-[#082b59]">{profil?.total_classes || 7}</p>
                  <p className="mt-1 text-sm text-slate-500">Rombel</p>
                </div>
              </div>
            </FadeIn>
          </div>
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
                    <img
                      src={profil?.principal_photo_url || "/images/Kepala-Sekolah.jpg"}
                      alt={profil?.principal_name || "Kepala Sekolah"}
                      className="h-full w-full object-cover object-[center_20%]"
                      loading="lazy"
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
        <section className="bg-[#f4f7fb] py-20">
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
                        src={f.image_url || `https://picsum.photos/seed/${encodeURIComponent(f.name)}/600/400`}
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

      {/* Timeline Sejarah */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Perjalanan Kami</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Timeline</h2>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="relative mx-auto max-w-3xl">
              <div className="absolute left-4 top-0 h-full w-0.5 bg-gradient-to-b from-[#f4d21f] via-[#1767b1] to-[#082b59] md:left-1/2 md:-translate-x-px" />

              {[
                { year: "Berdiri", label: "Sekolah Didirikan", desc: "SMP Muhammadiyah 4 Tanggul didirikan di bawah naungan Persyarikatan Muhammadiyah dengan semangat kaderisasi Da'i dan Ulama Hafidz." },
                { year: "Kurikulum", label: "Kurikulum Merdeka", desc: "Penerapan Kurikulum Merdeka yang terintegrasi dengan ISMUBA (Al-Islam, Kemuhammadiyahan, dan Bahasa Arab)." },
                { year: "Akreditasi", label: `Akreditasi ${profil?.accreditation || "A"}`, desc: `Meraih Akreditasi ${profil?.accreditation || "A"} dari BAN-SM atas kualitas pendidikan yang unggul.` },
                { year: "Sekarang", label: "Boarding School", desc: "Beroperasi penuh sebagai Boarding School dan Full Day School dengan program Tahfidz, Keberbakatan, dan 7 Golden Habits." },
              ].map((item, i) => (
                <div key={i} className={`relative mb-10 flex items-start gap-6 md:mb-12 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                  <div className="absolute left-4 top-1 z-10 h-3 w-3 -translate-x-1.5 rounded-full border-2 border-[#f4d21f] bg-white shadow-md md:left-1/2" />
                  <div className="ml-12 flex-1 md:ml-0">
                    <div className={`rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-6 transition-all hover:shadow-lg hover:shadow-[#082b59]/5 ${i % 2 === 0 ? "md:text-right" : ""}`}>
                      <span className="inline-block rounded-full bg-[#082b59] px-3 py-1 text-xs font-bold text-white">{item.year}</span>
                      <h3 className="mt-3 text-lg font-semibold text-[#082b59]">{item.label}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Prestasi Highlights */}
      {achievements.length > 0 && (
        <section className="bg-[#f4f7fb] py-20">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn>
              <div className="mb-12 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Pencapaian</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Prestasi Sekolah</h2>
                </div>
                <Link href="/achievements" className="text-sm font-semibold text-[#1767b1] transition-colors hover:text-[#082b59]">
                  Semua prestasi <ArrowUpRight className="inline h-4 w-4" />
                </Link>
              </div>
            </FadeIn>

            <StaggerChildren stagger={0.08} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.slice(0, 6).map((a) => (
                <StaggerItem key={a.id}>
                  <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[#1767b1]/30 hover:shadow-xl hover:shadow-[#082b59]/5">
                    {a.image_url && (
                      <div className="relative h-40 overflow-hidden bg-[#f4f7fb]">
                        <Image
                          src={a.image_url}
                          alt={a.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-2">
                        <Medal className="h-4 w-4 text-[#f4d21f]" weight="fill" />
                        <span className="rounded-full bg-[#1767b1]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1767b1]">
                          {a.category || "Prestasi"}
                        </span>
                        {a.year && (
                          <span className="ml-auto text-xs text-slate-400">{a.year}</span>
                        )}
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-[#082b59]">{a.title}</h3>
                      {a.description && (
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500 line-clamp-2">{a.description}</p>
                      )}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>
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
                      src={g.thumbnail_url || g.url || `https://picsum.photos/seed/${encodeURIComponent(g.title)}/400/400`}
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
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Hubungi Kami</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Kontak & Lokasi</h2>
            </div>
          </FadeIn>

          <div className="grid gap-8 lg:grid-cols-2">
            <FadeIn>
              <div className="space-y-5">
                <div className="flex items-start gap-4 rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-5 transition-all hover:shadow-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#082b59] shadow-lg shadow-[#082b59]/20">
                    <MapPin className="h-5 w-5 text-[#f4d21f]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#082b59]">Alamat</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {profil?.address || "Jl. Pemandian No. 88, Patemon, Tanggul, Jember, Jawa Timur"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-5 transition-all hover:shadow-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#082b59] shadow-lg shadow-[#082b59]/20">
                    <Phone className="h-5 w-5 text-[#f4d21f]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#082b59]">Telepon</h3>
                    <a href={`tel:${profil?.phone || "08123456789"}`} className="mt-1 block text-sm text-[#1767b1] transition-colors hover:text-[#082b59]">
                      {profil?.phone || "0812-3456-789"}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-5 transition-all hover:shadow-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#082b59] shadow-lg shadow-[#082b59]/20">
                    <Envelope className="h-5 w-5 text-[#f4d21f]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#082b59]">Email</h3>
                    <a href={`mailto:${profil?.email || "info@smpmuh4tanggul.sch.id"}`} className="mt-1 block text-sm text-[#1767b1] transition-colors hover:text-[#082b59]">
                      {profil?.email || "info@smpmuh4tanggul.sch.id"}
                    </a>
                  </div>
                </div>

                {profil?.website && (
                  <div className="flex items-start gap-4 rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-5 transition-all hover:shadow-md">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#082b59] shadow-lg shadow-[#082b59]/20">
                      <LinkIcon className="h-5 w-5 text-[#f4d21f]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#082b59]">Website</h3>
                      <a href={profil.website} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-[#1767b1] transition-colors hover:text-[#082b59]">
                        {profil.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </FadeIn>

            <FadeIn direction="left">
              <div className="h-[400px] overflow-hidden rounded-2xl border border-[#dce3ed] lg:h-full lg:min-h-[400px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3948.123456789!2d114.2!3d-8.15!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOMKwMDknMDAuMCJTIDExNMKwMTInMDAuMCJF!5e0!3m2!1sid!2sid!4v1"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: "400px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Lokasi SMP Muhammadiyah 4 Tanggul"
                />
              </div>
            </FadeIn>
          </div>
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
