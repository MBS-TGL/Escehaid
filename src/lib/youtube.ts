/**
 * Helper untuk URL YouTube — dipakai galeri (admin boleh paste link YouTube
 * sebagai "URL Video", sehingga egress Supabase untuk video bisa nol).
 */

const ID = "[A-Za-z0-9_-]{11}";

const PATTERNS: RegExp[] = [
  new RegExp(`youtube\\.com\\/watch\\?(?:[^#]*&)?v=(${ID})`),
  new RegExp(`youtu\\.be\\/(${ID})`),
  new RegExp(`youtube\\.com\\/(?:embed|shorts|v|live)\\/(${ID})`),
  new RegExp(`youtube-nocookie\\.com\\/embed\\/(${ID})`),
];

/** Ambil ID video dari berbagai bentuk URL YouTube. Bukan link YouTube → null. */
export function getYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  for (const re of PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Thumbnail resmi YouTube (dipakai sebagai preview kecil di grid galeri). */
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** URL embed tanpa cookie (privacy-friendly) untuk <iframe>. */
export function youtubeEmbedUrl(id: string, autoplay = false): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${
    autoplay ? "&autoplay=1" : ""
  }`;
}
