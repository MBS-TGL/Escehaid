import { getNewsList, getArticleList } from "@/lib/queries";

/**
 * RSS 2.0 feed — gabungan berita + artikel terpublikasi (maks. 50 terbaru
 * masing-masing). Dilayani dari /rss.xml; ISR 15 menit agar murah namun tetap
 * segar. Query yang dipakai sama dengan beranda (getNewsList/getArticleList)
 * sehingga otomatis hanya memuat konten yang boleh tampil publik.
 */

export const revalidate = 900;

const SITE_URL = "https://www.smpmuh4tanggul.sch.id";
const FEED_TITLE = "SMP Muhammadiyah 4 Tanggul — Berita & Artikel";
const FEED_DESCRIPTION =
  "Berita, artikel, dan informasi terbaru dari SMP Muhammadiyah 4 Tanggul";
const MAX_PER_TYPE = 50;

/** Escape teks menjadi aman di dalam XML. */
function esc(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "\u0026apos;");
}

/** ISO date → RFC 822 (kebutuhan pubDate RSS); string rusak → "". */
function rfc822(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toUTCString();
}

/** Buang tag HTML & rapikan spasi — ringkasan feed harus teks polos. */
function plainText(value?: string | null, max = 300): string {
  const text = (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u0026nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  category: string;
  pubDate: string;
  /** epoch ms untuk sort — 0 bila tanggal tak terbaca. */
  ts: number;
}

function buildXml(items: FeedItem[], lastBuildDate: string): string {
  const itemXml = items
    .map(
      (i) => [
        "    <item>",
        `      <title>${esc(i.title)}</title>`,
        `      <link>${esc(i.link)}</link>`,
        `      <guid isPermaLink="true">${esc(i.link)}</guid>`,
        i.category ? `      <category>${esc(i.category)}</category>` : "",
        i.pubDate ? `      <pubDate>${esc(i.pubDate)}</pubDate>` : "",
        `      <description>${esc(i.description)}</description>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${esc(FEED_TITLE)}</title>`,
    `    <link>${SITE_URL}</link>`,
    `    <description>${esc(FEED_DESCRIPTION)}</description>`,
    "    <language>id-ID</language>",
    `    <lastBuildDate>${esc(lastBuildDate)}</lastBuildDate>`,
    `    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />`,
    itemXml,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export async function GET() {
  const [news, articles] = await Promise.all([
    getNewsList(MAX_PER_TYPE),
    getArticleList(MAX_PER_TYPE),
  ]);

  const items: FeedItem[] = [
    ...news.map((n) => {
      const pubDate = rfc822(n.published_at || n.created_at);
      return {
        title: n.title,
        link: `${SITE_URL}/news/${n.slug}`,
        description: plainText(n.summary),
        category: n.category || "",
        pubDate,
        ts: pubDate ? new Date(pubDate).getTime() : 0,
      };
    }),
    ...articles.map((a) => {
      const pubDate = rfc822(a.published_at || a.created_at);
      return {
        title: a.title,
        link: `${SITE_URL}/articles/${a.slug}`,
        description: plainText(a.excerpt),
        category: a.category || "",
        pubDate,
        ts: pubDate ? new Date(pubDate).getTime() : 0,
      };
    }),
  ]
    // Item tanpa tanggal valid diletakkan terakhir, bukan memicu NaN.
    .sort((a, b) => b.ts - a.ts);

  const lastBuildDate =
    items[0]?.pubDate || new Date().toUTCString();

  return new Response(buildXml(items, lastBuildDate), {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}
