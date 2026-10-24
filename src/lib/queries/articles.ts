import { supabase } from "../supabase";
import type { Article } from "../supabase";
import { tryCompressImage } from "../compress-image";
import { FilterMethods, newsNowIso } from "./news";
import { buildSearchOr, cleanupOldFiles, deleteStorageFileByUrl, generateUniqueArticleSlug, slugify, tableHasColumn, tokenizeSearch } from "./shared";
import { uploadFileViaRoute } from "../storage-remote";

export interface ArticleWithAuthor extends Article {
  author_name?: string | null;
}

/** Baris `articles` hasil select: kolom author_name (bila ada) + join profil. */
export type ArticleRow = Article & {
  author_name?: string | null;
  user_profiles?: { full_name: string | null } | null;
};

const ARTICLE_LIST_COLUMNS =
  "id, title, slug, excerpt, image_url, category, is_published, published_at, created_at, user_profiles(full_name)";

/** Kolom Tahap 1 (image_alt/is_pinned/expires_at) — belum tentu ada di DB. */
const ARTICLE_NEW_COLUMNS = "image_alt, is_pinned, expires_at";

let articleNewColsPromise: Promise<boolean> | null = null;
/**
 * Probe sekali per proses: apakah kolom Tahap 1 sudah ada di tabel articles?
 * false → query publik/form memakai jalur lama tanpa kolom itu (aman sebelum SQL dijalankan).
 */
export function articlesHasScheduledColumns(): Promise<boolean> {
  if (!articleNewColsPromise) {
    articleNewColsPromise = Promise.resolve(
      supabase.from("articles").select(ARTICLE_NEW_COLUMNS).limit(0)
    ).then(
      ({ error }) => !error || !/does not exist|42703/.test(error.message || ""),
      () => false
    );
  }
  return articleNewColsPromise;
}

let articleSourceColPromise: Promise<boolean> | null = null;
/**
 * Probe sekali per proses: apakah kolom `source` sudah ada di tabel articles
 * (migrasi supabase/content_source.sql — penanda "panel-ai")? false → payload
 * insert disusun tanpa `source` agar createArticle tetap aman sebelum migrasi.
 */
export function articlesHasSourceColumn(): Promise<boolean> {
  if (!articleSourceColPromise) {
    articleSourceColPromise = Promise.resolve(
      supabase.from("articles").select("source").limit(0)
    ).then(
      ({ error }) => !error || !/does not exist|42703/.test(error.message || ""),
      () => false
    );
  }
  return articleSourceColPromise;
}

/** Probe kolom `video_url` (migrasi supabase/content_video.sql) — memoized. */
export function articlesHasVideoColumn(): Promise<boolean> {
  return tableHasColumn("articles", "video_url");
}

/**
 * Filter publik artikel — sama persis dengan policy SELECT Tahap 1 news:
 * is_published = true AND (published_at IS NULL OR published_at <= now())
 * AND (expires_at IS NULL OR expires_at > now()).
 * `withExpires` false bila kolom expires_at belum ada (SQL tahap 1 belum jalan).
 */
function applyPublicArticleFilters<T extends FilterMethods<T>>(query: T, withExpires: boolean): T {
  const nowIso = newsNowIso();
  let q: T = query
    .eq("is_published", true)
    .or(`published_at.is.null,published_at.lte.${nowIso}`);
  if (withExpires) {
    q = q.or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  }
  return q;
}

/**
 * Daftar artikel publik. `search` (opsional) menyaring judul, cuplikan, ATAU
 * isi — dipakai pencarian menyeluruh di /search; istilah dinormalisasi agar
 * aman untuk sintaks `.or()`.
 */
