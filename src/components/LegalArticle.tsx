import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import PageHero from "@/components/public/PageHero";
import LegalToc from "@/components/LegalToc";
import { PrintButton } from "@/components/LegalParts";

const SITE_URL = "https://www.smpmuh4tanggul.sch.id";

export type LegalSection = { id: string; title: string; content: ReactNode };
export type LegalHighlight = { title: string; text: string };

function waLink(raw: string) {
  const d = raw.replace(/\D/g, "");
  const n = d.startsWith("0") ? `62${d.slice(1)}` : d;
  return `https://wa.me/${n}`;
}

/**
 * Kerangka halaman legal: PageHero + strip meta + kartu ringkasan +
 * daftar isi sticky + seksi bernomor + kartu kontak + tautan halaman pasangan.
 */
export default function LegalArticle({
  title,
  description,
  updated,
  path,
  icon,
  audience,
  highlights,
  sections,
  brand,
  related,
}: {
  title: string;
  description: string;
  updated: string;
  /** Path kanonis, mis. "/privacy" — untuk breadcrumb JSON-LD. */
  path: string;
  icon: ComponentProps<typeof PageHero>["icon"];
  audience: string;
  highlights: LegalHighlight[];
  sections: LegalSection[];
  brand: { email?: string | null; whatsapp?: string | null };
  related: { href: string; label: string };
}) {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}${path}` },
          ],
        })
      }} />
      <PageHero
        variant="compact"
        title={title}
        description={description}
        icon={icon}
        breadcrumb={[{ label: "Beranda", href: "/" }, { label: title }]}
      />

      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        {/* Strip meta */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)]/[0.07] px-3.5 py-1.5 text-xs font-semibold text-[var(--brand-primary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Diperbarui {updated}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600">
            {audience}
          </span>
          <span className="sm:ml-auto">
            <PrintButton />
          </span>
        </div>

        {/* Ringkasan singkat */}
        <section aria-label="Ringkasan" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((h) => (
            <div key={h.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-accent)]/15 text-[var(--brand-primary)]">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                </svg>
              </span>
              <h2 className="mt-3 text-[15px] font-semibold text-[var(--brand-primary)]">{h.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{h.text}</p>
            </div>
          ))}
        </section>

        {/* Daftar isi + isi */}
        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
          <aside>
            <LegalToc items={sections.map(({ id, title }) => ({ id, title }))} />
          </aside>

          <article className="min-w-0 max-w-[760px]">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28 border-t border-slate-200 py-8 first:border-t-0 first:pt-0">
                <h2 className="group flex items-baseline gap-3 text-xl font-semibold tracking-tight text-[var(--brand-primary)]">
                  <span className="text-sm font-medium tabular-nums text-[var(--brand-accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <a href={`#${s.id}`} className="no-underline">
                    {s.title}
                    <span className="ml-2 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 print:hidden" aria-hidden>#</span>
                  </a>
                </h2>
                <div className="[&_li]:mt-1 [&_p]:mt-3 [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-slate-600 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-[15px] [&_ul]:leading-relaxed [&_ul]:text-slate-600 [&_a]:font-medium [&_a]:text-[var(--brand-accent)] [&_a]:underline-offset-2 hover:[&_a]:underline">
                  {s.content}
                </div>
              </section>
            ))}

            {/* Kartu kontak */}
            <div className="mt-6 rounded-2xl bg-[var(--brand-primary)] p-6 text-white md:p-8 print:hidden">
              <h2 className="text-lg font-semibold">Ada pertanyaan?</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-white/75">
                Tim kami siap membantu menjelaskan isi halaman ini atau menindaklanjuti permintaan Anda.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {brand.email && (
                  <a href={`mailto:${brand.email}`} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--brand-primary)] transition-opacity hover:opacity-90">
                    Kirim email
                  </a>
                )}
                {brand.whatsapp && (
                  <a href={waLink(brand.whatsapp)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20">
                    WhatsApp
                  </a>
                )}
                <Link href="/contact" className="rounded-full px-5 py-2.5 text-sm font-semibold text-white/85 ring-1 ring-white/20 transition-colors hover:bg-white/10">
                  Halaman kontak
                </Link>
              </div>
            </div>

            <p className="mt-8 text-sm text-slate-500 print:hidden">
              Lihat juga:{" "}
              <Link href={related.href} className="font-semibold text-[var(--brand-accent)] underline-offset-2 hover:underline">
                {related.label} →
              </Link>
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}