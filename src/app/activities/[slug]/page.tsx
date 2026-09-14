import Link from "next/link";
import Image from "next/image";
import { getActivityBySlug, getActivityList } from "@/lib/queries";
import { sanitize } from "@/lib/sanitize";
import { CSSFadeIn } from "@/components/CSSAnimations";
import { CalendarBlank, MapPin, ArrowLeft } from "@/components/Icons";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

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
  const description = activity.description || activity.title;
  return {
    title: activity.title,
    description,
    openGraph: {
      title: activity.title,
      description,
      type: "article",
      images: activity.image_url ? [{ url: activity.image_url, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: activity.title,
      description,
      images: activity.image_url ? [activity.image_url] : [],
    },
    alternates: { canonical: `/activities/${activity.slug}` },
  };
}

export default async function ActivityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);

  if (!activity) {
    notFound();
  }

  const activityUrl = `https://smpmuh4tanggul.web.id/activities/${activity.slug}`;

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: activity.title,
    description: activity.description || activity.title,
    image: activity.image_url || undefined,
    startDate: activity.activity_date || undefined,
    location: activity.location
      ? {
          "@type": "Place",
          name: activity.location,
          address: {
            "@type": "PostalAddress",
            addressLocality: "Tanggul",
            addressRegion: "Jember",
            addressCountry: "ID",
          },
        }
      : undefined,
    organizer: {
      "@type": "Organization",
      name: "SMP Muhammadiyah 4 Tanggul",
      url: "https://smpmuh4tanggul.web.id",
    },
    eventStatus: "https://schema.org/EventCompleted",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://smpmuh4tanggul.web.id" },
      { "@type": "ListItem", position: 2, name: "Kegiatan", item: "https://smpmuh4tanggul.web.id/activities" },
      { "@type": "ListItem", position: 3, name: activity.title, item: activityUrl },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6">
          <CSSFadeIn>
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
          </CSSFadeIn>
        </div>
      </section>

      <section style={{ contentVisibility: "auto" } as React.CSSProperties} className="mx-auto max-w-4xl px-6 py-12">
        <CSSFadeIn>
          {activity.image_url && (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl">
              <Image src={activity.image_url} alt={activity.title} fill sizes="100vw" className="h-full w-full object-cover" />
            </div>
          )}

          {activity.description && (
            <p className="mb-6 text-lg leading-relaxed text-slate-600">{activity.description}</p>
          )}

          {activity.content && (
            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: sanitize(activity.content) }} />
          )}
        </CSSFadeIn>
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
