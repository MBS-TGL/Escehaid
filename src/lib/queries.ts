import { supabase } from "./supabase";
import type { SchoolProfile, News, Gallery, SpmbRegistration, Teacher, Facility, Article, Activity, Achievement, ContactMessage } from "./supabase";
import type { UserProfile } from "./auth";
import {
  sendRegistrationEmail,
  sendRegistrationAdminEmail,
  sendContactEmail,
  sendContactAdminEmail,
} from "./notifications";
import { compressImage } from "./compress-image";

interface NewsWithAuthor extends News {
  author_name?: string;
}

interface ArticleWithAuthor extends Article {
  author_name?: string;
}

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
export async function getSchoolProfile(): Promise<SchoolProfile | null> {
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

// ============ NEWS ============
export async function getNewsListPaginated(
  page: number = 1,
  pageSize: number = 9,
  search?: string
): Promise<{ items: NewsWithAuthor[]; total: number; totalPages: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("news")
    .select("id, title, slug, summary, cover_position, image_url, category, is_published, published_at, created_at, user_profiles(full_name)", { count: "exact" })
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

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
  let query = supabase
    .from("news")
    .select("id, title, slug, summary, image_url, category, published_at, created_at, user_profiles(full_name)")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

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
  const { data, error } = await supabase
    .from("news")
    .select("*, user_profiles(full_name)")
    .eq("slug", slug)
    .single();

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
  const { data, error } = await supabase
    .from("news")
    .select("*, user_profiles(full_name)")
    .eq("is_published", true)
    .eq("category", category)
    .neq("id", currentId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching related news:", error);
    return [];
  }
  return (data || []).map((item: any) => ({
    ...item,
    author_name: item.user_profiles?.full_name ?? null,
  }));
}

export async function createNews(news: {
  title: string;
  summary?: string;
  content?: string;
  category?: string;
  image_url?: string;
  cover_image_position?: string;
  writer_name?: string;
  editor_name?: string;
  published_at?: string;
  is_published?: boolean;
}): Promise<{ data: News | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  const payload: Record<string, any> = {
    title: news.title,
    summary: news.summary,
    content: news.content,
    category: news.category,
    image_url: news.image_url,
    is_published: news.is_published,
    author_id: user?.id,
  };
  if (news.cover_image_position) payload.cover_image_position = news.cover_image_position;
  if (news.writer_name) payload.writer_name = news.writer_name;
  if (news.editor_name) payload.editor_name = news.editor_name;
  if (news.published_at) payload.published_at = news.published_at;
  const { data, error } = await supabase
    .from("news")
    .insert(payload)
    .select()
    .single();

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
    summary?: string;
    content?: string;
    category?: string;
    image_url?: string;
    cover_image_position?: string;
    writer_name?: string;
    editor_name?: string;
    published_at?: string;
    is_published?: boolean;
  }
): Promise<{ data: News | null; error?: string }> {
  const payload: Record<string, any> = {};
  if (news.title !== undefined) payload.title = news.title;
  if (news.summary !== undefined) payload.summary = news.summary;
  if (news.content !== undefined) payload.content = news.content;
  if (news.category !== undefined) payload.category = news.category;
  if (news.image_url !== undefined) payload.image_url = news.image_url;
  if (news.is_published !== undefined) payload.is_published = news.is_published;
  if (news.cover_image_position) payload.cover_image_position = news.cover_image_position;
  if (news.writer_name) payload.writer_name = news.writer_name;
  if (news.editor_name) payload.editor_name = news.editor_name;
  if (news.published_at) payload.published_at = news.published_at;
  const { data, error } = await supabase
    .from("news")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating news:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function deleteNews(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) {
    console.error("Error deleting news:", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteNewsBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("news").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting news:", error);
    return { error: error.message };
  }
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
  const compressed = await compressImage(file);
  const path = `news/${newsId}.jpg`;

  await cleanupOldFiles("news", newsId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true });

  if (uploadError) {
    console.error("Error uploading image:", uploadError);
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: data.publicUrl };
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
    documents: registration.documents || {},
  });

  if (error) {
    console.error("Error submitting registration:", error);
    return { success: false, error: error.message };
  }

  // Send confirmation email to registrant + admin notification (fire-and-forget)
  sendRegistrationEmail({
    full_name: registration.full_name,
    email: registration.email,
    registration_path: registration.registration_path,
    parent_name: registration.parent_name,
  }).catch(() => {});
  sendRegistrationAdminEmail({
    full_name: registration.full_name,
    parent_name: registration.parent_name,
    phone: registration.phone,
    email: registration.email,
    registration_path: registration.registration_path,
    previous_school: registration.previous_school,
  }).catch(() => {});

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

