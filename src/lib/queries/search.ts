import { getActivityList } from "./activities";
import { getAchievementList } from "./achievements";
import { getArticleList } from "./articles";
import { getEkskulList } from "./ekskuls";
import { getNewsList } from "./news";
import { sanitizeSearchTerm, tokenizeSearch } from "./shared";

export type SearchKind = "berita" | "artikel" | "kegiatan" | "prestasi" | "ekskul" | "halaman";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  href: string;
  /** ISO date (tanggal terbit / tanggal kegiatan) atau created_at; null bila tak tersedia. */
  date: string | null;
  excerpt: string | null;
  /**
   * Skor kecocokan multi-token (0—1.5): fraksi token yang mengenai judul+
   * cuplikan, plus bonus setengah fraksi token yang mengenai judul sendiri.
   * Sudah terisi oleh `searchAllContent` — ranking grup memakainya.
   */
  score?: number;
  /**
   * Keterangan singkat tambahan per jenis (mis. "Juara 1 · 2025" untuk
   * prestasi). null/absen → tidak ditampilkan.
   */
  meta?: string | null;
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
 * Skor kecocokan murni (tanpa efek samping): fraksi token yang mengenai
 * judul+cuplikan, plus bonus setengah fraksi token yang mengenai judul saja —
 * judul mengandung token dibedakan dari yang hanya menyentuh isi.
 */
export function scoreSearchItem(item: SearchItem, tokens: string[]): number {
  const total = tokens.length || 1;
  const text = `${item.title} ${item.excerpt ?? ""}`.toLowerCase();
  const hits = tokens.filter((token) => text.includes(token)).length;
  const title = item.title.toLowerCase();
  const titleHits = tokens.filter((token) => title.includes(token)).length;
  return hits / total + (0.5 * titleHits) / total;
}

/**
 * Pencocokan halaman statis: istilah (sudah dinormalisasi) dicocokkan sebagai
 * substring dari "judul + kata kunci". Tanpa query DB; istilah yang gagal
 * dinormalisasi → [] tanpa memicu pencapaian halaman. Skor dihitung terhadap
 * teks yang sama sehingga halaman yang cocok lewat alias tetap diberi bobot.
 */
export function searchStaticPages(query: string): SearchItem[] {
  const term = sanitizeSearchTerm(query).toLowerCase();
  if (!term) return [];
  const tokens = tokenizeSearch(query);
  return STATIC_PAGES.filter((p) =>
    `${p.title} ${p.keywords.join(" ")}`.toLowerCase().includes(term)
  ).map((p) => {
    const text = `${p.title} ${p.keywords.join(" ")}`.toLowerCase();
    const hits = tokens.filter((token) => text.includes(token)).length;
    return {
      id: p.href,
      kind: "halaman" as const,
      title: p.title,
      href: p.href,
      date: null,
      excerpt: null,
      score: hits / (tokens.length || 1),
    };
  });
}

/**
 * Pencarian menyeluruh: query multi-token menjangkau halaman statis + berita +
 * artikel + kegiatan + prestasi + ekskul — item masuk bila SALAH SATU tokennya
 * mengenai kolom pencarian (pencocokan halaman tanpa DB + 5 query paralel), Semua jenis memakai filter
 * publik yang sama dengan halaman daftarnya (draft/terjadwal/ekskul nonaktif
 * tidak pernah bocor), dan aman dipanggil dari server maupun client karena
 * memakai client Supabase anon yang sama.
 */
