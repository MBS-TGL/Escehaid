import { FileText, CheckCircle, Clock, Warning } from "@/components/icons";
import Link from "next/link";

export default function PPDBPage() {
  return (
    <div>
      <section className="bg-[#082b59] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">PPDB Online</h1>
          <p className="text-white/70">Pendaftaran Peserta Didik Baru SMP Muhammadiyah 4 Tanggul</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-6 text-[#082b59]">Jalur Pendaftaran</h2>
            <div className="space-y-4">
              {[
                { icon: FileText, color: "bg-[#082b59]/10 text-[#082b59]", title: "Jalur Reguler", desc: "Pendaftaran untuk semua siswa" },
                { icon: CheckCircle, color: "bg-emerald-100 text-emerald-600", title: "Jalur Prestasi", desc: "Untuk siswa berprestasi akademik/non-akademik" },
                { icon: Warning, color: "bg-amber-100 text-amber-600", title: "Jalur Beasiswa", desc: "Untuk siswa kurang mampu" },
              ].map((jalur) => (
                <div key={jalur.title} className="bg-white p-6 rounded-xl shadow-sm border border-[#dce3ed]">
                  <div className="flex items-start gap-4">
                    <div className={`${jalur.color} p-2 rounded-lg`}>
                      <jalur.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-[#082b59]">{jalur.title}</h3>
                      <p className="text-sm text-gray-600">{jalur.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 text-[#082b59]">Jadwal Penting</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#dce3ed]">
              <div className="space-y-4">
                {[
                  ["Pendaftaran Dibuka", "1 Juli - 31 Agustus 2026"],
                  ["Seleksi", "1 - 15 September 2026"],
                  ["Pengumuman", "20 September 2026"],
                ].map(([title, date], i) => (
                  <div key={title} className={`flex items-center gap-4 ${i < 2 ? "pb-4 border-b border-[#dce3ed]" : ""}`}>
                    <Clock className="h-5 w-5 text-[#1767b1] shrink-0" />
                    <div>
                      <div className="font-medium text-[#082b59]">{title}</div>
                      <div className="text-sm text-gray-600">{date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/admission/register"
              className="mt-6 block w-full text-center bg-[#082b59] text-white py-3 rounded-xl font-semibold hover:bg-[#1767b1] transition-colors"
            >
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
