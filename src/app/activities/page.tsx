import Link from "next/link";
import Image from "next/image";
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
import { CalendarBlank, CaretLeft, CaretRight, Clock, MagnifyingGlass, MapPin, Star } from "@/components/Icons";
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

/** Kartu grid (dipakai seksi "Akan Datang" & "Sudah Berlangsung"). */
function ActivityCard({ item }: { item: Activity }) {
  const status = activityStatus(item.activity_date, item.end_date);
  const days = daysUntilActivity(item.activity_date);
  const isLive = isActivityLiveActive(item.live_url, item.activity_date, item.end_date);
  return (
    <div>
      <Link
        href={`/activities/${item.slug}`}
        className="group block overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[#1767b1]/30 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1]"
      >
        <div className="overflow-hidden bg-slate-100">
          <Image
            src={item.image_url || "/images/Ruang-Kelas.jpg"}
            alt={item.title}
            width={1280}
            height={720}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            // Rasio natural tanpa crop — konsisten dengan kartu Berita,
            // poster portrait tidak memotong wajah/teks.
            className="h-auto w-full transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${activityTypeBadge(item.activity_type)}`}>
              {activityTypeLabel(item.activity_type)}
            </span>
            {status === "today" && (
              <span className="inline-flex items-center rounded-md bg-[#f4d21f] px-2 py-0.5 text-[10px] font-bold uppercase text-[#082b59]">
                Hari ini
              </span>
            )}
            {status === "upcoming" && days === 1 && (
              <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                Besok
              </span>
            )}
            {status === "ongoing" && (
              <span className="inline-flex items-center rounded-md bg-[#1767b1]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#1767b1]">
                Berlangsung
              </span>
            )}
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
                Live
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-bold text-[#082b59] line-clamp-2 transition-colors group-hover:text-[#1767b1]">
            {item.title}
          </h3>
          {item.description && (
            <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">{item.description}</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
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
          </div>
        </div>
      </Link>
    </div>
  );
}

/** Kartu besar unggulan — kegiatan terdekat (atau terbaru bila tak ada yang akan datang). */
function ActivityFeaturedCard({ item }: { item: Activity }) {
  const status = activityStatus(item.activity_date, item.end_date);
  const days = daysUntilActivity(item.activity_date);
  const isLive = isActivityLiveActive(item.live_url, item.activity_date, item.end_date);
  return (
    <Link
      href={`/activities/${item.slug}`}
      className="group grid overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm transition-all hover:border-[#1767b1]/30 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] lg:grid-cols-5"
    >
      <div className="relative overflow-hidden bg-slate-100 lg:col-span-3">
        <Image
          src={item.image_url || "/images/Ruang-Kelas.jpg"}
          alt={item.title}
          width={1600}
          height={900}
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
          // Tinggi natural mengikuti rasio poster — tanpa crop (pola kartu Berita).
          className="h-auto w-full transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col justify-center gap-3 p-6 lg:col-span-2 lg:p-8">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${activityTypeBadge(item.activity_type)}`}>
            {activityTypeLabel(item.activity_type)}
          </span>
          {item.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#082b59] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              <Star className="h-3 w-3 text-[#f4d21f]" weight="fill" /> Unggulan
            </span>
          )}
          {status === "today" && (
            <span className="inline-flex items-center rounded-md bg-[#f4d21f] px-2.5 py-1 text-[11px] font-bold uppercase text-[#082b59]">
              Hari ini
            </span>
          )}
          {status === "upcoming" && days === 1 && (
            <span className="inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-700">
              Besok
            </span>
          )}
          {status === "ongoing" && (
            <span className="inline-flex items-center rounded-md bg-[#1767b1]/10 px-2.5 py-1 text-[11px] font-bold uppercase text-[#1767b1]">
              Berlangsung
            </span>
          )}
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
              Live
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold leading-snug text-[#082b59] line-clamp-2 md:text-2xl">
          {item.title}
        </h2>
        {item.description && (
          <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          {item.activity_date && (
            <span className="flex items-center gap-1">
              <CalendarBlank className="h-3.5 w-3.5" />
              {formatActivityDateRange(item.activity_date, item.end_date, { long: true })}
            </span>
          )}
          {status === "upcoming" && days !== null && days > 0 && (
            <span className="flex items-center gap-1 font-semibold text-[#1767b1]">
              <Clock className="h-3.5 w-3.5" />
              {days === 1 ? "Mulai besok" : `${days} hari lagi`}
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
      {/* Hero — gaya sama halaman Berita */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-16 text-white">
        <div className="absolute inset-0 hidden opacity-[0.04] sm:block">
          <CalendarBlank className="absolute -left-10 -top-10 h-64 w-64 -rotate-12" weight="fill" />
          <CalendarBlank className="absolute -right-10 -bottom-10 h-64 w-64 rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <CSSFadeIn>
            <h1 className="text-3xl font-bold md:text-4xl text-balance">Kegiatan Sekolah</h1>
            <p className="mt-3 text-base text-white/70 text-balance">Kajian, perlombaan, upacara, dan aktivitas lainnya</p>
            {q && (
              <p className="mt-2 text-sm text-white/50">Hasil pencarian: &quot;{q}&quot;</p>
            )}
            {tipe && (
              <p className="mt-2 text-sm text-white/50">Tipe: {tipeLabel}</p>
            )}
          </CSSFadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        {/* Pencarian + filter tipe (GET tanpa JS; ?q & ?tipe bisa di-share) */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form action="/activities" method="GET" className="relative w-full sm:max-w-xs">
            <label htmlFor="act-search" className="sr-only">Cari kegiatan</label>
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="act-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Cari kegiatan..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20"
            />
            {tipe && <input type="hidden" name="tipe" value={tipe} />}
          </form>
          <nav aria-label="Filter tipe kegiatan" className="flex flex-wrap items-center gap-2">
            <Link
              href={buildHref(1, "")}
              aria-current={!tipe ? "page" : undefined}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                !tipe
                  ? "border-[#082b59] bg-[#082b59] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Semua
            </Link>
            {Object.values(ACTIVITY_TYPES).map((cfg) => (
              <Link
                key={cfg.key}
                href={buildHref(1, cfg.key)}
                aria-current={tipe === cfg.key ? "page" : undefined}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tipe === cfg.key
                    ? "border-[#082b59] bg-[#082b59] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cfg.label}
              </Link>
            ))}
          </nav>
        </div>

        {activities.length === 0 ? (
          /* Empty state berbeda: "belum ada" vs "tidak ada hasil" */
          <CSSFadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
              <CalendarBlank className="h-14 w-14 text-[#082b59]/20" />
              <p className="mt-5 text-base text-slate-500">
                {q || tipe ? "Tidak ada kegiatan yang cocok." : "Belum ada kegiatan."}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {q
                  ? `Hasil pencarian "${q}" tidak ditemukan.`
                  : tipe
                    ? `Belum ada kegiatan bertipe ${tipeLabel}.`
                    : "Nantikan kegiatan terbaru dari sekolah kami."}
              </p>
              {(q || tipe) && (
                <Link
                  href="/activities"
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#082b59] transition-colors hover:border-[#1767b1] hover:text-[#1767b1]"
                >
                  Lihat semua kegiatan
                </Link>
              )}
            </div>
          </CSSFadeIn>
        ) : outOfRange ? (
          <CSSFadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
              <CalendarBlank className="h-14 w-14 text-slate-300" />
              <p className="mt-5 text-base text-slate-500">Halaman tidak ditemukan — coba buka halaman pertama.</p>
              <Link
                href={buildHref(1, tipe)}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#082b59] transition-colors hover:border-[#1767b1] hover:text-[#1767b1]"
              >
                Lihat semua kegiatan
              </Link>
            </div>
          </CSSFadeIn>
        ) : (
          <>
            {/* Unggulan (hanya halaman 1) */}
            {page === 1 && featured && (
              <CSSFadeIn>
                <ActivityFeaturedCard item={featured} />
              </CSSFadeIn>
            )}

            {/* Akan datang — terdekat dulu, disembunyikan bila kosong */}
            {page === 1 && upcomingRest.length > 0 && (
              <div className="mt-10">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#082b59]">
                  <span className="rounded-lg bg-[#f4d21f] p-1.5 text-[#082b59]">
                    <CalendarBlank className="h-4 w-4" weight="fill" />
                  </span>
                  Akan Datang
                </h2>
                <CSSStagger stagger={60} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingRest.map((item) => (
                    <ActivityCard key={item.id} item={item} />
                  ))}
                </CSSStagger>
              </div>
            )}

            {/* Sudah berlangsung — terbaru dulu + pagination pola Berita */}
            {pastRest.length > 0 && (
              <div className={page === 1 ? "mt-10" : ""}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#082b59]">
                  <span className="rounded-lg bg-slate-200 p-1.5 text-slate-600">
                    <Clock className="h-4 w-4" weight="fill" />
                  </span>
                  Sudah Berlangsung
                </h2>
                <CSSStagger stagger={60} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {pastPageItems.map((item) => (
                    <ActivityCard key={item.id} item={item} />
                  ))}
                </CSSStagger>

                {pastTotalPages > 1 && (
                  <CSSFadeIn delay={150}>
                    <div className="mt-10 flex flex-col items-center gap-3">
                      <p className="text-xs text-slate-400">
                        Halaman {page} dari {pastTotalPages} · {pastRest.length} kegiatan
                      </p>
                      <div className="flex items-center gap-1">
                        <Link
                          href={buildHref(Math.max(1, page - 1), tipe)}
                          aria-label="Halaman sebelumnya"
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${page === 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          <CaretLeft className="h-4 w-4" />
                        </Link>
                        {Array.from({ length: pastTotalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === pastTotalPages || Math.abs(p - page) <= 2)
                          .reduce<(number | "...")[]>((acc, p, i, arr) => {
                            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, i) =>
                            p === "..." ? (
                              <span key={`dots-${i}`} className="flex h-9 w-9 items-center justify-center text-xs text-slate-400">…</span>
                            ) : (
                              <Link
                                key={p}
                                href={buildHref(p, tipe)}
                                aria-label={`Halaman ${p}`}
                                aria-current={p === page ? "page" : undefined}
                                className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[#082b59] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                              >
                                {p}
                              </Link>
                            )
                          )}
                        <Link
                          href={buildHref(Math.min(pastTotalPages, page + 1), tipe)}
                          aria-label="Halaman berikutnya"
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${page === pastTotalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          <CaretRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </CSSFadeIn>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
