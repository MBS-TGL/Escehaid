"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Clock,
  FileText,
  MagnifyingGlass,
  X,
} from "@/components/Icons";
import { groupSearchResults, searchAllContent } from "@/lib/queries";
import type { SearchItem } from "@/lib/queries";
import { KIND_META, formatSearchDate } from "@/components/SearchMeta";

type Status = "idle" | "loading" | "done";

/**
 * Kotak pencarian menyeluruh: satu istilah menjangkau berita, artikel,
 * kegiatan, dan prestasi. Menggunakan debounce 300ms + sinkronisasi URL
 * dangkal (`history.replaceState`) sehingga ?q= bisa dibagikan tanpa memicu
 * re-render server tiap ketikan; form GET tetap berfungsi tanpa JavaScript.
 */
export default function SearchView({
  initialQuery,
  initialResults,
}: {
  initialQuery: string;
  initialResults: SearchItem[];
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchItem[]>(initialResults);
  const [searchedQuery, setSearchedQuery] = useState(initialQuery);
  const [status, setStatus] = useState<Status>(initialQuery ? "done" : "idle");
  /** Istilah yang SUDAH punya hasil (awal dari server atau baru dicari). */
  const lastSearchedRef = useRef(initialQuery);
  /** Nomor urut permintaan — jawaban dengan nomor basi dibuang. */
  const requestIdRef = useRef(0);

  /** Kembalikan tampilan ke kondisi awal (input kosong) — dari event handler,
   *  bukan dari effect, agar tidak memicu setState sinkron di dalam effect. */
  const applyQuery = (value: string) => {
    setQuery(value);
    if (value.trim() === "") {
      requestIdRef.current += 1; // batalkan permintaan yang masih melayang
      lastSearchedRef.current = "";
      setResults([]);
      setSearchedQuery("");
      setStatus("idle");
      window.history.replaceState(null, "", pathname);
    }
  };

  useEffect(() => {
    const term = query.trim();
    // Kosong (sudah ditangani applyQuery) atau sudah punya hasil → selesai.
    if (!term || term === lastSearchedRef.current) return;

    let cancelled = false;
    // Debounce 300ms — ketikan cepat hanya memicu SATU pencarian.
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      const requestId = (requestIdRef.current += 1);
      const items = await searchAllContent(term);
      if (cancelled || requestId !== requestIdRef.current) return; // jawaban basi
      setResults(items);
      setSearchedQuery(term);
      setStatus("done");
      lastSearchedRef.current = term;
      // Sinkkan URL secara dangkal (tanpa re-render server) agar bisa dibagikan.
      window.history.replaceState(null, "", `${pathname}?q=${encodeURIComponent(term)}`);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, pathname]);

  const groups = groupSearchResults(results);

  const statusText =
    status === "loading"
      ? "Mencari…"
      : status === "idle"
        ? "Masukkan kata kunci untuk mulai mencari."
        : results.length > 0
          ? `${results.length} hasil untuk “${searchedQuery}”`
          : `Tidak ada hasil untuk “${searchedQuery}”`;

  return (
    <section className="mx-auto max-w-4xl px-6 py-10 md:py-12">
      {/* Form GET = jalur tanpa JavaScript; dengan JS, submit dicegah dan
          pencarian sudah berjalan lewat debounce. */}
      <form
        action="/search"
        method="get"
        onSubmit={(e) => e.preventDefault()}
        className="rounded-3xl border border-[#dce3ed] bg-white p-5 shadow-sm sm:p-6"
      >
        <label htmlFor="site-search" className="block text-sm font-semibold text-[#082b59]">
          Cari di situs ini
        </label>
        <div className="relative mt-2.5">
          <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="site-search"
            name="q"
            type="text"
            value={query}
            onChange={(e) => applyQuery(e.target.value)}
            placeholder="Misalnya: SPMB, lomba, OSN…"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="w-full rounded-2xl border border-[#dce3ed] bg-slate-50/50 py-3.5 pl-12 pr-12 text-base text-slate-800 transition-colors placeholder:text-slate-400 focus:border-[#1767b1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1767b1]/15"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => applyQuery("")}
              aria-label="Hapus kata kunci"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Status sekaligus wilayah aria-live: perubahan jumlah hasil diumumkan pembaca layar. */}
        <p role="status" aria-live="polite" className="mt-3 text-sm text-slate-500">
          {statusText}
        </p>
      </form>

      <div className="mt-8">
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-12 text-center">
            <MagnifyingGlass className="h-12 w-12 text-[#082b59]/20" />
            <p className="mt-4 text-sm text-slate-500">
              Ketik kata kunci — misalnya nama kegiatan, judul berita, atau kata kunci prestasi.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Pencarian menjangkau berita, artikel, kegiatan, dan prestasi sekaligus.
            </p>
          </div>
        )}

        {status === "done" && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white px-6 py-12 text-center">
            <FileText className="h-12 w-12 text-[#082b59]/15" />
            <p className="mt-4 text-base font-medium text-slate-600">
              Tidak ada hasil untuk “{searchedQuery}”
            </p>
            <p className="mt-1 text-sm text-slate-400">Coba kata kunci lain atau periksa ejaan.</p>
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-8">
            {groups.map((group) => {
              const { icon: Icon, chip } = KIND_META[group.kind];
              return (
                <section key={group.kind} aria-labelledby={`search-group-${group.kind}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border ${chip}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <h2
                      id={`search-group-${group.kind}`}
                      className="text-base font-bold text-[#082b59]"
                    >
                      {group.label}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {group.items.length}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="group block rounded-2xl border border-[#dce3ed] bg-white p-4 transition-all hover:border-[#1767b1]/40 hover:shadow-sm sm:p-5"
                        >
                          <span className="block text-[15px] font-semibold leading-snug text-[#082b59] transition-colors group-hover:text-[#1767b1]">
                            {item.title}
                          </span>
                          {item.excerpt && (
                            <span className="mt-1 block line-clamp-2 text-sm text-slate-500">
                              {item.excerpt}
                            </span>
                          )}
                          <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            {formatSearchDate(item.date)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
