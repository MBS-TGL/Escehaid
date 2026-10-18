/**
 * Util video kegiatan/konten — parse URL YouTube / Instagram / TikTok /
 * Vimeo / Google Drive → embed ringan.
 *
 * Dipakai dua sisi:
 * - KLIEN (admin & komponen VideoEmbed): `parseVideoUrl` mendeteksi penyedia
 *   untuk chip/label, `videoEmbedUrl` menurunkan src iframe click-to-load.
 * - SERVER (detail kegiatan/berita/artikel): `resolveVideoUrl` menyelesaikan
 *   link pendek TikTok (vm.tiktok.com / vt.tiktok.com / tiktok.com/t/…) lewat
 *   redirect fetch ATAU oEmbed publik https://www.tiktok.com/oembed?url=… —
 *   dengan timeout, error aman (selalu jatuh ke URL mentah), dan cache TTL
 *   sederhana sehingga render statis tidak menembak jaringan di setiap request.
 *
 * Sengaja TIDAK memuat skrip embed pihak ketiga (instagram embed.js, dsb.):
 * cukup iframe resmi youtube-nocookie / instagram / tiktok / vimeo / drive.
 * Facebook sengaja tidak didukung (butuh skrip SDK); platform lain jatuh ke
 * tombol link-out "Tonton di <hostname>".
 */

import { youtubeEmbedUrl } from "./youtube";

export type VideoProvider =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "vimeo"
  | "googledrive"
  | "unknown";

export interface ParsedVideoUrl {
  /** Penyedia terdeteksi dari host URL. */
  provider: VideoProvider;
  /** ID video; null bila link pendek TikTok belum diselesaikan / ID tak terbaca. */
  id: string | null;
  /** URL kanonik (bisa dibuka langsung); URL mentah bila tak dikenali. */
  canonicalUrl: string;
  /** Hostname bersih (tanpa www.) — label fallback untuk platform tak dikenal. */
  host: string;
}

/** Label penyedia untuk chip admin; host tak dikenal memakai videoProviderLabel(). */
export const VIDEO_PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  vimeo: "Vimeo",
  googledrive: "Google Drive",
  unknown: "Tidak dikenali",
};

/** Label ramah: penyedia dikenal → VIDEO_PROVIDER_LABEL; selain itu hostname. */
export function videoProviderLabel(parsed: ParsedVideoUrl): string {
  if (parsed.provider !== "unknown") return VIDEO_PROVIDER_LABEL[parsed.provider];
  return parsed.host || "Tidak dikenali";
}

const YT_ID = "[A-Za-z0-9_-]{11}";

/**
 * Deteksi penyedia + ID video dari URL (sync, aman dipanggil di klien).
 * Link pendek TikTok tetap dikenali sebagai "tiktok" dengan `id` null —
 * pemanggil server memakai `resolveVideoUrl` untuk menyelesaikannya.
 */
export function parseVideoUrl(url?: string | null): ParsedVideoUrl {
  const raw = (url || "").trim();
  const emptyHost = { provider: "unknown" as const, id: null, canonicalUrl: "", host: "" };
  if (!raw) return emptyHost;

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ...emptyHost, canonicalUrl: raw };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ...emptyHost, canonicalUrl: raw };
  }

  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  // ── YouTube: watch?v=, youtu.be/, /shorts/, /embed/, /live/ ────────────────
  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtu.be" ||
    host === "youtube-nocookie.com"
  ) {
    let id: string | null = null;
    if (host === "youtu.be") {
      id = u.pathname.match(new RegExp(`^/(${YT_ID})(?:/|$)`))?.[1] ?? null;
    } else if (u.pathname === "/watch") {
      id = u.searchParams.get("v")?.match(new RegExp(`^(${YT_ID})$`))?.[1] ?? null;
    } else {
      id = u.pathname.match(new RegExp(`^/(?:embed|shorts|live|v)/(${YT_ID})`))?.[1] ?? null;
    }
    return {
      provider: "youtube",
      id,
      canonicalUrl: id ? `https://www.youtube.com/watch?v=${id}` : raw,
      host,
    };
  }

  // ── Instagram: /p/, /reel/, /tv/ ───────────────────────────────────────────
  if (host === "instagram.com" || host === "instagr.am") {
    const m = u.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    const kind = m?.[1];
    const id = m?.[2] ?? null;
    return {
      provider: "instagram",
      id,
      canonicalUrl: id && kind ? `https://www.instagram.com/${kind}/${id}/` : raw,
      host,
    };
  }

  // ── TikTok: /@user/video/ID, /embed/v2/ID, dan link pendek vm/vt ──────────
  if (
    host === "tiktok.com" ||
    host === "m.tiktok.com" ||
    host === "vm.tiktok.com" ||
    host === "vt.tiktok.com"
  ) {
    const id =
      u.pathname.match(/\/video\/(\d+)/)?.[1] ??
      u.pathname.match(/\/embed\/v2\/(\d+)/)?.[1] ??
      null;
    const user = u.pathname.match(/^\/(@[^/]+)\/video\//)?.[1] ?? null;
    return {
      provider: "tiktok",
      id,
      canonicalUrl: id && user ? `https://www.tiktok.com/${user}/video/${id}` : raw,
      host,
    };
  }

  // ── Vimeo: vimeo.com/ID, vimeo.com/video/ID, player.vimeo.com/video/ID ────
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.match(/(?:^\/|\/video\/)(\d{6,})/)?.[1] ?? null;
    return {
      provider: "vimeo",
      id,
      canonicalUrl: id ? `https://vimeo.com/${id}` : raw,
      host,
    };
  }

  // ── Google Drive: /file/d/ID/view|preview, open?id=ID ─────────────────────
  // docs.google.com (form/dokumen) sengaja TIDAK didukung — hanya file drive.
  if (host === "drive.google.com") {
    let id = u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
    if (!id && (u.pathname === "/open" || u.pathname === "/uc")) id = u.searchParams.get("id");
    return {
      provider: "googledrive",
      id,
      canonicalUrl: id ? `https://drive.google.com/file/d/${id}/view` : raw,
      host,
    };
  }

  return { provider: "unknown", id: null, canonicalUrl: raw, host };
}

