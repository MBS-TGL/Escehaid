import Link from "next/link";
import { getActivityList } from "@/lib/queries";
import {
  ACTIVITY_TYPES,
  activityStatus,
  activityTypeBadge,
  activityTypeLabel,
  daysUntilActivity,
  formatActivityDateRange,
  isActivityLiveActive,
  todayInJakarta,
  toJakartaDateKey,
} from "@/lib/activity-types";
import { CSSStagger } from "@/components/CSSAnimations";
import { CalendarBlank, Clock, MapPin } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
import FilterBar, { type FilterChip } from "@/components/public/FilterBar";
import ContentCard from "@/components/public/ContentCard";
import EmptyState from "@/components/public/EmptyState";
import Pagination from "@/components/public/Pagination";
import type { Activity } from "@/lib/supabase";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kegiatan",
    description: "Kegiatan sekolah SMP Muhammadiyah 4 Tanggul - Kajian, perlombaan, upacara, dan ekstrakurikuler.",
    alternates: { canonical: "/activities" },
    openGraph: pageOpenGraph({
      title: "Kegiatan",
      description: "Kegiatan sekolah SMP Muhammadiyah 4 Tanggul - Kajian, perlombaan, upacara, dan ekstrakurikuler.",
      url: "/activities",
      image: await ogImageOverride(),
    }),
  };
}

// Revalidasi on-demand (/activities, /activities/[slug], /, /search) sudah aktif —
// strategi TTL disamakan dengan halaman Berita (300 detik).
export const revalidate = 300;

const PAGE_SIZE = 9;
/** Bila kegiatan terdekat ≤ angka ini, tampil sebagai kartu sorot lebar; lebih dari itu → grid biasa. */
const FEATURED_MAX = 2;

type Badge = { label: string; cls: string; live?: boolean };

function activityBadges(item: Activity): Badge[] {
  const status = activityStatus(item.activity_date, item.end_date);
  const days = daysUntilActivity(item.activity_date);
  const isLive = isActivityLiveActive(item.live_url, item.activity_date, item.end_date);
  const badges: Badge[] = [
    { label: activityTypeLabel(item.activity_type), cls: `border ${activityTypeBadge(item.activity_type)}` },
  ];
  if (item.is_featured) badges.push({ label: "Unggulan", cls: "bg-[var(--brand-primary)] text-white" });
  if (status === "today") badges.push({ label: "Hari ini", cls: "bg-[var(--brand-accent)] text-white" });
  if (status === "upcoming" && days === 1) badges.push({ label: "Besok", cls: "bg-emerald-100 text-emerald-700" });
  if (status === "ongoing") badges.push({ label: "Berlangsung", cls: "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" });
  if (isLive) badges.push({ label: "Live", cls: "bg-red-600 text-white", live: true });
  return badges;
}

