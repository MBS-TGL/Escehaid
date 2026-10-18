"use client";

import { useState } from "react";
import {
  parseVideoUrl,
  videoEmbedUrl,
  videoProviderLabel,
  type ParsedVideoUrl,
} from "@/lib/video-embed";
import { ArrowSquareOut, InstagramLogo, YoutubeLogo, Video, Cloud } from "@/components/Icons";

/**
 * Embed video konten — CLICK-TO-LOAD (ringan):
 *
 * - Awalnya hanya kartu poster (gambar kegiatan) + ikon putar + label penyedia
 *   dengan rasio TETAP → tanpa layout shift, tanpa skrip pihak ketiga.
 * - iframe (youtube-nocookie / instagram / tiktok / vimeo / drive resmi) baru
 *   dimuat saat kartu diklik/tap — tidak ada beban jaringan sebelum pengguna
 *   berminat.
 * - URL tak dikenali / embed tak tersedia → tombol "Tonton di <host>"
 *   (tab baru, rel="noopener noreferrer").
 * - Tanpa CSSFadeIn & tanpa `will-change` permanen (menyebabkan teks blur).
 */

const PROVIDER_ICON: Record<ParsedVideoUrl["provider"], typeof Video> = {
  youtube: YoutubeLogo,
  instagram: InstagramLogo,
  tiktok: Video,
  vimeo: Video,
  googledrive: Cloud,
  unknown: Video,
};

/** Rasio + lebar maksimum per penyedia (video vertikal jadi kartu ramping). */
const RATIO_CLASS: Record<string, string> = {
  youtube: "aspect-video w-full",
  vimeo: "aspect-video w-full",
  googledrive: "aspect-video w-full",
  instagram: "mx-auto aspect-[4/5] w-full max-w-[540px]",
  tiktok: "mx-auto aspect-[9/16] w-full max-w-[420px]",
  unknown: "aspect-video w-full",
};

export default function VideoEmbed({
  url,
  poster,
  title,
}: {
  /** URL video (hasil resolveVideoUrl — link pendek TikTok sudah kanonik). */
  url: string;
  /** Gambar kegiatan sbg poster; null → kartu polos navy. */
  poster?: string | null;
  /** Judul kegiatan — dipakai aria-label & title iframe. */
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const parsed = parseVideoUrl(url);
  const embedUrl = videoEmbedUrl(parsed);
  const provider = videoProviderLabel(parsed);
  const Icon = PROVIDER_ICON[parsed.provider];
  const ratio = RATIO_CLASS[parsed.provider] ?? RATIO_CLASS.unknown;

  // ── Fallback: URL tak dikenali / ID tak terbaca → tombol buka di platform ──
  if (!embedUrl) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-[#dce3ed] bg-[var(--brand-primary)] ${ratio}`}>
        {poster && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${JSON.stringify(poster)})` }}
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Icon className="h-8 w-8 text-white/80" aria-hidden="true" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#f4d21f] px-4 py-2.5 text-sm font-bold text-[var(--brand-primary)] transition-colors hover:bg-[#e6c51a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d21f]"
            aria-label={`Tonton video ${title} di ${provider} (tab baru)`}
          >
            <ArrowSquareOut className="h-4 w-4" aria-hidden="true" /> Tonton di {provider}
          </a>
        </div>
      </div>
    );
  }

  // ── Poster click-to-load / iframe setelah diklik ──────────────────────────
  return (
    <div>
      <div className={ratio}>
        {loaded ? (
          <iframe
            src={embedUrl}
            title={`Video: ${title} (${provider})`}
            className="h-full w-full rounded-2xl border border-[#dce3ed] bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            aria-label={`Putar video ${title} di ${provider}`}
            className="group relative block h-full w-full overflow-hidden rounded-2xl border border-[#dce3ed] bg-[var(--brand-primary)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
          >
            {poster && (
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center opacity-60 transition-opacity group-hover:opacity-70"
                style={{ backgroundImage: `url(${JSON.stringify(poster)})` }}
              />
            )}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/85 via-[var(--brand-primary)]/30 to-transparent" />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-[var(--brand-primary)]" aria-hidden="true">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.77-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
                </svg>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {provider}
              </span>
            </span>
          </button>
        )}
      </div>
      {/* Jalan keluar bila embed diblokir/gagal muat di perangkat pengunjung. */}
      {loaded && (
        <a
          href={parsed.canonicalUrl || url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-accent)] transition-colors hover:text-[var(--brand-primary)]"
          aria-label={`Tonton video ${title} di ${provider} (tab baru)`}
        >
          Tonton di {provider} <ArrowSquareOut className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
