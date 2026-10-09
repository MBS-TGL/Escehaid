import { supabase } from "../supabase";
import type { News } from "../supabase";
import { cleanupNewsAttachments, cleanupNewsImageFolder } from "./news-media";
import { deleteStorageFileByUrl, generateUniqueNewsSlug, slugify } from "./shared";

export interface NewsWithAuthor extends News {
  author_name?: string | null;
}

/** Baris `news` hasil select: join profil penulis (bila kolom author_name tak ada). */
type NewsRow = News & {
  author_name?: string | null;
  user_profiles?: { full_name: string | null } | null;
};

const NEWS_LIST_COLUMNS =
  "id, title, slug, summary, cover_image_position, image_url, category, is_published, published_at, created_at, user_profiles(full_name)";

/** Kolom Tahap 1 (image_alt/is_pinned/expires_at) — belum tentu ada di DB. */
const NEWS_NEW_COLUMNS = "image_alt, is_pinned, expires_at";

let newsNewColsPromise: Promise<boolean> | null = null;
/**
 * Probe sekali per proses: apakah kolom Tahap 1 sudah ada di tabel news?
 * false → query publik/form memakai jalur lama tanpa kolom itu (aman sebelum SQL dijalankan).
 */
export function newsHasScheduledColumns(): Promise<boolean> {
  if (!newsNewColsPromise) {
    newsNewColsPromise = Promise.resolve(
      supabase.from("news").select(NEWS_NEW_COLUMNS).limit(0)
    ).then(
      ({ error }) => !error || !/does not exist|42703/.test(error.message || ""),
      () => false
    );
  }
  return newsNewColsPromise;
}

/** "Sekarang" dalam ISO UTC presisi detik — aman untuk disisipkan ke sintaks .or(). */
export function newsNowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Metode builder Supabase yang benar-benar dipakai helper filter publik.
 * Ditulis sebagai deklarasi method (bukan properti panah) agar parameter
 * bersifat bivariant — builder asli lolos batasan ini.
 */
export type FilterMethods<T> = {
  eq(column: string, value: unknown): T;
  or(filters: string): T;
};

/**
 * Filter publik berita — sama persis dengan policy SELECT Tahap 1:
 * is_published = true AND (published_at IS NULL OR published_at <= now())
 * AND (expires_at IS NULL OR expires_at > now()).
 * `withExpires` false bila kolom expires_at belum ada (SQL tahap 1 belum jalan).
 */
function applyPublicNewsFilters<T extends FilterMethods<T>>(query: T, withExpires: boolean): T {
  const nowIso = newsNowIso();
  let q: T = query
    .eq("is_published", true)
    .or(`published_at.is.null,published_at.lte.${nowIso}`);
  if (withExpires) {
    q = q.or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  }
  return q;
}

async function queryNewsPage(
  columns: string,
  page: number,
  pageSize: number,
  search?: string,
  newCols = false,
  category?: string
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("news")
    .select(columns, { count: "exact" });

  query = applyPublicNewsFilters(query, newCols);

  // Disematkan dulu, lalu terbaru (kolom is_pinned hanya bila sudah ada)
  if (newCols) {
    query = query.order("is_pinned", { ascending: false });
  }
  query = query.order("published_at", { ascending: false, nullsFirst: false });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }

  // select dengan string runtime + join tidak bisa di-infer Supabase
  // (hasilnya ParserError, bukan baris) → cast manual seperti ArticleRow.
  return (await query.range(from, to)) as unknown as {
    data: NewsRow[] | null;
    error: { message?: string } | null;
    count: number | null;
  };
}

export async function getNewsListPaginated(
  page: number = 1,
  pageSize: number = 9,
  search?: string,
  category?: string
): Promise<{ items: NewsWithAuthor[]; total: number; totalPages: number }> {
  const newCols = await newsHasScheduledColumns();
  const base = `${NEWS_LIST_COLUMNS}${newCols ? `, ${NEWS_NEW_COLUMNS}` : ""}`;
  let { data, error, count } = await queryNewsPage(
    `${base}, attachment_url`,
    page,
    pageSize,
    search,
    newCols,
    category
  );

  // Kolom attachment_url belum ada (migration 005 belum dijalankan)
  // → jangan sampai halaman berita jadi kosong, ulangi tanpa kolom itu.
  if (error && /attachment_url/.test(error.message || "")) {
    ({ data, error, count } = await queryNewsPage(base, page, pageSize, search, newCols, category));
  }

  if (error) {
    console.error("Error fetching news:", error);
    return { items: [], total: 0, totalPages: 0 };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items: (data || []).map((item: NewsRow) => ({
      ...item,
      author_name: item.user_profiles?.full_name ?? null,
    })),
    total,
    totalPages,
  };
}