export async function getArticleList(limit?: number, search?: string): Promise<ArticleWithAuthor[]> {
  const [newCols, hasVideo] = await Promise.all([
    articlesHasScheduledColumns(),
    articlesHasVideoColumn(),
  ]);
  const orFilter = buildSearchOr(tokenizeSearch(search ?? ""), ["title", "excerpt", "content"]);
  const listColumns = `${ARTICLE_LIST_COLUMNS}${hasVideo ? ", video_url" : ""}`;
  const run = async (columns: string) => {
    let query = supabase
      .from("articles")
      .select(columns);
    query = applyPublicArticleFilters(query, newCols);
    if (orFilter) query = query.or(orFilter);
    // Disematkan dulu, lalu terbaru (kolom is_pinned hanya bila sudah ada)
    if (newCols) query = query.order("is_pinned", { ascending: false });
    query = query.order("published_at", { ascending: false, nullsFirst: false });
    if (limit) query = query.limit(limit);
    // select dengan string runtime tidak bisa di-infer Supabase → cast manual
    return (await query) as unknown as {
      data: ArticleRow[] | null;
      error: { message?: string } | null;
    };
  };

  // Coba dengan author_name dulu; bila kolom belum ada (42703), ulang tanpa itu.
  let { data, error } = await run(`${listColumns}, author_name`);
  if (error && /author_name/.test(error.message || "")) {
    ({ data, error } = await run(listColumns));
  }

  if (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
  return (data || []).map((item: ArticleRow) => ({
    ...item,
    author_name: item.author_name ?? item.user_profiles?.full_name ?? null,
  }));
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithAuthor | null> {
  const newCols = await articlesHasScheduledColumns();
  let query = supabase
    .from("articles")
    .select("*, user_profiles(full_name)")
    .eq("slug", slug);

  // Publik: draft/terjadwal/kedaluwarsa tidak boleh tampil (404)
  query = applyPublicArticleFilters(query, newCols);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Error fetching article by slug:", error);
    return null;
  }
  if (!data) return null;
  // Kolom author_name (bila ada) menang; artikel lama fallback ke nama profil.
  return {
    ...data,
    author_name: data.author_name ?? data.user_profiles?.full_name ?? null,
  };
}

/** Bagian dari `run` di getArticleListPaginated — dipisah agar retry bersih. */
async function queryArticlePage(
  columns: string,
  withAuthorName: boolean,
  page: number,
  pageSize: number,
  search?: string,
  withExpires?: boolean,
  category?: string
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const orFilter = buildSearchOr(tokenizeSearch(search ?? ""), ["title", "excerpt", "content"]);

  let query = supabase
    .from("articles")
    .select(`${columns}${withAuthorName ? ", author_name" : ""}`, { count: "exact" });

  query = applyPublicArticleFilters(query, withExpires ?? false);

  // Disematkan dulu, lalu terbaru (kolom is_pinned hanya bila sudah ada)
  if (withExpires) {
    query = query.order("is_pinned", { ascending: false });
  }
  query = query.order("published_at", { ascending: false, nullsFirst: false });

  if (orFilter) {
    query = query.or(orFilter);
  }
  if (category) {
    query = query.eq("category", category);
  }

  // select dengan string runtime + join tidak bisa di-infer Supabase
  // (hasilnya ParserError, bukan baris) → cast manual seperti ArticleRow.
  return (await query.range(from, to)) as unknown as {
    data: ArticleRow[] | null;
    error: { message?: string } | null;
    count: number | null;
  };
}

/**
 * Daftar artikel publik per halaman — pola yang sama dengan getNewsListPaginated.
 * `search` menyaring judul ATAU cuplikan; `category` = kategori bebas (artikel
 * tidak punya enum). Kolom author_name bila belum ada → retry tanpa itu.
 */
export async function getArticleListPaginated(
  page: number = 1,
  pageSize: number = 9,
  search?: string,
  category?: string
): Promise<{ items: ArticleWithAuthor[]; total: number; totalPages: number }> {
  const [newCols, hasVideo] = await Promise.all([
    articlesHasScheduledColumns(),
    articlesHasVideoColumn(),
  ]);
  const base = `${ARTICLE_LIST_COLUMNS}${newCols ? `, ${ARTICLE_NEW_COLUMNS}` : ""}${hasVideo ? ", video_url" : ""}`;
  let { data, error, count } = await queryArticlePage(
    base,
    true,
    page,
    pageSize,
    search,
    newCols,
    category
  );

  // Kolom author_name belum ada (ALTER belum dijalankan)
  // → jangan sampai halaman artikel jadi kosong, ulang tanpa kolom itu.
  if (error && /author_name/.test(error.message || "")) {
    ({ data, error, count } = await queryArticlePage(base, false, page, pageSize, search, newCols, category));
  }

  if (error) {
    console.error("Error fetching articles:", JSON.stringify(error, ["message", "details", "hint", "code"]));
    return { items: [], total: 0, totalPages: 0 };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items: (data || []).map((item: ArticleRow) => ({
      ...item,
      author_name: item.author_name ?? item.user_profiles?.full_name ?? null,
    })),
    total,
    totalPages,
  };
}

/**
 * Artikel terkait: kategori sama, bukan artikel ini, terbaru dulu.
 * Kategori artikel bebas (bukan enum) → cukup eq kategori persis.
 */
export async function getRelatedArticles(category: string, currentId: string, limit = 4): Promise<ArticleWithAuthor[]> {
  const newCols = await articlesHasScheduledColumns();
  const hasVideo = await articlesHasVideoColumn();
  const listColumns = `${ARTICLE_LIST_COLUMNS}${newCols ? `, ${ARTICLE_NEW_COLUMNS}` : ""}${hasVideo ? ", video_url" : ""}`;
  let query = supabase
    .from("articles")
    .select(`${listColumns}, author_name`)
    .eq("category", category)
    .neq("id", currentId);

  query = applyPublicArticleFilters(query, newCols);
  if (newCols) {
    query = query.order("is_pinned", { ascending: false });
  }
  query = query.order("published_at", { ascending: false, nullsFirst: false }).limit(limit);

  const { data, error } = (await query) as unknown as {
    data: ArticleRow[] | null;
    error: { message?: string } | null;
  };

  if (error && /author_name/.test(error.message || "")) {
    const retry = supabase
      .from("articles")
      .select(`${listColumns}, user_profiles(full_name)`)
      .eq("category", category)
      .neq("id", currentId);
    let rq = applyPublicArticleFilters(retry, newCols);
    if (newCols) rq = rq.order("is_pinned", { ascending: false });
    rq = rq.order("published_at", { ascending: false, nullsFirst: false }).limit(limit);
    const retried = (await rq) as unknown as {
      data: ArticleRow[] | null;
      error: { message?: string } | null;
    };
    return (retried.data || []).map((item: ArticleRow) => ({
      ...item,
      author_name: item.user_profiles?.full_name ?? null,
    }));
  }

  if (error) {
    console.error("Error fetching related articles:", error);
    return [];
  }
  return (data || []).map((item: ArticleRow) => ({
    ...item,
    author_name: item.author_name ?? item.user_profiles?.full_name ?? null,
  }));
}

/**
 * Daftar kategori unik artikel publik — kategori artikel bebas (bukan enum),
 * jadi chips filter tidak bisa hardcode. Select lean kolom category saja.
 */
export async function getArticleCategories(): Promise<string[]> {
  const newCols = await articlesHasScheduledColumns();
  let query = supabase.from("articles").select("category");
  query = applyPublicArticleFilters(query, newCols);
  query = query.order("published_at", { ascending: false, nullsFirst: false });

  // select dengan string runtime + filter tak ter-infer → cast manual.
  const { data, error } = (await query) as unknown as {
    data: { category: string }[] | null;
    error: { message?: string } | null;
  };
  if (error) {
    console.error("Error fetching article categories:", error);
    return [];
  }
  // Dedupe dengan urutan kemunculan pertama (artikel terbaru dulu).
  const seen = new Set<string>();
  for (const row of data || []) {
    const cat = (row.category || "").trim();
    if (cat) seen.add(cat);
  }
  return [...seen];
}

/**
 * Sitemap: hanya artikel yang tampil (filter publik yang sama) — draft &
 * terjadwal tidak boleh bocor ke sitemap. Ringkas: slug + tanggal saja.
 */
export async function getArticleListForSitemap(): Promise<
  Pick<Article, "id" | "slug" | "published_at" | "updated_at">[]
> {
  const newCols = await articlesHasScheduledColumns();
  let query = supabase.from("articles").select("id, slug, published_at, updated_at");
  query = applyPublicArticleFilters(query, newCols);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching articles for sitemap:", error);
    return [];
  }
  return (data || []) as Pick<Article, "id" | "slug" | "published_at" | "updated_at">[];
}

