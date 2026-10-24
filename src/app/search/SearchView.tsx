"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, MagnifyingGlass, X } from "@/components/Icons";
import type { SearchGroup, SearchKind } from "@/lib/queries/search";
import { sortGroupsByRelevance } from "@/lib/queries/search";
import { EMPTY_STATE_LINKS, KIND_META, SUGGEST_DICTIONARY } from "@/components/SearchMeta";
import SearchResultCard from "@/components/public/SearchResultCard";
import EmptyState from "@/components/public/EmptyState";
import { suggestCorrections } from "@/lib/search-suggest";
import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  saveRecentSearch,
} from "@/lib/search-recent";

type Status = "idle" | "loading" | "done" | "error";
type KindFilter = SearchKind | "semua";

/** Jumlah maksimum item pada papan "Hasil teratas". */
const TOP_COUNT = 3;

/** Kelas chip filter — disalin persis dari CategoryChips (kanonik situs). */
const CHIP_BASE = "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors";
const CHIP_ON = "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm";
const CHIP_OFF = "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

/**
 * Kotak pencarian menyeluruh: satu istilah menjangkau halaman situs, berita,
 * artikel, kegiatan, prestasi, dan ekskul.
 *
 * Tata letak: SATU kolom `max-w-7xl` — sama seperti /news, /articles,
 * /activities, /gallery. Tidak ada sidebar: halaman daftar konten di situs ini
 * tidak memakai pola itu, dan input pencarian butuh lebar maksimal.
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
  /** Timer debounce aktif — dibatalkan saat tombol "Cari" ditekan. */
  const debounceRef = useRef<number | null>(null);
  /** Sentinel di atas form — dipantau IntersectionObserver utk sticky bar. */
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

  // Sticky bar: pantau sentinel di atas form.
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

  /**
   * Satu-satunya tempat yang memanggil /api/search — dipakai debounce ketikan
   * DAN tombol "Cari" (yang ingin langsung jalan tanpa menunggu 300ms).
   * Respons basi dibuang lewat perbandingan `requestIdRef`.
   */
  const runSearch = useCallback(
    async (term: string) => {
      if (!term) return;
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
        if (requestId !== requestIdRef.current) return; // jawaban basi
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
        if (requestId === requestIdRef.current) {
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
    },
    [pathname]
  );

  useEffect(() => {
    const term = query.trim();
    // Kosong (sudah ditangani applyQuery) atau sudah punya hasil → selesai.
    if (!term || term === lastSearchedRef.current) return;

    // Debounce 300ms — ketikan cepat hanya memicu SATU pencarian.
    const timer = window.setTimeout(() => {
      debounceRef.current = null;
      void runSearch(term);
    }, 300);
    debounceRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      debounceRef.current = null;
      // Batalkan respons yang masih melayang untuk istilah yang sudah usang.
      requestIdRef.current += 1;
    };
  }, [query, runSearch]);

  /**
   * Tombol "Cari" / submit form: jalankan SEGERA tanpa menunggu debounce.
   * Timer yang belum jalan dibatalkan agar tidak ada request ganda.
   */
  const submitSearch = useCallback(() => {
    const term = query.trim();
    if (!term) return;
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    lastSearchedRef.current = "";
    void runSearch(term);
  }, [query, runSearch]);

  /** Grup yang sudah diurutkan relevansi (khusus tab "Semua"). */
  const orderedGroups = useMemo(() => {
    if (activeKind === "semua") return sortGroupsByRelevance(groups);
    return groups.filter((group) => group.kind === activeKind);
  }, [groups, activeKind]);

  /** 3 item skor tertinggi lintas jenis — papan "Hasil teratas". */
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

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      {/* Bilah pencarian ringkas saat form utama di luar layar. */}
      {stickyVisible && (
        <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md motion-reduce:transition-none">
          <form
            action="/search"
            method="get"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
            className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:px-6"
          >
            <div className="relative flex-1">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => applyQuery(e.target.value)}
                placeholder="Cari di situs ini..."
                aria-label="Cari di situs ini (bilah ringkas)"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
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
            <span className="hidden text-xs text-slate-500 sm:block" aria-live="polite">
              {status === "done" ? `${count} hasil` : ""}
            </span>
          </form>
        </div>
      )}

      {/* Form GET = jalur tanpa JavaScript; dengan JS, submit dicegah lalu
          pencarian langsung dijalankan (tanpa menunggu debounce).
          TANPA kartu pembungkus (opsi C): setinggi FilterBar di /news —
          input + tombol saja, status/riwayat jadi baris terpisah di bawah. */}
      <form
        action="/search"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        className="flex gap-2"
      >
        {/* Label visual dihilangkan: hero halaman sudah "Pencarian". Tetap
            ada (sr-only) agar input punya nama aksesibel. */}
        <label htmlFor="site-search" className="sr-only">
          Cari di situs ini
        </label>
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="site-search"
            name="q"
            type="text"
            value={query}
            onChange={(e) => applyQuery(e.target.value)}
            placeholder="Cari di situs ini..."
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]/20"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => applyQuery("")}
              aria-label="Hapus kata kunci"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Submit native saat tanpa JS; dengan JS langsung jalan. Di layar
            sempit tinggal ikon (aria-label menjaga nama aksesibelnya). */}
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label="Cari"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:ring-offset-2 disabled:opacity-50 sm:px-5"
        >
          <MagnifyingGlass className="h-4 w-4" />
          <span className="hidden sm:inline">
            {status === "loading" ? "Mencari..." : "Cari"}
          </span>
        </button>
      </form>

      {/* Status hasil — tentang HASIL, bukan tentang kotak input. aria-live
          dipertahankan agar perubahan jumlah hasil diumumkan pembaca layar. */}
      <p role="status" aria-live="polite" className="mt-3 text-sm font-medium text-slate-500">
        {statusText}
      </p>

      {/* Riwayat pencarian — baris chip sederhana, bukan panel. */}
      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Clock className="h-3 w-3" />
            Terakhir dicari
          </span>
          {recent.map((term) => (
            <span key={term} className="group relative inline-flex">
              <button
                type="button"
                onClick={() => applyQuery(term)}
                className="rounded-lg border border-slate-200 bg-white py-1 pl-2.5 pr-7 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                {term}
              </button>
              <button
                type="button"
                onClick={() => setRecent(removeRecentSearch(term))}
                aria-label={`Hapus riwayat “${term}”`}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setRecent(clearRecentSearches())}
            className="text-xs font-semibold text-slate-400 underline-offset-2 transition-colors hover:text-[var(--brand-primary)] hover:underline"
          >
            Hapus semua
          </button>
        </div>
      )}

      <div className="mt-5">
        {status === "idle" && (
          <EmptyState
            icon={MagnifyingGlass}
            title="Ketik kata kunci untuk mulai mencari"
            description="Pencarian menjangkau halaman situs, berita, artikel, kegiatan, prestasi, dan ekstrakurikuler sekaligus."
          />
        )}

        {status === "done" && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <EmptyState
              compact
              icon={MagnifyingGlass}
              title={`Tidak ada hasil untuk “${searchedQuery}”`}
              description="Coba kata kunci lain atau periksa ejaan."
            />
            {suggestions.length > 0 && (
              <div className="-mt-8 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-500">Mungkin maksud Anda:</span>
                {suggestions.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => applyQuery(word)}
                    className={`${CHIP_BASE} border-slate-200 bg-white text-[var(--brand-primary)] hover:bg-slate-50`}
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
                  className={`${CHIP_BASE} border-slate-200 bg-white text-[var(--brand-primary)] hover:bg-slate-50`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <EmptyState
              compact
              icon={MagnifyingGlass}
              title={`Pencarian gagal untuk “${searchedQuery}”`}
              description={errorMessage}
            />
            <button
              type="button"
              onClick={submitSearch}
              className="-mt-8 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-primary)] transition-colors hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
            >
              Coba lagi
            </button>
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-8">
            {/* Filter jenis — chip gaya CategoryChips (kanonik situs). */}
            <nav aria-label="Filter jenis" className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={activeKind === "semua"}
                onClick={() => setActiveKind("semua")}
                className={`${CHIP_BASE} ${activeKind === "semua" ? CHIP_ON : CHIP_OFF}`}
              >
                Semua ({count})
              </button>
              {groups.map((group) => (
                <button
                  key={group.kind}
                  type="button"
                  aria-pressed={activeKind === group.kind}
                  onClick={() => setActiveKind(group.kind)}
                  className={`${CHIP_BASE} ${activeKind === group.kind ? CHIP_ON : CHIP_OFF}`}
                >
                  {group.label} ({group.items.length})
                </button>
              ))}
            </nav>

            {/* Papan "Hasil teratas" — tab Semua, hasil cukup banyak & beragam. */}
            {topItems.length > 0 && (
              <section aria-labelledby="search-top-heading">
                <h2
                  id="search-top-heading"
                  className="mb-3 text-lg font-bold text-[var(--brand-primary)]"
                >
                  Hasil teratas
                </h2>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {topItems.map((item, idx) => (
                    <li key={`${item.kind}-${item.id}`}>
                      {/* Kartu pertama = elemen LCP → preload gambarnya. */}
                      <SearchResultCard
                        item={item}
                        query={searchedQuery}
                        variant="featured"
                        priority={idx === 0}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {orderedGroups.length === 0 && (
              <p className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
                Tidak ada hasil pada jenis ini.
              </p>
            )}

            {orderedGroups.map((group) => {
              const { icon: Icon, chip } = KIND_META[group.kind];
              return (
                <section key={group.kind} aria-labelledby={`search-group-${group.kind}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md border ${chip}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <h2
                      id={`search-group-${group.kind}`}
                      className="text-sm font-bold uppercase tracking-wider text-slate-500"
                    >
                      {group.label}
                    </h2>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
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
    </section>
  );
}
