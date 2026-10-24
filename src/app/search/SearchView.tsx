"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  FileText,
  MagnifyingGlass,
  Warning,
  X,
} from "@/components/Icons";
import type { SearchGroup, SearchKind } from "@/lib/queries/search";
import { sortGroupsByRelevance } from "@/lib/queries/search";
import {
  EMPTY_STATE_LINKS,
  KIND_META,
  SUGGEST_DICTIONARY,
} from "@/components/SearchMeta";
import SearchResultCard from "@/components/public/SearchResultCard";
import { suggestCorrections } from "@/lib/search-suggest";
import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  saveRecentSearch,
} from "@/lib/search-recent";

type Status = "idle" | "loading" | "done" | "error";
type KindFilter = SearchKind | "semua";

/** Jumlah maksimum item pada papan "Paling relevan". */
const TOP_COUNT = 3;

/**
 * Kotak pencarian menyeluruh: satu istilah menjangkau halaman situs, berita,
 * artikel, kegiatan, prestasi, dan ekskul.
 *
 * Tata letak: kontainer `max-w-7xl` (selaras PageHero & halaman daftar lain),
 * dua kolom di desktop — panel kontrol sticky di kiri (pencarian, filter jenis,
 * riwayat, tautan cepat) dan hasil di kanan; satu kolom di mobile dengan chip
 * filter horizontal.
 *
 * Perilaku: debounce 300ms + sinkronisasi URL dangkal (`history.replaceState`)
 * sehingga ?q= bisa dibagikan tanpa re-render server tiap ketikan; form GET
 * tetap berfungsi tanpa JavaScript. Query dijalankan via /api/search (server).
 */