export async function searchAllContent(query: string): Promise<SearchItem[]> {
  // Istilah habis setelah tokenisasi (mis. ", (") → jangan query apa pun.
  const tokens = tokenizeSearch(query);
  if (!tokens.length) return [];

  const [news, articles, activities, achievements, ekskuls] = await Promise.all([
    getNewsList(MAX_PER_KIND, query),
    getArticleList(MAX_PER_KIND, query),
    getActivityList(MAX_PER_KIND, query),
    getAchievementList(query),
    getEkskulList(MAX_PER_KIND, query),
  ]);

  // Ranking: hitung ulang skor hanya utk item DB (halaman statis sudah di skor
  // dengan alias kata kuncinya).
  const withScore = (item: SearchItem): SearchItem => ({
    ...item,
    score: item.score ?? scoreSearchItem(item, tokens),
  });

  return [
    ...searchStaticPages(query),
    ...news.map((n) =>
      withScore({
        id: n.id,
        kind: "berita" as const,
        title: n.title,
        href: `/news/${n.slug}`,
        date: n.published_at || n.created_at,
        excerpt: n.summary || null,
      })
    ),
    ...articles.map((a) =>
      withScore({
        id: a.id,
        kind: "artikel" as const,
        title: a.title,
        href: `/articles/${a.slug}`,
        date: a.published_at || a.created_at,
        excerpt: a.excerpt || null,
      })
    ),
    ...activities.map((a) =>
      withScore({
        id: a.id,
        kind: "kegiatan" as const,
        title: a.title,
        href: `/activities/${a.slug}`,
        date: a.activity_date || a.created_at,
        excerpt: a.description || null,
      })
    ),
    ...achievements.slice(0, MAX_PER_KIND).map((a) =>
      withScore({
        id: a.id,
        kind: "prestasi" as const,
        title: a.title,
        // Prestasi belum punya halaman detail ([slug]) — tautkan ke daftarnya.
        href: "/achievements",
        date: a.created_at,
        excerpt: a.description || null,
        // "Juara 1 · 2025" — hanya bagian yang tersedia.
        meta: [a.rank_label, a.year ? String(a.year) : null].filter(Boolean).join(" · ") || null,
      })
    ),
    ...ekskuls.map((e) =>
      withScore({
        id: e.id,
        kind: "ekskul" as const,
        title: e.name,
        href: `/ekskul/${e.slug}`,
        // Ekskul tak punya tanggal relevan — null agar tampilan menyembunyikannya.
        date: null,
        excerpt: e.description || null,
      })
    ),
  ];
}

/** Kelompokkan hasil per jenis (urutan tetap); kelompok kosong dibuang. Tiap kelompok diurutkan kesesuaian skor desc, termudah tanggal desc. */
export function groupSearchResults(items: SearchItem[]): SearchGroup[] {
  return GROUP_ORDER.map(({ kind, label }) => ({
    kind,
    label,
    items: items
      .filter((item) => item.kind === kind)
      .sort((a, b) => {
        const score = (b.score ?? 0) - (a.score ?? 0);
        if (score) return score;
        return (b.date ?? "").localeCompare(a.date ?? "");
      }),
  })).filter((group) => group.items.length > 0);
}

/** Skor tertinggi dalam sebuah grup (0 bila kosong). */
function groupTopScore(group: SearchGroup): number {
  return group.items.reduce((max, item) => Math.max(max, item.score ?? 0), 0);
}

/**
 * Urutkan grup menurut RELEVANSI (skor tertinggi anggotanya, desc) alih-alih
 * urutan tetap — dipakai halaman /search saat tab "Semua" aktif.
 *
 * Grup "halaman" diperlakukan khusus: ia navigasional, jadi tetap di atas
 * HANYA bila skornya setara grup terbaik (≥ skor tertinggi grup lain);
 * bila kurang relevan, ia ikut turun seperti grup lain.
 * Urutan asli dipertahankan sebagai pemecah seri → hasil stabil.
 */
export function sortGroupsByRelevance(groups: SearchGroup[]): SearchGroup[] {
  const indexed = groups.map((group, index) => ({ group, index }));
  const best = Math.max(0, ...groups.map(groupTopScore));
  return indexed
    .sort((a, b) => {
      const aIsPage = a.group.kind === "halaman" && groupTopScore(a.group) >= best;
      const bIsPage = b.group.kind === "halaman" && groupTopScore(b.group) >= best;
      if (aIsPage !== bIsPage) return aIsPage ? -1 : 1;
      const score = groupTopScore(b.group) - groupTopScore(a.group);
      if (score) return score;
      return a.index - b.index;
    })
    .map(({ group }) => group);
}
