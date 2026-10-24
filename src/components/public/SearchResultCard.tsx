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
 * Satu kartu hasil pencarian — dipakai papan "Paling relevan" dan daftar per
 * grup di /search.
 *
 * - `featured`: foto sampul 16:9 di atas (pola kanonik ContentCard) + lencana
 *   jenis, dipakai papan 3 teratas.
 * - `default` : kartu horizontal — thumbnail persegi di kiri, teks di kanan,
 *   supaya daftar panjang tetap ringkas dan mudah dipindai.
 *
 * Tanpa foto (atau URL tak valid) → panel gradient + huruf awal judul, jadi
 * kartu tak pernah kosong/gepeng. Highlight judul/cuplikan memakai
 * `<Highlight>` (escape React, tanpa dangerouslySetInnerHTML).
 */
export default function SearchResultCard({
  item,
  query,
  variant = "default",
}: {
  item: SearchItem;
  query: string;
  /** "featured" = kartu papan atas (foto besar). */
  variant?: "default" | "featured";
}) {
  const { icon: Icon, chip } = KIND_META[item.kind];
  const relative = formatRelativeDate(item.date);
  const absolute = formatSearchDate(item.date);
  const featured = variant === "featured";
  const imageUrl = safeImageUrl(item.imageUrl);

  const metaRow = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
      {item.meta && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
          {item.meta}
        </span>
      )}
      {relative && (
        <span className="flex items-center gap-1.5" title={absolute}>
          <Clock className="h-3.5 w-3.5" />
          {relative}
        </span>
      )}
    </span>
  );

  const featuredBadge = (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold ${chip}`}
    >
      <Icon className="h-3 w-3" />
      Paling relevan
    </span>
  );

  /* ── FEATURED: foto 16:9 di atas ─────────────────────────────────── */
  if (featured) {
    return (
      <Link
        href={item.href}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[var(--brand-accent)]/40 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.title}
              width={640}
              height={360}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)]">
              <span className="text-4xl font-black text-white/20">{item.title[0]}</span>
            </div>
          )}
          <span className="absolute left-3 top-3">{featuredBadge}</span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <span className="block text-[15px] font-bold leading-snug text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">
            <Highlight text={item.title} query={query} />
          </span>
          {item.excerpt && (
            <span className="mt-1.5 line-clamp-2 text-sm text-slate-500">
              <Highlight text={item.excerpt} query={query} />
            </span>
          )}
          <span className="mt-auto pt-3">{metaRow}</span>
        </div>
      </Link>
    );
  }

  /* ── DEFAULT: thumbnail kiri + teks kanan ────────────────────────── */
  return (
    <Link
      href={item.href}
      className="group flex gap-3 overflow-hidden rounded-2xl border border-[#dce3ed] bg-white p-3 transition-all hover:border-[var(--brand-accent)]/40 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] sm:gap-4 sm:p-4"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-28">
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
            <span className="text-xl font-black text-white/25 sm:text-2xl">{item.title[0]}</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="mb-1 flex items-center gap-1.5">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${chip}`}>
            <Icon className="h-2.5 w-2.5" />
          </span>
          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {KIND_LABEL[item.kind]}
          </span>
        </span>
        <span className="block text-[15px] font-semibold leading-snug text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)]">
          <Highlight text={item.title} query={query} />
        </span>
        {item.excerpt && (
          <span className="mt-1 line-clamp-2 text-sm text-slate-500">
            <Highlight text={item.excerpt} query={query} />
          </span>
        )}
        <span className="mt-2">{metaRow}</span>
      </div>
    </Link>
  );
}
