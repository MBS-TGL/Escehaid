import { cache } from "react";
import { supabase } from "./supabase";
import type { SchoolProfile, News, Gallery, SpmbRegistration, SpmbWave, SpmbFormField, SpmbFieldType, Teacher, Facility, Article, Activity, Achievement, ContactMessage } from "./supabase";
import type { UserProfile } from "./auth";
import {
  sendRegistrationEmail,
  sendRegistrationAdminEmail,
  sendContactEmail,
  sendContactAdminEmail,
} from "./notifications";
import { tryCompressImage, TEACHER_PHOTO } from "./compress-image";

interface NewsWithAuthor extends News {
  author_name?: string;
}

export interface ArticleWithAuthor extends Article {
  author_name?: string | null;
}

/** Baris `articles` hasil select: kolom author_name (bila ada) + join profil. */
type ArticleRow = Article & {
  author_name?: string | null;
  user_profiles?: { full_name: string | null } | null;
};

async function cleanupOldFiles(folder: string, id: string) {
  const { data } = await supabase.storage.from("images").list(folder);
  if (data) {
    const oldFiles = data
      .filter((f) => f.name.startsWith(id + "."))
      .map((f) => `${folder}/${f.name}`);
    if (oldFiles.length > 0) {
      await supabase.storage.from("images").remove(oldFiles);
    }
  }
}

// ============ SCHOOL PROFILE ============
/**
 * Ambil profil sekolah (satu baris). Dibungkus `cache` dari React agar
 * layout, footer, dan halaman yang dirender pada request yang sama
 * berbagi SATU query. (Pada client build, `cache` hanya pembungkus
 * passthrough — aman dipanggil dari komponen client.)
 */
export const getSchoolProfile = cache(
  async function getSchoolProfile(): Promise<SchoolProfile | null> {
    const { data, error } = await supabase
      .from("school_profile")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  }
);

// ============ NEWS ============
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
function newsNowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Filter publik berita — sama persis dengan policy SELECT Tahap 1:
 * is_published = true AND (published_at IS NULL OR published_at <= now())
 * AND (expires_at IS NULL OR expires_at > now()).
 * `withExpires` false bila kolom expires_at belum ada (SQL tahap 1 belum jalan).
 */
