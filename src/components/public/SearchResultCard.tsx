"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock } from "@/components/Icons";
import { KIND_LABEL, KIND_META, formatRelativeDate, formatSearchDate } from "@/components/SearchMeta";
import Highlight from "@/components/public/Highlight";
import type { SearchItem } from "@/lib/queries/search";

/**
 * URL gambar hanya dipakai bila benar-benar absolut (http/https) atau path
 * lokal — melindungi `next/image` dari data lama yang kosong/rusak (URL
 * relatif aneh, string "null", dsb.) yang akan melempar error runtime.
 */
function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return null;
}

/**
 * Kartu hasil pencarian — memakai kelas kanonik `ContentCard` (foto 16:9 +
 * `text-sm font-bold` judul + `text-xs` cuplikan + border `slate-200` +
 * `rounded-2xl`) supaya /search tidak punya bahasa visual sendiri.
 *
 * - `featured`: kartu grid 3 kolom (papan "Hasil teratas") dengan lencana
 *   "Paling relevan" menempel di atas foto.
 * - `default` : kartu horizontal ringkas (thumbnail 80/112px) — hasil
 *   pencarian biasanya banyak, jadi baris padat lebih mudah dipindai.
 *
 * Tanpa foto (atau URL tak valid) → panel gradient + huruf awal judul, jadi
 * kartu tak pernah kosong/gepeng. Highlight judul/cuplikan memakai
 * `<Highlight>` (escape React, tanpa dangerouslySetInnerHTML).
 */
export default function SearchResultCard({
  item,
  query,
  variant = "default",
  priority = false,
}: {
  item: SearchItem;
  query: string;
  /** "featured" = kartu papan atas (foto besar). */
  variant?: "default" | "featured";
  /** true → gambar di-preload (LCP). Hanya untuk kartu pertama di viewport. */
  priority?: boolean;
}) {
  const { icon: Icon, chip, iconColor } = KIND_META[item.kind];
  const relative = formatRelativeDate(item.date);
  const absolute = formatSearchDate(item.date);
  const featured = variant === "featured";
  const imageUrl = safeImageUrl(item.imageUrl);

  /** Baris meta kanonik: badge prestasi (10px uppercase) + tanggal relatif. */
  const metaRow = (
    <span className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      {item.meta && (
        <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">
          {item.meta}
        </span>
      )}
      {relative && (
        <span className="flex items-center gap-1 normal-case tracking-normal" title={absolute}>
          <Clock className="h-3 w-3" />
          {relative}
        </span>
      )}
    </span>
  );

  /**
   * Lencana di atas foto: WAJIB latar solid — `chip` punya latar transparan
   * untuk sebagian jenis (artikel: `bg-[#1767b1]/10`) sehingga navy di atas
   * foto jadi tak terbaca. Ikon tetap berwarna per jenis lewat `iconColor`.
   */
  const featuredBadge = (
    <span className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur-sm">
      <Icon className={`h-3 w-3 ${iconColor}`} />
      Paling relevan
    </span>
  );

  /* ── FEATURED: foto 16:9 di atas (grid 3 kolom) ──────────────────── */
  if (featured) {
    return (
      <Link
        href={item.href}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.title}
              width={640}
              height={360}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)]">
              <span className="text-3xl font-bold text-white/20">{item.title[0]}</span>
            </div>
          )}
          <span className="absolute left-2 top-2">{featuredBadge}</span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-sm font-bold text-[var(--brand-primary)] line-clamp-2 transition-colors group-hover:text-[var(--brand-accent)]">
            <Highlight text={item.title} query={query} />
          </h3>
          {item.excerpt && (
            <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
              <Highlight text={item.excerpt} query={query} />
            </p>
          )}
          <div className="mt-auto pt-2.5">{metaRow}</div>
        </div>
      </Link>
    );
  }

  /* ── DEFAULT: thumbnail kiri + teks kanan ────────────────────────── */
  return (
    <Link
      href={item.href}
      className="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] sm:gap-4"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-24 sm:w-28">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.title}
            width={224}
            height={192}
            sizes="(max-width: 640px) 80px, 112px"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)]">
            <span className="text-xl font-bold text-white/25">{item.title[0]}</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span
          className={`mb-1 inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${chip}`}
        >
          <Icon className="h-2.5 w-2.5" />
          {KIND_LABEL[item.kind]}
        </span>
        <h3 className="text-sm font-bold text-[var(--brand-primary)] line-clamp-2 transition-colors group-hover:text-[var(--brand-accent)]">
          <Highlight text={item.title} query={query} />
        </h3>
        {item.excerpt && (
          <p className="mt-1 text-xs text-slate-600 line-clamp-2">
            <Highlight text={item.excerpt} query={query} />
          </p>
        )}
        <div className="mt-2">{metaRow}</div>
      </div>
    </Link>
  );
}
