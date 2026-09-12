import Link from "next/link";
import { getActivityBySlug, getActivityList } from "@/lib/queries";
import { sanitize } from "@/lib/sanitize";
import { FadeIn } from "@/components/Animations";
import { CalendarBlank, MapPin, ArrowLeft } from "@/components/Icons";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const ACTIVITY_TYPES: Record<string, string> = {
  kajian: "Kajian",
  peringatan: "Peringatan",
  lomba: "Lomba",
  upacara: "Upacara",
  ekskul: "Ekstrakurikuler",
  umum: "Umum",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) return { title: "Kegiatan Tidak Ditemukan" };
  return { title: activity.title };
}

export default async function ActivityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);

  if (!activity) {
    notFound();
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6">
          <FadeIn>
            <Link href="/activities" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Kegiatan
            </Link>
            <div className="mt-2">
              <span className="rounded-full bg-[#f4d21f] px-3 py-1 text-xs font-bold uppercase text-[#082b59]">
                {ACTIVITY_TYPES[activity.activity_type] || activity.activity_type}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">{activity.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
              {activity.activity_date && (
                <span className="flex items-center gap-1.5">
                  <CalendarBlank className="h-4 w-4" />
                  {new Date(activity.activity_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
              )}
              {activity.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {activity.location}
                </span>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <FadeIn>
          {activity.image_url && (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl">
              <img src={activity.image_url} alt={activity.title} className="h-full w-full object-cover" />
            </div>
          )}

          {activity.description && (
            <p className="mb-6 text-lg leading-relaxed text-slate-600">{activity.description}</p>
          )}

          {activity.content && (
            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: sanitize(activity.content) }} />
          )}
        </FadeIn>
      </section>
    </div>
  );
}

export async function generateStaticParams() {
  const activities = await getActivityList();
  return activities.map((item) => ({
    slug: item.slug,
  }));
}
