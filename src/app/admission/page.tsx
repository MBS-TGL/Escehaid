import { FileText, CheckCircle, Clock, Warning, GraduationCap } from "@/components/icons";
import Link from "next/link";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/animations";

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
            <h1 className="text-3xl font-bold md:text-4xl">PPDB Online</h1>
            <p className="mt-3 text-base text-white/70">Pendaftaran Peserta Didik Baru SMP Muhammadiyah 4 Tanggul</p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-2">
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

          <FadeIn direction="left">
            <div>
              <h2 className="mb-6 text-2xl font-bold text-[#082b59]">Jadwal Penting</h2>
              <div className="rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  {[
                    ["Pendaftaran Dibuka", "1 Juli - 31 Agustus 2026"],
                    ["Seleksi", "1 - 15 September 2026"],
                    ["Pengumuman", "20 September 2026"],
                  ].map(([title, date], i) => (
                    <div key={title} className={`flex items-center gap-4 ${i < 2 ? "border-b border-[#dce3ed] pb-4" : ""}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1767b1]/10">
                        <Clock className="h-5 w-5 text-[#1767b1]" />
                      </div>
                      <div>
                        <div className="font-medium text-[#082b59]">{title}</div>
                        <div className="text-sm text-slate-500">{date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/admission/register"
                className="mt-6 block w-full rounded-xl bg-[#082b59] py-3.5 text-center text-sm font-bold text-white transition-all hover:bg-[#1767b1] hover:shadow-lg"
              >
                Daftar Sekarang
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
