import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { CSSFadeIn } from "@/components/CSSAnimations";
import HeroGraphic, { type HeroGraphicName } from "./HeroGraphic";

/**
 * Hero halaman publik — 3 varian berbeda karakter supaya tidak ada dua halaman
 * dengan blok hero persis sama:
 *
 * - "photo"  : full-bleed komposisi geometris-editorial + gradient brand, zoom
 *              halus mengikuti scroll. Fallback → gradient + ikon raksasa.
 * - "split"  : editorial asimetris — teks kiri di latar terang, komposisi grafis
 *              kanan ber-clip arch di atas pelat aksen solid. Fallback → panel brand.
 * - "compact": pita terang ramping untuk halaman fungsional (search, status, portal).
 */

export type CrumbItem = { label: string; href?: string };

export type PageHeroProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  /** Komposisi geometris hero (lihat HeroGraphic). */
  graphic?: HeroGraphicName;
  /** Ikon dekoratif fallback (Phosphor SSR) saat tidak ada komposisi grafis. */
  icon?: ComponentType<{ className?: string; weight?: "fill" | "regular" }>;
  breadcrumb?: CrumbItem[];
  /** Elemen tambahan di bawah deskripsi (stat strip, chip dsb). */
  children?: ReactNode;
  variant?: "photo" | "split" | "compact";
  className?: string;
};

function Breadcrumb({ items, tone }: { items: CrumbItem[]; tone: "light" | "dark" }) {
  if (!items.length) return null;
  const link = tone === "light" ? "text-white/50 hover:text-white" : "text-slate-400 hover:text-[var(--brand-accent)]";
  const current = tone === "light" ? "text-white/90" : "text-slate-600";
  const divider = tone === "light" ? "text-white/30" : "text-slate-300";
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className={divider} aria-hidden="true">/</span>}
          {item.href ? (
            <Link href={item.href} className={`font-medium transition-colors ${link}`}>{item.label}</Link>
          ) : (
            <span className={`max-w-[220px] truncate font-medium ${current}`}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function PageHero({
  title,
  description,
  eyebrow,
  graphic,
  icon: Icon,
  breadcrumb,
  children,
  variant = "compact",
  className = "",
}: PageHeroProps) {
  const crumbs = breadcrumb ?? [];

  /* ── PHOTO: full-bleed komposisi grafis + gradient brand ──────────── */
  if (variant === "photo") {
    return (
      <section className={`relative overflow-hidden bg-[var(--brand-primary)] text-white ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)]" />
        {graphic ? (
          /* Zoom halus mengikuti scroll (lihat .hero-media di globals.css). */
          <div className="hero-media absolute inset-0">
            <HeroGraphic name={graphic} className="h-full w-full" />
          </div>
        ) : (
          Icon && (
            <Icon className="absolute -right-8 -top-8 h-56 w-56 rotate-12 opacity-[0.06]" weight="fill" />
          )
        )}
        {/* Aksen geometris melayang (dekoratif, di bawah blok teks). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-2 border-white/10" />
          <div className="absolute right-8 top-12 hidden h-16 w-16 rotate-12 rounded-2xl bg-white/5 md:block" />
          <div className="absolute -bottom-8 right-1/4 h-10 w-28 rounded-full bg-[var(--brand-accent)]/40" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-12">
          <CSSFadeIn>
            <div className="max-w-2xl">
              <Breadcrumb items={crumbs} tone="light" />
              {eyebrow && (
                <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-highlight)]">
                  <span className="h-px w-6 bg-[var(--brand-highlight)]" aria-hidden="true" />
                  {eyebrow}
                </p>
              )}
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-4xl md:leading-[1.08]">
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">{description}</p>
              )}
              {children && <div className="mt-4">{children}</div>}
            </div>
          </CSSFadeIn>
        </div>
      </section>
    );
  }

  /* ── SPLIT: editorial, teks kiri + visual kanan ───────────────────── */
  if (variant === "split") {
    return (
      <section className={`border-b border-[#dce3ed] bg-slate-50 ${className}`}>
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-8 sm:px-6 md:py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <CSSFadeIn>
            <div>
              <Breadcrumb items={crumbs} tone="dark" />
              {eyebrow && (
                <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
                  <span className="h-px w-6 bg-[var(--brand-accent)]" aria-hidden="true" />
                  {eyebrow}
                </p>
              )}
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-[var(--brand-primary)] md:text-4xl md:leading-[1.08] text-balance">
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">{description}</p>
              )}
              {children && <div className="mt-4">{children}</div>}
            </div>
          </CSSFadeIn>

          <CSSFadeIn delay={0.15}>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              {/* Pelat aksen SOLID yang mengintip di sudut kanan-bawah, bentuk
                  daun (radius diagonal berlawanan) mengikuti panel di atasnya. */}
              <div
                aria-hidden="true"
                className="absolute -bottom-3 -right-3 h-full w-full rounded-tl-[999px] rounded-br-[999px] rounded-tr-[0.75rem] rounded-bl-[0.75rem] bg-[var(--brand-accent)]/90 md:-bottom-4 md:-right-4"
              />
              {graphic ? (
                <div className="relative h-40 w-full overflow-hidden rounded-tl-[999px] rounded-br-[999px] rounded-tr-[0.75rem] rounded-bl-[0.75rem] border border-[#dce3ed] bg-white shadow-xl shadow-[var(--brand-primary)]/20 md:h-52">
                  <HeroGraphic name={graphic} className="absolute inset-0 h-full w-full" />
                </div>
              ) : (
                <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-tl-[999px] rounded-br-[999px] rounded-tr-[0.75rem] rounded-bl-[0.75rem] bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)] shadow-lg shadow-[var(--brand-primary)]/10 md:h-52">
                  <div aria-hidden="true" className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[var(--brand-accent)]/20 blur-[80px]" />
                  {Icon ? (
                    <Icon className="h-24 w-24 text-white/15" weight="fill" />
                  ) : (
                    <span className="text-6xl font-black text-white/10">{title[0]}</span>
                  )}
                </div>
              )}
              {/* Satelit multi-shape: lingkaran aksen + pill navy mengambang di
                  luar panel, dengan ring sewarna latar supaya terbaca "cut-out". */}
              <div
                aria-hidden="true"
                className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-[var(--brand-accent)] ring-[6px] ring-slate-50 md:-right-5 md:-top-5 md:h-14 md:w-14"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-4 -left-4 h-12 w-24 rounded-full bg-[var(--brand-primary)] ring-[6px] ring-slate-50 md:-bottom-5 md:-left-5 md:h-14 md:w-28"
              />
            </div>
          </CSSFadeIn>
        </div>
      </section>
    );
  }

  /* ── COMPACT: pita terang ramping untuk halaman fungsional ───────── */
  return (
    <section className={`relative overflow-hidden border-b border-[#dce3ed] bg-slate-50 ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-28 hidden h-80 w-80 rounded-full border-[36px] border-[var(--brand-accent)]/[0.06] md:block"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
        <CSSFadeIn>
          <div className="max-w-3xl">
            <Breadcrumb items={crumbs} tone="dark" />
            {eyebrow && (
              <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
                <span className="h-px w-6 bg-[var(--brand-accent)]" aria-hidden="true" />
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-[var(--brand-primary)] md:text-3xl text-balance">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">{description}</p>
            )}
          </div>
          {children && <div className="mt-5">{children}</div>}
        </CSSFadeIn>
      </div>
    </section>
  );
}
