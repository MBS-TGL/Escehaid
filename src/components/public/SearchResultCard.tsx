"use client";

import Link from "next/link";
import { Clock } from "@/components/Icons";
import { KIND_META, formatRelativeDate, formatSearchDate } from "@/components/SearchMeta";
import Highlight from "@/components/public/Highlight";
import type { SearchItem } from "@/lib/queries/search";

/**
 * Satu kartu hasil pencarian — dipakai papan "Paling relevan" dan daftar per
 * grup di /search. Murni presentasional: highlight judul/cuplikan memakai
 * `<Highlight>` (escape React, tanpa dangerouslySetInnerHTML), tanggal
 * ditampilkan relatif dengan tooltip absolut.
 */
export default function SearchResultCard({
  item,
  query,
  variant = "default",
}: {
  item: SearchItem;
  query: string;
  /** "featured" = kartu papan atas (lebih besar, ada lencana jenis). */
  variant?: "default" | "featured";
}) {
  const { icon: Icon, chip } = KIND_META[item.kind];
  const relative = formatRelativeDate(item.date);
  const absolute = formatSearchDate(item.date);
  const featured = variant === "featured";

  return (
    <Link
      href={item.href}
      className={`group block rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[var(--brand-accent)]/40 hover:shadow-sm ${
        featured ? "p-5" : "p-4 sm:p-5"
      }`}
    >
      {featured && (
        <span className="mb-2 flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-lg border ${chip}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Paling relevan
          </span>
        </span>
      )}
      <span
        className={`block font-semibold leading-snug text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)] ${
          featured ? "text-base" : "text-[15px]"
        }`}
      >
        <Highlight text={item.title} query={query} />
      </span>
      {item.excerpt && (
        <span
          className={`mt-1 block text-sm text-slate-500 ${
            featured ? "line-clamp-3" : "line-clamp-2"
          }`}
        >
          <Highlight text={item.excerpt} query={query} />
        </span>
      )}
      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
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
    </Link>
  );
}
