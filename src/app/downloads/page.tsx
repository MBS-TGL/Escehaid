import Link from "next/link";
import { Download, FileText, FolderOpen, Info } from "@/components/Icons";
import { CSSStagger } from "@/components/CSSAnimations";
import PageHero from "@/components/public/PageHero";
import EmptyState from "@/components/public/EmptyState";
import CategoryChips, { type CategoryChip } from "@/components/public/CategoryChips";
import { getDownloadList, downloadKind, formatFileSize } from "@/lib/queries";
import { pageOpenGraph } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unduhan",
  description:
    "Unduhan resmi SMP Muhammadiyah 4 Tanggul - brosur, formulir pendaftaran, dan dokumen lainnya.",
  alternates: { canonical: "/downloads" },
  openGraph: pageOpenGraph({
    title: "Unduhan",
    url: "/downloads",
  }),
};

export const revalidate = 300;

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]";

export default async function UnduhanPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const sp = await searchParams;
  const downloads = await getDownloadList();

  // Kelompokkan berdasarkan kategori, urut abjad; kategori "Umum" paling akhir
  // agar kategori spesifik (mis. SPMB) tampil lebih dulu.
  const allCategories = Array.from(new Set(downloads.map((d) => d.category))).sort((a, b) =>
    a === "Umum" ? 1 : b === "Umum" ? -1 : a.localeCompare(b, "id")
  );

  const activeCat = sp.cat && allCategories.includes(sp.cat) ? sp.cat : undefined;
  const categories = activeCat ? [activeCat] : allCategories;

  const chips: CategoryChip[] = [
    { key: "all", label: "Semua", href: "/downloads", active: !activeCat },
    ...allCategories.map((c) => ({
      key: c,
      label: c,
      href: `/downloads?cat=${encodeURIComponent(c)}`,
      active: activeCat === c,
    })),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "Unduhan", item: "https://www.smpmuh4tanggul.sch.id/downloads" },
          ],
        })
      }} />
      {/* Hero */}
      <PageHero
        variant="compact"
        title="Unduhan"
        description="Brosur, formulir, dan dokumen resmi SMP Muhammadiyah 4 Tanggul."
        icon={Download}
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: "Unduhan" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6" style={{ contentVisibility: "auto" } as React.CSSProperties}>
        {allCategories.length > 1 && (
          <CategoryChips chips={chips} className="mb-8" />
        )}
        {downloads.length === 0 ? (
          <EmptyState
            icon={Download}
            title="Belum ada berkas unduhan."
            description="Dokumen resmi akan segera tersedia di sini."
          />
        ) : (
          <CSSStagger className="space-y-10">
            {categories.map((category) => {
              const rows = downloads.filter((d) => d.category === category);
              return (
                <div key={category}>
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-accent)]/15">
                      <FolderOpen className="h-4.5 w-4.5 text-[var(--brand-primary)]" />
                    </div>
                    <h2 className="text-lg font-bold text-[var(--brand-primary)] md:text-xl">{category}</h2>
                    <span className="rounded-full bg-[var(--brand-accent)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-primary)]/70">
                      {rows.length} berkas
                    </span>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((item) => {
                      const kind = downloadKind(item.file_name || item.file_url);
                      const size = formatFileSize(item.file_size);
                      return (
                        <li key={item.id}>
                          <a
                            href={item.file_url}
                            download={item.file_name || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group flex h-full items-start gap-3 rounded-2xl border border-[#dce3ed] bg-white p-4 transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-md ${focusRing}`}
                          >
                            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--brand-primary)]/5 leading-none">
                              <FileText aria-hidden="true" className="h-5 w-5 text-[var(--brand-primary)]" />
                              <span aria-hidden="true" className="mt-0.5 text-[8px] font-bold text-[var(--brand-accent)]">{kind}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">
                                {item.title}
                              </span>
                              {item.description && (
                                <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-slate-500">
                                  {item.description}
                                </span>
                              )}
                              <span className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">{kind}</span>
                                {size && <span>{size}</span>}
                              </span>
                            </span>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white transition-colors group-hover:bg-[var(--brand-accent)]" aria-hidden="true">
                              <Download className="h-4 w-4" />
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </CSSStagger>
        )}

        <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <Info className="h-3.5 w-3.5" />
          Butuh dokumen lain?{" "}
          <Link href="/contact" className={`font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-primary)] ${focusRing}`}>
            Hubungi kami
          </Link>
        </p>
      </section>
    </div>
  );
}
