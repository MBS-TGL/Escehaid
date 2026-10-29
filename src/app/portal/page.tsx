import Link from "next/link";
import {
  House,
  HandCoins,
  Building,
  Newspaper,
  Trophy,
  ImageSquare,
  FileText,
  CalendarBlank,
  MapPin,
  Star,
  SquaresFour,
  BookOpen,
  GraduationCap,
  ChartBar,
  Clock,
  CaretDown,
  ArrowUpRight,
  ArrowSquareOut,
  Megaphone,
  WhatsappLogo,
} from "@/components/Icons";
import {
  filterUpcomingEvents,
  getActiveAgendaEvents,
  getActiveAnnouncements,
  getPortalApps,
  getSchoolProfile,
} from "@/lib/queries";
import type { PortalApp } from "@/lib/queries";
import { formatActivityDate, toJakartaDateKey } from "@/lib/activity-types";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import { getSiteSettings } from "@/lib/settings";
import { waLink } from "@/lib/site-config";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Portal",
    description:
      "Portal layanan SMP Muhammadiyah 4 Tanggul - akses cepat ke SPMB, aplikasi sekolah, dan agenda kegiatan.",
    alternates: { canonical: "/portal" },
    openGraph: pageOpenGraph({
      title: "Portal",
      url: "/portal",
      image: await ogImageOverride(),
    }),
  };
}

export const revalidate = 3600;

type AppIcon = React.ComponentType<{ className?: string; weight?: "regular" | "fill" }>;

/** Kolom `icon` di tabel portal_apps berisi nama komponen ikon, mis. "HandCoins". */
const ICONS: Record<string, AppIcon> = {
  House,
  HandCoins,
  Building,
  Newspaper,
  Trophy,
  ImageSquare,
  FileText,
  CalendarBlank,
  MapPin,
  Star,
  SquaresFour,
  BookOpen,
  GraduationCap,
  ChartBar,
  Clock,
};

/** Kolom `color` di tabel portal_apps berisi kunci warna. Kelas ditulis utuh agar terbaca Tailwind. */
const COLORS: Record<string, { box: string; ink: string }> = {
  navy: { box: "bg-[var(--brand-primary)]/10", ink: "text-[var(--brand-primary)]" },
  sky: { box: "bg-sky-50", ink: "text-sky-600" },
  blue: { box: "bg-blue-50", ink: "text-blue-600" },
  amber: { box: "bg-amber-50", ink: "text-amber-600" },
  violet: { box: "bg-violet-50", ink: "text-violet-600" },
  teal: { box: "bg-teal-50", ink: "text-teal-600" },
  rose: { box: "bg-rose-50", ink: "text-rose-600" },
  emerald: { box: "bg-emerald-50", ink: "text-emerald-600" },
};

/** Pesan pembuka chat WhatsApp dari halaman portal. */
const WA_PORTAL_MESSAGE =
  "Assalamu'alaikum, saya ingin bertanya tentang portal sekolah.";

/**
 * Tampilan tujuan tanpa protokol: "https://laporanmu.my.id" → "laporanmu.my.id".
 * Tautan non-absolut (mis. "#", "/admission") → path-nya; "#" → "" (disembunyikan).
 */
function formatDomain(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href.startsWith("/") ? href : "";
  }
}

