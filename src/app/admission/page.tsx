import { FileText, CheckCircle, Clock, Warning, GraduationCap, BookOpen, House, Download } from "@/components/Icons";
import Link from "next/link";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/Animations";

export default function PPDBPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <GraduationCap className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <FileText className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <FadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">SPMB Online</h1>
            <p className="mt-3 text-base text-white/70">Pendaftaran Peserta Didik Baru SMP Muhammadiyah 4 Tanggul</p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        {/* Program Unggulan */}
        <FadeIn>
          <div className="mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1767b1]">Program Unggulan</p>
            <h2 className="mt-3 mb-8 text-2xl font-bold text-[#082b59]">Pilihan Program Pendidikan</h2>
            <StaggerChildren stagger={0.1} className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: BookOpen, title: "Program Kepesantrenan", desc: "Tahfidz Qur'an 30 Juz, Baca Kitab Kuning, Muhadhoroh 3 Bahasa, dan Golden Habit.", color: "bg-[#082b59]/10 text-[#082b59]" },
                { icon: House, title: "SMP Boarding (MBS)", desc: "Program asrama penuh sejak 2018/2019. Siswa dibimbing 24 jam oleh ustadz kompeten.", color: "bg-[#1767b1]/10 text-[#1767b1]" },
                { icon: GraduationCap, title: "SMP Full Day School", desc: "Pembelajaran Senin-Sabtu pukul 07.30-15.00 meliputi mapel umum dan keagamaan.", color: "bg-[#f4d21f]/20 text-[#082b59]" },
                { icon: BookOpen, title: "SMA Boarding", desc: "Program asrama penuh untuk jenjang SMA dengan kurikulum Tahfidz dan keunggulan akademik.", color: "bg-[#082b59]/10 text-[#082b59]" },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <div className="flex h-full gap-4 rounded-2xl border border-[#dce3ed] bg-white p-5 transition-all hover:shadow-lg hover:shadow-[#082b59]/5">
                    <div className={`${item.color} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#082b59]">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </FadeIn>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Jalur Pendaftaran */}
          <FadeIn>
            <div>
              <h2 className="mb-6 text-2xl font-bold text-[#082b59]">Jalur Pendaftaran</h2>
              <StaggerChildren stagger={0.1} className="space-y-4">
                {[
                  { icon: FileText, color: "bg-[#082b59]/10 text-[#082b59]", title: "Jalur Reguler", desc: "Pendaftaran untuk semua siswa" },
                  { icon: CheckCircle, color: "bg-emerald-100 text-emerald-600", title: "Jalur Prestasi", desc: "Untuk siswa berprestasi akademik/non-akademik" },
                  { icon: Warning, color: "bg-amber-100 text-amber-600", title: "Jalur Beasiswa", desc: "Untuk siswa kurang mampu" },
                ].map((jalur) => (
                  <StaggerItem key={jalur.title}>
                    <div className="rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:shadow-[#082b59]/5">
                      <div className="flex items-start gap-4">
                        <div className={`${jalur.color} rounded-xl p-2.5`}>
                          <jalur.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#082b59]">{jalur.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">{jalur.desc}</p>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </div>
          </FadeIn>

          {/* Biaya & Pendaftaran */}
          <FadeIn direction="left">
            <div>
              <h2 className="mb-6 text-2xl font-bold text-[#082b59]">Informasi Biaya</h2>
              <div className="rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1767b1]/10">
                    <Clock className="h-5 w-5 text-[#1767b1]" />
                  </div>
                  <div>
                    <div className="font-medium text-[#082b59]">Gelombang Inden</div>
                    <div className="text-sm text-slate-500">20 Oktober - 30 Desember 2026</div>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">
                  Rincian biaya pendidikan, boarding, dan kegiatan dapat dilihat pada brosur resmi sekolah.
                </p>
                <a
                  href="https://smpmuh4tanggul.sch.id/info-spmb/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1767b1] hover:text-[#082b59]"
                >
                  Lihat Brosur Lengkap <FileText className="h-4 w-4" />
                </a>
              </div>

              <h2 className="mb-6 mt-8 text-2xl font-bold text-[#082b59]">Cara Mendaftar</h2>
              <div className="space-y-3">
                <Link
                  href="/admission/register"
                  className="flex items-center gap-3 rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm transition-all hover:border-[#1767b1]/30 hover:shadow-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#082b59] text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#082b59]">Daftar Online</div>
                    <div className="text-xs text-slate-500">Isi formulir pendaftaran</div>
                  </div>
                </Link>
                <a
                  href="https://docs.google.com/document/d/1SEownLgB4jmY9nIfZhTSSg-Y1LtfL0eH/edit?usp=sharing&ouid=109565226300801463501&rtpof=true&sd=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm transition-all hover:border-[#1767b1]/30 hover:shadow-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1767b1] text-white">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#082b59]">Unduh Formulir Offline</div>
                    <div className="text-xs text-slate-500">Isi dan kumpulkan di Kantor MBS Tanggul</div>
                  </div>
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