// ============ ARTICLES CRUD ============
export async function getArticleListAll(): Promise<ArticleWithAuthor[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*, user_profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all articles:", error);
    // Melempar error agar panel admin bisa membedakan "kosong" vs "gagal
    // memuat" — pemanggil (panel artikel) menangkap dan menampilkan retry.
    throw new Error(error.message);
  }
  return (data || []).map((item: ArticleRow) => ({
    ...item,
    author_name: item.author_name ?? item.user_profiles?.full_name ?? null,
  }));
}

/**
 * Deteksi kolom author_name/editor_name di tabel articles (hasil SQL ALTER
 * yang belum/belum dijalankan). Field form hanya ditampilkan bila kolomnya ada
 * supaya payload insert/update tidak pernah menyertakan kolom tak dikenal.
 */
export async function getArticleColumnSupport(): Promise<{
  author_name: boolean;
  editor_name: boolean;
}> {
  const exists = async (column: string) => {
    const { error } = await supabase.from("articles").select(column).limit(1);
    if (!error) return true;
    // 42703 / "does not exist" = kolom belum dibuat; error lain dianggap ada
    // supaya field tetap tampil dan error sesungguhnya muncul saat simpan.
    return !(error.code === "42703" || /does not exist/.test(error.message || ""));
  };
  const [author_name, editor_name] = await Promise.all([
    exists("author_name"),
    exists("editor_name"),
  ]);
  return { author_name, editor_name };
}