/** Deretan badge status/tipe kegiatan. */
function ActivityBadges({ item }: { item: Activity }) {
  return (
    <>
      {activityBadges(item).map((b) => (
        <span
          key={`${item.id}-${b.label}`}
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${b.cls}`}
        >
          {b.live ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
              {b.label}
            </>
          ) : (
            b.label
          )}
        </span>
      ))}
    </>
  );
}

/** Kartu kegiatan — pakai kartu konten kanonik (sama dengan halaman Berita). */
function ActivityCard({ item }: { item: Activity }) {
  return (
    <div className="h-full min-w-0">
      <ContentCard
        href={`/activities/${item.slug}`}
        title={item.title}
        description={item.description}
        imageUrl={item.image_url || "/images/Ruang-Kelas.jpg"}
        imageAlt={item.title}
        badges={<ActivityBadges item={item} />}
        meta={
          <>
            {item.activity_date && (
              <span className="flex items-center gap-1 text-[11px]">
                <CalendarBlank className="h-3 w-3" />
                {formatActivityDateRange(item.activity_date, item.end_date)}
              </span>
            )}
            {item.location && (
              <span className="flex items-center gap-1 text-[11px]">
                <MapPin className="h-3 w-3" />
                {item.location}
              </span>
            )}
          </>
        }
      />
    </div>
  );
}

/**
 * Kartu sorot lebar (gambar kiri, teks kanan) untuk kegiatan yang sedang berlangsung
 * atau paling dekat. Bentuknya sengaja beda dari kartu grid di bawahnya, sehingga
 * tidak mungkin tertukar dengan "Kegiatan Sebelumnya".
 */
function FeaturedActivityCard({ item }: { item: Activity }) {
  return (
    <Link
      href={`/activities/${item.slug}`}
      className="group grid min-w-0 overflow-hidden rounded-2xl border border-[var(--brand-accent)]/25 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] md:grid-cols-5"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 md:col-span-2 md:aspect-auto md:min-h-[260px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url || "/images/Ruang-Kelas.jpg"}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-3 p-5 md:col-span-3 md:p-8">
        <div className="flex flex-wrap items-center gap-1.5">
          <ActivityBadges item={item} />
        </div>
        <h3 className="text-xl font-bold leading-snug text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)] md:text-2xl">
          {item.title}
        </h3>
        {item.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 md:text-base">{item.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-500">
          {item.activity_date && (
            <span className="flex items-center gap-1.5">
              <CalendarBlank className="h-4 w-4" />
              {formatActivityDateRange(item.activity_date, item.end_date)}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {item.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Judul seksi: ikon + judul + jumlah. */
function SectionHeading({
  icon,
  title,
  count,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  tone: "accent" | "muted";
}) {
  const iconCls = tone === "accent" ? "bg-[var(--brand-accent)] text-white" : "bg-slate-200 text-slate-600";
  const countCls =
    tone === "accent" ? "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" : "bg-slate-100 text-slate-500";
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconCls}`}>{icon}</span>
      <h2 className="text-lg font-bold text-[var(--brand-primary)]">{title}</h2>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${countCls}`}>{count}</span>
    </div>
  );
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipe?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  // ?tipe= hanya diterima bila termasuk key ACTIVITY_TYPES; ?q= dibatasi 100 karakter.
  const rawTipe = (sp.tipe || "").trim();
  const tipe = rawTipe && Object.prototype.hasOwnProperty.call(ACTIVITY_TYPES, rawTipe) ? rawTipe : "";
  const q = (sp.q || "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  // Tanpa limit: seluruh data tayang dibaca lalu dipecah per seksi (jumlah kegiatan
  // sekolah kecil). sanitizeSearchTerm diterapkan di dalam getActivityList.
  const activities = await getActivityList(
    undefined,
    q || undefined,
    tipe ? { type: tipe } : undefined
  );

  // Pemisah berdasar hari ini Asia/Jakarta; kegiatan multi-hari MASIH dihitung
  // "akan datang" sampai akhir hari efektif (end_date bila ada, else mulai).
  const today = todayInJakarta();
  const endKeyOf = (a: Activity) => toJakartaDateKey(a.end_date || a.activity_date);
  const byStartDate = (a: Activity, b: Activity) =>
    (toJakartaDateKey(a.activity_date) || "").localeCompare(toJakartaDateKey(b.activity_date) || "");
  const upcoming = activities
    .filter((a) => {
      const k = endKeyOf(a);
      return k !== null && k >= today;
    })
    .sort(byStartDate);
  const past = activities.filter((a) => {
    const k = endKeyOf(a);
    return k === null || k < today;
  });

  // Unggulan tampil paling depan di seksi aslinya (sort stabil → urutan lain tetap).
  const frontFirst = (a: Activity, b: Activity) => Number(b.is_featured) - Number(a.is_featured);
  const upcomingItems = [...upcoming].sort(frontFirst);
  const pastItems = [...past].sort(frontFirst);

  const upCount = upcomingItems.length;

  // Judul seksi mengikuti isinya: hanya yang hari ini/berlangsung → "Sedang Berlangsung",
  // hanya yang belum mulai → "Akan Datang", campuran → "Agenda Terdekat".
  const nowCount = upcomingItems.filter((a) => {
    const s = activityStatus(a.activity_date, a.end_date);
    return s === "today" || s === "ongoing";
  }).length;
  const upcomingTitle =
    nowCount === 0 ? "Akan Datang" : nowCount === upCount ? "Sedang Berlangsung" : "Agenda Terdekat";

  const pastTotalPages = Math.max(1, Math.ceil(pastItems.length / PAGE_SIZE));
  const outOfRange = page > pastTotalPages;
  const pastPageItems = pastItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /** Link /activities dengan q + tipe + halaman yang sedang aktif. */
  const buildHref = (p: number, tipeKey: string) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (tipeKey) s.set("tipe", tipeKey);
    if (p > 1) s.set("page", String(p));
    const str = s.toString();
    return `/activities${str ? `?${str}` : ""}`;
  };

  const tipeLabel = tipe ? activityTypeLabel(tipe) : "";

  const chips: FilterChip[] = [
    { key: "", label: "Semua", href: buildHref(1, ""), active: !tipe },
    ...Object.values(ACTIVITY_TYPES).map((cfg) => ({
      key: cfg.key,
      label: cfg.label,
      href: buildHref(1, cfg.key),
      active: tipe === cfg.key,
    })),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {page > 1 && <link rel="prev" href={buildHref(page - 1, tipe)} />}
      {page < pastTotalPages && <link rel="next" href={buildHref(page + 1, tipe)} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "Kegiatan", item: "https://www.smpmuh4tanggul.sch.id/activities" },
          ],
        })
      }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Kegiatan SMP Muhammadiyah 4 Tanggul",
          itemListElement: activities.slice(0, 20).map((a, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: a.title,
            url: `https://www.smpmuh4tanggul.sch.id/activities/${a.slug}`,
          })),
        })
      }} />

      {/* Hero — compact */}
      <PageHero
        variant="compact"
        eyebrow="Agenda Sekolah"
        title="Kegiatan"
        description="Kajian, perlombaan, upacara, dan aktivitas murid, dari ekstrakurikuler hingga acara besar sekolah."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Kegiatan" }]}
      >
        <FilterBar
          action="/activities"
          searchName="q"
          searchId="act-search"
          searchValue={q}
          searchPlaceholder="Cari kegiatan..."
          hiddenFields={tipe ? { tipe } : {}}
          chips={chips}
        />
        {q && <p className="mt-3 text-sm font-medium text-slate-500">Hasil pencarian: &quot;{q}&quot;</p>}
        {tipe && <p className="mt-3 text-sm font-medium text-slate-500">Tipe: {tipeLabel}</p>}
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16" style={{ contentVisibility: "auto" } as React.CSSProperties}>

        {activities.length === 0 ? (
          /* Empty state berbeda: "belum ada" vs "tidak ada hasil" */
          <EmptyState
            icon={CalendarBlank}
            title={q || tipe ? "Tidak ada kegiatan yang cocok." : "Belum ada kegiatan."}
            description={
              q
                ? `Hasil pencarian "${q}" tidak ditemukan.`
                : tipe
                  ? `Belum ada kegiatan bertipe ${tipeLabel}.`
                  : "Nantikan kegiatan terbaru dari sekolah kami."
            }
            action={q || tipe ? { href: "/activities", label: "Lihat semua kegiatan" } : undefined}
          />
        ) : outOfRange ? (
          <EmptyState
            icon={CalendarBlank}
            title="Halaman tidak ditemukan"
            description="Coba buka halaman pertama."
            action={{ href: buildHref(1, tipe), label: "Lihat semua kegiatan" }}
          />
        ) : (
          <>
            {/* Terdekat / sedang berlangsung (hanya halaman 1).
                ≤ FEATURED_MAX → kartu sorot lebar; lebih banyak → grid kartu biasa. */}
            {page === 1 && upCount > 0 && (
              <div>
                <SectionHeading
                  icon={<CalendarBlank className="h-4 w-4" weight="fill" />}
                  title={upcomingTitle}
                  count={upCount}
                  tone="accent"
                />
                {upCount <= FEATURED_MAX ? (
                  <CSSStagger stagger={60} className="grid gap-5">
                    {upcomingItems.map((item) => (
                      <FeaturedActivityCard key={item.id} item={item} />
                    ))}
                  </CSSStagger>
                ) : (
                  <CSSStagger stagger={60} className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingItems.map((item) => (
                      <ActivityCard key={item.id} item={item} />
                    ))}
                  </CSSStagger>
                )}
              </div>
            )}

            {/* Kegiatan sebelumnya — grid kartu kanonik + pagination shared */}
            {pastItems.length > 0 && (
              <div className={page === 1 && upCount > 0 ? "mt-12" : ""}>
                <SectionHeading
                  icon={<Clock className="h-4 w-4" weight="fill" />}
                  title="Kegiatan Sebelumnya"
                  count={pastItems.length}
                  tone="muted"
                />
                <CSSStagger stagger={60} className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {pastPageItems.map((item) => (
                    <ActivityCard key={item.id} item={item} />
                  ))}
                </CSSStagger>

                <Pagination
                  page={page}
                  totalPages={pastTotalPages}
                  total={pastItems.length}
                  unit="kegiatan"
                  makeHref={(p) => buildHref(p, tipe)}
                  className="mt-10"
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
