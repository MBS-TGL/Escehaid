import type { Metadata } from "next";
import Link from "next/link";
import { getAnnouncementArchive, parseAnnouncementLink } from "@/lib/queries";
import type { AnnouncementArchiveItem } from "@/lib/queries/announcements";
import { Megaphone } from "@/components/Icons";
import PageHero from "@/components/public/PageHero";
import EmptyState from "@/components/public/EmptyState";
import Pagination from "@/components/public/Pagination";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const items = await getAnnouncementArchive();
  const description =
    "Pengumuman resmi SMP Muhammadiyah 4 Tanggul — informasi terbaru untuk murid, orang tua, dan calon murid.";
  return {
    title: "Pengumuman",
    description,
    alternates: { canonical: "/announcements" },
    robots: items.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: pageOpenGraph({
      title: "Pengumuman",
      description,
      url: "/announcements",
      image: await ogImageOverride(),
    }),
  };
}

// Revalidasi on-demand dari panel admin (/admin/announcements) — TTL disamakan
// dengan halaman Kegiatan (300 detik).
export const revalidate = 300;

const PAGE_SIZE = 20;

/** Tanggal hari ini (zona WIB) sebagai "YYYY-MM-DD" — pola sama dengan getActiveAnnouncements. */
function todayWIB(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

/** "YYYY-MM-DD" → "5 Nov 2026", tanpa geser zona waktu (pola formatWaveDateShort beranda). */
function formatISODate(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Kartu satu pengumuman: ikon + teks (boleh bertaut) + meta tanggal. */
function AnnouncementCard({ item, expired = false }: { item: AnnouncementArchiveItem; expired?: boolean }) {
  const { text, href } = parseAnnouncementLink(item.text);
  return (
    <div
      className={`flex items-start gap-3.5 rounded-2xl border p-4 shadow-sm sm:gap-4 sm:p-5 ${
        expired ? "border-slate-200 bg-white/70" : "border-[#dce3ed] bg-white"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${
          expired ? "bg-slate-100 text-slate-400" : "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]"
        }`}
      >
        <Megaphone className="h-5 w-5" weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-relaxed sm:text-[15px] ${expired ? "text-slate-500" : "text-slate-700"}`}>
          {href ? (
            <Link href={href} className="font-semibold text-[var(--brand-primary)] underline-offset-2 transition-colors hover:text-[var(--brand-accent)] hover:underline">
              {text}
            </Link>
          ) : (
            text
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 sm:text-xs">
          <span>Diterbitkan {formatISODate(item.created_at)}</span>
          {item.expires_at && (
            <span className={expired ? "" : "font-semibold text-slate-500"}>
              {expired ? `Berlalu ${formatISODate(item.expires_at)}` : `Berlaku s.d. ${formatISODate(item.expires_at)}`}
            </span>
          )}
        </div>
      </div>
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
        <Megaphone className="h-4 w-4" weight="fill" />
      </span>
      <h2 className="text-lg font-bold text-[var(--brand-primary)]">{title}</h2>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${countCls}`}>{count}</span>
    </div>
  );
}

export default async function PengumumanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const items = await getAnnouncementArchive();
  const today = todayWIB();

  // Berlaku = tanpa kedaluwarsa atau tanggal kedaluwarsa ≥ hari ini (WIB) —
  // aturan sama persis dengan bar berjalan (getActiveAnnouncements).
  const active = items.filter((a) => !a.expires_at || a.expires_at.slice(0, 10) >= today);
  const expired = items
    .filter((a) => a.expires_at && a.expires_at.slice(0, 10) < today)
    .sort((a, b) => (b.expires_at || "").localeCompare(a.expires_at || ""));

  // Arsip "sudah berlalu" yang bisa membesar → dipagination; daftar yang masih
  // berlaku tampil penuh di halaman 1 (pola halaman Kegiatan).
  const totalPages = Math.max(1, Math.ceil(expired.length / PAGE_SIZE));
  const outOfRange = page > totalPages;
  const expiredPageItems = expired.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const makeHref = (p: number) => (p > 1 ? `/announcements?page=${p}` : "/announcements");

  return (
    <div className="min-h-screen bg-slate-50">
      {page > 1 && <link rel="prev" href={makeHref(page - 1)} />}
      {page < totalPages && <link rel="next" href={makeHref(page + 1)} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
              { "@type": "ListItem", position: 2, name: "Pengumuman", item: "https://www.smpmuh4tanggul.sch.id/announcements" },
            ],
          }),
        }}
      />

      <PageHero
        variant="compact"
        eyebrow="Informasi Sekolah"
        title="Pengumuman"
        description="Pengumuman resmi sekolah untuk murid, orang tua, dan calon murid — lengkap dengan arsipnya."
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Pengumuman" }]}
      />

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        {items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Belum ada pengumuman."
            description="Pengumuman terbaru akan tampil di halaman ini."
          />
        ) : outOfRange ? (
          <EmptyState
            icon={Megaphone}
            title="Halaman tidak ditemukan"
            description="Coba buka halaman pertama."
            action={{ href: "/announcements", label: "Halaman pertama" }}
          />
        ) : (
          <div className="space-y-10">
            {page === 1 && active.length > 0 && (
              <div>
                <SectionHeading title="Sedang Berlaku" count={active.length} tone="accent" />
                <div className="space-y-3">
                  {active.map((a) => (
                    <AnnouncementCard key={a.id} item={a} />
                  ))}
                </div>
              </div>
            )}

            {expired.length > 0 && (
              <div>
                <SectionHeading title="Sudah Berlalu" count={expired.length} tone="muted" />
                <div className="space-y-3">
                  {expiredPageItems.map((a) => (
                    <AnnouncementCard key={a.id} item={a} expired />
                  ))}
                </div>
                {totalPages > 1 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={expired.length}
                    unit="pengumuman"
                    makeHref={makeHref}
                    className="mt-10"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
