import Link from "next/link";
import { MapPin, Phone, Envelope, Users, BookOpen, GraduationCap, Building } from "@/components/icons";
import { getSchoolProfile, getTeacherList, getFacilityList } from "@/lib/queries";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/animations";
import ImageWithLoader from "@/components/ImageWithLoader";
import TeacherGrid from "@/components/TeacherGrid";

export default async function ProfilPage() {
  const [profil, teachers, facilities] = await Promise.all([
    getSchoolProfile(),
    getTeacherList(),
    getFacilityList(),
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
                  <p className="mt-3 text-3xl font-bold text-[#082b59]">A</p>
                  <p className="mt-1 text-sm text-slate-500">Akreditasi</p>
                </div>
                <div className="rounded-2xl bg-[#f4f7fb] p-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-[#f4d21f]" />
                  <p className="mt-3 text-3xl font-bold text-[#082b59]">164</p>
                  <p className="mt-1 text-sm text-slate-500">Siswa</p>
                </div>
                <div className="rounded-2xl bg-[#f4f7fb] p-6 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-[#f4d21f]" />
                  <p className="mt-3 text-3xl font-bold text-[#082b59]">14</p>
                  <p className="mt-1 text-sm text-slate-500">Guru</p>
                </div>
                <div className="rounded-2xl bg-[#f4f7fb] p-6 text-center">
                  <Building className="mx-auto h-8 w-8 text-[#f4d21f]" />
                  <p className="mt-3 text-3xl font-bold text-[#082b59]">7</p>
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
                    <ImageWithLoader
                      src="/images/Kepala-Sekolah.jpg"
                      alt="Kepala Sekolah"
                      className="h-full w-full"
                      imgClassName="object-cover object-[center_20%]"
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
                  Khoirul Anwar, S.Pd
                </h2>
                <p className="mt-6 text-[15px] leading-relaxed text-slate-600">
                  Memimpin sekolah dengan visi untuk mencetak kader umat yang berakhlak mulia, cerdas, dan siap menjadi Da&apos;i serta Ulama Hafidz yang bermanfaat bagi masyarakat.
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
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#082b59]">
                  <span className="text-lg font-bold text-[#f4d21f]">V</span>
                </div>
                <h3 className="text-xl font-semibold text-[#082b59]">Visi</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
                  {profil?.vision || "Unggul dalam Iptek dan Imtaq, Berakhlak Mulia, Berwawasan Global, Berbasis Lingkungan Hidup, serta Mandiri dan Sejahtera."}
                </p>
              </div>
            </FadeIn>

            <FadeIn direction="left">
              <div className="h-full rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#082b59]">
                  <span className="text-lg font-bold text-[#f4d21f]">M</span>
                </div>
                <h3 className="text-xl font-semibold text-[#082b59]">Misi</h3>
                {profil?.mission ? (
                  <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-slate-600">
                    {(() => {
                      try {
                        const misi = JSON.parse(profil.mission);
                        return misi.map((m: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4d21f]" />
                            <span>{m}</span>
                          </li>
                        ));
                      } catch {
                        return <li>{profil.mission}</li>;
                      }
                    })()}
                  </ul>
                ) : (
                  <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-slate-600">
                    {[
                      "Melaksanakan pendidikan yang berkualitas sesuai tuntutan Kurikulum Merdeka",
                      "Mengembangkan potensi peserta didik secara optimal dan seimbang",
                      "Membina akhlak mulia sesuai nilai-nilai Al-Islam dan Kemuhammadiyahan",
                      "Menciptakan lingkungan belajar yang menyenangkan dan kondusif",
                    ].map((m, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4d21f]" />
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
      <section className="bg-[#f4f7fb] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Tim Pengajar</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Guru & Staff</h2>
            </div>
          </FadeIn>

          {teachers.length === 0 ? (
            <FadeIn>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-16 text-center">
                <Users className="h-12 w-12 text-[#082b59]/20" />
                <p className="mt-4 text-sm text-slate-500">Data guru masih kosong.</p>
              </div>
            </FadeIn>
          ) : (
            <TeacherGrid teachers={teachers} />
          )}
        </div>
      </section>

      {/* Fasilitas */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Sarana Prasarana</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Fasilitas Sekolah</h2>
            </div>
          </FadeIn>

          {facilities.length === 0 ? (
            <FadeIn>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-[#f4f7fb] py-16 text-center">
                <Building className="h-12 w-12 text-[#082b59]/20" />
                <p className="mt-4 text-sm text-slate-500">Data fasilitas masih kosong.</p>
              </div>
            </FadeIn>
          ) : (
            <StaggerChildren stagger={0.1} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {facilities.map((f) => (
                <StaggerItem key={f.id}>
                  <div className="group overflow-hidden rounded-2xl border border-[#dce3ed] transition-all hover:shadow-lg hover:shadow-[#082b59]/5">
                    <div className="relative h-48 overflow-hidden bg-[#f4f7fb]">
                      <ImageWithLoader
                        src={f.image_url || `/images/${encodeURIComponent(f.name)}.jpg`}
                        alt={f.name}
                        className="h-full w-full"
                        imgClassName="transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-[#082b59]">{f.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.description}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>
          )}
        </div>
      </section>

      {/* Kontak */}
      <section className="bg-[#f4f7fb] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Kontak</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#082b59] md:text-4xl">Hubungi Kami</h2>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="mx-auto max-w-2xl rounded-2xl border border-[#dce3ed] bg-white p-8">
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f7fb]">
                    <MapPin className="h-5 w-5 text-[#1767b1]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#082b59]">Alamat</p>
                    <p className="mt-1 text-sm text-slate-600">{profil?.address || "Jl. Pemandian No. 88, Patemon, Tanggul, Jember 68154"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f7fb]">
                    <Phone className="h-5 w-5 text-[#1767b1]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#082b59]">Telepon</p>
                    <p className="mt-1 text-sm text-slate-600">{profil?.phone || "0858-5200-4008"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f7fb]">
                    <Envelope className="h-5 w-5 text-[#1767b1]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#082b59]">Email</p>
                    <p className="mt-1 text-sm text-slate-600">{profil?.email || "smpm4tangguljember@gmail.com"}</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