export async function getNewsList(limit?: number, search?: string): Promise<NewsWithAuthor[]> {
  const newCols = await newsHasScheduledColumns();
  let query = supabase
    .from("news")
    .select(
      `id, title, slug, summary, image_url, category, published_at, created_at${
        newCols ? `, ${NEWS_NEW_COLUMNS}` : ""
      }, user_profiles(full_name)`
    );

  query = applyPublicNewsFilters(query, newCols);
  if (newCols) {
    query = query.order("is_pinned", { ascending: false });
  }
  query = query.order("published_at", { ascending: false, nullsFirst: false });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (limit) {
    query = query.limit(limit);
  }

  // select dengan string runtime + join tidak bisa di-infer Supabase → cast manual.
  const { data, error } = (await query) as unknown as {
    data: NewsRow[] | null;
    error: { message?: string } | null;
  };

  if (error) {
    console.error("Error fetching news:", error);
    return [];
  }
  return (data || []).map((item: NewsRow) => ({
    ...item,
    author_name: item.user_profiles?.full_name ?? null,
  }));
}

export async function getNewsListAll(): Promise<NewsWithAuthor[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*, user_profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all news:", error);
    return [];
  }
  return (data || []).map((item: NewsRow) => ({
    ...item,
    author_name: item.user_profiles?.full_name ?? null,
  }));
}

export async function getNewsBySlug(slug: string): Promise<NewsWithAuthor | null> {
  const newCols = await newsHasScheduledColumns();
  let query = supabase
    .from("news")
    .select("*, user_profiles(full_name)")
    .eq("slug", slug);

  // Publik: draft/terjadwal/kedaluwarsa tidak boleh tampil (404)
  query = applyPublicNewsFilters(query, newCols);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Error fetching news by slug:", error);
    return null;
  }
  if (!data) return null;
  return {
    ...data,
    author_name: data.user_profiles?.full_name ?? null,
  };
}

export async function getRelatedNews(category: string, currentId: string, limit = 4): Promise<NewsWithAuthor[]> {
  const newCols = await newsHasScheduledColumns();
  let query = supabase
    .from("news")
    .select("*, user_profiles(full_name)")
    .eq("category", category)
    .neq("id", currentId);

  query = applyPublicNewsFilters(query, newCols);
  if (newCols) {
    query = query.order("is_pinned", { ascending: false });
  }
  query = query.order("published_at", { ascending: false, nullsFirst: false }).limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching related news:", error);
    return [];
  }
  return (data || []).map((item: NewsRow) => ({
    ...item,
    author_name: item.user_profiles?.full_name ?? null,
  }));
}

/**
 * Sitemap: hanya berita yang tampil (filter publik yang sama) — draft &
 * terjadwal tidak boleh bocor ke sitemap. Ringkas: slug + tanggal saja.
 */
export async function getNewsListForSitemap(): Promise<
  Pick<News, "id" | "slug" | "published_at" | "updated_at">[]
> {
  const newCols = await newsHasScheduledColumns();
  let query = supabase.from("news").select("id, slug, published_at, updated_at");
  query = applyPublicNewsFilters(query, newCols);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching news for sitemap:", error);
    return [];
  }
  return (data || []) as Pick<News, "id" | "slug" | "published_at" | "updated_at">[];
}

