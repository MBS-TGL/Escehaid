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
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import { CalendarBlank, Clock, MapPin, ArrowRight } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
import FilterBar, { type FilterChip } from "@/components/public/FilterBar";
import FeaturedCard from "@/components/public/FeaturedCard";
import ContentCard from "@/components/public/ContentCard";
import EmptyState from "@/components/public/EmptyState";
import Pagination from "@/components/public/Pagination";
import type { Activity } from "@/lib/supabase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kegiatan",
  description: "Kegiatan sekolah SMP Muhammadiyah 4 Tanggul - Kajian, perlombaan, upacara, dan ekstrakurikuler.",
  alternates: { canonical: "/activities" },
};

// Revalidasi on-demand (/activities, /activities/[slug], /, /search) sudah aktif —
// strategi TTL disamakan dengan halaman Berita (300 detik).
export const revalidate = 300;

const PAGE_SIZE = 9;

const monthShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function activityBadges(item: Activity): { label: string; cls: string; live?: boolean }[] {
  const status = activityStatus(item.activity_date, item.end_date);
  const days = daysUntilActivity(item.activity_date);
  const isLive = isActivityLiveActive(item.live_url, item.activity_date, item.end_date);
  const badges: { label: string; cls: string; live?: boolean }[] = [
    { label: activityTypeLabel(item.activity_type), cls: `border ${activityTypeBadge(item.activity_type)}` },
  ];
  if (item.is_featured) badges.push({ label: "Unggulan", cls: "bg-[var(--brand-primary)] text-white" });
  if (status === "today") badges.push({ label: "Hari ini", cls: "bg-[var(--brand-accent)] text-white" });
  if (status === "upcoming" && days === 1) badges.push({ label: "Besok", cls: "bg-emerald-100 text-emerald-700" });
  if (status === "ongoing") badges.push({ label: "Berlangsung", cls: "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" });
  if (isLive) badges.push({ label: "Live", cls: "bg-red-600 text-white", live: true });
  return badges;
}