/**
 * Normalisasi teks menjadi slug URL: huruf kecil, tanpa aksen (NFD),
 * non-alfanumerik jadi "-", rapikan "-" di awal/akhir, maksimal 70 karakter.
 * Dipakai oleh createArticle/updateArticle dan form admin artikel.
 */

export async function createArticle(article: {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  image_url?: string;
  is_published?: boolean;
  author_name?: string;
  editor_name?: string;
  image_alt?: string;
  is_pinned?: boolean;
  expires_at?: string | null;
  published_at?: string;
  /** Penanda asal artikel, mis. "panel-ai" (butuh kolom source — content_source.sql). */
  source?: string;
  /** Tautan video eksternal (opsional; probe video_url — content_video.sql). */
  video_url?: string | null;
}): Promise<{ data: Article | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  const newCols = await articlesHasScheduledColumns();
  // Penanda sumber hanya dikirim bila kolomnya sudah ada (migrasi belum jalan → lewati diam-diam).
  const hasSourceCol = article.source ? await articlesHasSourceColumn() : false;
  // Tautan video hanya dikirim bila kolomnya sudah ada (probe, sama seperti source).
  const hasVideoCol = article.video_url ? await articlesHasVideoColumn() : false;
  // Slug unik: dari slug form bila diisi, selain itu dari judul
  const baseSlug = article.slug ? slugify(article.slug) : slugify(article.title);
  const slug = await generateUniqueArticleSlug(baseSlug || "artikel");
  const payload: Record<string, unknown> = { ...article, slug, author_id: user?.id };
  // Isi published_at saat pertama terbit; tanggal eksplisit dari form menang.
  if (payload.is_published && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }
  // Kolom Tahap 1 hanya dikirim bila sudah ada di DB (probe)
  if (!newCols) {
    delete payload.image_alt;
    delete payload.is_pinned;
    delete payload.expires_at;
  }
  delete payload.source;
  if (hasSourceCol) payload.source = article.source;
  delete payload.video_url;
  if (hasVideoCol) payload.video_url = article.video_url;
  const { data, error } = await supabase
    .from("articles")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error creating article:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function updateArticle(
  id: string,
  article: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    category?: string;
    image_url?: string;
    is_published?: boolean;
    published_at?: string;
    author_name?: string;
    editor_name?: string;
    image_alt?: string;
    is_pinned?: boolean;
    expires_at?: string | null;
    /** Tautan video eksternal (opsional; probe video_url — content_video.sql). */
    video_url?: string | null;
  }
): Promise<{ data: Article | null; error?: string }> {
  const [newCols, hasVideoCol] = await Promise.all([
    articlesHasScheduledColumns(),
    articlesHasVideoColumn(),
  ]);
  // Baris lama: URL gambar (untuk bersihkan file) + published_at (untuk
  // tahu apakah ini pertama kali terbit — jangan menimpa tanggal lama).
  let oldImageUrl: string | null = null;
  let currentPublishedAt: string | null = null;
  if (typeof article.image_url === "string" || article.is_published !== undefined) {
    const { data: current } = await supabase
      .from("articles")
      .select("image_url, published_at")
      .eq("id", id)
      .single();
    oldImageUrl = current?.image_url || null;
    currentPublishedAt = current?.published_at || null;
  }
  // Slug TIDAK di-regenerate dari judul: hanya berubah bila form mengirim
  // slug eksplisit (dan tetap dicek keunikannya).
  if (typeof article.slug === "string") {
    const base = slugify(article.slug) || slugify(article.title || "") || "artikel";
    article.slug = await generateUniqueArticleSlug(base, id);
  }
  // Isi published_at hanya saat pertama kali menjadi terbit, dan tidak
  // menimpa tanggal eksplisit yang dikirim form (Tanggal Publish).
  if (article.is_published === true && !currentPublishedAt && !article.published_at) {
    article.published_at = new Date().toISOString();
  }
  // Kolom Tahap 1 hanya dikirim bila sudah ada di DB (probe)
  if (!newCols) {
    delete article.image_alt;
    delete article.is_pinned;
    delete article.expires_at;
  }
  if (!hasVideoCol) delete article.video_url;
  let { data, error } = await supabase
    .from("articles")
    .update(article)
    .eq("id", id)
    .select()
    .single();

  // Kolom opsional belum ada di DB → ulangi tanpa kolom itu
  if (error && /(image_alt|is_pinned|expires_at|video_url)/.test(error.message || "")) {
    const msg = error.message || "";
    (["image_alt", "is_pinned", "expires_at", "video_url"] as const).forEach((k) => {
      if (msg.includes(k)) delete article[k];
    });
    ({ data, error } = await supabase.from("articles").update(article).eq("id", id).select().single());
  }

  if (error) {
    console.error("Error updating article:", error);
    return { data: null, error: error.message };
  }
  // Bersihkan file lama hanya bila URL benar-benar berubah (best-effort)
  if (oldImageUrl && oldImageUrl !== article.image_url) {
    deleteStorageFileByUrl(oldImageUrl).catch(() => {});
  }
  return { data };
}

