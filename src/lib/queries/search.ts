import { getActivityList } from "./activities";
import { getAchievementList } from "./achievements";
import { getArticleList } from "./articles";
import { getEkskulList } from "./ekskuls";
import { getNewsList } from "./news";
import { sanitizeSearchTerm } from "./shared";

export type SearchKind = "berita" | "artikel" | "kegiatan" | "prestasi" | "ekskul" | "halaman";

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
  { kind: "halaman", label: "Halaman" },
  { kind: "berita", label: "Berita" },
  { kind: "artikel", label: "Artikel" },
  { kind: "kegiatan", label: "Kegiatan" },
  { kind: "prestasi", label: "Prestasi" },
  { kind: "ekskul", label: "Ekstrakurikuler" },
];

/**
 * Halaman statis publik — dipasangkan dengan label/kata-kunci alias agar
 * istilah seperti "pendaftaran" atau "biaya" menemukan halaman yang tepat.
 * Label/href mengikuti navigasi publik; tanpa DB, tampil pada grup pertama.
 */
interface StaticPage {
  title: string;
  href: string;
  keywords: string[];
}

const STATIC_PAGES: StaticPage[] = [
  { title: "SPMB", href: "/admission", keywords: ["spmb", "pendaftaran", "daftar", "ppdb", "murid baru", "penerimaan", "biaya"] },
  { title: "Berita", href: "/news", keywords: ["berita", "informasi"] },
  { title: "Kegiatan", href: "/activities", keywords: ["kegiatan", "agenda"] },
  { title: "Prestasi", href: "/achievements", keywords: ["prestasi", "penghargaan"] },
  { title: "Artikel", href: "/articles", keywords: ["artikel"] },
  { title: "Profil", href: "/profile", keywords: ["profil", "tentang", "sejarah", "guru", "fasilitas", "ekstrakurikuler", "ekskul"] },
  { title: "Program", href: "/program", keywords: ["program", "tahfidz", "keunggulan", "golden habits"] },
  { title: "Galeri", href: "/gallery", keywords: ["galeri", "foto"] },
  { title: "Unduhan", href: "/downloads", keywords: ["unduhan", "download", "formulir", "brosur"] },
  { title: "Kontak", href: "/contact", keywords: ["kontak", "hubungi", "alamat", "telepon", "email"] },
  { title: "Portal", href: "/portal", keywords: ["portal", "siswa", "login", "masuk"] },
  { title: "Beranda", href: "/", keywords: ["beranda", "home"] },
];

/**
 * Pencocokan halaman statis: istilah (sudah dinormalisasi) dicocokkan sebagai
 * substring dari "judul + kata kunci". Tanpa query DB; istilah yang gagal
 * dinormalisasi → [] tanpa memicu pencapaian halaman.
 */
export function searchStaticPages(query: string): SearchItem[] {
  const term = sanitizeSearchTerm(query).toLowerCase();
  if (!term) return [];
  return STATIC_PAGES.filter((p) =>
    `${p.title} ${p.keywords.join(" ")}`.toLowerCase().includes(term)
  ).map((p) => ({
    id: p.href,
    kind: "halaman" as const,
    title: p.title,
    href: p.href,
    date: null,
    excerpt: null,
  }));
}

/**
 * Pencarian menyeluruh: SATU istilah menjangkau halaman statis + berita +
 * artikel + kegiatan + prestasi + ekskul (pencocokan halaman tanpa DB + 5
 * query paralel). Semua jenis memakai filter
 * publik yang sama dengan halaman daftarnya (draft/terjadwal/ekskul nonaktif
 * tidak pernah bocor), dan aman dipanggil dari server maupun client karena
 * memakai client Supabase anon yang sama.
 */
export async function searchAllContent(query: string): Promise<SearchItem[]> {
  // Istilah habis setelah sanitasi (mis. ", (") → jangan query apa pun.
  if (!sanitizeSearchTerm(query)) return [];

  const [news, articles, activities, achievements, ekskuls] = await Promise.all([
    getNewsList(MAX_PER_KIND, query),
    getArticleList(MAX_PER_KIND, query),
    getActivityList(MAX_PER_KIND, query),
    getAchievementList(query),
    getEkskulList(MAX_PER_KIND, query),
  ]);

  return [
    ...searchStaticPages(query),
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
    ...ekskuls.map((e) => ({
      id: e.id,
      kind: "ekskul" as const,
      title: e.name,
      href: `/ekskul/${e.slug}`,
      // Ekskul tak punya tanggal relevan — null agar tampilan menyembunyikannya.
      date: null,
      excerpt: e.description || null,
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
