import Link from "next/link";
import { Users, BookOpen, GraduationCap, Building, Eye, Checks } from "@/components/Icons";
import { getSchoolProfile, getTeacherList } from "@/lib/queries";
import { FadeIn } from "@/components/Animations";
import TeacherGrid from "./TeacherGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilPage() {
  const [profil, teachers] = await Promise.all([
    getSchoolProfile(),
    getTeacherList(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#082b59] py-12 text-white md:py-16">
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
                  <p className="mt-1 text-sm text-slate-500">Akreditasi</p>
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
                  <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-slate-600">
                    {profil.vision.split(/,\s*/).filter((s: string) => s.trim()).map((v: string, i: number) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4d21f]" />
                        <span>{v.trim()}</span>
                      </li>
                    ))}
                  </ul>
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
                      "Menanamkan kepribadian Islam dan meningkatkan kepedulian serta berbudaya terhadap lingkungan yang tinggi kepada semua warga sekolah",
                      "Menanamkan karakter unggul pada siswa sehingga lurus aqidahnya, bagus ibadahnya, mulia akhlaknya, dan luas pemahaman da'wahnya serta peduli dan berbudaya terhadap lingkungannya",
                      "Menanamkan dan meningkatkan rasa ikhlas dan tanggung jawab serta peduli dan berbudaya lingkungan pada semua warga sekolah",
                      "Memupuk kedisiplinan, semangat berlatih, demokratis dan beretos kerja tinggi serta peduli dan berbudaya lingkungan pada semua warga sekolah",
                      "Melaksanakan pembelajaran dan bimbingan yang aktif, inovatif, kreatif, efektif, menyenangkan serta peduli dan berbudaya lingkungan sehingga siswa berkembang secara optimal",
                      "Melaksanakan program yang mampu menumbuhkan potensi keberbakatan dalam setiap siswa dengan program-program yang berorientasi pada pengembangan bakat dan minat belajar",
                      "Memberikan pelayanan pendidikan berbasis Boarding School dan Full Day School dengan memadukan kurikulum Nasional dan kurikulum Muhammadiyah",
                      "Melaksanakan kegiatan pengkaderan secara aktif dan berkelanjutan",
                      "Mewujudkan lulusan yang beriman dan bertaqwa, menguasai ilmu pengetahuan dan teknologi, yang berkualitas, mampu menjadi da'i dan ulama",
                      "Mewujudkan generasi emas 2045 dengan cita-cita One Home One Hafidz",
                      "Memberikan pelayanan yang optimal kepada seluruh lapisan masyarakat",
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
    </div>
  );
}