export default function SearchView({
  initialQuery,
  initialGroups,
  initialCount,
}: {
  initialQuery: string;
  initialGroups: SearchGroup[];
  initialCount: number;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [groups, setGroups] = useState<SearchGroup[]>(initialGroups);
  const [count, setCount] = useState(initialCount);
  const [searchedQuery, setSearchedQuery] = useState(initialQuery);
  const [status, setStatus] = useState<Status>(initialQuery ? "done" : "idle");
  /** Pesan kegagalan terakhir (jaringan/429/500) — kosong bila pencarian sukses. */
  const [errorMessage, setErrorMessage] = useState("");
  /** Filter jenis aktif pada daftar hasil. */
  const [activeKind, setActiveKind] = useState<KindFilter>("semua");
  /** Riwayat pencarian (localStorage) — tampil saat input kosong. */
  const [recent, setRecent] = useState<string[]>([]);
  /** Bilah pencarian ringkas muncul saat form asli tergulir keluar layar. */
  const [stickyVisible, setStickyVisible] = useState(false);

  /** Istilah yang SUDAH punya hasil (awal dari server atau baru dicari). */
  const lastSearchedRef = useRef(initialQuery);
  /** Nomor urut permintaan — jawaban dengan nomor basi dibuang. */
  const requestIdRef = useRef(0);
  /** Naik tiap klik "Coba lagi" — memicu pencarian ulang istilah yang sama. */
  const [retryNonce, setRetryNonce] = useState(0);
  /** Sentinel di atas panel — dipantau IntersectionObserver utk sticky bar. */
  const sentinelRef = useRef<HTMLDivElement>(null);

  /** Kembalikan tampilan ke kondisi awal (input kosong) — dari event handler,
   *  bukan dari effect, agar tidak memicu setState sinkron di dalam effect. */
  const applyQuery = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim() === "") {
        requestIdRef.current += 1; // batalkan permintaan yang masih melayang
        lastSearchedRef.current = "";
        setGroups([]);
        setCount(0);
        setSearchedQuery("");
        setErrorMessage("");
        setStatus("idle");
        setActiveKind("semua");
        window.history.replaceState(null, "", pathname);
      }
    },
    [pathname]
  );

  // Muat riwayat pencarian saat mount — deferred agar patuh aturan
  // react-hooks/set-state-in-effect (snapshot awal tetap []).
  useEffect(() => {
    const timer = window.setTimeout(() => setRecent([...readRecentSearches()]), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Sticky bar: pantau sentinel di atas panel.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { rootMargin: "-8px 0px 0px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const term = query.trim();
    // Kosong (sudah ditangani applyQuery) atau sudah punya hasil → selesai.
    if (!term || term === lastSearchedRef.current) return;

    let cancelled = false;
    // Debounce 300ms — ketikan cepat hanya memicu SATU pencarian.
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      const requestId = (requestIdRef.current += 1);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (!res.ok) {
          // Ambil pesan ramah dari API (mis. 429 rate limit) bila tersedia.
          let apiError = "";
          try {
            const payload = (await res.json()) as { error?: unknown };
            if (typeof payload?.error === "string") apiError = payload.error;
          } catch {
            // body bukan JSON — pakai pesan generik di bawah.
          }
          throw new Error(apiError || `Pencarian gagal (HTTP ${res.status}). Coba lagi sebentar.`);
        }
        const data = (await res.json()) as { groups: SearchGroup[]; count: number };
        if (cancelled || requestId !== requestIdRef.current) return; // jawaban basi
        setGroups(data.groups);
        setCount(data.count);
        setSearchedQuery(term);
        setErrorMessage("");
        setStatus("done");
        lastSearchedRef.current = term;
        // Catat riwayat hanya untuk pencarian yang berhasil.
        setRecent(saveRecentSearch(term));
        // Sinkronkan URL secara dangkal agar bisa dibagikan.
        window.history.replaceState(null, "", `${pathname}?q=${encodeURIComponent(term)}`);
      } catch (err) {
        if (!cancelled && requestId === requestIdRef.current) {
          setGroups([]);
          setCount(0);
          setSearchedQuery(term);
          setStatus("error");
          // lastSearchedRef TIDAK diisi → "Coba lagi" bisa mengulang istilah ini.
          setErrorMessage(
            err instanceof Error && err.message
              ? err.message
              : "Pencarian gagal. Periksa koneksi internet Anda lalu coba lagi."
          );
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, pathname, retryNonce]);

  /** Grup yang sudah diurutkan relevansi (khusus tab "Semua"). */
  const orderedGroups = useMemo(() => {
    if (activeKind === "semua") return sortGroupsByRelevance(groups);
    return groups.filter((group) => group.kind === activeKind);
  }, [groups, activeKind]);

  /** 3 item skor tertinggi lintas jenis — papan "Paling relevan". */
  const topItems = useMemo(() => {
    if (activeKind !== "semua" || count <= TOP_COUNT) return [];
    const distinctKinds = new Set(groups.map((group) => group.kind)).size;
    if (distinctKinds < 2) return []; // semua hasil satu jenis → papan tak menambah info
    return groups
      .flatMap((group) => group.items)
      .sort((a, b) => {
        const score = (b.score ?? 0) - (a.score ?? 0);
        if (score) return score;
        return (b.date ?? "").localeCompare(a.date ?? "");
      })
      .slice(0, TOP_COUNT);
  }, [groups, count, activeKind]);

  /** Saran koreksi ejaan saat hasil kosong. */
  const suggestions = useMemo(
    () =>
      status === "done" && groups.length === 0
        ? suggestCorrections(searchedQuery, SUGGEST_DICTIONARY)
        : [],
    [status, groups.length, searchedQuery]
  );

  const statusText =
    status === "loading"
      ? "Mencari…"
      : status === "idle"
        ? "Masukkan kata kunci untuk mulai mencari."
        : status === "error"
          ? `Pencarian gagal untuk “${searchedQuery}” — ${errorMessage}`
          : count > 0
            ? `${count} hasil untuk “${searchedQuery}”`
            : `Tidak ada hasil untuk “${searchedQuery}”`;

  const inputClassName =
    "w-full rounded-2xl border border-[#dce3ed] bg-slate-50/50 py-3.5 pl-12 pr-12 text-base text-slate-800 transition-colors placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/15";

  /** Chip filter — dipakai versi vertikal (desktop) & horizontal (mobile). */
  const filterButtons = (
    <>
      <button
        type="button"
        role="tab"
        aria-selected={activeKind === "semua"}
        onClick={() => setActiveKind("semua")}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
          activeKind === "semua"
            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
            : "border-[#dce3ed] bg-white text-slate-600 hover:border-[var(--brand-accent)]/40"
        }`}
      >
        <span>Semua</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
            activeKind === "semua" ? "bg-white/20" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      </button>
      {groups.map((group) => {
        const active = activeKind === group.kind;
        return (
          <button
            key={group.kind}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveKind(group.kind)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              active
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                : "border-[#dce3ed] bg-white text-slate-600 hover:border-[var(--brand-accent)]/40"
            }`}
          >
            <span className="truncate">{group.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                active ? "bg-white/20" : "bg-slate-100 text-slate-500"
              }`}
            >
              {group.items.length}
            </span>
          </button>
        );
      })}
    </>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-12">
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      {/* Bilah pencarian ringkas saat panel utama di luar layar. */}
      {stickyVisible && (
        <div className="fixed inset-x-0 top-0 z-40 border-b border-[#dce3ed] bg-white/90 backdrop-blur-md motion-reduce:transition-none">
          <form
            action="/search"
            method="get"
            onSubmit={(e) => e.preventDefault()}
            className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:px-6"
          >
            <div className="relative flex-1">
              <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => applyQuery(e.target.value)}
                placeholder="Cari di situs ini…"
                aria-label="Cari di situs ini (bilah ringkas)"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                className="w-full rounded-xl border border-[#dce3ed] bg-white py-2 pl-10 pr-9 text-sm text-slate-800 focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/15"
              />
              {query !== "" && (
                <button
                  type="button"
                  onClick={() => applyQuery("")}
                  aria-label="Hapus kata kunci"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <span className="hidden text-xs text-slate-400 sm:block" aria-live="polite">
              {status === "done" ? `${count} hasil` : ""}
            </span>
          </form>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* ── PANEL KONTROL (sticky di desktop) ───────────────────────── */}
        <aside className="lg:sticky lg:top-20">
          {/* Form GET = jalur tanpa JavaScript; dengan JS, submit dicegah dan
              pencarian sudah berjalan lewat debounce. */}
          <form
            action="/search"
            method="get"
            onSubmit={(e) => e.preventDefault()}
            className="rounded-3xl border border-[#dce3ed] bg-white p-5 shadow-sm"
          >
            <label htmlFor="site-search" className="block text-sm font-semibold text-[var(--brand-primary)]">
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
                placeholder="Misalnya: SPMB, lomba…"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                className={inputClassName}
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
            {/* Status sekaligus aria-live: perubahan jumlah hasil diumumkan pembaca layar. */}
            <p role="status" aria-live="polite" className="mt-3 text-sm text-slate-500">
              {statusText}
            </p>
          </form>

          {/* Filter vertikal — hanya desktop; mobile memakai chip di atas hasil. */}
          {groups.length > 0 && (
            <div
              role="tablist"
              aria-label="Saring hasil menurut jenis"
              aria-orientation="vertical"
              className="mt-4 hidden flex-col gap-1.5 lg:flex"
            >
              {filterButtons}
            </div>
          )}

          {/* Riwayat pencarian — tampil kapan pun ada, agar bisa dipakai ulang. */}
          {recent.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#dce3ed] bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  Pencarian Terakhir
                </span>
                <button
                  type="button"
                  onClick={() => setRecent(clearRecentSearches())}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                >
                  Hapus semua
                </button>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {recent.map((term) => (
                  <li key={term} className="group relative">
                    <button
                      type="button"
                      onClick={() => applyQuery(term)}
                      className="rounded-full border border-[#dce3ed] bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-600 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-primary)]"
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecent(removeRecentSearch(term))}
                      aria-label={`Hapus riwayat “${term}”`}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tautan cepat — selalu tersedia sebagai jalan pintas navigasi. */}
          <div className="mt-4 flex flex-wrap gap-2">
            {EMPTY_STATE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-[#dce3ed] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] transition-colors hover:border-[var(--brand-accent)]/40 hover:bg-slate-50"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </aside>

        {/* ── HASIL ───────────────────────────────────────────────────── */}
        <div className="mt-8 min-w-0 lg:mt-0">
          {/* Chip filter horizontal — hanya mobile. */}
          {groups.length > 0 && (
            <div
              role="tablist"
              aria-label="Saring hasil menurut jenis"
              className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeKind === "semua"}
                onClick={() => setActiveKind("semua")}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  activeKind === "semua"
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                    : "border-[#dce3ed] bg-white text-slate-600 hover:border-[var(--brand-accent)]/40"
                }`}
              >
                Semua ({count})
              </button>
              {groups.map((group) => {
                const active = activeKind === group.kind;
                return (
                  <button
                    key={group.kind}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveKind(group.kind)}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                        : "border-[#dce3ed] bg-white text-slate-600 hover:border-[var(--brand-accent)]/40"
                    }`}
                  >
                    {group.label} ({group.items.length})
                  </button>
                );
              })}
            </div>
          )}

          {status === "idle" && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-14 text-center">
              <MagnifyingGlass className="h-12 w-12 text-[var(--brand-primary)]/20" />
              <p className="mt-4 text-sm text-slate-500">
                Ketik kata kunci — misalnya nama kegiatan, judul berita, atau kata kunci prestasi.
              </p>
              <p className="mt-1 max-w-lg text-xs text-slate-400">
                Pencarian menjangkau halaman situs, berita, artikel, kegiatan, prestasi, dan
                ekstrakurikuler sekaligus. Riwayat pencarian Anda muncul di panel kiri.
              </p>
            </div>
          )}

          {status === "done" && groups.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white px-6 py-14 text-center">
              <FileText className="h-12 w-12 text-[var(--brand-primary)]/15" />
              <p className="mt-4 text-base font-medium text-slate-600">
                Tidak ada hasil untuk “{searchedQuery}”
              </p>
              <p className="mt-1 text-sm text-slate-400">Coba kata kunci lain atau periksa ejaan.</p>

              {suggestions.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs text-slate-400">Mungkin maksud Anda:</span>
                  {suggestions.map((word) => (
                    <button
                      key={word}
                      type="button"
                      onClick={() => applyQuery(word)}
                      className="rounded-full border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/5 px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] transition-colors hover:border-[var(--brand-accent)]/60 hover:bg-[var(--brand-accent)]/10"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {EMPTY_STATE_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-full border border-[#dce3ed] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] transition-colors hover:border-[var(--brand-accent)]/40 hover:bg-slate-50"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white px-6 py-14 text-center">
              <Warning className="h-12 w-12 text-amber-500/70" />
              <p className="mt-4 text-base font-medium text-slate-600">
                Pencarian gagal untuk “{searchedQuery}”
              </p>
              <p className="mt-1 text-sm text-slate-400">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setRetryNonce((n) => n + 1)}
                className="mt-4 rounded-lg border border-[#dce3ed] bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-primary)] transition-colors hover:border-[var(--brand-accent)]/40 hover:bg-slate-50"
              >
                Coba lagi
              </button>
            </div>
          )}

          {groups.length > 0 && (
            <div className="space-y-8">
              {/* Papan "Paling relevan" — tab Semua, hasil cukup banyak & beragam. */}
              {topItems.length > 0 && (
                <section aria-labelledby="search-top-heading">
                  <h2
                    id="search-top-heading"
                    className="mb-3 text-base font-bold text-[var(--brand-primary)]"
                  >
                    Hasil teratas
                  </h2>
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {topItems.map((item) => (
                      <li key={`${item.kind}-${item.id}`}>
                        <SearchResultCard item={item} query={searchedQuery} variant="featured" />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {orderedGroups.length === 0 && (
                <p className="rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-8 text-center text-sm text-slate-400">
                  Tidak ada hasil pada jenis ini.
                </p>
              )}

              {orderedGroups.map((group) => {
                const { icon: Icon, chip } = KIND_META[group.kind];
                return (
                  <section key={group.kind} aria-labelledby={`search-group-${group.kind}`}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${chip}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <h2
                        id={`search-group-${group.kind}`}
                        className="text-base font-bold text-[var(--brand-primary)]"
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
                          <SearchResultCard item={item} query={searchedQuery} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
