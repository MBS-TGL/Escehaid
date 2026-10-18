import Link from "next/link";
import Image from "next/image";
import type { ComponentType, ReactNode } from "react";
import { CSSFadeIn } from "@/components/CSSAnimations";

/**
 * Hero halaman publik — 3 varian berbeda karakter supaya tidak ada dua halaman
 * dengan blok hero persis sama:
 *
 * - "photo"  : full-bleed foto (dari DB) + scrim brand dua lapis, motif matahari
 *              geometris di sudut, zoom halus mengikuti scroll. Fallback → gradient.
 * - "split"  : editorial asimetris — teks kiri di latar terang, foto kanan ber-clip
 *              arch di atas pelat aksen solid. Fallback → panel brand.
 * - "compact": pita terang ramping untuk halaman fungsional (search, status, portal).
 */

export type CrumbItem = { label: string; href?: string };

export type PageHeroProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  image?: string | null;
  imageAlt?: string;
  /** Ikon dekoratif fallback (Phosphor SSR) saat tidak ada foto. */
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
  image,
  imageAlt = "",
  icon: Icon,
  breadcrumb,
  children,
  variant = "compact",
  className = "",
}: PageHeroProps) {
  const crumbs = breadcrumb ?? [];

  /* ── PHOTO: full-bleed foto + scrim brand ─────────────────────────── */
  if (variant === "photo") {
    return (
      <section className={`relative overflow-hidden bg-[var(--brand-primary)] text-white ${className}`}>
        {image ? (
          <>
            {/* Zoom halus mengikuti scroll (lihat .hero-media di globals.css). */}
            <div className="hero-media absolute inset-0">
              <Image
                src={image}
                alt={imageAlt || title}
                fill
                sizes="100vw"
                priority
                className="object-cover saturate-[1.05] contrast-[1.05] brightness-[0.98]"
              />
            </div>
            {/* Dua lapis scrim: horizontal (kontras teks di kiri) + vignette
                vertikal (kedalaman, mengikat foto ke warna merek). */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-primary)]/78 to-[var(--brand-primary)]/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/70 via-transparent to-[var(--brand-primary)]/15" />
            {/* Motif geometris merek: pancaran matahari dari sudut kanan-bawah
                (murni CSS, lihat .hero-sunmark). Sumbu diarahkan agar tidak
                menerpa blok teks di kiri. */}
            <div
              aria-hidden="true"
              className="hero-sunmark pointer-events-none absolute bottom-0 right-0 h-[340px] w-[340px] md:h-[520px] md:w-[520px]"
            />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)]" />
            {Icon && (
              <Icon className="absolute -right-8 -top-8 h-56 w-56 rotate-12 opacity-[0.06]" weight="fill" />
            )}
          </>
        )}
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-12">
          <CSSFadeIn>
            <div className="max-w-2xl">
              <Breadcrumb items={crumbs} tone="light" />
              {eyebrow && (
                <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
                  <span className="h-px w-6 bg-[var(--brand-accent)]" aria-hidden="true" />
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
              {/* Pelat aksen SOLID (bukan garis tipis) yang mengintip di sudut
                  kanan-bawah. Bentuk arch (mihrab/jendela) jadi penanda
                  geometris editorial, bukan bingkai kotak generik. */}
              <div
                aria-hidden="true"
                className="absolute -bottom-3 -right-3 h-full w-full rounded-t-[999px] rounded-b-2xl bg-[var(--brand-accent)]/90 md:-bottom-4 md:-right-4"
              />
              {image ? (
                <div className="relative h-40 w-full overflow-hidden rounded-t-[999px] rounded-b-2xl border border-[#dce3ed] bg-white shadow-xl shadow-[var(--brand-primary)]/20 md:h-52">
                  <Image
                    src={image}
                    alt={imageAlt || title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    priority
                    className="object-cover saturate-[1.05] contrast-[1.05] brightness-[0.98]"
                  />
                  {/* Wash merek tipis supaya foto tetap sedarah. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[var(--brand-primary)]/28 via-transparent to-transparent"
                  />
                </div>
              ) : (
                <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-t-[999px] rounded-b-2xl bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)] shadow-lg shadow-[var(--brand-primary)]/10 md:h-52">
                  <div aria-hidden="true" className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[var(--brand-accent)]/20 blur-[80px]" />
                  {Icon ? (
                    <Icon className="h-24 w-24 text-white/15" weight="fill" />
                  ) : (
                    <span className="text-6xl font-black text-white/10">{title[0]}</span>
                  )}
                </div>
              )}
            </div>
          </CSSFadeIn>
        </div>
      </section>
    );
  }

  /* ── COMPACT: pita terang ramping untuk halaman fungsional ───────── */
  return (
    <section className={`border-b border-[#dce3ed] bg-white ${className}`}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
        <CSSFadeIn>
          <div className="max-w-3xl">
            <Breadcrumb items={crumbs} tone="dark" />
            <h1 className="mt-2 text-xl font-black leading-tight tracking-tight text-[var(--brand-primary)] md:text-2xl text-balance">
              {title}
            </h1>
            <div aria-hidden="true" className="mt-2 h-1 w-8 rounded-full bg-[var(--brand-accent)]" />
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
            )}
            {children && <div className="mt-4">{children}</div>}
          </div>
        </CSSFadeIn>
      </div>
    </section>
  );
}