/**
 * src iframe embed (tanpa skrip pihak ketiga). null → pemanggil menampilkan
 * fallback "Tonton di <platform>".
 */
export function videoEmbedUrl(parsed: ParsedVideoUrl): string | null {
  switch (parsed.provider) {
    case "youtube":
      // youtube-nocookie = privacy-friendly; helper yang sama dipakai galeri.
      return parsed.id ? youtubeEmbedUrl(parsed.id) : null;
    case "instagram": {
      if (!parsed.id) return null;
      const kind = parsed.canonicalUrl.match(/instagram\.com\/(p|reel|tv)\//)?.[1] || "p";
      return `https://www.instagram.com/${kind}/${parsed.id}/embed/`;
    }
    case "tiktok":
      return parsed.id ? `https://www.tiktok.com/embed/v2/${parsed.id}` : null;
    case "vimeo":
      return parsed.id ? `https://player.vimeo.com/video/${parsed.id}` : null;
    case "googledrive":
      return parsed.id ? `https://drive.google.com/file/d/${parsed.id}/preview` : null;
    default:
      return null;
  }
}

// ── Resolusi link pendek TikTok (SERVER ONLY) ────────────────────────────────

/** Hasil resolve server: URL sudah kanonik + thumbnail oEmbed (poster). */
export interface ResolvedVideo {
  parsed: ParsedVideoUrl;
  /** Thumbnail TikTok dari oEmbed — poster bila kegiatan tidak punya gambar. */
  thumbnailUrl: string | null;
}

const RESOLVE_TTL_MS = 24 * 60 * 60 * 1000;
/** Cache memo per URL (di luar cache Next) → aman untuk render statis & ISR. */
const resolveCache = new Map<string, { value: ResolvedVideo; expires: number }>();

/** fetch dengan timeout — jangan pernah menggantung render/hang build. */
async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { Accept: "application/json, text/html;q=0.9, */*;q=0.8" },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Ikuti redirect link pendek → URL penuh /@user/video/ID (atau null). */
async function resolveTikTokRedirect(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url);
    const finalUrl = res.url;
    if (finalUrl && finalUrl !== url && /tiktok\.com\/@[^/]+\/video\/\d+/i.test(finalUrl)) {
      return finalUrl;
    }
  } catch {
    // Kors/timeout/blokir → lanjut ke oEmbed; gagal = aman (fallback tombol).
  }
  return null;
}

/** oEmbed publik TikTok → { id video, thumbnail } tanpa API key. */
async function fetchTikTokOembed(
  url: string
): Promise<{ id: string | null; thumbnailUrl: string | null }> {
  try {
    const res = await fetchWithTimeout(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) return { id: null, thumbnailUrl: null };
    const data = (await res.json()) as { thumbnail_url?: unknown; html?: unknown };
    const id = typeof data.html === "string" ? data.html.match(/embed\/v2\/(\d+)/)?.[1] ?? null : null;
    return {
      id,
      thumbnailUrl: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
    };
  } catch {
    return { id: null, thumbnailUrl: null };
  }
}

/**
 * Selesaikan URL video di SERVER (panggil dari Server Component):
 * - link pendek TikTok → redirect fetch, cadangan oEmbed publik;
 * - TikTok → thumbnail oEmbed untuk poster click-to-load.
 * Error apa pun ditelan → tampilan jatuh ke tombol "Tonton di <platform>".
 */
export async function resolveVideoUrl(url?: string | null): Promise<ResolvedVideo> {
  const raw = (url || "").trim();
  const empty: ResolvedVideo = {
    parsed: { provider: "unknown", id: null, canonicalUrl: "", host: "" },
    thumbnailUrl: null,
  };
  if (!raw) return empty;

  const cached = resolveCache.get(raw);
  if (cached && cached.expires > Date.now()) return cached.value;

  const parsed = parseVideoUrl(raw);
  const value: ResolvedVideo = { parsed, thumbnailUrl: null };

  try {
    // Link pendek (id null) → ikuti redirect dulu, lalu oEmbed sbg cadangan.
    if (parsed.provider === "tiktok" && !parsed.id) {
      const resolvedUrl = await resolveTikTokRedirect(raw);
      if (resolvedUrl) {
        const rp = parseVideoUrl(resolvedUrl);
        if (rp.id) value.parsed = rp;
      }
    }
    if (value.parsed.provider === "tiktok") {
      const oembed = await fetchTikTokOembed(raw);
      if (oembed.thumbnailUrl) value.thumbnailUrl = oembed.thumbnailUrl;
      if (!value.parsed.id && oembed.id) {
        value.parsed = { ...value.parsed, id: oembed.id };
      }
    }
  } catch {
    // Error tak terduga → biarkan apa adanya (fallback "Tonton di …").
  }

  resolveCache.set(raw, { value, expires: Date.now() + RESOLVE_TTL_MS });
  return value;
}
