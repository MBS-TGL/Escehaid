"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clock, FileText, MagnifyingGlass, X } from "@/components/Icons";
import { groupSearchResults, searchAllContent } from "@/lib/queries";
import type { SearchItem } from "@/lib/queries";
import { KIND_META, formatSearchDate } from "@/components/SearchMeta";

type Status = "idle" | "loading" | "done";

/**
 * Overlay pencarian gaya command-palette di topbar publik. Satu istilah
 * menjangkau berita, artikel, kegiatan, dan prestasi (reuse `searchAllContent`
 * + `groupSearchResults`, sama dengan halaman /search). Debounce 300ms; hasil
 * tampil langsung tanpa navigasi. Enter membuka hasil aktif; "Lihat semua
 * hasil" tetap mengarah ke /search?q= (shareable, tanpa-JS) sehingga halaman
 * tersebut tidak tergantikan — overlay hanya pintasan cepat.
 *
 * Aksesibilitas: combobox + listbox dengan aria-activedescendant (fokus tetap
 * di input), Esc menutup, dan fokus terkunci di dalam dialog (focus trap).
 */
export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  /** Istilah yang SUDAH menghasilkan — dipakai statusText & pengumuman SR. */
  const [searchedQuery, setSearchedQuery] = useState("");
  /** Indeks hasil tersorot untuk keyboard (−1 = belum ada). */
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  /** Istilah yang SUDAH punya hasil — cegah pencarian berulang. */
  const lastSearchedRef = useRef("");
  /** Nomor urut permintaan — jawaban dengan nomor basi dibuang. */
  const requestIdRef = useRef(0);

  // Fokus ke input saat dibuka + kunci scroll body (pola sama dengan
  // MobileBottomNav/Modal/SlideOver/GalleryLightbox di codebase ini), supaya
  // wheel/trackpad di belakang backdrop tak menggeser halaman.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Debounce 300ms — ketikan cepat hanya memicu SATU pencarian.
  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (!term || term === lastSearchedRef.current) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      const requestId = (requestIdRef.current += 1);
      const items = await searchAllContent(term);
      if (cancelled || requestId !== requestIdRef.current) return; // jawaban basi
      setResults(items);
      setStatus("done");
      setSearchedQuery(term);
      lastSearchedRef.current = term;
      setActiveIndex(-1); // sorotan di-reset tiap hasil baru
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const groups = groupSearchResults(results);
  // List datar untuk navigasi ↑/↓ melintasi kelompok.
  const flat = groups.flatMap((g) => g.items);

  const clearAll = () => {
    requestIdRef.current += 1; // batalkan permintaan yang masih melayang
    lastSearchedRef.current = "";
    setQuery("");
    setResults([]);
    setStatus("idle");
    setSearchedQuery("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  /**
   * Satu kalimat status untuk SATU region aria-live persisten (pola sama
   * dengan SearchView): pembaca layar mengumumkan hasil akhir, bu hanya
   * "Mencari…" yang hilang saat permintaan selesai.
   */
  const statusText =
    status === "loading"
      ? "Mencari…"
      : status === "idle"
        ? "Masukkan kata kunci untuk mulai mencari."
        : results.length > 0
          ? `${results.length} hasil untuk “${searchedQuery}”`
          : `Tidak ada hasil untuk “${searchedQuery}”`;

  // Navigasi keyboard pada list hasil (dipakai saat fokus di input).
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i - 1 + flat.length) % flat.length : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = activeIndex >= 0 ? flat[activeIndex] : undefined;
      if (picked) {
        onClose();
        router.push(picked.href);
      } else if (query.trim()) {
        // Tanpa hasil tersorot → halaman penuh (shareable).
        const q = query.trim();
        onClose();
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }
    }
  };

  // Focus trap: kunci Tab di dalam dialog selama terbuka.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('a[href], button, input, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop — klik untuk menutup */}
      <div
        className="absolute inset-0 bg-[#082b59]/40"
        onClick={onClose}
        aria-hidden
      />

      {/*
        Panel — mobile: sheet penuh (inset-x-0); desktop: palet di atas tengah.
        Lebar desktop TIDAK pakai 100vw: unit vw ikut menghitung scrollbar, jadi
        di pita 640–712px panel bisa melebihi ruang inset-x-4 (margin kanan
        menyusut, asimetris). Cukup left+right (inset-x-4) + width auto +
        max-w 680px + mx-auto: lebar = min(ruang tersedia, 680px), selalu simetris.
      */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian situs"
        className="absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col border-b border-[#dce3ed] bg-white shadow-2xl sm:inset-x-4 sm:top-[12vh] sm:mx-auto sm:max-h-[75vh] sm:max-w-[680px] sm:rounded-2xl sm:border sm:border-[#dce3ed]"
      >
        {/* Baris input — clear berada DI DALAM field (pola search-field
            standar), close di LUAR sebagai chip terpisah. Dua tombol ❌ identik
            berdempetan terbukti ambigu saat diuji (lihat screenshot), jadi
            keduanya dibedakan wujud maupun posisinya. */}
        <div className="flex items-center gap-3 border-b border-[#dce3ed] px-4 py-3">
          <MagnifyingGlass className="h-5 w-5 shrink-0 text-slate-400" />
          <div className="relative flex min-w-0 flex-1 items-center">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Cari berita, artikel, kegiatan, prestasi…"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              role="combobox"
              aria-expanded={flat.length > 0}
              aria-controls="search-overlay-listbox"
              aria-activedescendant={
                activeIndex >= 0 ? `search-overlay-opt-${activeIndex}` : undefined
              }
              aria-label="Kata kunci pencarian"
              className={`w-full bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none ${
                query !== "" ? "pr-8" : ""
              }`}
            />
            {query !== "" && (
              <button
                type="button"
                onClick={clearAll}
                aria-label="Hapus kata kunci"
                className="absolute right-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Desktop: chip "Esc" (jelas beda dari clear). Mobile: ❌ —
              clear sudah terpisah border field, jadi tak lagi ambigu. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pencarian"
            className="shrink-0 rounded-md border border-[#dce3ed] px-2 py-1 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="hidden sm:inline">Esc</span>
            <X className="h-5 w-5 sm:hidden" />
          </button>
        </div>

        {/* Status sekaligus wilayah aria-live: perubahan jumlah hasil diumumkan
            pembaca layar. Persisten — jangan dipasang di cabang kondisional,
            karena region yang dilepas tak pernah mengumumkan apa pun. */}
        <p role="status" aria-live="polite" className="sr-only">
          {statusText}
        </p>

        {/* Hasil */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {status === "idle" && (
            <p className="px-4 py-6 text-sm text-slate-500">
              Ketik untuk mulai mencari — hasil muncul langsung.
            </p>
          )}

          {status === "loading" && (
            <p className="px-4 py-6 text-sm text-slate-500" aria-hidden>
              Mencari…
            </p>
          )}

          {status === "done" && groups.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <FileText className="h-10 w-10 text-[#082b59]/15" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                Tidak ada hasil untuk &ldquo;{query.trim()}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-400">Coba kata kunci lain atau periksa ejaan.</p>
            </div>
          )}

          {groups.length > 0 && (
            <ul id="search-overlay-listbox" role="listbox" aria-label="Hasil pencarian" className="py-2">
              {groups.map((group) => {
                const { icon: Icon, chip } = KIND_META[group.kind];
                const groupStart = flat.indexOf(group.items[0]);
                return (
                  <li key={group.kind} role="presentation">
                    <p className="flex items-center gap-2 px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg border ${chip}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {group.label}
                    </p>
                    <ul role="presentation">
                      {group.items.map((item, j) => {
                        const idx = groupStart + j;
                        const active = idx === activeIndex;
                        return (
                          <li key={item.id} role="presentation">
                            <Link
                              id={`search-overlay-opt-${idx}`}
                              role="option"
                              aria-selected={active}
                              href={item.href}
                              onClick={onClose}
                              onMouseMove={() => setActiveIndex(idx)}
                              className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${
                                active ? "bg-[#1767b1]/10" : "hover:bg-slate-50"
                              }`}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-[#082b59]">
                                  {item.title}
                                </span>
                                {item.excerpt && (
                                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                                    {item.excerpt}
                                  </span>
                                )}
                              </span>
                              {item.date && (
                                <span className="mt-0.5 flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  {formatSearchDate(item.date)}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer — pintasan ke halaman penuh */}
        <div className="flex items-center justify-between gap-3 border-t border-[#dce3ed] bg-slate-50/70 px-4 py-2.5">
          <p className="hidden text-xs text-slate-400 sm:block">
            <span className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-slate-500">↑</span>{" "}
            <span className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-slate-500">↓</span>{" "}
            pilih · <span className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-slate-500">Enter</span> buka ·{" "}
            <span className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-slate-500">Esc</span> tutup
          </p>
          {query.trim() !== "" && (
            <Link
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              onClick={onClose}
              className="ml-auto rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1767b1] transition-colors hover:bg-[#1767b1]/10 hover:text-[#082b59]"
            >
              Lihat semua hasil →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