/** Kartu unggulan — dipakai bila tepat 1 aplikasi tayang. Seluruh kartu bisa diklik. */
function FeaturedAppCard({ app }: { app: PortalApp }) {
  const Icon = ICONS[app.icon] ?? SquaresFour;
  const { box, ink } = COLORS[app.color] ?? COLORS.navy;
  const domain = formatDomain(app.href);

  // Mobile: tumpuk vertikal — ikon + teks + tombol sejajar membuat teks hanya
  // tersisa ±120px di layar 360px. Desktop tetap satu baris.
  const cls =
    "group flex w-full flex-col items-start gap-4 rounded-3xl border-[1.5px] border-[var(--brand-primary)] bg-white p-5 transition-all hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] sm:flex-row sm:items-center sm:gap-5 sm:p-6";

  const content = (
    <>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${box} ${ink}`}>
        <Icon className="h-6 w-6" weight="fill" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-base font-bold text-[var(--brand-primary)] sm:text-lg">{app.label}</span>
          {app.is_external && <ArrowSquareOut className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" aria-hidden="true" />}
        </span>
        <span className="mt-0.5 block text-sm text-slate-600">{app.description}</span>
        {domain && <span className="mt-1 block truncate text-xs text-slate-500">{domain}</span>}
      </span>
      <span className="flex w-full items-center justify-center rounded-full bg-[var(--brand-primary)] px-4 py-2.5 text-xs font-bold text-white transition-transform group-hover:scale-105 sm:w-auto sm:shrink-0 sm:px-5 sm:py-2.5 sm:text-sm">
        Buka aplikasi
      </span>
    </>
  );

  const label = app.is_external
    ? `${app.label}, buka aplikasi di tab baru`
    : `${app.label}, buka aplikasi`;
  if (app.is_external) {
    return (
      <a href={app.href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>
        {content}
      </a>
    );
  }
  return (
    <Link href={app.href} aria-label={label} className={cls}>
      {content}
    </Link>
  );
}

/** Kartu standar — dipakai bila aplikasi tayang 2 atau lebih (grid auto-fit, tanpa slot kosong). */
function AppCard({ app }: { app: PortalApp }) {
  const Icon = ICONS[app.icon] ?? SquaresFour;
  const { box, ink } = COLORS[app.color] ?? COLORS.navy;

  const cls =
    "group flex h-full flex-col items-start gap-2 rounded-3xl border border-[#dce3ed] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-primary)]/25 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] sm:p-5";

  const content = (
    <>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${box} ${ink}`}>
        <Icon className="h-5 w-5" weight="fill" aria-hidden="true" />
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-slate-800">{app.label}</span>
        {app.is_external && <ArrowSquareOut className="h-3.5 w-3.5 shrink-0 text-[var(--brand-accent)]" aria-hidden="true" />}
      </span>
      <span className="line-clamp-2 text-xs leading-relaxed text-slate-500">{app.description}</span>
      <span className="mt-auto inline-flex items-center gap-1 rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-bold text-white transition-transform group-hover:scale-105">
        Buka
        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      </span>
    </>
  );

  const label = app.is_external
    ? `${app.label}, buka aplikasi di tab baru`
    : `${app.label}, buka aplikasi`;
  if (app.is_external) {
    return (
      <a href={app.href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>
        {content}
      </a>
    );
  }
  return (
    <Link href={app.href} aria-label={label} className={cls}>
      {content}
    </Link>
  );
}

/** Baris "Sedang disiapkan" — ringkas, deskripsi tetap tampil, badge "Segera", bukan tautan. */
function SoonItem({ app }: { app: PortalApp }) {
  const Icon = ICONS[app.icon] ?? SquaresFour;
  const { box, ink } = COLORS[app.color] ?? COLORS.navy;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#dce3ed] bg-white p-3.5 sm:p-4">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${box} ${ink}`}>
        <Icon className="h-4 w-4" weight="fill" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{app.label}</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
            Segera
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{app.description}</span>
      </span>
    </div>
  );
}

