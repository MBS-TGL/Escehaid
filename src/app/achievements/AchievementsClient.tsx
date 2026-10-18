"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Medal,
  Users,
  Megaphone,
  Star,
  Play,
  X,
  ArrowSquareOut,
} from "@/components/Icons";
import { CSSFadeIn, CSSStagger } from "@/components/CSSAnimations";
import VideoEmbed from "@/components/VideoEmbed";
import type { Achievement } from "@/lib/supabase";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LEVELS,
  achievementCategoryMeta,
  achievementLevelLabel,
  capitalizeCategory,
} from "@/lib/site-config";

const SEMUA = "Semua";

/** Label kategori — konstanta bersama; tak dikenal → capitalize. */
function categoryLabel(key: string): string {
  return achievementCategoryMeta(key)?.label || capitalizeCategory(key || "-");
}

/** Label tingkat — konstanta bersama; tak dikenal → capitalize. */
function levelLabel(value?: string | null): string {
  if (!value) return "";
  return achievementLevelLabel(value) || capitalizeCategory(value);
}

/** Kartu prestasi — gambar atas / teks bawah, konsisten dengan kartu berita.
 *  Klik kartu → modal detail (dengan video bila ada). */
function AchievementCard({
  item,
  big = false,
  onSelect,
}: {
  item: Achievement;
  big?: boolean;
  onSelect: (item: Achievement) => void;
}) {
  const meta = achievementCategoryMeta(item.category);
  const Icon = meta?.icon || Trophy;
  const lvl = levelLabel(item.level);

  return (
    <article
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Lihat detail prestasi: ${item.title}`}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-lg hover:shadow-[var(--brand-primary)]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${
        big ? "sm:col-span-2" : ""
      }`}
    >
      {item.image_url ? (
        <div className="relative overflow-hidden bg-slate-100">
          <Image
            src={item.image_url}
            alt={item.image_alt || item.title}
            width={1280}
            height={720}
            sizes={big ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {item.video_url && (
            <span aria-hidden="true" className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <Play weight="fill" className="h-3 w-3" /> Video
            </span>
          )}
        </div>
      ) : (
        <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[#f4d21f]/20 to-[#f4d21f]/5">
          {item.video_url && (
            <span aria-hidden="true" className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <Play weight="fill" className="h-3 w-3" /> Video
            </span>
          )}
          <Icon weight="fill" className={big ? "h-16 w-16 text-[#f4d21f]" : "h-12 w-12 text-[#f4d21f]"} />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.rank_label && (
            <span className="rounded-md bg-[#f4d21f] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
              {item.rank_label}
            </span>
          )}
          {lvl && (
            <span className="rounded-md bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
              {lvl}
            </span>
          )}
          <span className="rounded-md border border-[var(--brand-accent)]/20 bg-[var(--brand-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-accent)]">
            {categoryLabel(item.category)}
          </span>
          <span className="text-[11px] text-slate-400">{item.year}</span>
        </div>

        <h3
          className={`mt-2.5 font-semibold text-[var(--brand-primary)] ${
            big ? "text-lg sm:text-xl" : "text-base"
          }`}
        >
          {item.title}
        </h3>

        {item.participants && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
            <Users className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{item.participants}</span>
          </p>
        )}
        {item.organizer && (
          <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
            <Megaphone className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{item.organizer}</span>
          </p>
        )}
        {item.description && (
          <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-2">{item.description}</p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-accent)] transition-colors group-hover:text-[var(--brand-primary)]">
          {item.video_url ? (
            <>
              <Play weight="fill" className="h-3.5 w-3.5" /> Lihat detail &amp; video
            </>
          ) : (
            "Lihat detail"
          )}
        </p>
      </div>
    </article>
  );
}

export default function PrestasiClient({ achievements }: { achievements: Achievement[] }) {
  const [activeCat, setActiveCat] = useState(SEMUA);
  const [activeLevel, setActiveLevel] = useState(SEMUA);
  /** Prestasi aktif di modal detail (video ditampilkan di sini). */
  const [selected, setSelected] = useState<Achievement | null>(null);

  // Modal: ESC menutup + kunci scroll latar belakang
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected]);

  /** Tahap 4.6 — tahun menurun, lalu created_at menurun (di komponen, query tidak diubah). */
  const sorted = useMemo(
    () =>
      [...achievements].sort(
        (a, b) =>
          (b.year || 0) - (a.year || 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [achievements]
  );

  /** Chip kategori dari data (min. 1 prestasi) — urut mengikuti konstanta bersama. */
  const catChips = useMemo(() => {
    const keys = [...new Set(sorted.map((a) => a.category).filter(Boolean))];
    const present = new Set(keys.map((k) => k.toLowerCase()));
    const known = ACHIEVEMENT_CATEGORIES.filter((c) => present.has(c.key)).map((c) => c.key);
    const used = new Set(known.map((k) => k.toLowerCase()));
    const unknown = keys.filter((k) => !used.has(k.toLowerCase())).sort();
    return [...known, ...unknown];
  }, [sorted]);

  /** Chip tingkat dari data — hanya bila ada nilai level. */
  const levelChips = useMemo(() => {
    const vals = [...new Set(sorted.map((a) => a.level).filter(Boolean))] as string[];
    const present = new Set(vals.map((v) => v.toLowerCase()));
    const known = ACHIEVEMENT_LEVELS.filter((l) => present.has(l.toLowerCase()));
    const used = new Set(known.map((l) => l.toLowerCase()));
    const unknown = vals.filter((v) => !used.has(v.toLowerCase())).sort();
    return [...known, ...unknown];
  }, [sorted]);

  const filtered = sorted.filter(
    (a) =>
      (activeCat === SEMUA || (a.category || "").toLowerCase() === activeCat.toLowerCase()) &&
      (activeLevel === SEMUA || (a.level || "").toLowerCase() === activeLevel.toLowerCase())
  );

  const featured = filtered.filter((a) => a.is_featured);
  const rest = filtered.filter((a) => !a.is_featured);

  function resetFilters() {
    setActiveCat(SEMUA);
    setActiveLevel(SEMUA);
  }

  const chipCls = (active: boolean) =>
    `rounded-full px-5 py-2 text-sm font-medium transition-all ${
      active
        ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20"
        : "bg-[#f4f7fb] text-slate-500 hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
    }`;

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-primary-mid)] to-[var(--brand-primary-light)] py-16 text-white">
        <div className="absolute inset-0 hidden opacity-[0.04] sm:block">
          <Trophy className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <Medal className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <CSSFadeIn>
            <h1 className="text-3xl font-bold md:text-4xl text-balance">Prestasi</h1>
            <p className="mt-3 text-base text-white/70 text-balance">Pencapaian terbaik siswa dan sekolah</p>
          </CSSFadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        {achievements.length === 0 ? (
          /* ── Tanpa data sama sekali ── */
          <CSSFadeIn>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-20 text-center">
              <Trophy className="h-14 w-14 text-[var(--brand-primary)]/20" />
              <p className="mt-5 text-base text-slate-500">Belum ada data prestasi.</p>
              <p className="mt-1 text-sm text-slate-400">Lihat kabar terbaru sekolah kami sambil menunggu.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/news" className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--brand-primary)]/20 transition-all hover:bg-[var(--brand-accent)]">
                  Lihat Berita Terbaru
                </Link>
                <Link href="/admission" className="rounded-full bg-[#f4f7fb] px-5 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]">
                  Info SPMB
                </Link>
              </div>
            </div>
          </CSSFadeIn>
        ) : (
          <>
            {/* ── Filter kategori & tingkat (dibangun dari data) ── */}
            <CSSFadeIn>
              <div className="mb-6 flex flex-wrap justify-center gap-2">
                <button aria-pressed={activeCat === SEMUA} onClick={() => setActiveCat(SEMUA)} className={chipCls(activeCat === SEMUA)}>
                  {SEMUA}
                </button>
                {catChips.map((cat) => (
                  <button key={cat} aria-pressed={activeCat === cat} onClick={() => setActiveCat(cat)} className={chipCls(activeCat === cat)}>
                    {categoryLabel(cat)}
                  </button>
                ))}
              </div>

              {levelChips.length > 0 && (
                <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
                  <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Tingkat</span>
                  <button aria-pressed={activeLevel === SEMUA} onClick={() => setActiveLevel(SEMUA)} className={chipCls(activeLevel === SEMUA)}>
                    {SEMUA}
                  </button>
                  {levelChips.map((lvl) => (
                    <button key={lvl} aria-pressed={activeLevel === lvl} onClick={() => setActiveLevel(lvl)} className={chipCls(activeLevel === lvl)}>
                      {levelLabel(lvl)}
                    </button>
                  ))}
                </div>
              )}
            </CSSFadeIn>

            {filtered.length === 0 ? (
              /* ── Ada data, tapi filter tidak menghasilkan apa pun ── */
              <CSSFadeIn>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce3ed] bg-white py-16 text-center">
                  <p className="text-sm text-slate-500">Tidak ada prestasi yang cocok dengan filter ini.</p>
                  <button onClick={resetFilters} className="mt-4 rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--brand-primary)]/20 transition-all hover:bg-[var(--brand-accent)]">
                    Tampilkan semua
                  </button>
                </div>
              </CSSFadeIn>
            ) : (
              <>
                {/* ── Bagian Unggulan (mengikuti filter yang aktif) ── */}
                {featured.length > 0 && (
                  <div className="mb-10">
                    <div className="mb-4 flex items-center gap-2">
                      <Star weight="fill" className="h-4 w-4 text-[#f4d21f]" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--brand-primary)]">Unggulan</h2>
                      <div className="h-1 w-6 rounded-full bg-[#f4d21f]" />
                    </div>
                    <CSSStagger stagger={80} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {featured.map((item) => (
                        <AchievementCard key={item.id} item={item} big onSelect={setSelected} />
                      ))}
                    </CSSStagger>
                  </div>
                )}

                {/* ── Sisanya — grid 3 kolom ── */}
                <CSSStagger stagger={60} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((item) => (
                    <AchievementCard key={item.id} item={item} onSelect={setSelected} />
                  ))}
                </CSSStagger>
              </>
            )}
          </>
        )}
      </section>

      {/* ── Modal detail prestasi (dengan video bila ada) ── */}
      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={`Detail prestasi: ${selected.title}`}>
          <div aria-hidden="true" className="absolute inset-0 bg-[var(--brand-primary)]/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Tutup detail prestasi"
              className="absolute right-3 top-3 z-10 rounded-lg bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>

            {selected.image_url ? (
              <Image
                src={selected.image_url}
                alt={selected.image_alt || selected.title}
                width={1280}
                height={720}
                sizes="100vw"
                className="h-48 w-full object-cover sm:h-56"
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-[#f4d21f]/20 to-[#f4d21f]/5">
                <Trophy weight="fill" className="h-14 w-14 text-[#f4d21f]" />
              </div>
            )}

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-1.5">
                {selected.rank_label && (
                  <span className="rounded-md bg-[#f4d21f] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                    {selected.rank_label}
                  </span>
                )}
                {levelLabel(selected.level) && (
                  <span className="rounded-md bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                    {levelLabel(selected.level)}
                  </span>
                )}
                {selected.category && (
                  <span className="rounded-md border border-[var(--brand-accent)]/20 bg-[var(--brand-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-accent)]">
                    {categoryLabel(selected.category)}
                  </span>
                )}
                {selected.year && (
                  <span className="text-[11px] text-slate-400">{selected.year}</span>
                )}
              </div>

              <h2 className="mt-3 text-xl font-bold text-[var(--brand-primary)]">{selected.title}</h2>

              {selected.participants && (
                <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-600">
                  <Users className="mt-px h-4 w-4 shrink-0 text-slate-400" />
                  <span>{selected.participants}</span>
                </p>
              )}
              {selected.organizer && (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-600">
                  <Megaphone className="mt-px h-4 w-4 shrink-0 text-slate-400" />
                  <span>{selected.organizer}</span>
                </p>
              )}
              {selected.description && (
                <p className="mt-4 text-sm leading-relaxed text-slate-500">{selected.description}</p>
              )}

              {/* Video eksternal — click-to-load; TikTok pendek tak teresolve di client → tombol "Tonton di ..." */}
              {selected.video_url && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1 w-6 rounded-full bg-[#f4d21f]" />
                    <p className="text-sm font-bold uppercase tracking-wider text-[var(--brand-primary)]">Video Prestasi</p>
                    <a href={selected.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-primary)]">
                      Buka di platform <ArrowSquareOut className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                  <VideoEmbed
                    url={selected.video_url}
                    poster={selected.image_url}
                    title={selected.title}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
