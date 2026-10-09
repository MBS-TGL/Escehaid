import { getActivityList } from "./activities";
import { getAchievementList } from "./achievements";
import { getArticleList } from "./articles";
import { getNewsList } from "./news";
import { sanitizeSearchTerm } from "./shared";

export type SearchKind = "berita" | "artikel" | "kegiatan" | "prestasi";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  href: string;
  /** ISO date (tanggal terbit / tanggal kegiatan) atau created_at; null bila tak tersedia. */
  date: string | null;
  excerpt: string | null;
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  items: SearchItem[];
}

/** Batas hasil per jenis — pencarian menyeluruh menampilkan cuplikan, bu arsip penuh. */
const MAX_PER_KIND = 8;

const GROUP_ORDER: { kind: SearchKind; label: string }[] = [
  { kind: "berita", label: "Berita" },
  { kind: "artikel", label: "Artikel" },
  { kind: "kegiatan", label: "Kegiatan" },
  { kind: "prestasi", label: "Prestasi" },
];

/**
 * Pencarian menyeluruh: SATU istilah menjangkau berita + artikel + kegiatan +
 * prestasi sekaligus (4 query paralel). Semua jenis memakai filter publik yang
 * sama dengan halaman daftarnya (draft/terjadwal tidak pernah bocor), dan
 * aman dipanggil dari server maupun client karena memakai client Supabase
 * anon yang sama.
 */
export async function searchAllContent(query: string): Promise<SearchItem[]> {
  // Istilah habis setelah sanitasi (mis. ", (") → jangan query apa pun.
  if (!sanitizeSearchTerm(query)) return [];

  const [news, articles, activities, achievements] = await Promise.all([
    getNewsList(MAX_PER_KIND, query),
    getArticleList(MAX_PER_KIND, query),
    getActivityList(MAX_PER_KIND, query),
    getAchievementList(query),
  ]);

  return [
    ...news.map((n) => ({
      id: n.id,
      kind: "berita" as const,
      title: n.title,
      href: `/news/${n.slug}`,
      date: n.published_at || n.created_at,
      excerpt: n.summary || null,
    })),
    ...articles.map((a) => ({
      id: a.id,
      kind: "artikel" as const,
      title: a.title,
      href: `/articles/${a.slug}`,
      date: a.published_at || a.created_at,
      excerpt: a.excerpt || null,
    })),
    ...activities.map((a) => ({
      id: a.id,
      kind: "kegiatan" as const,
      title: a.title,
      href: `/activities/${a.slug}`,
      date: a.activity_date || a.created_at,
      excerpt: a.description || null,
    })),
    ...achievements.slice(0, MAX_PER_KIND).map((a) => ({
      id: a.id,
      kind: "prestasi" as const,
      title: a.title,
      // Prestasi belum punya halaman detail ([slug]) — tautkan ke daftarnya.
      href: "/achievements",
      date: a.created_at,
      excerpt: a.description || null,
    })),
  ];
}

/** Kelompokkan hasil per jenis (urutan tetap); kelompok kosong dibuang, tiap kelompok terbaru dulu. */
export function groupSearchResults(items: SearchItem[]): SearchGroup[] {
  return GROUP_ORDER.map(({ kind, label }) => ({
    kind,
    label,
    items: items
      .filter((item) => item.kind === kind)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
  })).filter((group) => group.items.length > 0);
}