export default async function PortalPage() {
  const [apps, agenda, profile, announcements, settings] = await Promise.all([
    getPortalApps(),
    getActiveAgendaEvents(),
    getSchoolProfile(),
    getActiveAnnouncements(),
    getSiteSettings(),
  ]);

  // Pisahkan per status; urutan mengikuti sort_order dari admin (sudah di query).
  const liveApps = apps.filter((a) => !a.is_coming_soon);
  const soonApps = apps.filter((a) => a.is_coming_soon);

  // Agenda mendatang — pakai helper berbasis waktu (event_date = timestamptz),
  // bukan perbandingan string yang menganggap acara hari ini selalu akan datang.
  const upcomingAgenda = filterUpcomingEvents(agenda).slice(0, 5);

  // Info tambahan di bawah banner SPMB — pengumuman aktif yang relevan (satu baris).
  const spmbNote =
    announcements.find((text) => /spmb|daftar\s*ulang/i.test(text)) ?? null;

  // Nomor WhatsApp sekolah dari profil (kontak umum, fallback panitia SPMB).
  const waRaw = profile?.phone?.trim() || profile?.spmb_contact_phone?.trim() || "";
  const waNumber = waRaw ? waLink(waRaw) : "";

  // JSON-LD breadcrumb jangan hardcode domain — ikuti Pengaturan Situs.
  const siteBase = (settings.values.site_url.trim() || "https://www.smpmuh4tanggul.sch.id").replace(/\/+$/, "");

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: `${siteBase}/` },
            { "@type": "ListItem", position: 2, name: "Portal", item: `${siteBase}/portal` },
          ],
        })
      }} />
      {/* Hero — compact terang, layanan langsung terlihat */}
      <PageHero
        variant="compact"
        title="Portal"
        description="Semua layanan sekolah dalam satu tempat."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Portal" }]}
      />

      <section className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
        {/* SPMB — layanan publik, dipisah dari aplikasi */}
        <CSSFadeIn>
          <Link
            href="/admission"
            className="group flex flex-col items-start gap-4 rounded-2xl border border-[var(--brand-accent)]/60 bg-[var(--brand-accent)]/10 p-4 transition-all hover:border-[var(--brand-accent)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] sm:flex-row sm:items-center sm:p-5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-accent)] text-white sm:h-14 sm:w-14">
              <HandCoins className="h-6 w-6 sm:h-7 sm:w-7" weight="fill" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-[var(--brand-primary)]">SPMB Online</span>
              <span className="block text-sm text-slate-600">
                Pendaftaran peserta didik baru SMP Muhammadiyah 4 Tanggul
              </span>
              {spmbNote && (
                <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[var(--brand-primary)]">
                  <Megaphone className="h-3.5 w-3.5 shrink-0" weight="fill" aria-hidden="true" />
                  <span className="line-clamp-2">{spmbNote}</span>
                </span>
              )}
            </span>
            <span className="flex w-full shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-bold text-white transition-transform group-hover:scale-105 sm:w-auto sm:py-2">
              Daftar
            </span>
          </Link>
        </CSSFadeIn>

        {/* Aplikasi sekolah — tersedia & sedang disiapkan dipisah */}
        <CSSFadeIn>
          <div className="mt-10">
            <h2 className="text-base font-bold text-[var(--brand-primary)]">Aplikasi Sekolah</h2>

            {apps.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-[#dce3ed] bg-white py-10 text-center">
                <p className="text-sm text-slate-500">Belum ada aplikasi.</p>
                <p className="mt-1 text-xs text-slate-400">Aplikasi sekolah akan muncul di sini.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-8">
                {/* Tersedia — hanya bila ada aplikasi tayang */}
                {liveApps.length === 1 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Tersedia</h3>
                    <FeaturedAppCard app={liveApps[0]} />
                  </div>
                )}
                {liveApps.length > 1 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Tersedia</h3>
                    <CSSStagger
                      stagger={80}
                      className="grid gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]"
                    >
                      {liveApps.map((app) => (
                        <AppCard key={app.id} app={app} />
                      ))}
                    </CSSStagger>
                  </div>
                )}

                {/* Sedang disiapkan — dilipat agar tidak mendominasi halaman.
                    Native <details> tetap aksesibel tanpa JS. */}
                {soonApps.length > 0 && (
                  <details className="group">
                    <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                      Sedang disiapkan ({soonApps.length})
                      <CaretDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <CSSStagger stagger={60} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {soonApps.map((app) => (
                        <SoonItem key={app.id} app={app} />
                      ))}
                    </CSSStagger>
                  </details>
                )}
              </div>
            )}
          </div>
        </CSSFadeIn>

        {/* Agenda kegiatan mendatang */}
        {upcomingAgenda.length > 0 && (
          <CSSFadeIn>
            <div className="mt-10">
              <h2 className="text-base font-bold text-[var(--brand-primary)]">Agenda Kegiatan</h2>
              <ul className="mt-3 divide-y divide-[#f0f3f8] overflow-hidden rounded-2xl border border-[#dce3ed] bg-white">
                {upcomingAgenda.map((ev) => {
                  // event_date bertipe timestamptz — split("-") membuat ed NaN
                  // dan dulu menampilkan ISO mentah. Format lewat helper WIB.
                  const dateKey = toJakartaDateKey(ev.event_date);
                  const dayLabel = dateKey ? formatActivityDate(ev.event_date, { day: "numeric" }) : "-";
                  const monthLabel = dateKey ? formatActivityDate(ev.event_date, { month: "short" }) : "";
                  const fullDate = dateKey
                    ? formatActivityDate(ev.event_date, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : ev.event_date;
                  return (
                    <li key={ev.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--brand-primary)]/5 text-[var(--brand-primary)] leading-none">
                        <span className="text-sm font-bold">{dayLabel}</span>
                        <span className="mt-0.5 text-[10px] font-semibold uppercase">{monthLabel}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--brand-primary)]">{ev.title}</p>
                        <p className="text-xs text-slate-500">{fullDate}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CSSFadeIn>
        )}

        {/* Butuh bantuan — pengganti chip "Jelajahi Website" */}
        <CSSFadeIn>
          <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-[#dce3ed] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--brand-primary)]">Butuh bantuan?</h2>
              <p className="mt-1 text-sm text-slate-600">
                Ada pertanyaan seputar portal atau layanan sekolah? Hubungi kami lewat WhatsApp.
              </p>
            </div>
            {waNumber ? (
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(WA_PORTAL_MESSAGE)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              >
                <WhatsappLogo className="h-4 w-4" weight="fill" />
                Chat WhatsApp
              </a>
            ) : (
              <Link
                href="/contact"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              >
                Hubungi sekolah
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </CSSFadeIn>

      </section>
    </div>
  );
}
