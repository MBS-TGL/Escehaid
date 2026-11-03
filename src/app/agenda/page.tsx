import type { Metadata } from "next";
import { getActiveAgendaEvents, filterUpcomingEvents } from "@/lib/queries";
import type { AgendaEvent } from "@/lib/queries/agenda";
import { todayInJakarta, toJakartaDateKey } from "@/lib/activity-types";
import { CalendarBlank } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
import EmptyState from "@/components/public/EmptyState";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const events = await getActiveAgendaEvents();
  const description =
    "Agenda kegiatan SMP Muhammadiyah 4 Tanggul — jadwal kegiatan sekolah, madrasah, dan peringatan hari besar yang akan datang.";
  return {
    title: "Agenda Kegiatan",
    description,
    alternates: { canonical: "/agenda" },
    robots: events.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: pageOpenGraph({
      title: "Agenda Kegiatan",
      description,
      url: "/agenda",
      image: await ogImageOverride(),
    }),
  };
}

// Revalidasi on-demand dari panel admin — TTL disamakan dengan halaman Kegiatan.
export const revalidate = 300;

/** "2026-11-05" (tanpa waktu) → format dari angka komponennya supaya tidak
 *  bergeser sehari oleh zona waktu; ISO berkala → new Date() (pola CountdownEvent). */
function formatAgendaDate(dateStr: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d).toLocaleDateString("id-ID", opts);
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("id-ID", opts);
}

/** Komponen tanggal untuk badge besar (angka hari + bulan singkat). */
function dateParts(dateStr: string): { day: string; month: string } {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? (() => {
        const [y, m, dd] = dateStr.split("-").map(Number);
        return y && m && dd ? new Date(y, m - 1, dd) : new Date(dateStr);
      })()
    : new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { day: "–", month: "" };
  return {
    day: d.toLocaleDateString("id-ID", { day: "numeric" }),
    month: d.toLocaleDateString("id-ID", { month: "short" }),
  };
}

/** Label jarak hari berdasarkan tanggal WIB: "Hari ini", "Besok", "3 hari lagi". */
function relativeDayLabel(dateStr: string): string {
  const key = toJakartaDateKey(dateStr);
  if (!key) return "";
  const utc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const diff = Math.round((utc(key) - utc(todayInJakarta())) / 86400000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff > 1) return `${diff} hari lagi`;
  if (diff === -1) return "Kemarin";
  return `${Math.abs(diff)} hari yang lalu`;
}

/** Kartu agenda: badge tanggal + judul + tanggal panjang + chip jarak hari. */
function AgendaCard({ event, past = false }: { event: AgendaEvent; past?: boolean }) {
  const { day, month } = dateParts(event.event_date);
  const rel = relativeDayLabel(event.event_date);
  return (
    <div
      className={`flex items-center gap-3.5 rounded-2xl border p-4 shadow-sm sm:gap-4 sm:p-5 ${
        past ? "border-slate-200 bg-white/70" : "border-[#dce3ed] bg-white"
      }`}
    >
      <div
        className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl sm:h-16 sm:w-16 ${
          past ? "bg-slate-100 text-slate-500" : "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]"
        }`}
      >
        <span className="text-xl font-black leading-none sm:text-2xl">{day}</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider">{month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className={`text-sm font-bold leading-snug sm:text-base ${
            past ? "text-slate-500" : "text-[var(--brand-primary)]"
          }`}
        >
          {event.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{formatAgendaDate(event.event_date)}</p>
      </div>
      {rel && (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:text-[11px] ${
            past ? "bg-slate-100 text-slate-400" : "bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]"
          }`}
        >
          {rel}
        </span>
      )}
    </div>
  );
}

/** Judul seksi gaya halaman Kegiatan: ikon + judul + jumlah. */
function SectionHeading({ title, count, tone }: { title: string; count: number; tone: "accent" | "muted" }) {
  const iconCls = tone === "accent" ? "bg-[var(--brand-accent)] text-white" : "bg-slate-200 text-slate-600";
  const countCls =
    tone === "accent" ? "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" : "bg-slate-100 text-slate-500";
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconCls}`}>
        <CalendarBlank className="h-4 w-4" weight="fill" />
      </span>
      <h2 className="text-lg font-bold text-[var(--brand-primary)]">{title}</h2>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${countCls}`}>{count}</span>
    </div>
  );
}

export default async function AgendaPage() {
  const events = await getActiveAgendaEvents();

  // Pemisah lewat helper murni (Date.now/new Date() tidak dipanggil langsung
  // di badan render — pola homepage CountdownEvent).
  const upcoming = [...filterUpcomingEvents(events)].sort((a, b) =>
    (toJakartaDateKey(a.event_date) || "").localeCompare(toJakartaDateKey(b.event_date) || "")
  );
  const upcomingKeys = new Set(upcoming.map((e) => e.id));
  const past = events
    .filter((e) => !upcomingKeys.has(e.id))
    .sort(
      (a, b) =>
        (toJakartaDateKey(b.event_date) || "").localeCompare(toJakartaDateKey(a.event_date) || "")
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
              { "@type": "ListItem", position: 2, name: "Agenda Kegiatan", item: "https://www.smpmuh4tanggul.sch.id/agenda" },
            ],
          }),
        }}
      />

      <PageHero
        variant="compact"
        eyebrow="Informasi Sekolah"
        title="Agenda Kegiatan"
        description="Jadwal kegiatan sekolah yang akan datang serta riwayat kegiatan yang sudah berlalu."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Agenda Kegiatan" }]}
      />

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        {events.length === 0 ? (
          <EmptyState
            icon={CalendarBlank}
            title="Belum ada agenda."
            description="Nantikan jadwal kegiatan terbaru dari sekolah kami."
          />
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <div>
                <SectionHeading title="Akan Datang" count={upcoming.length} tone="accent" />
                <div className="space-y-3">
                  {upcoming.map((e) => (
                    <AgendaCard key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <SectionHeading title="Sudah Berlalu" count={past.length} tone="muted" />
                <div className="space-y-3">
                  {past.map((e) => (
                    <AgendaCard key={e.id} event={e} past />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