/** Kartu grid untuk seksi "Sudah Berlangsung" — pakai kartu konten kanonik. */
function ActivityCard({ item }: { item: Activity }) {
  return (
    <div>
      <ContentCard
        href={`/activities/${item.slug}`}
        title={item.title}
        description={item.description}
        imageUrl={item.image_url || "/images/Ruang-Kelas.jpg"}
        imageAlt={item.title}
        badges={
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
        }
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
 * Baris agenda "Akan Datang" — identitas kegiatan: kotak tanggal kiri
 * (bulan-des) + konten kanan, bukan grid kartu identik.
 */
function ActivityTimelineRow({ item }: { item: Activity }) {
  const raw = new Date(item.activity_date);
  const valid = !Number.isNaN(raw.getTime());
  const day = valid ? raw.getDate() : null;
  const month = valid ? monthShort[raw.getMonth()] : "";
  return (
    <Link
      href={`/activities/${item.slug}`}
      className="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] sm:gap-6 sm:p-4"
    >
      {/* Kotak tanggal */}
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-[var(--brand-accent)]/20 bg-white shadow-sm sm:h-[76px] sm:w-[76px]">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--brand-accent)]">{month}</span>
        <span className="text-xl font-black leading-none text-[var(--brand-primary)]">{day ?? "-"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
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
        </div>
        <h3 className="mt-1.5 truncate text-base font-bold text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)] sm:text-lg">
          {item.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          {item.activity_date && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatActivityDateRange(item.activity_date, item.end_date)}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.location}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="hidden h-5 w-5 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--brand-accent)] sm:block" />
    </Link>
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

  // Unggulan: PIN is_featured bila ada; kalau tidak → terdekat / terbaru.
  const featured = activities.find((a) => a.is_featured) ?? upcoming[0] ?? past[0] ?? null;
  const rest = featured ? activities.filter((a) => a.id !== featured.id) : activities;
  const upcomingRest = rest
    .filter((a) => {
      const k = endKeyOf(a);
      return k !== null && k >= today;
    })
    .sort(byStartDate);
  const pastRest = rest.filter((a) => {
    const k = endKeyOf(a);
    return k === null || k < today;
  });

  const pastTotalPages = Math.max(1, Math.ceil(pastRest.length / PAGE_SIZE));
  const outOfRange = page > pastTotalPages;
  const pastPageItems = pastRest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      {/* Hero — editorial split, visual dari kegiatan unggulan */}
      <PageHero
        variant="split"
        eyebrow="Agenda Sekolah"
        title="Kegiatan"
        description="Kajian, perlombaan, upacara, dan aktivitas murid, dari ekstrakurikuler hingga acara besar sekolah."
        image="/images/facilities/3d1d5c31-7639-413b-bbda-2f9c64abcfa8.jpg"
        imageAlt="Fasilitas SMP Muhammadiyah 4 Tanggul"
        icon={CalendarBlank}
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Kegiatan" }]}
      >
        <>
          {q && <p className="text-sm font-medium text-slate-500">Hasil pencarian: &quot;{q}&quot;</p>}
          {tipe && <p className="text-sm font-medium text-slate-500">Tipe: {tipeLabel}</p>}
        </>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        {/* Pencarian + filter tipe (GET tanpa JS; ?q & ?tipe bisa di-share) */}
        <FilterBar
          action="/activities"
          searchName="q"
          searchId="act-search"
          searchValue={q}
          searchPlaceholder="Cari kegiatan..."
          hiddenFields={tipe ? { tipe } : {}}
          chips={chips}
        />

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
            {/* Unggulan (hanya halaman 1) */}
            {page === 1 && featured && (
              <CSSFadeIn>
                <FeaturedCard
                  href={`/activities/${featured.slug}`}
                  title={featured.title}
                  description={featured.description}
                  imageUrl={featured.image_url || "/images/Ruang-Kelas.jpg"}
                  imageAlt={featured.title}
                  badges={
                    <>
                      {activityBadges(featured).map((b) => (
                        <span
                          key={`${featured.id}-${b.label}`}
                          className={`inline-flex w-fit items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${b.cls}`}
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
                  }
                  meta={
                    <>
                      {featured.activity_date && (
                        <span className="flex items-center gap-1 text-xs">
                          <CalendarBlank className="h-3.5 w-3.5" />
                          {formatActivityDateRange(featured.activity_date, featured.end_date, { long: true })}
                        </span>
                      )}
                      {(() => {
                        const status = activityStatus(featured.activity_date, featured.end_date);
                        const days = daysUntilActivity(featured.activity_date);
                        if (status === "upcoming" && days !== null && days > 0) {
                          return (
                            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-accent)]">
                              <Clock className="h-3.5 w-3.5" />
                              {days === 1 ? "Mulai besok" : `${days} hari lagi`}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {featured.location && (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3.5 w-3.5" />
                          {featured.location}
                        </span>
                      )}
                    </>
                  }
                  ctaLabel="Lihat kegiatan"
                />
              </CSSFadeIn>
            )}

            {/* Akan datang — agenda timeline (hanya halaman 1) */}
            {page === 1 && upcomingRest.length > 0 && (
              <div className="mt-10">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-accent)] text-white">
                    <CalendarBlank className="h-4 w-4" weight="fill" />
                  </span>
                  <h2 className="text-lg font-bold text-[var(--brand-primary)]">Akan Datang</h2>
                  <span className="rounded-full bg-[var(--brand-accent)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--brand-accent)]">
                    {upcomingRest.length}
                  </span>
                </div>
                <CSSStagger stagger={60} className="rounded-2xl border border-[#dce3ed] bg-slate-50/50 p-2">
                  {upcomingRest.map((item) => (
                    <ActivityTimelineRow key={item.id} item={item} />
                  ))}
                </CSSStagger>
              </div>
            )}

            {/* Sudah berlangsung — grid kartu kanonik + pagination shared */}
            {pastRest.length > 0 && (
              <div className={page === 1 ? "mt-10" : ""}>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
                    <Clock className="h-4 w-4" weight="fill" />
                  </span>
                  <h2 className="text-lg font-bold text-[var(--brand-primary)]">Sudah Berlangsung</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                    {pastRest.length}
                  </span>
                </div>
                <CSSStagger stagger={60} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {pastPageItems.map((item) => (
                    <ActivityCard key={item.id} item={item} />
                  ))}
                </CSSStagger>

                <Pagination
                  page={page}
                  totalPages={pastTotalPages}
                  total={pastRest.length}
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