export async function deleteRegistration(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("spmb_registrations").delete().eq("id", id);
  if (error) {
    console.error("Error deleting registration:", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteRegistrationBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("spmb_registrations").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting registrations:", error);
    return { error: error.message };
  }
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
  return { data };
}

export async function deleteFacility(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("facilities").delete().eq("id", id);
  if (error) {
    console.error("Error deleting facility:", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteFacilityBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("facilities").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting facilities:", error);
    return { error: error.message };
  }
  return {};
}

export async function uploadFacilityImage(
  file: File,
  facilityId: string
): Promise<{ url: string | null; error?: string }> {
  const compressed = await compressImage(file);
  const path = `facilities/${facilityId}.jpg`;

  await cleanupOldFiles("facilities", facilityId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true });
  if (uploadError) {
    console.error("Error uploading facility image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: data.publicUrl };
}

// ============ ARTICLES ============
export async function getArticleList(limit?: number): Promise<ArticleWithAuthor[]> {
  let query = supabase
    .from("articles")
    .select("id, title, slug, excerpt, image_url, category, is_published, published_at, created_at, user_profiles(full_name)")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
  return (data || []).map((item: any) => ({
    ...item,
    author_name: item.user_profiles?.full_name ?? null,
  }));
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithAuthor | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*, user_profiles(full_name)")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching article by slug:", error);
    return null;
  }
  if (!data) return null;
  return {
    ...data,
    author_name: data.user_profiles?.full_name ?? null,
  };
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
  return (data || []).map((item: any) => ({
    ...item,
    author_name: item.user_profiles?.full_name ?? null,
  }));
}

export async function createArticle(article: {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  image_url?: string;
  is_published?: boolean;
}): Promise<{ data: Article | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!article.slug) {
    article.slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  const { data, error } = await supabase
    .from("articles")
    .insert({ ...article, author_id: user?.id })
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
  }
): Promise<{ data: Article | null; error?: string }> {
  if (article.title && !article.slug) {
    article.slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  const { data, error } = await supabase
    .from("articles")
    .update(article)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating article:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function deleteArticle(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) {
    console.error("Error deleting article:", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteArticleBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("articles").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting articles:", error);
    return { error: error.message };
  }
  return {};
}

export async function togglePublishArticle(
  id: string,
  is_published: boolean
): Promise<{ error?: string }> {
  const update: Record<string, any> = { is_published };
  if (is_published) update.published_at = new Date().toISOString();
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
  const update: Record<string, any> = { is_published };
  if (is_published) update.published_at = new Date().toISOString();
  const { error } = await supabase.from("articles").update(update).in("id", ids);
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
  const compressed = await compressImage(file);
  const path = `articles/${articleId}.jpg`;

  await cleanupOldFiles("articles", articleId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true });
  if (uploadError) {
    console.error("Error uploading article image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: data.publicUrl };
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
  return data || [];
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
  return { data };
}

export async function deleteActivity(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) {
    console.error("Error deleting activity:", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteActivityBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("activities").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting activities:", error);
    return { error: error.message };
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
  const compressed = await compressImage(file);
  const path = `activities/${activityId}.jpg`;

  await cleanupOldFiles("activities", activityId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true });
  if (uploadError) {
    console.error("Error uploading activity image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: data.publicUrl };
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
  return { data };
}

export async function deleteGallery(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("gallery").delete().eq("id", id);
  if (error) {
    console.error("Error deleting gallery:", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteGalleryBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("gallery").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting gallery:", error);
    return { error: error.message };
  }
  return {};
}

export async function uploadGalleryImage(
  file: File,
  galleryId: string
): Promise<{ url: string | null; error?: string }> {
  const compressed = await compressImage(file);
  const path = `gallery/${galleryId}.jpg`;

  await cleanupOldFiles("gallery", galleryId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true });
  if (uploadError) {
    console.error("Error uploading gallery image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: data.publicUrl };
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

export async function updateAchievement(
  id: string,
  achievement: {
    title?: string;
    description?: string;
    category?: string;
    year?: number;
    image_url?: string;
    sort_order?: number;
  }
): Promise<{ data: Achievement | null; error?: string }> {
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
  return { data };
}

export async function deleteAchievement(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("achievements").delete().eq("id", id);
  if (error) {
    console.error("Error deleting achievement:", error);
    return { error: error.message };
  }
  return {};
}

export async function deleteAchievementBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("achievements").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting achievements:", error);
    return { error: error.message };
  }
  return {};
}

export async function uploadAchievementImage(
  file: File,
  achievementId: string
): Promise<{ url: string | null; error?: string }> {
  const compressed = await compressImage(file);
  const path = `achievements/${achievementId}.jpg`;

  await cleanupOldFiles("achievements", achievementId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true });
  if (uploadError) {
    console.error("Error uploading achievement image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function uploadTeacherPhoto(
  file: File,
  teacherId: string
): Promise<{ url: string | null; error?: string }> {
  const compressed = await compressImage(file);
  const path = `teachers/${teacherId}.jpg`;

  await cleanupOldFiles("teachers", teacherId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true });

  if (uploadError) {
    console.error("Error uploading teacher photo:", uploadError);
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: data.publicUrl };
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

  // Send confirmation email to sender + admin notification (fire-and-forget)
  sendContactEmail(message).catch(() => {});
  sendContactAdminEmail(message).catch(() => {});

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
  const { error } = await supabase.from("teachers").update(data).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteTeacher(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("teachers").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteTeacherBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("teachers").delete().in("id", ids);
  if (error) return { error: error.message };
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