export async function deleteArticle(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("articles").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) {
    console.error("Error deleting article:", error);
    return { error: error.message };
  }
  if (row?.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  return {};
}

export async function deleteArticleBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("articles").select("image_url").in("id", ids);
  const { error } = await supabase.from("articles").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting articles:", error);
    return { error: error.message };
  }
  for (const row of rows || []) {
    if (row.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  }
  return {};
}

export async function togglePublishArticle(
  id: string,
  is_published: boolean
): Promise<{ error?: string }> {
  const update: Record<string, unknown> = { is_published };
  if (is_published) {
    const { data: current } = await supabase
      .from("articles")
      .select("published_at")
      .eq("id", id)
      .single();
    // Terbit tanpa tanggal → stempel sekarang; jadwal masa depan yang masih
    // menempel (artikel terjadwal diklik jadi draft lalu diterbitkan lagi)
    // di-reset ke sekarang supaya benar-benar tayang.
    if (!current?.published_at || new Date(current.published_at).getTime() > Date.now()) {
      update.published_at = new Date().toISOString();
    }
  }
  const { error } = await supabase.from("articles").update(update).eq("id", id);
  if (error) {
    console.error("Error toggling article publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function togglePublishArticleBulk(
  ids: string[],
  is_published: boolean
): Promise<{ error?: string }> {
  // Publish massal: isi published_at untuk baris yang belum punya, dan
  // reset jadwal masa depan supaya benar-benar tayang (sama dengan toggle satuan).
  if (is_published) {
    const nowIso = new Date().toISOString();
    const { data: rows } = await supabase
      .from("articles")
      .select("id, published_at")
      .in("id", ids);
    const needsStamp = (rows || [])
      .filter((r) => !r.published_at || new Date(r.published_at).getTime() > Date.now())
      .map((r) => r.id);

    const { error } = await supabase
      .from("articles")
      .update({ is_published })
      .in("id", ids);
    if (error) {
      console.error("Error bulk toggling article publish:", error);
      return { error: error.message };
    }
    if (needsStamp.length > 0) {
      const { error: stampError } = await supabase
        .from("articles")
        .update({ published_at: nowIso })
        .in("id", needsStamp);
      if (stampError) {
        console.error("Error stamping published_at:", stampError);
        return { error: stampError.message };
      }
    }
    return {};
  }
  const { error } = await supabase
    .from("articles")
    .update({ is_published })
    .in("id", ids);
  if (error) {
    console.error("Error bulk toggling article publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function uploadArticleImage(
  file: File,
  articleId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };
  const path = `articles/${articleId}.jpg`;

  await cleanupOldFiles("articles", articleId);

  const uploaded = await uploadFileViaRoute("images", path, compressed, {
    upsert: true,
    cacheControl: "31536000",
    contentType: "image/jpeg",
  });
  if (uploaded.error) {
    console.error("Error uploading article image:", uploaded.error);
    return { url: null, error: uploaded.error };
  }
  return { url: `${uploaded.url}?v=${Date.now()}` };
}

// ============ ACTIVITIES CRUD ============
