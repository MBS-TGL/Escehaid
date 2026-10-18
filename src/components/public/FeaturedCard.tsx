import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

/** Kartu unggulan full-width (gambar 3 kolom + konten 2 kolom), halaman 1.
    Tinggi gambar dibatasi (h-44 md:h-52) supaya tetap jadi penyorot tapi tidak
    mendominasi halaman. */
export default function FeaturedCard({
  href,
  title,
  description,
  imageUrl,
  imageAlt = "",
  badges,
  meta,
  ctaLabel = "Baca selengkapnya",
}: {
  href: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  badges?: ReactNode;
  meta?: ReactNode;
  ctaLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group grid overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] lg:grid-cols-5"
    >
      <div className="relative h-44 w-full overflow-hidden bg-slate-100 md:h-52 lg:col-span-3">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt || title}
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)]">
            <span className="text-5xl font-bold text-white/20">{title[0]}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-2.5 p-5 lg:col-span-2 lg:p-6">
        {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
        <h2 className="text-lg font-bold leading-snug text-[var(--brand-primary)] line-clamp-2 md:text-xl">{title}</h2>
        {description && <p className="text-sm text-slate-600 line-clamp-2">{description}</p>}
        {meta && <div className="flex items-center gap-3 text-slate-400">{meta}</div>}
        <div className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-accent)] transition-colors group-hover:text-[var(--brand-primary)]">
          {ctaLabel}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
  );
}