function applyPublicNewsFilters(query: any, withExpires: boolean) {
  const nowIso = newsNowIso();
  let q = query
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

  return query.range(from, to);
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
    items: (data || []).map((item: any) => ({
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

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching news:", error);
    return [];
  }
  return (data || []).map((item: any) => ({
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
  return (data || []).map((item: any) => ({
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
  return (data || []).map((item: any) => ({
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
  const payload: Record<string, any> = {
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
  const payload: Record<string, any> = {};
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
  (rows || []).forEach((row: any) => {
    if (row.attachment_url) deleteStorageFileByUrl(row.attachment_url).catch(() => {});
  });
  ids.forEach((id) => cleanupNewsAttachments(id).catch(() => {}));
  return {};
}

export async function togglePublishNews(
  id: string,
  is_published: boolean
): Promise<{ error?: string }> {
  const update: Record<string, any> = { is_published };
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
  const update: Record<string, any> = { is_published };
  if (is_published) update.published_at = new Date().toISOString();

  const { error } = await supabase.from("news").update(update).in("id", ids);
  if (error) {
    console.error("Error bulk toggling publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function uploadNewsImage(
  file: File,
  newsId: string
): Promise<{ url: string | null; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `news/${newsId}/${Date.now()}-${rand}.${ext}`;

  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: false, cacheControl: "31536000" });

  if (uploadError) {
    console.error("Error uploading image:", uploadError);
    return { url: null, error: `Gagal mengunggah gambar: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  return { url };
}

/**
 * Ekstrak path di dalam bucket dari publicUrl Supabase Storage.
 * Menangani trailing-slash inconsistency pada getPublicUrl("").
 */
function storagePathFromUrl(url: string): string | null {
  // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const match = url.split("?")[0].match(/\/storage\/v1\/object\/public\/images\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Hapus file dari bucket "images" berdasarkan publicUrl.
 * Abaikan URL yang bukan dari bucket ini.
 */
export async function deleteStorageFileByUrl(url: string): Promise<void> {
  try {
    const filePath = storagePathFromUrl(url);
    if (!filePath) return;
    const { data, error } = await supabase.storage.from("images").remove([filePath]);
    if (error) {
      console.warn("[deleteStorageFileByUrl] remove failed:", error.message);
    } else if (!data || data.length === 0) {
      console.warn("[deleteStorageFileByUrl] remove returned empty data for", filePath,
        "— kemungkinan policy DELETE belum dikonfigurasi di bucket 'images'.");
    }
  } catch (e) {
    console.warn("[deleteStorageFileByUrl] error:", e);
  }
}

/**
 * Hapus semua file di folder `news/<newsId>/`, kecuali file yang URL-nya == keepUrl.
 * Dipakai saat: (1) sampul diganti — hapus versi lama, (2) berita dihapus — bersihkan semua.
 */
export async function cleanupNewsImageFolder(
  newsId: string,
  keepUrl?: string | null
): Promise<void> {
  try {
    const prefix = `news/${newsId}`;
    const { data: files, error: listError } = await supabase.storage
      .from("images")
      .list(prefix);

    if (listError) {
      console.warn("[cleanupNewsImageFolder] list failed:", listError.message);
      return;
    }
    if (!files || files.length === 0) return;

    // Nama file yang harus dipertahankan
    const keepName = keepUrl ? storagePathFromUrl(keepUrl)?.split("/").pop() : null;

    const toDelete = files
      .filter((f) => f.name !== keepName)
      .map((f) => `${prefix}/${f.name}`);

    if (toDelete.length === 0) return;

    const { data, error: removeError } = await supabase.storage
      .from("images")
      .remove(toDelete);

    if (removeError) {
      console.warn("[cleanupNewsImageFolder] remove failed:", removeError.message);
    } else if (!data || data.length === 0) {
      console.warn(
        `[cleanupNewsImageFolder] remove returned empty data untuk ${toDelete.length} file di ${prefix}/`,
        "— kemungkinan policy DELETE belum dikonfigurasi di bucket 'images'.",
        "Tambahkan SQL policy berikut di Supabase Dashboard → Storage → Policies:",
        `CREATE POLICY \"Allow authenticated delete\" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images');`
      );
    }
  } catch (e) {
    console.warn("[cleanupNewsImageFolder] error:", e);
  }
}

/**
 * Kirim daftar path ke POST /api/revalidate, lalu catat status HTTP +
 * pesan error dari server bila gagal (untuk debugging admin/developer).
 * `type` opsional ("page" | "layout") diteruskan ke revalidatePath di server.
 */
async function postRevalidate(
  paths: string[],
  logLabel: string,
  type?: "page" | "layout"
): Promise<void> {
  try {
    // Ambil session token untuk otorisasi di server
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(type ? { paths, type } : { paths }),
    });

    if (!res.ok) {
      let message = "";
      try {
        const payload = (await res.json()) as { error?: unknown };
        message = typeof payload?.error === "string" ? payload.error : "";
      } catch {
        // body bukan JSON — abaikan
      }
      console.warn(
        `[${logLabel}] revalidate gagal: HTTP ${res.status}${message ? ` (${message})` : ""} | paths: ${paths.join(", ")}`
      );
    }
  } catch (e) {
    console.warn(
      `[${logLabel}] fetch failed, cache not invalidated:`,
      e instanceof Error ? e.message : e
    );
  }
}

/**
 * Panggil revalidatePath untuk halaman berita via API route /api/revalidate.
 * Aman dipanggil dari client component admin setelah create/update/delete/togglePublish.
 */
export async function revalidateNews(
  slug: string,
  oldSlug?: string
): Promise<void> {
  const paths = Array.from(
    new Set(
      [
        slug ? `/news/${slug}` : null,
        oldSlug && oldSlug !== slug ? `/news/${oldSlug}` : null,
        "/news",
        "/",
      ].filter(Boolean) as string[]
    )
  );
  await postRevalidate(paths, "revalidateNews");
}

/**
 * Invalidasi ISR halaman artikel (/ + /articles + /articles/[slug])
 * via API route /api/revalidate. Dipanggil dari client component admin
 * artikel setelah create/update/delete/togglePublish/bulk/duplicate.
 */
export async function revalidateArticles(
  slug?: string,
  oldSlug?: string
): Promise<void> {
  const paths = Array.from(
    new Set(
      [
        slug ? `/articles/${slug}` : null,
        oldSlug && oldSlug !== slug ? `/articles/${oldSlug}` : null,
        "/articles",
        "/",
      ].filter(Boolean) as string[]
    )
  );
  await postRevalidate(paths, "revalidateArticles");
}

/**
 * Invalidasi ISR untuk halaman yang menampilkan fasilitas (beranda + profil)
 * via API route /api/revalidate. Dipanggil dari client component admin
 * setelah create/update/delete/toggle fasilitas.
 */
export async function revalidateFacilities(): Promise<void> {
  await postRevalidate(["/", "/profile"], "revalidateFacilities");
}

/**
 * Invalidasi ISR halaman prestasi (/achievements + beranda) via API route
 * /api/revalidate. Dipanggil dari client component admin prestasi setelah
 * create/update/delete/bulk/duplikat+simpan.
 */
export async function revalidateAchievements(): Promise<void> {
  await postRevalidate(["/achievements", "/"], "revalidateAchievements");
}

/**
 * Revalidate path publik tertentu (mis. "/admission") via API route /api/revalidate.
 * Dipanggil dari client component admin setelah create/update/delete/toggle gelombang.
 * `type` opsional: "layout" → revalidatePath(path, "layout") di server
 * (me-revalidate layout + semua halaman di bawahnya — dipakai untuk "/",
 * karena footer & banner ada di root layout).
 * Kredensial & whitelist path dicek di server (route /api/revalidate).
 */
export async function revalidatePaths(
  paths: string[],
  type?: "page" | "layout"
): Promise<void> {
  const unique = Array.from(
    new Set(paths.filter((p) => typeof p === "string" && p.startsWith("/")))
  );
  if (unique.length === 0) return;
  await postRevalidate(unique, "revalidatePaths", type);
}

// ============ SUMBER PENDAFTARAN (MODE REGISTRASI) ============
/** URL Google Form penerimaan — sumber tunggal semua CTA "Daftar" + redirect halaman form. */
export const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScGq3QR_ohqV-lBPtM7wgS-1IqXeUVqvFGwm3XO3VSJGBjw8w/viewform";

/**
 * Tujuan CTA "Daftar" berdasarkan school_profile.registration_mode + google_form_url.
 * - "internal" → form bawaan /admission/register
 * - mode Google Form → link kustom admin (bila ada), kalau kosong → GOOGLE_FORM_URL bawaan
 * - kolom belum ada / null → Google Form — perilaku default.
 */
export function registrationHref(
  profile: Pick<SchoolProfile, "registration_mode" | "google_form_url"> | null | undefined
): string {
  if (profile?.registration_mode === "internal") return "/admission/register";
  return profile?.google_form_url?.trim() || GOOGLE_FORM_URL;
}

/**
 * Simpan mode sumber pendaftaran (admin — policy "Staff manage school_profile").
 * Mode "google_form" + googleFormUrl (bila diberikan; null = kembali ke link bawaan)
 * ikut disimpan ke school_profile.google_form_url.
 * Pakai .select() supaya kegagalan RLS yang diam-diam (0 baris) tetap terdeteksi.
 */
export async function setRegistrationMode(
  mode: "google_form" | "internal",
  googleFormUrl?: string | null
): Promise<{ error?: string }> {
  try {
    // PostgREST menolak UPDATE tanpa WHERE ("UPDATE requires a WHERE clause"),
    // jadi ambil id profil (tabel singleton) dulu lalu filter berdasarkan id.
    const profile = await getSchoolProfile();
    if (!profile?.id) {
      return { error: "Profil sekolah tidak ditemukan — mode tidak tersimpan." };
    }
    const payload: { registration_mode: string; google_form_url?: string | null } = {
      registration_mode: mode,
    };
    if (mode === "google_form" && googleFormUrl !== undefined) {
      payload.google_form_url = googleFormUrl;
    }
    const { data, error } = await supabase
      .from("school_profile")
      .update(payload)
      .eq("id", profile.id)
      .select("registration_mode");
    if (error) {
      console.error("Error saving registration mode:", error);
      return { error: error.message };
    }
    if (!data || data.length === 0) {
      return { error: "Mode tidak tersimpan — tidak ada baris yang terupdate (cek policy RLS)." };
    }
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error saving registration mode:", e);
    return { error: message };
  }
}

/**
 * Simpan pengaturan SPMB (brosur, formulir offline, nomor WA panitia,
 * sorotan hasil seleksi) ke school_profile (admin).
 * Pola sama dengan setRegistrationMode: ambil id dulu, UPDATE ... WHERE id, deteksi 0 baris.
 */
export async function setSpmbDocuments(docs: {
  spmb_brochure_url: string | null;
  spmb_offline_form_url: string | null;
  spmb_contact_phone: string | null;
  spmb_highlight_text: string | null;
}): Promise<{ error?: string }> {
  try {
    const profile = await getSchoolProfile();
    if (!profile?.id) {
      return { error: "Profil sekolah tidak ditemukan — dokumen tidak tersimpan." };
    }
    const { data, error } = await supabase
      .from("school_profile")
      .update(docs)
      .eq("id", profile.id)
      .select("spmb_brochure_url, spmb_offline_form_url, spmb_contact_phone, spmb_highlight_text");
    if (error) {
      console.error("Error saving spmb documents:", error);
      return { error: error.message };
    }
    if (!data || data.length === 0) {
      return { error: "Tidak tersimpan — tidak ada baris yang terupdate (cek policy RLS)." };
    }
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error saving spmb documents:", e);
    return { error: message };
  }
}

// ============ SPMB FORM BUILDER (PERTANYAAN CUSTOM) ============
/** Jenis pertanyaan yang didukung builder + label tampilan (dipakai admin & form publik). */
export const SPMB_FIELD_TYPES: { value: SpmbFieldType; label: string }[] = [
  { value: "text", label: "Jawaban Singkat" },
  { value: "textarea", label: "Jawaban Panjang" },
  { value: "number", label: "Angka" },
  { value: "date", label: "Tanggal" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Nomor Telepon" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Pilihan Ganda" },
  { value: "checkbox", label: "Centang (bisa pilih lebih dari satu)" },
];

/** Tipe yang butuh daftar opsi. */
export function spmbFieldNeedsOptions(type: SpmbFieldType): boolean {
  return type === "select" || type === "radio" || type === "checkbox";
}

/** Kunci jawaban pendaftar di spmb_registrations.documents untuk sebuah field. */
export function spmbAnswerKey(fieldId: string): string {
  return `cf_${fieldId}`;
}

/** Batas jumlah pertanyaan custom (pertahanan terhadap jsonb korup/rakus). */
const SPMB_FIELDS_MAX = 50;

/**
 * Validasi + normalisasi skema dari jsonb: buang entri rusak, paksa tipe/panjang
 * yang aman, dedup id. Return [] bila bukan array (kolom null / belum ada).
 */
export function normalizeSpmbFormSchema(raw: unknown): SpmbFormField[] {
  if (!Array.isArray(raw)) return [];
  const validTypes = new Set<string>(SPMB_FIELD_TYPES.map((t) => t.value));
  const seen = new Set<string>();
  const out: SpmbFormField[] = [];
  for (const item of raw) {
    if (out.length >= SPMB_FIELDS_MAX) break;
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const id = typeof f.id === "string" ? f.id.trim().slice(0, 64) : "";
    const label = typeof f.label === "string" ? f.label.trim().slice(0, 200) : "";
    const type = typeof f.type === "string" && validTypes.has(f.type) ? (f.type as SpmbFieldType) : "text";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    const options = Array.isArray(f.options)
      ? f.options
          .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
          .map((o) => o.trim().slice(0, 120))
          .slice(0, 30)
      : [];
    out.push({
      id,
      label,
      type,
      required: f.required === true,
      active: f.active !== false,
      placeholder: typeof f.placeholder === "string" ? f.placeholder.trim().slice(0, 200) : "",
      help: typeof f.help === "string" ? f.help.trim().slice(0, 300) : "",
      options: spmbFieldNeedsOptions(type) && options.length > 0 ? options : [],
    });
  }
  return out;
}

/**
 * Ambil pertanyaan custom SPMB dari school_profile (hanya aktif yang dipakai
 * form publik — filter active dilakukan pemanggil). Aman sebelum ALTER TABLE:
 * kolom belum ada → profile.spmb_form_schema undefined → [].
 */
export async function getSpmbFormSchema(): Promise<SpmbFormField[]> {
  const profile = await getSchoolProfile();
  return normalizeSpmbFormSchema(profile?.spmb_form_schema);
}

/**
 * Simpan SELURUH daftar pertanyaan custom (admin — policy update school_profile).
 * Pola setSpmbDocuments: ambil id dulu, UPDATE ... WHERE id, deteksi 0 baris.
 * Kolom belum ada → pesan yang menunjuk ke SQL migrasi.
 */
export async function setSpmbFormSchema(fields: SpmbFormField[]): Promise<{ error?: string }> {
  try {
    const profile = await getSchoolProfile();
    if (!profile?.id) {
      return { error: "Profil sekolah tidak ditemukan — skema tidak tersimpan." };
    }
    const payload = { spmb_form_schema: normalizeSpmbFormSchema(fields) };
    const { data, error } = await supabase
      .from("school_profile")
      .update(payload)
      .eq("id", profile.id)
      .select("spmb_form_schema");
    if (error) {
      console.error("Error saving spmb form schema:", error);
      // Kolom belum ada (sebelum ALTER TABLE): PGRST204 = kolom tak ada di schema cache.
      if (
        error.code === "PGRST204" ||
        /does not exist|42703|schema cache/i.test(error.message || "")
      ) {
        return {
          error:
            "Kolom spmb_form_schema belum ada di database — jalankan SQL migrasi ALTER TABLE school_profile terlebih dahulu.",
        };
      }
      return { error: error.message };
    }
    if (!data || data.length === 0) {
      return { error: "Skema tidak tersimpan — tidak ada baris yang terupdate (cek policy RLS)." };
    }
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error saving spmb form schema:", e);
    return { error: message };
  }
}

// ============ NEWS ATTACHMENT (lampiran file) ============
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ATTACHMENT_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.oasis.opendocument.text": "ODT",
  "text/plain": "TXT",
  "application/zip": "ZIP",
};

/** null = file boleh diunggah, string = pesan penolakan. */
export function checkAttachment(file: File): string | null {
  if (!ATTACHMENT_TYPES[file.type]) {
    return "Format file tidak didukung. Gunakan PDF, Word, Excel, TXT, atau ZIP.";
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return `Ukuran file maksimal ${Math.round(ATTACHMENT_MAX_BYTES / 1048576)} MB.`;
  }
  return null;
}

/** Label jenis lampiran dari ekstensi, mis. "PDF", "DOCX". */
export function attachmentKind(name?: string | null): string {
  const ext = (name || "").split(".").pop()?.toUpperCase() || "FILE";
  return ext.length <= 5 ? ext : "FILE";
}

export async function uploadNewsAttachment(
  file: File,
  newsId: string
): Promise<{ url: string | null; error?: string }> {
  const invalid = checkAttachment(file);
  if (invalid) return { url: null, error: invalid };

  const folder = `news/${newsId}`;
  const storage = supabase.storage.from("documents");

  // Nama file aman untuk URL (tanpa spasi/karakter aneh); nama asli tetap disimpan
  // di attachment_name untuk ditampilkan.
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100);
  const path = `${folder}/${safeName}`;

  const { error: uploadError } = await storage.upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "31536000",
  });

  if (uploadError) {
    console.error("Error uploading attachment:", uploadError);
    return { url: null, error: uploadError.message };
  }

  const { data } = storage.getPublicUrl(path);
  const publicUrl = data.publicUrl;

  // Satu berita = satu file → buang file lama SETELAH upload sukses
  // (kalau gagal, lampiran lama tetap utuh).
  try {
    const { data: listing } = await storage.list(folder);
    const stale = (listing || [])
      .map((f) => `${folder}/${f.name}`)
      .filter((p) => p !== path);
    if (stale.length > 0) await storage.remove(stale);
  } catch {
    /* best-effort */
  }

  return { url: `${publicUrl}?v=${Date.now()}` };
}

/** Hapus semua lampiran milik sebuah berita (dipanggil saat berita dihapus). */
async function cleanupNewsAttachments(newsId: string) {
  try {
    const storage = supabase.storage.from("documents");
    const { data } = await storage.list(`news/${newsId}`);
    if (data && data.length > 0) {
      await storage.remove(data.map((f) => `news/${newsId}/${f.name}`));
    }
  } catch {
    /* best-effort */
  }
}

// ============ GALLERY ============
export async function getGalleryList(limit?: number): Promise<Gallery[]> {
  let query = supabase
    .from("gallery")
    .select("*")
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching gallery:", error);
    return [];
  }
  return data || [];
}

export async function getGalleryPage(page: number, perPage: number = 20): Promise<Gallery[]> {
  const start = page * perPage;
  const end = start + perPage - 1;

  const { data, error } = await supabase
    .from("gallery")
    .select("id, title, description, url, thumbnail_url, category, media_type, created_at")
    .order("created_at", { ascending: false })
    .range(start, end);

  if (error) {
    console.error("Error fetching gallery page:", error);
    return [];
  }
  return data || [];
}

export async function getGalleryByCategory(category: string): Promise<Gallery[]> {
  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching gallery by category:", error);
    return [];
  }
  return data || [];
}

// ============ SPMB ============
export async function submitRegistration(registration: {
  full_name: string;
  birth_place?: string;
  birth_date?: string;
  gender: "L" | "P";
  address?: string;
  phone?: string;
  email?: string;
  parent_name?: string;
  parent_occupation?: string;
  previous_school?: string;
  registration_path: "reguler" | "prestasi" | "beasiswa";
  documents?: Record<string, string | null>;
}): Promise<{ success: boolean; error?: string }> {
  // Fase 4: catat gelombang yang sedang "open" saat pendaftar mengirim form.
  // Kalau tidak ada gelombang terbuka (atau gagal membaca), wave_id = null dan
  // pendaftaran TETAP disimpan — jangan blokir.
  let waveId: string | null = null;
  try {
    const now = new Date();
    waveId = (await getPublishedWaves()).find((w) => getWaveStatus(w, now) === "open")?.id ?? null;
  } catch {
    waveId = null;
  }

  const { error } = await supabase.from("spmb_registrations").insert({
    full_name: registration.full_name,
    birth_place: registration.birth_place,
    birth_date: registration.birth_date,
    gender: registration.gender,
    address: registration.address,
    phone: registration.phone,
    parent_name: registration.parent_name,
    parent_occupation: registration.parent_occupation,
    previous_school: registration.previous_school,
    registration_path: registration.registration_path,
    // Email wajib ikut tersimpan — kolom dipakai pencarian & tab Kontak di admin.
    email: registration.email,
    documents: registration.documents || {},
    wave_id: waveId,
  });

  if (error) {
    console.error("Error submitting registration:", error);
    return { success: false, error: error.message };
  }

  // Email notifications —暂时 DISABLED (belum diverifikasi domain Resend)
  // Aktifkan lagi setelah custom domain ter-verify di Resend
  // sendRegistrationEmail({
  //   full_name: registration.full_name,
  //   email: registration.email,
  //   registration_path: registration.registration_path,
  //   parent_name: registration.parent_name,
  // }).catch(() => {});
  // sendRegistrationAdminEmail({
  //   full_name: registration.full_name,
  //   parent_name: registration.parent_name,
  //   phone: registration.phone,
  //   email: registration.email,
  //   registration_path: registration.registration_path,
  //   previous_school: registration.previous_school,
  // }).catch(() => {});

  // In-app notification to admins
  const pathLabel = registration.registration_path === "prestasi" ? "Prestasi" : registration.registration_path === "beasiswa" ? "Beasiswa" : "Reguler";
  notifyAllAdmins(
    "Pendaftaran SPMB Baru",
    `${registration.full_name} mendaftar via jalur ${pathLabel} dari ${registration.previous_school || "-"}.`,
    "info",
    "/admin/admission"
  ).catch(() => {});

  return { success: true };
}

export async function getRegistrationList(): Promise<SpmbRegistration[]> {
  const { data, error } = await supabase
    .from("spmb_registrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching registrations:", error);
    return [];
  }
  return data || [];
}

export async function updateRegistrationStatus(
  id: string,
  status: "accepted" | "rejected",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("spmb_registrations")
    .update({ status, admin_notes: notes })
    .eq("id", id);

  if (error) {
    console.error("Error updating status:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateRegistrationNotes(
  id: string,
  admin_notes: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("spmb_registrations")
    .update({ admin_notes })
    .eq("id", id);

  if (error) {
    console.error("Error updating notes:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateRegistrationBulkStatus(
  ids: string[],
  status: "accepted" | "rejected"
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("spmb_registrations")
    .update({ status })
    .in("id", ids);

  if (error) {
    console.error("Error bulk updating status:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** Kunci berkas pada jsonb documents pendaftar (kunci lain = data teks, bukan path). */
const REG_DOC_KEYS = ["kk", "akta", "surat_sekolah", "ktp_ortu", "bukti_transfer"] as const;

/** Kumpulkan path file berkas dari jsonb documents (abaikan nilai yang bukan path). */
function collectRegDocPaths(documents: Record<string, unknown> | null | undefined): string[] {
  if (!documents) return [];
  return REG_DOC_KEYS.map((k) => documents[k]).filter(
    (v): v is string => typeof v === "string" && v.length > 0 && !v.startsWith("http")
  );
}

/** Hapus file berkas pendaftar di bucket spmb-documents (best-effort, tidak menggagalkan delete). */
async function removeRegDocFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await supabase.storage.from("spmb-documents").remove(paths);
    if (error) console.warn("[removeRegDocFiles] remove failed:", error.message);
  } catch (e) {
    console.warn("[removeRegDocFiles] error:", e);
  }
}

export async function deleteRegistration(id: string): Promise<{ error?: string }> {
  // Ambil path berkas SEBELUM row dihapus supaya dokumen sensitif tidak jadi orphan
  const { data: row } = await supabase
    .from("spmb_registrations")
    .select("documents")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("spmb_registrations").delete().eq("id", id);
  if (error) {
    console.error("Error deleting registration:", error);
    return { error: error.message };
  }
  removeRegDocFiles(collectRegDocPaths(row?.documents)).catch(() => {});
  return {};
}

export async function deleteRegistrationBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase
    .from("spmb_registrations")
    .select("documents")
    .in("id", ids);
  const { error } = await supabase.from("spmb_registrations").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting registrations:", error);
    return { error: error.message };
  }
  const docPaths: string[] = [];
  for (const row of rows || []) {
    docPaths.push(...collectRegDocPaths(row.documents));
  }
  removeRegDocFiles(docPaths).catch(() => {});
  return {};
}

// ============ TEACHERS ============
export async function getTeacherList(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching teachers:", error);
    return [];
  }
  return data || [];
}

// ============ FACILITIES ============
export async function getFacilityList(): Promise<Facility[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching facilities:", error);
    return [];
  }
  return data || [];
}

export async function getFacilityListAll(): Promise<Facility[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching all facilities:", error);
    return [];
  }
  return data || [];
}

export async function createFacility(facility: {
  name: string;
  description?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{ data: Facility | null; error?: string }> {
  const { data, error } = await supabase
    .from("facilities")
    .insert(facility)
    .select()
    .single();

  if (error) {
    console.error("Error creating facility:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function updateFacility(
  id: string,
  facility: {
    name?: string;
    description?: string;
    image_url?: string;
    sort_order?: number;
    is_active?: boolean;
  }
): Promise<{ data: Facility | null; error?: string }> {
  // Ambil URL gambar lama dulu supaya file lama bisa dibersihkan bila berganti
  let oldImageUrl: string | null = null;
  if (typeof facility.image_url === "string") {
    const { data: current } = await supabase.from("facilities").select("image_url").eq("id", id).single();
    oldImageUrl = current?.image_url || null;
  }

  const { data, error } = await supabase
    .from("facilities")
    .update(facility)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating facility:", error);
    return { data: null, error: error.message };
  }
  // Bersihkan file lama hanya bila URL benar-benar berubah (best-effort)
  if (oldImageUrl && oldImageUrl !== facility.image_url) {
    deleteStorageFileByUrl(oldImageUrl).catch(() => {});
  }
  return { data };
}

export async function deleteFacility(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("facilities").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("facilities").delete().eq("id", id);
  if (error) {
    console.error("Error deleting facility:", error);
    return { error: error.message };
  }
  if (row?.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  return {};
}

export async function deleteFacilityBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("facilities").select("image_url").in("id", ids);
  const { error } = await supabase.from("facilities").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting facilities:", error);
    return { error: error.message };
  }
  for (const row of rows || []) {
    if (row.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  }
  return {};
}

export async function uploadFacilityImage(
  file: File,
  facilityId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };
  const path = `facilities/${facilityId}.jpg`;

  await cleanupOldFiles("facilities", facilityId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    console.error("Error uploading facility image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

// ============ ARTICLES ============
/**
 * Kolom list publik (tanpa content) — dipakai dua kali: dengan `author_name`
 * (kolom hasil ALTER TABLE) dan tanpanya bila kolom belum ada.
 */
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

/**
 * Filter publik artikel — sama persis dengan policy SELECT Tahap 1 news:
 * is_published = true AND (published_at IS NULL OR published_at <= now())
 * AND (expires_at IS NULL OR expires_at > now()).
 * `withExpires` false bila kolom expires_at belum ada (SQL tahap 1 belum jalan).
 */
function applyPublicArticleFilters(query: any, withExpires: boolean) {
  const nowIso = newsNowIso();
  let q = query
    .eq("is_published", true)
    .or(`published_at.is.null,published_at.lte.${nowIso}`);
  if (withExpires) {
    q = q.or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  }
  return q;
}

export async function getArticleList(limit?: number): Promise<ArticleWithAuthor[]> {
  const newCols = await articlesHasScheduledColumns();
  const run = async (columns: string) => {
    let query = supabase
      .from("articles")
      .select(columns);
    query = applyPublicArticleFilters(query, newCols);
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
  let { data, error } = await run(`${ARTICLE_LIST_COLUMNS}, author_name`);
  if (error && /author_name/.test(error.message || "")) {
    ({ data, error } = await run(ARTICLE_LIST_COLUMNS));
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
    return [];
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
export function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug.slice(0, 70).replace(/-+$/, "");
}

/**
 * Cari slug yang belum dipakai: bila `base` sudah ada, tambah sufiks
 * -2, -3, dst. `excludeId` = id artikel sendiri (agar slug yang tidak
 * berubah tidak ikut dianggap "duplikat" saat edit).
 */
async function generateUniqueArticleSlug(base: string, excludeId?: string): Promise<string> {
  const { data } = await supabase
    .from("articles")
    .select("id, slug")
    .like("slug", `${base}%`);
  const rows = data || [];
  const own = excludeId ? rows.find((r) => r.id === excludeId) : undefined;
  if (own && own.slug === base) return base;
  const used = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!used.has(base)) return base;
  const root = base.slice(0, 66).replace(/-+$/, "") || base;
  let suffix = 2;
  while (used.has(`${root}-${suffix}`)) suffix++;
  return `${root}-${suffix}`;
}

/**
 * Versi berita dari generateUniqueArticleSlug: sufiks -2, -3, dst.
 * `excludeId` = id berita sendiri agar slug yang tidak berubah tidak
 * dianggap duplikat saat edit. Dipakai createNews/updateNews.
 */
async function generateUniqueNewsSlug(base: string, excludeId?: string): Promise<string> {
  const { data } = await supabase
    .from("news")
    .select("id, slug")
    .like("slug", `${base}%`);
  const rows = data || [];
  const own = excludeId ? rows.find((r) => r.id === excludeId) : undefined;
  if (own && own.slug === base) return base;
  const used = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!used.has(base)) return base;
  const root = base.slice(0, 66).replace(/-+$/, "") || base;
  let suffix = 2;
  while (used.has(`${root}-${suffix}`)) suffix++;
  return `${root}-${suffix}`;
}

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
}): Promise<{ data: Article | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  const newCols = await articlesHasScheduledColumns();
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
  }
): Promise<{ data: Article | null; error?: string }> {
  const newCols = await articlesHasScheduledColumns();
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
  let { data, error } = await supabase
    .from("articles")
    .update(article)
    .eq("id", id)
    .select()
    .single();

  // Kolom opsional belum ada di DB → ulangi tanpa kolom itu
  if (error && /(image_alt|is_pinned|expires_at)/.test(error.message || "")) {
    const msg = error.message || "";
    (["image_alt", "is_pinned", "expires_at"] as const).forEach((k) => {
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
  const update: Record<string, any> = { is_published };
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

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    console.error("Error uploading article image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

// ============ ACTIVITIES CRUD ============
export async function getActivityList(limit?: number): Promise<Activity[]> {
  let query = supabase
    .from("activities")
    .select("id, title, slug, description, activity_type, activity_date, image_url, is_published, created_at")
    .eq("is_published", true)
    .order("activity_date", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching activities:", JSON.stringify(error), error.message, error.code, error.details, error.hint);
    return [];
  }
  return (data || []) as Activity[];
}

export async function getActivityBySlug(slug: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching activity by slug:", error);
    return null;
  }
  return data;
}

export async function getActivityListAll(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all activities:", error);
    return [];
  }
  return data || [];
}

export async function createActivity(activity: {
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  activity_date?: string;
  activity_type?: string;
  location?: string;
  image_url?: string;
  is_published?: boolean;
}): Promise<{ data: Activity | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!activity.slug) {
    activity.slug = activity.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  const { data, error } = await supabase
    .from("activities")
    .insert({ ...activity, author_id: user?.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating activity:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function updateActivity(
  id: string,
  activity: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    activity_date?: string;
    activity_type?: string;
    location?: string;
    image_url?: string;
    is_published?: boolean;
  }
): Promise<{ data: Activity | null; error?: string }> {
  // Ambil URL gambar lama supaya file lama bisa dibersihkan bila berganti
  let oldImageUrl: string | null = null;
  if (typeof activity.image_url === "string") {
    const { data: current } = await supabase.from("activities").select("image_url").eq("id", id).single();
    oldImageUrl = current?.image_url || null;
  }
  if (activity.title && !activity.slug) {
    activity.slug = activity.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  const { data, error } = await supabase
    .from("activities")
    .update(activity)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating activity:", error);
    return { data: null, error: error.message };
  }
  // Bersihkan file lama hanya bila URL benar-benar berubah (best-effort)
  if (oldImageUrl && oldImageUrl !== activity.image_url) {
    deleteStorageFileByUrl(oldImageUrl).catch(() => {});
  }
  return { data };
}

export async function deleteActivity(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("activities").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) {
    console.error("Error deleting activity:", error);
    return { error: error.message };
  }
  if (row?.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  return {};
}

export async function deleteActivityBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("activities").select("image_url").in("id", ids);
  const { error } = await supabase.from("activities").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting activities:", error);
    return { error: error.message };
  }
  for (const row of rows || []) {
    if (row.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  }
  return {};
}

export async function togglePublishActivity(
  id: string,
  is_published: boolean
): Promise<{ error?: string }> {
  const { error } = await supabase.from("activities").update({ is_published }).eq("id", id);
  if (error) {
    console.error("Error toggling activity publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function togglePublishActivityBulk(
  ids: string[],
  is_published: boolean
): Promise<{ error?: string }> {
  const { error } = await supabase.from("activities").update({ is_published }).in("id", ids);
  if (error) {
    console.error("Error bulk toggling activity publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function uploadActivityImage(
  file: File,
  activityId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };
  const path = `activities/${activityId}.jpg`;

  await cleanupOldFiles("activities", activityId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    console.error("Error uploading activity image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

// ============ GALLERY CRUD ============
export async function getGalleryListAll(): Promise<Gallery[]> {
  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all gallery:", error);
    return [];
  }
  return data || [];
}

export async function createGallery(gallery: {
  title: string;
  description?: string;
  url?: string;
  category?: string;
  media_type?: string;
}): Promise<{ data: Gallery | null; error?: string }> {
  const { data, error } = await supabase
    .from("gallery")
    .insert(gallery)
    .select()
    .single();

  if (error) {
    console.error("Error creating gallery:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function updateGallery(
  id: string,
  gallery: {
    title?: string;
    description?: string;
    url?: string;
    category?: string;
    media_type?: string;
  }
): Promise<{ data: Gallery | null; error?: string }> {
  // Ambil URL gambar lama supaya file lama bisa dibersihkan bila berganti
  let oldImageUrl: string | null = null;
  if (typeof gallery.url === "string") {
    const { data: current } = await supabase.from("gallery").select("url").eq("id", id).single();
    oldImageUrl = current?.url || null;
  }

  const { data, error } = await supabase
    .from("gallery")
    .update(gallery)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating gallery:", error);
    return { data: null, error: error.message };
  }
  // Bersihkan file lama hanya bila URL benar-benar berubah (best-effort)
  if (oldImageUrl && oldImageUrl !== gallery.url) {
    deleteStorageFileByUrl(oldImageUrl).catch(() => {});
  }
  return { data };
}

export async function deleteGallery(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("gallery").select("url").eq("id", id).single();
  const { error } = await supabase.from("gallery").delete().eq("id", id);
  if (error) {
    console.error("Error deleting gallery:", error);
    return { error: error.message };
  }
  if (row?.url) deleteStorageFileByUrl(row.url).catch(() => {});
  return {};
}

export async function deleteGalleryBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("gallery").select("url").in("id", ids);
  const { error } = await supabase.from("gallery").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting gallery:", error);
    return { error: error.message };
  }
  for (const row of rows || []) {
    if (row.url) deleteStorageFileByUrl(row.url).catch(() => {});
  }
  return {};
}

export async function uploadGalleryImage(
  file: File,
  galleryId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };
  const path = `gallery/${galleryId}.jpg`;

  await cleanupOldFiles("gallery", galleryId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    console.error("Error uploading gallery image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

// ============ ACHIEVEMENTS ============
export async function getAchievementList(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching achievements:", error);
    return [];
  }
  return data || [];
}

export async function createAchievement(achievement: {
  title: string;
  description?: string;
  category?: string;
  year?: number;
  image_url?: string;
  sort_order?: number;
  /** Kolom Tahap 1 (null = kosongkan) */
  rank_label?: string | null;
  level?: string | null;
  participants?: string | null;
  organizer?: string | null;
  is_featured?: boolean;
  image_alt?: string | null;
}): Promise<{ data: Achievement | null; error?: string }> {
  const { data, error } = await supabase
    .from("achievements")
    .insert(achievement)
    .select()
    .single();

  if (error) {
    console.error("Error creating achievement:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

/**
 * Hapus file gambar prestasi BILA file itu tidak lagi dipakai baris mana pun.
 * Tombol Duplikat menyalin `image_url` apa adanya, sehingga beberapa baris bisa
 * berbagi SATU file — file hanya boleh dihapus setelah baris terakhir pemakainya
 * hilang. Perbandingan memakai path (tanpa `?v=`) agar URL beda query cache
 * dianggap file yang sama; sekaligus melindungi file yang baru saja diunggah
 * (path-nya masih dirujuk baris ini).
 */
async function pruneAchievementImageFiles(urls: (string | null | undefined)[]): Promise<void> {
  const targets = [...new Set(urls.filter((u): u is string => !!u))];
  if (targets.length === 0) return;
  const { data: rows, error } = await supabase.from("achievements").select("image_url");
  if (error) {
    // Gagal memastikan → jangan hapus apa pun (file sisa lebih baik daripada gambar rusak).
    console.warn("[pruneAchievementImageFiles] cek referensi gagal, file tidak dihapus:", error.message);
    return;
  }
  const usedPaths = new Set(
    (rows || []).map((r) => storagePathFromUrl(r.image_url || "")).filter((p): p is string => !!p)
  );
  for (const url of targets) {
    const path = storagePathFromUrl(url);
    if (path && !usedPaths.has(path)) deleteStorageFileByUrl(url).catch(() => {});
  }
}

export async function updateAchievement(
  id: string,
  achievement: {
    title?: string;
    description?: string;
    category?: string;
    year?: number;
    image_url?: string;
    sort_order?: number;
    /** Kolom Tahap 1 (null = kosongkan) */
    rank_label?: string | null;
    level?: string | null;
    participants?: string | null;
    organizer?: string | null;
    is_featured?: boolean;
    image_alt?: string | null;
  }
): Promise<{ data: Achievement | null; error?: string }> {
  // Ambil URL gambar lama supaya file lama bisa dibersihkan bila berganti
  let oldImageUrl: string | null = null;
  if (typeof achievement.image_url === "string") {
    const { data: current } = await supabase.from("achievements").select("image_url").eq("id", id).single();
    oldImageUrl = current?.image_url || null;
  }

  const { data, error } = await supabase
    .from("achievements")
    .update(achievement)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating achievement:", error);
    return { data: null, error: error.message };
  }
  // Bersihkan file lama hanya bila URL benar-benar berubah dan tidak masih
  // dipakai baris lain (best-effort; bandingkan path, bukan URL ?v=).
  if (oldImageUrl && oldImageUrl !== achievement.image_url) {
    await pruneAchievementImageFiles([oldImageUrl]);
  }
  return { data };
}

export async function deleteAchievement(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus; file baru dihapus bila baris lain
  // (mis. hasil Duplikat) tidak lagi memakainya.
  const { data: row } = await supabase.from("achievements").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("achievements").delete().eq("id", id);
  if (error) {
    console.error("Error deleting achievement:", error);
    return { error: error.message };
  }
  if (row?.image_url) await pruneAchievementImageFiles([row.image_url]);
  return {};
}

export async function deleteAchievementBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("achievements").select("image_url").in("id", ids);
  const { error } = await supabase.from("achievements").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting achievements:", error);
    return { error: error.message };
  }
  await pruneAchievementImageFiles((rows || []).map((r) => r.image_url));
  return {};
}

export async function uploadAchievementImage(
  file: File,
  achievementId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };
  // Nama file unik tiap unggahan: baris hasil Duplikat berbagi SATU file,
  // jadi file tidak boleh ditimpa/dibersihkan di sini — pembersihan file lama
  // dilakukan oleh update/delete dengan guard referensi (lihat di bawah).
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `achievements/${achievementId}-${Date.now()}-${rand}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    console.error("Error uploading achievement image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

export async function uploadTeacherPhoto(
  file: File,
  teacherId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file, TEACHER_PHOTO);
  if (!compressed) return { url: null, error: compressError };
  const path = `teachers/${teacherId}.jpg`;

  await cleanupOldFiles("teachers", teacherId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });

  if (uploadError) {
    console.error("Error uploading teacher photo:", uploadError);
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

// ============ CONTACT MESSAGES CRUD ============
export async function deleteContactMessage(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) {
    console.error("Error deleting contact message:", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteContactMessageBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("contact_messages").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting contact messages:", error);
    return { error: error.message };
  }
  return {};
}

export async function toggleReadContactMessage(
  id: string,
  is_read: boolean
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read })
    .eq("id", id);
  if (error) {
    console.error("Error toggling contact read:", error);
    return { error: error.message };
  }
  return {};
}

export async function toggleReadContactMessageBulk(
  ids: string[],
  is_read: boolean
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read })
    .in("id", ids);
  if (error) {
    console.error("Error bulk toggling contact read:", error);
    return { error: error.message };
  }
  return {};
}

// ============ CONTACT MESSAGES ============
export async function submitContactMessage(message: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("contact_messages").insert(message);

  if (error) {
    console.error("Error submitting contact:", error);
    return { success: false, error: error.message };
  }

  // Email notifications —暂时 DISABLED (belum diverifikasi domain Resend)
  // sendContactEmail(message).catch(() => {});
  // sendContactAdminEmail(message).catch(() => {});

  // In-app notification to admins
  notifyAllAdmins(
    "Pesan Baru dari Website",
    `${message.name} mengirim pesan: "${message.subject || message.message.slice(0, 50)}..."`,
    "info",
    "/admin/contact"
  ).catch(() => {});

  return { success: true };
}

export async function getContactMessageList(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }
  return data || [];
}

export async function markContactAsRead(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    console.error("Error marking contact as read:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getUnreadMessageCount(): Promise<number> {
  const { count, error } = await supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
  return count || 0;
}

export async function getRecentUnreadMessages(limit = 5): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent unread messages:", error);
    return [];
  }
  return data || [];
}

// ============ USER PROFILES ============
export async function getProfileList(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
  return data || [];
}

export async function updateProfileRole(
  id: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ role })
    .eq("id", id);

  if (error) {
    console.error("Error updating profile role:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateProfileStatus(
  id: string,
  is_active: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ is_active })
    .eq("id", id);

  if (error) {
    console.error("Error updating profile status:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteProfile(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("user_profiles").delete().eq("id", id);
  if (error) {
    console.error("Error deleting profile:", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteProfileBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("user_profiles").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting profiles:", error);
    return { error: error.message };
  }
  return {};
}

// ============ ANNOUNCEMENTS ============
export interface Announcement {
  id: string;
  text: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching announcements:", error);
    return [];
  }
  return data || [];
}

export async function getActiveAnnouncements(): Promise<string[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("text")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];
  return (data || []).map((a) => a.text);
}

export async function createAnnouncement(text: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("announcements").insert({ text });
  if (error) return { error: error.message };
  return {};
}

export async function updateAnnouncement(id: string, data: Partial<Pick<Announcement, "text" | "is_active" | "sort_order">>): Promise<{ error?: string }> {
  const { error } = await supabase.from("announcements").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAnnouncement(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAnnouncementBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("announcements").delete().in("id", ids);
  if (error) return { error: error.message };
  return {};
}

// ============================================================
// Agenda Events (countdown timer homepage)
// ============================================================

export interface AgendaEvent {
  id: string;
  title: string;
  event_date: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getAgendaEvents(): Promise<AgendaEvent[]> {
  const { data, error } = await supabase
    .from("agenda_events")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function getActiveAgendaEvents(): Promise<AgendaEvent[]> {
  const { data, error } = await supabase
    .from("agenda_events")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function createAgendaEvent(title: string, event_date: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("agenda_events").insert({ title, event_date });
  if (error) return { error: error.message };
  return {};
}

export async function updateAgendaEvent(id: string, data: Partial<Pick<AgendaEvent, "title" | "event_date" | "is_active" | "sort_order">>): Promise<{ error?: string }> {
  const { error } = await supabase.from("agenda_events").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAgendaEvent(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("agenda_events").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAgendaEventBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("agenda_events").delete().in("id", ids);
  if (error) return { error: error.message };
  return {};
}

// ============================================================
// Teachers (Guru & Staff)
// ============================================================

export async function getAllTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function createTeacher(data: { name: string; position?: string; photo_url?: string }): Promise<{ error?: string }> {
  const { error } = await supabase.from("teachers").insert(data);
  if (error) return { error: error.message };
  return {};
}

export async function updateTeacher(id: string, data: Partial<Pick<Teacher, "name" | "position" | "photo_url" | "sort_order" | "is_active">>): Promise<{ error?: string }> {
  // Ambil URL foto lama supaya file lama bisa dibersihkan bila berganti
  let oldPhotoUrl: string | null = null;
  if (typeof data.photo_url === "string") {
    const { data: current } = await supabase.from("teachers").select("photo_url").eq("id", id).single();
    oldPhotoUrl = current?.photo_url || null;
  }
  const { error } = await supabase.from("teachers").update(data).eq("id", id);
  if (error) return { error: error.message };
  // Bersihkan file lama hanya bila URL benar-benar berubah (best-effort)
  if (oldPhotoUrl && oldPhotoUrl !== data.photo_url) {
    deleteStorageFileByUrl(oldPhotoUrl).catch(() => {});
  }
  return {};
}

export async function deleteTeacher(id: string): Promise<{ error?: string }> {
  // Ambil URL foto SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("teachers").select("photo_url").eq("id", id).single();
  const { error } = await supabase.from("teachers").delete().eq("id", id);
  if (error) return { error: error.message };
  if (row?.photo_url) deleteStorageFileByUrl(row.photo_url).catch(() => {});
  return {};
}

export async function deleteTeacherBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("teachers").select("photo_url").in("id", ids);
  const { error } = await supabase.from("teachers").delete().in("id", ids);
  if (error) return { error: error.message };
  for (const row of rows || []) {
    if (row.photo_url) deleteStorageFileByUrl(row.photo_url).catch(() => {});
  }
  return {};
}

// ============ CATEGORIES ============
export interface Category {
  id: string;
  name: string;
  slug: string;
  type: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export async function getCategoryList(type?: string): Promise<Category[]> {
  let query = supabase.from("categories").select("*").order("sort_order", { ascending: true });
  if (type) query = query.eq("type", type);
  const { data } = await query;
  return data || [];
}

export async function createCategory(data: { name: string; slug: string; type: string; color?: string; sort_order?: number }): Promise<{ error?: string }> {
  const { error } = await supabase.from("categories").insert(data);
  if (error) return { error: error.message };
  return {};
}

export async function updateCategory(id: string, data: Partial<{ name: string; slug: string; type: string; color: string; sort_order: number }>): Promise<{ error?: string }> {
  const { error } = await supabase.from("categories").update(data).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

// ============ NOTIFICATIONS ============
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string
): Promise<{ error?: string }> {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    link: link || null,
  });
  if (error) {
    console.error("Error creating notification:", error);
    return { error: error.message };
  }
  return {};
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread notification count:", error);
    return 0;
  }
  return count || 0;
}

export async function getRecentNotifications(limit: number = 10): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
  return data || [];
}

export async function markNotificationAsRead(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function markAllNotificationsAsRead(): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);
  if (error) return { error: error.message };
  return {};
}

export async function notifyAllAdmins(
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string
): Promise<void> {
  // Dipanggil dari form publik (anon) → tidak bisa baca user_profiles (RLS),
  // jadi semua langkah (baca daftar admin + insert) dilakukan fungsi Postgres
  // security definer notify_admins(). Lihat SQL "notify_admins".
  const { error } = await supabase.rpc("notify_admins", {
    p_title: title,
    p_message: message,
    p_type: type,
    p_link: link ?? null,
  });
  if (error) console.warn("notifyAllAdmins gagal:", error.message);
}

// ============ PORTAL APPS (grid aplikasi di /portal) ============

export interface PortalApp {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  is_external: boolean;
  is_coming_soon: boolean;
}

/** Aplikasi portal yang aktif saja, diurut sort_order (baca publik). */
export async function getPortalApps(): Promise<PortalApp[]> {
  const { data, error } = await supabase
    .from("portal_apps")
    .select(
      "id, label, description, href, icon, color, is_external, is_coming_soon"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching portal apps:", error);
    return [];
  }
  return data ?? [];
}

/** Semua aplikasi (termasuk nonaktif) untuk halaman admin /admin/portal. */
export interface PortalAppAdmin extends PortalApp {
  is_active: boolean;
  sort_order: number;
}

export async function getPortalAppsAdmin(): Promise<PortalAppAdmin[]> {
  const { data, error } = await supabase
    .from("portal_apps")
    .select(
      "id, label, description, href, icon, color, is_external, is_coming_soon, is_active, sort_order"
    )
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching portal apps (admin):", error);
    return [];
  }
  return data ?? [];
}

export type PortalAppInput = Omit<PortalAppAdmin, "id">;

export async function createPortalApp(input: PortalAppInput): Promise<{ error?: string }> {
  const { error } = await supabase.from("portal_apps").insert(input);
  if (error) return { error: error.message };
  return {};
}

export async function updatePortalApp(
  id: string,
  input: Partial<PortalAppInput>
): Promise<{ error?: string }> {
  const { error } = await supabase.from("portal_apps").update(input).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deletePortalApp(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("portal_apps").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

/**
 * Invalidasi ISR halaman /portal via API route /api/revalidate.
 * Dipanggil dari halaman admin /admin/portal setelah simpan/hapus.
 */
export async function revalidatePortal(): Promise<void> {
  await postRevalidate(["/portal"], "revalidatePortal");
}

// ============ SPMB WAVES (Gelombang Pendaftaran) ============

/**
 * Untuk halaman publik — hanya gelombang yang is_published = true,
 * diurutkan sort_order ASC, start_date ASC.
 */
export async function getPublishedWaves(): Promise<SpmbWave[]> {
  const { data, error } = await supabase
    .from("spmb_waves")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Error fetching published waves:", error);
    return [];
  }
  return (data || []) as SpmbWave[];
}

/**
 * Untuk panel admin — semua gelombang termasuk yang is_published = false.
 */
export async function getWavesAll(): Promise<SpmbWave[]> {
  const { data, error } = await supabase
    .from("spmb_waves")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Error fetching all waves:", error);
    return [];
  }
  return (data || []) as SpmbWave[];
}

export async function createWave(wave: {
  name: string;
  start_date: string;
  end_date: string;
  note?: string | null;
  is_published?: boolean;
  sort_order?: number;
}): Promise<{ data: SpmbWave | null; error?: string }> {
  const { data, error } = await supabase
    .from("spmb_waves")
    .insert({
      name: wave.name,
      start_date: wave.start_date,
      end_date: wave.end_date,
      note: wave.note ?? null,
      is_published: wave.is_published ?? true,
      sort_order: wave.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating wave:", error);
    return { data: null, error: error.message };
  }
  return { data: data as SpmbWave };
}

export async function updateWave(
  id: string,
  wave: Partial<{
    name: string;
    start_date: string;
    end_date: string;
    note: string | null;
    is_published: boolean;
    sort_order: number;
  }>
): Promise<{ data: SpmbWave | null; error?: string }> {
  const { data, error } = await supabase
    .from("spmb_waves")
    .update(wave)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating wave:", error);
    return { data: null, error: error.message };
  }
  return { data: data as SpmbWave };
}

export async function deleteWave(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("spmb_waves")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting wave:", error);
    return { error: error.message };
  }
  return {};
}

/**
 * Hitung status gelombang relatif terhadap `now` dalam zona waktu WIB (Asia/Jakarta, UTC+7).
 * `end_date` dianggap inklusif sampai 23:59:59 WIB.
 *
 * @returns "upcoming" | "open" | "closed"
 *
 * Contoh pengujian (anggap start_date="2026-10-20", end_date="2026-12-30"):
 *
 *   [1] Sebelum start — now = 2026-10-19T23:59:59+07:00
 *       startWIB = 2026-10-20T00:00:00+07:00
 *       endWIB   = 2026-12-30T23:59:59+07:00
 *       now < startWIB → "upcoming"
 *
 *   [2] Tepat di start — now = 2026-10-20T00:00:00+07:00
 *       now >= startWIB && now <= endWIB → "open"
 *
 *   [3] Tepat di hari end — now = 2026-12-30T23:59:59+07:00
 *       now >= startWIB && now <= endWIB → "open"  (end_date inklusif)
 *
 *   [4] Sehari setelah end — now = 2026-12-31T00:00:00+07:00
 *       now > endWIB → "closed"
 */
export function getWaveStatus(
  wave: Pick<SpmbWave, "start_date" | "end_date">,
  now: Date = new Date()
): "upcoming" | "open" | "closed" {
  const WIB_OFFSET = 7 * 60; // menit

  // Konversi date string ("YYYY-MM-DD") ke epoch UTC dengan asumsi WIB
  function wibDateToMs(dateStr: string, endOfDay = false): number {
    const [y, m, d] = dateStr.split("-").map(Number);
    const hours = endOfDay ? 23 : 0;
    const mins = endOfDay ? 59 : 0;
    const secs = endOfDay ? 59 : 0;
    // Buat Date di UTC, lalu kurangi offset WIB agar mewakili "jam X WIB"
    return Date.UTC(y, m - 1, d, hours - WIB_OFFSET / 60, mins, secs);
  }

  const startMs = wibDateToMs(wave.start_date, false); // 00:00:00 WIB
  const endMs   = wibDateToMs(wave.end_date, true);    // 23:59:59 WIB
  const nowMs   = now.getTime();

  if (nowMs < startMs) return "upcoming";
  if (nowMs > endMs)   return "closed";
  return "open";
}