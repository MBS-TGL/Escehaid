import { MedalMilitary, Medal, Trophy, Star } from "@/components/icons";
import { getAchievementList } from "@/lib/queries";

const iconMap: Record<string, typeof Trophy> = {
  Akademik: Trophy,
  Keagamaan: Medal,
  Sekolah: Star,
  Olahraga: MedalMilitary,
};

const fallback = [
  {
    title: "Juara 1 Olimpiade Sains Tingkat Kabupaten",
    category: "Akademik",
    year: 2025,
    description: "Siswa/i SMP Muhammadiyah 4 Tanggul meraih juara 1 dalam olimpiade sains tingkat kabupaten Jember.",
  },
  {
    title: "Juara 2 Lomba Tahfidz Qur'an Tingkat Provinsi",
    category: "Keagamaan",
    year: 2025,
    description: "Hafidz terbaik sekolah berhasil meraih juara 2 dalam lomba tahfidz Qur'an tingkat Jawa Timur.",
  },
  {
    title: "Akreditasi A - BAN-SM",
    category: "Sekolah",
    year: 2024,
    description: "SMP Muhammadiyah 4 Tanggul memperoleh predikat Akreditasi A dari Badan Akreditasi Nasional.",
  },
  {
    title: "Juara 1 Futsal Tingkat Kecamatan",
    category: "Olahraga",
    year: 2025,
    description: "Tim futsal putra sekolah menjadi juara 1 dalam turnamen futsal tingkat kecamatan Tanggul.",
  },
  {
    title: "Juara 3 Cerdas Cermat Islami",
    category: "Keagamaan",
    year: 2024,
    description: "Tim cerdas cermat islami sekolah meraih juara 3 dalam kompetisi tingkat kabupaten.",
  },
  {
    title: "Best Speaker English Competition",
    category: "Akademik",
    year: 2025,
    description: "Perwakilan siswa meraih penghargaan Best Speaker dalam kompetisi bahasa Inggris tingkat kabupaten.",
  },
];

export default async function PrestasiPage() {
  const achievements = await getAchievementList();
  const prestasi = achievements.length > 0
    ? achievements.map((a) => ({
        title: a.title,
        category: a.category,
        year: a.year,
        description: a.description,
        icon: iconMap[a.category] || Trophy,
      }))
    : fallback.map((f) => ({
        ...f,
        icon: iconMap[f.category] || Trophy,
      }));

  return (
    <div>
      <section className="bg-[#082b59] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="mb-4 text-3xl font-bold md:text-4xl">Prestasi</h1>
          <p className="text-white/70">Pencapaian terbaik siswa dan sekolah</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {prestasi.map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border border-[#dce3ed] bg-white p-6 transition-all hover:border-[#1767b1]/20 hover:shadow-lg"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4d21f]/10 text-[#f4d21f]">
                  <item.icon weight="fill" className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[#082b59]/5 px-3 py-1 text-xs font-medium text-[#082b59]">
                  {item.category}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-[#082b59]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">{item.year}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
