import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Kartu konten (berita/artikel/prestasi) — satu gaya kanonik: foto atas +
 * area konten, hover border-accent + shadow + zoom. Bila tak ada foto →
 * panel gradient dengan huruf awal judul.
 */
export default function ContentCard({
  href,
  title,
  description,
  imageUrl,
  imageAlt = "",
  badges,
  meta,
  priority = false,
  className = "",
}: {
  href: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  /** Baris badge di atas judul. */
  badges?: ReactNode;
  /** Baris meta di bawah (tanggal, lampiran, dsb). */
  meta?: ReactNode;
  /** True untuk kartu pertama grid → ikut preloading LCP (kartu di atas fold). */
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group block overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${className}`}
    >
      <div className="overflow-hidden bg-slate-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt || title}
            width={1280}
            height={720}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-auto w-full transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)]">
            <span className="text-3xl font-bold text-white/20">{title[0]}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
        <h3 className="mt-2 text-sm font-bold text-[var(--brand-primary)] line-clamp-2 transition-colors group-hover:text-[var(--brand-accent)]">
          {title}
        </h3>
        {description && <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">{description}</p>}
        {meta && (
          <div className="mt-2.5 flex items-center gap-3 text-slate-400">{meta}</div>
        )}
      </div>
    </Link>
  );
}
