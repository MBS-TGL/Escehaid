import Link from "next/link";
import Image from "next/image";
import CoverImage from "@/components/CoverImage";
import { getActivityBySlug, getActivityList } from "@/lib/queries";
import { RichContent } from "@/components/RichContent";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import {
  activityStatus,
  activityTypeBadge,
  activityTypeLabel,
  daysUntilActivity,
  formatActivityDate,
  formatActivityDateRange,
  isActivityLiveActive,
  toJakartaDateKey,
} from "@/lib/activity-types";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarBlank,
  CalendarCheck,
  CaretLeft,
  CaretRight,
  Clock,
  FacebookLogo,
  MapPin,
  Phone,
  TwitterLogo,
  WhatsappLogo,
} from "@/components/Icons";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Revalidasi on-demand sudah aktif — strategi TTL disamakan dengan detail Berita.
export const revalidate = 300;

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
      // Tanpa width/height palsu — dimensi asli tak diketahui (Fase A), biar crawler baca sendiri
      images: activity.image_url ? [{ url: activity.image_url }] : [],
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

/** Buang tag HTML & normalisasi spasi — untuk deteksi lead duplikat. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

/** "YYYY-MM-DD" → hari berikutnya (batas akhir eksklisif rentang Google Calendar). */
function nextDayKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function ActivityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [activity, allActivities] = await Promise.all([
    getActivityBySlug(slug),
    getActivityList(),
  ]);

  if (!activity) {
    notFound();
  }

  const activityUrl = `https://www.smpmuh4tanggul.sch.id/activities/${activity.slug}`;
  const shareUrl = activityUrl;
  const shareText = encodeURIComponent(activity.title);

  // Lokasi fisik & virtual (Fase 5: live_url → VirtualLocation + ModeCampuran)
  const place = activity.location
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
    : undefined;
  const virtual = activity.live_url
    ? { "@type": "VirtualLocation", url: activity.live_url }
    : undefined;

  // Kegiatan multi-hari → sertakan endDate di JSON-LD (bila melewati hari mulai).
  const startKey = toJakartaDateKey(activity.activity_date);
  const endKeyOnly = toJakartaDateKey(activity.end_date);
  const multiDay = !!(startKey && endKeyOnly && endKeyOnly > startKey);

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: activity.title,
    description: activity.description || activity.title,
    image: activity.image_url || undefined,
    startDate: activity.activity_date || undefined,
    endDate: multiDay ? activity.end_date ?? undefined : undefined,
    // Bila live_url terisi: location = [fisik, virtual] + MixedEventAttendanceMode.
    location: place && virtual ? [place, virtual] : place || virtual,
    organizer: {
      "@type": "Organization",
      name: "SMP Muhammadiyah 4 Tanggul",
      url: "https://www.smpmuh4tanggul.sch.id",
    },
    // Status event mengikuti hari ini Asia/Jakarta — "past" hanya setelah end_date.
    eventStatus:
      activityStatus(activity.activity_date, activity.end_date) !== "past"
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventCompleted",
    eventAttendanceMode: virtual
      ? "https://schema.org/MixedEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
      { "@type": "ListItem", position: 2, name: "Kegiatan", item: "https://www.smpmuh4tanggul.sch.id/activities" },
      { "@type": "ListItem", position: 3, name: activity.title, item: activityUrl },
    ],
  };

  // Status kegiatan (Akan Datang / Hari Ini / Berlangsung / Selesai) hari ini WIB.
  const status = activityStatus(activity.activity_date, activity.end_date);
  const statusPill =
    status === "today"
      ? { label: "Hari Ini", cls: "bg-[#f4d21f] text-[#082b59]" }
      : status === "upcoming"
        ? { label: "Akan Datang", cls: "bg-emerald-100 text-emerald-700" }
        : status === "ongoing"
          ? { label: "Berlangsung", cls: "bg-blue-100 text-blue-700" }
          : { label: "Selesai", cls: "bg-slate-100 text-slate-500" };

  // Tautan Google Calendar — acara sehari penuh; multi-hari → end + 1 hari.
  const dayKey = toJakartaDateKey(activity.activity_date);
  const lastKey = toJakartaDateKey(activity.end_date) || dayKey;
  const gcalHref =
    dayKey && lastKey
      ? `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(activity.title)}` +
      `&dates=${dayKey.replace(/-/g, "")}/${nextDayKey(lastKey).replace(/-/g, "")}` +
      `&details=${encodeURIComponent([activity.description, activityUrl].filter(Boolean).join("\n\n"))}` +
      `&location=${encodeURIComponent(activity.location || "")}`
      : null;

  // Fase 5/6: tombol LIVE aktif bila live_url terisi & hari ini di rentang acara.
  const liveActive = isActivityLiveActive(activity.live_url, activity.activity_date, activity.end_date);

  // Baris hitung mundur di hero: "Mulai dalam n hari" / "Berlangsung hingga …".
  const days = daysUntilActivity(activity.activity_date);
  const relText =
    status === "upcoming" && days !== null && days > 0
      ? days === 1
        ? "Mulai besok"
        : `Mulai dalam ${days} hari`
      : status === "ongoing" && lastKey
        ? `Berlangsung hingga ${formatActivityDate(lastKey, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`
        : "";

  // Lead: sembunyikan bila deskripsi identik dengan awal konten (anti-dobel).
  const normDesc = stripHtml(activity.description || "");
  const normContent = stripHtml(activity.content || "");
  const descHead = normDesc.slice(0, 120);
  const showLead = descHead.length > 0 && !(descHead.length >= 15 && normContent.startsWith(descHead));

  // Kegiatan lainnya (maks 3): tipe sama diprioritaskan, kecualikan yang dibuka.
  const related = allActivities
    .filter((a) => a.id !== activity.id)
    .sort((a, b) => {
      const pa = a.activity_type === activity.activity_type ? 0 : 1;
      const pb = b.activity_type === activity.activity_type ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (toJakartaDateKey(b.activity_date) || "").localeCompare(toJakartaDateKey(a.activity_date) || "");
    })
    .slice(0, 3);

  // Navigasi antar kegiatan: semua data urut activity_date DESC →
  // indeks+1 = tanggal lebih lama (Sebelumnya), indeks-1 = lebih baru (Berikutnya).
  const currentIdx = allActivities.findIndex((a) => a.id === activity.id);
  const newer = currentIdx > 0 ? allActivities[currentIdx - 1] : null;
  const older =
    currentIdx >= 0 && currentIdx < allActivities.length - 1 ? allActivities[currentIdx + 1] : null;

  const iconBtnBase =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors";
  const waBtnClass = `${iconBtnBase} hover:border-emerald-200 hover:text-emerald-600`;
  const fbBtnClass = `${iconBtnBase} hover:border-blue-200 hover:text-blue-600`;
  const copyBtnClass = `${iconBtnBase} hover:border-[#1767b1]/30 hover:text-[#1767b1]`;

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Sticky top bar — breadcrumb + share (pola detail Berita) */}
      <div className="sticky top-16 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md md:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-[#1767b1]">Beranda</Link>
            <span>/</span>
            <Link href="/activities" className="transition-colors hover:text-[#1767b1]">Kegiatan</Link>
            <span>/</span>
            <span className="max-w-[200px] truncate text-slate-600">{activity.title}</span>
          </nav>
          <div className="ml-auto flex items-center gap-1.5" role="group" aria-label="Bagikan kegiatan">
            <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer"
              aria-label="Bagikan ke WhatsApp"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600">
              <WhatsappLogo className="h-3.5 w-3.5" />
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer"
              aria-label="Bagikan ke Facebook"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
              <FacebookLogo className="h-3.5 w-3.5" />
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer"
              aria-label="Bagikan ke X (Twitter)"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600">
              <TwitterLogo className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Hero — gaya sama detail Berita (badge + meta + judul, navy solid) */}
      <section className="bg-[#082b59]">
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-4 md:pt-10 md:pb-5">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${activityTypeBadge(activity.activity_type)}`}>
                {activityTypeLabel(activity.activity_type)}
              </span>
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusPill.cls}`}>
                {statusPill.label}
              </span>
              {activity.activity_date && (
                <span className="flex items-center gap-1 text-xs text-white/50">
                  <CalendarBlank className="h-3 w-3" />
                  {formatActivityDateRange(activity.activity_date, activity.end_date, { long: true })}
                </span>
              )}
              {activity.location && (
                <span className="flex items-center gap-1 text-xs text-white/50">
                  <MapPin className="h-3 w-3" />
                  {activity.location}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-black leading-snug text-white md:text-4xl md:leading-tight">
              {activity.title}
            </h1>
            {relText && (
              <p className="mt-2 text-sm font-medium text-white/60">{relText}</p>
            )}
          </div>
        </div>
      </section>

      {/* Body — 2 kolom desktop: konten + sidebar sticky Info Kegiatan */}
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 md:pt-6 md:pb-10">
        <div className="flex flex-col gap-8 lg:flex-row">
          <article className="min-w-0 flex-1">
            <CSSFadeIn>
              {/* Poster — rata tengah, ukuran natural TANPA crop dan tanpa latar blur */}
              {activity.image_url && (
                <div className="mb-6 md:mb-8">
                  <CoverImage
                    src={activity.image_url}
                    alt={activity.title}
                    priority
                  />
                </div>
              )}

              {/* Lead — deskripsi; tidak tampil bila isinya sama dgn awal konten */}
              {showLead && (
                <p className="mb-6 text-lg leading-relaxed text-slate-600">{activity.description}</p>
              )}

              <RichContent content={activity.content} />
            </CSSFadeIn>

            {/* Share + Back (pola Berita) */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <Link href="/activities" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1767b1] hover:text-[#082b59]">
                <ArrowLeft className="h-4 w-4" /> Semua Kegiatan
              </Link>
              <div className="flex items-center gap-2">
                <span id="act-share-label" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bagikan</span>
                <div className="flex items-center gap-1.5" role="group" aria-labelledby="act-share-label">
                  <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer"
                    aria-label="Bagikan ke WhatsApp" className={waBtnClass}>
                    <WhatsappLogo className="h-4 w-4" />
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer"
                    aria-label="Bagikan ke Facebook" className={fbBtnClass}>
                    <FacebookLogo className="h-4 w-4" />
                  </a>
                  <CopyLinkButton url={activityUrl} compact className={copyBtnClass} />
                </div>
              </div>
            </div>

            {/* Navigasi antar kegiatan (Sebelumnya = lebih lama, Berikutnya = lebih baru) */}
            {(older || newer) && (
              <nav className="mt-8 flex flex-col gap-3 sm:flex-row" aria-label="Navigasi antar kegiatan">
                {older ? (
                  <Link
                    href={`/activities/${older.slug}`}
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-[#1767b1]/30 hover:bg-slate-50"
                  >
                    <CaretLeft className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[#1767b1]" />
                    <span className="min-w-0 text-left">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sebelumnya</span>
                      <span className="block truncate text-sm font-semibold text-slate-700 group-hover:text-[#1767b1]">{older.title}</span>
                    </span>
                  </Link>
                ) : (
                  <span className="hidden flex-1 sm:block" aria-hidden="true" />
                )}
                {newer && (
                  <Link
                    href={`/activities/${newer.slug}`}
                    className="group flex min-w-0 flex-1 flex-row-reverse items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-[#1767b1]/30 hover:bg-slate-50"
                  >
                    <CaretRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[#1767b1]" />
                    <span className="min-w-0 text-right">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Berikutnya</span>
                      <span className="block truncate text-sm font-semibold text-slate-700 group-hover:text-[#1767b1]">{newer.title}</span>
                    </span>
                  </Link>
                )}
              </nav>
            )}

            {/* Kegiatan Lainnya — gaya sama "Berita Terkait" */}
            {related.length > 0 && (
              <div className="mt-10">
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-1 w-8 bg-[#f4d21f]" />
                  <h3 className="text-lg font-bold text-[#082b59]">Kegiatan Lainnya</h3>
                </div>
                <CSSStagger stagger={60} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((item) => (
                    <Link key={item.id} href={`/activities/${item.slug}`}
                      className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-[#1767b1]/30 hover:shadow-md">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.title} width={80} height={80} sizes="80px"
                          className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <CalendarBlank className="h-6 w-6 text-slate-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${activityTypeBadge(item.activity_type)}`}>
                          {activityTypeLabel(item.activity_type)}
                        </span>
                        <h4 className="mt-1 text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-[#1767b1]">{item.title}</h4>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.activity_date ? formatActivityDateRange(item.activity_date, item.end_date) : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </CSSStagger>
              </div>
            )}
          </article>

          {/* Sidebar — Info Kegiatan (sticky, gaya kartu Berita) */}
          <aside className="order-first w-full shrink-0 lg:order-none lg:w-80">
            <div className="space-y-5 lg:sticky lg:top-[128px]">
              <div className="rounded-xl border border-[#dce3ed] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-1 w-6 bg-[#f4d21f]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Info Kegiatan</h3>
                </div>

                <dl className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <CalendarBlank className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1767b1]" />
                    <div className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tanggal</dt>
                      <dd className="text-sm font-medium text-slate-700">
                        {activity.activity_date
                          ? formatActivityDateRange(activity.activity_date, activity.end_date, { long: true })
                          : "-"}
                      </dd>
                    </div>
                  </div>
                  {activity.activity_time && (
                    <div className="flex items-start gap-3">
                      <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1767b1]" />
                      <div className="min-w-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Waktu</dt>
                        <dd className="text-sm font-medium text-slate-700">{activity.activity_time}</dd>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1767b1]" />
                    <div className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lokasi</dt>
                      <dd className="text-sm font-medium text-slate-700">{activity.location || "-"}</dd>
                    </div>
                  </div>
                  {activity.contact_person && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1767b1]" />
                      <div className="min-w-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kontak Panitia</dt>
                        <dd className="break-words text-sm font-medium text-slate-700">{activity.contact_person}</dd>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${status === "today" || status === "ongoing" ? "bg-[#f4d21f]" : "bg-[#1767b1]"}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tipe &amp; Status</dt>
                      <dd className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${activityTypeBadge(activity.activity_type)}`}>
                          {activityTypeLabel(activity.activity_type)}
                        </span>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusPill.cls}`}>
                          {statusPill.label}
                        </span>
                      </dd>
                    </div>
                  </div>
                </dl>

                {activity.registration_url && (
                  <a
                    href={activity.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#f4d21f] px-4 py-2.5 text-sm font-bold text-[#082b59] transition-colors hover:bg-[#e6c51a]"
                  >
                    <ArrowUpRight className="h-4 w-4" /> Daftar Sekarang
                  </a>
                )}

                {liveActive && activity.live_url && (
                  <a
                    href={activity.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#082b59] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1767b1]"
                  >
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
                    Tonton Siaran Langsung
                  </a>
                )}

                {gcalHref && (
                  <a
                    href={gcalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    /* Kuning solid bila tak ada tombol Daftar; outline bila sudah ada. */
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                      activity.registration_url
                        ? "border border-[#082b59]/20 bg-white text-[#082b59] hover:border-[#082b59]/40 hover:bg-[#082b59]/5"
                        : "bg-[#f4d21f] text-[#082b59] hover:bg-[#e6c51a]"
                    }`}
                  >
                    <CalendarCheck className="h-4 w-4" /> Tambahkan ke Kalender
                  </a>
                )}

                <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <span className="text-xs font-semibold text-slate-500">Bagikan</span>
                  <div className="flex items-center gap-1.5" role="group" aria-label="Bagikan kegiatan">
                    <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer"
                      aria-label="Bagikan ke WhatsApp" className={waBtnClass}>
                      <WhatsappLogo className="h-4 w-4" />
                    </a>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer"
                      aria-label="Bagikan ke Facebook" className={fbBtnClass}>
                      <FacebookLogo className="h-4 w-4" />
                    </a>
                    <CopyLinkButton url={activityUrl} compact className={copyBtnClass} />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const activities = await getActivityList();
  return activities.map((item) => ({
    slug: item.slug,
  }));
}
