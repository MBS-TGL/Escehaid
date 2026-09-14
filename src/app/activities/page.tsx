import Link from "next/link";
import Image from "next/image";
import { getActivityList } from "@/lib/queries";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/Animations";
import { CalendarBlank, MapPin, ArrowUpRight } from "@/components/Icons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kegiatan",
  description: "Kegiatan sekolah SMP Muhammadiyah 4 Tanggul - Kajian, perlombaan, upacara, dan ekstrakurikuler.",
  alternates: { canonical: "/activities" },
};

export const revalidate = 3600;

const ACTIVITY_TYPES: Record<string, string> = {
  kajian: "Kajian",
  peringatan: "Peringatan",
  lomba: "Lomba",
  upacara: "Upacara",
  ekskul: "Ekstrakurikuler",
  umum: "Umum",
};

export default async function ActivitiesPage() {
  const activities = await getActivityList();

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: "https://smpmuh4tanggul.web.id" },
          { "@type": "ListItem", position: 2, name: "Kegiatan", item: "https://smpmuh4tanggul.web.id/activities" },
        ],
      }) }} />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <FadeIn>
            <h1 className="text-3xl font-bold md:text-4xl">Kegiatan Sekolah</h1>
            <p className="mt-3 text-base text-white/70">Kajian, peringatan, lomba, dan aktivitas lainnya</p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        {activities.length === 0 ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
              <CalendarBlank className="h-14 w-14 text-[#082b59]/20" />
              <p className="mt-5 text-base text-slate-500">Belum ada kegiatan.</p>
              <p className="mt-1 text-sm text-slate-400">Nantikan kegiatan terbaru dari sekolah kami.</p>
            </div>
          </FadeIn>
        ) : (
          <StaggerChildren stagger={0.08} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((item) => (
              <StaggerItem key={item.id}>
                <Link href={`/activities/${item.slug}`} className="group block overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:shadow-xl hover:shadow-[#082b59]/5">
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#f4f7fb]">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <Image src="/images/Ruang-Kelas.jpg" alt={item.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-60" />
                    )}
                    <div className="absolute left-3 top-3">
                      <span className="rounded-full bg-[#f4d21f] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#082b59]">
                        {ACTIVITY_TYPES[item.activity_type] || item.activity_type}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-base font-semibold text-[#082b59] transition-colors group-hover:text-[#1767b1]">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                      {item.activity_date && (
                        <span className="flex items-center gap-1">
                          <CalendarBlank className="h-3.5 w-3.5" />
                          {new Date(item.activity_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </section>
    </div>
  );
}