export async function createNews(news: {
  title: string;
  slug?: string;
  summary?: string;
  content?: string;
  category?: string;
  image_url?: string | null;
  cover_image_position?: string;
  writer_name?: string;
  editor_name?: string;
  image_alt?: string;
  is_pinned?: boolean;
  expires_at?: string | null;
  published_at?: string | null;
  is_published?: boolean;
  attachment_url?: string;
  attachment_name?: string;
}): Promise<{ data: News | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  const newCols = await newsHasScheduledColumns();
  // Slug unik: dari slug form bila diisi, selain itu dari judul
  const baseSlug = news.slug ? slugify(news.slug) : slugify(news.title);
  const slug = await generateUniqueNewsSlug(baseSlug || "berita");
  const payload: Record<string, unknown> = {
    title: news.title,
    slug,
    summary: news.summary,
    content: news.content,
    category: news.category,
    image_url: news.image_url,
    is_published: news.is_published,
    author_id: user?.id,
    // Kosong → null (belum pernah terbit); terbit tanpa tanggal → now
    published_at: news.published_at || (news.is_published ? new Date().toISOString() : null),
  };
  if (news.cover_image_position) payload.cover_image_position = news.cover_image_position;
  if (news.writer_name) payload.writer_name = news.writer_name;
  if (news.editor_name) payload.editor_name = news.editor_name;
  if (newCols) {
    payload.image_alt = news.image_alt || null;
    payload.is_pinned = !!news.is_pinned;
    payload.expires_at = news.expires_at || null;
  }
  if (news.attachment_url) {
    payload.attachment_url = news.attachment_url;
    payload.attachment_name = news.attachment_name || "";
  }
  let { data, error } = await supabase
    .from("news")
    .insert(payload)
    .select()
    .single();

  // Kolom opsional belum ada di DB → ulangi tanpa kolom itu
  // (attachment: migration 005; image_alt/is_pinned/expires_at: SQL tahap 1)
  if (error && /(attachment_url|image_alt|is_pinned|expires_at)/.test(error.message || "")) {
    const msg = error.message || "";
    (["attachment_url", "attachment_name", "image_alt", "is_pinned", "expires_at"] as const).forEach((k) => {
      if (msg.includes(k)) delete payload[k];
    });
    ({ data, error } = await supabase.from("news").insert(payload).select().single());
  }

  if (error) {
    console.error("Error creating news:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function updateNews(
  id: string,
  news: {
    title?: string;
    slug?: string;
    summary?: string;
    content?: string;
    category?: string;
    image_url?: string | null;
    cover_image_position?: string;
    writer_name?: string;
    editor_name?: string;
    image_alt?: string;
    is_pinned?: boolean;
    expires_at?: string | null;
    published_at?: string | null;
    is_published?: boolean;
    attachment_url?: string;
    attachment_name?: string;
  }
): Promise<{ data: News | null; error?: string }> {
  const newCols = await newsHasScheduledColumns();
  const payload: Record<string, unknown> = {};
  if (news.title !== undefined) payload.title = news.title;
  // Slug hanya disentuh bila dikirim; lewat generator agar tetap unik (kecuali milik sendiri)
  if (news.slug !== undefined && news.slug) {
    payload.slug = await generateUniqueNewsSlug(slugify(news.slug), id);
  }
  if (news.summary !== undefined) payload.summary = news.summary;
  if (news.content !== undefined) payload.content = news.content;
  if (news.category !== undefined) payload.category = news.category;
  if (news.image_url !== undefined) payload.image_url = news.image_url || null;
  if (news.is_published !== undefined) payload.is_published = news.is_published;
  if (news.cover_image_position) payload.cover_image_position = news.cover_image_position;
  if (news.writer_name) payload.writer_name = news.writer_name;
  if (news.editor_name) payload.editor_name = news.editor_name;
  if ("published_at" in news) payload.published_at = news.published_at || null;
  if (newCols) {
    if (news.image_alt !== undefined) payload.image_alt = news.image_alt || null;
    if (news.is_pinned !== undefined) payload.is_pinned = !!news.is_pinned;
    if (news.expires_at !== undefined) payload.expires_at = news.expires_at || null;
  }
  if (news.attachment_url !== undefined) {
    payload.attachment_url = news.attachment_url;
    payload.attachment_name = news.attachment_name || "";
  }
  let { data, error } = await supabase
    .from("news")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  // Kolom opsional belum ada di DB → ulangi tanpa kolom itu
  if (error && /(attachment_url|image_alt|is_pinned|expires_at)/.test(error.message || "")) {
    const msg = error.message || "";
    (["attachment_url", "attachment_name", "image_alt", "is_pinned", "expires_at"] as const).forEach((k) => {
      if (msg.includes(k)) delete payload[k];
    });
    ({ data, error } = await supabase.from("news").update(payload).eq("id", id).select().single());
  }

  if (error) {
    console.error("Error updating news:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function deleteNews(id: string): Promise<{ error?: string }> {
  // Ambil URL lampiran sebelum row dihapus
  const { data: row } = await supabase
    .from("news")
    .select("attachment_url")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) {
    console.error("Error deleting news:", error);
    return { error: error.message };
  }
  // Hapus seluruh folder gambar berita ini
  cleanupNewsImageFolder(id).catch(() => {});
  // Hapus lampiran via URL (bisa ada di folder berbeda)
  if (row?.attachment_url) deleteStorageFileByUrl(row.attachment_url).catch(() => {});
  cleanupNewsAttachments(id).catch(() => {});
  return {};
}

export async function deleteNewsBulk(ids: string[]): Promise<{ error?: string }> {
  // Ambil URL lampiran semua row sebelum dihapus
  const { data: rows } = await supabase
    .from("news")
    .select("id, attachment_url")
    .in("id", ids);

  const { error } = await supabase.from("news").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting news:", error);
    return { error: error.message };
  }
  // Hapus folder gambar tiap berita + lampiran
  ids.forEach((id) => cleanupNewsImageFolder(id).catch(() => {}));
  (rows || []).forEach((row: { id: string; attachment_url: string | null }) => {
    if (row.attachment_url) deleteStorageFileByUrl(row.attachment_url).catch(() => {});
  });
  ids.forEach((id) => cleanupNewsAttachments(id).catch(() => {}));
  return {};
}

export async function togglePublishNews(
  id: string,
  is_published: boolean
): Promise<{ error?: string }> {
  const update: Record<string, unknown> = { is_published };
  if (is_published) update.published_at = new Date().toISOString();

  const { error } = await supabase.from("news").update(update).eq("id", id);
  if (error) {
    console.error("Error toggling publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function togglePublishNewsBulk(
  ids: string[],
  is_published: boolean
): Promise<{ error?: string }> {
  const update: Record<string, unknown> = { is_published };
  if (is_published) update.published_at = new Date().toISOString();

  const { error } = await supabase.from("news").update(update).in("id", ids);
  if (error) {
    console.error("Error bulk toggling publish:", error);
    return { error: error.message };
  }
  return {};
}
