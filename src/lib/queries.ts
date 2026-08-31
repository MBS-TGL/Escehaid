import { supabase } from "./supabase";
import type { SchoolProfile, News, Gallery, SpmbRegistration, Teacher, Facility, Article, Achievement, ContactMessage } from "./supabase";
import type { UserProfile } from "./auth";

interface NewsWithAuthor extends News {
  author_name?: string;
}

interface ArticleWithAuthor extends Article {
  author_name?: string;
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
export async function getNewsList(limit?: number): Promise<NewsWithAuthor[]> {
  let query = supabase
    .from("news")
    .select("*, user_profiles(full_name)")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

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

export async function createNews(news: {
  title: string;
  summary?: string;
  content?: string;
  category?: string;
  image_url?: string;
  is_published?: boolean;
}): Promise<{ data: News | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("news")
    .insert({ ...news, author_id: user?.id })
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
    is_published?: boolean;
  }
): Promise<{ data: News | null; error?: string }> {
  const { data, error } = await supabase
    .from("news")
    .update(news)
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
  const ext = file.name.split(".").pop();
  const path = `news/${newsId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, file, { upsert: true });

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
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("spmb_registrations").insert(registration);

  if (error) {
    console.error("Error submitting registration:", error);
    return { success: false, error: error.message };
  }
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

// ============ ARTICLES ============
export async function getArticleList(limit?: number): Promise<ArticleWithAuthor[]> {
  let query = supabase
    .from("articles")
    .select("*, user_profiles(full_name)")
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
  const ext = file.name.split(".").pop();
  const path = `articles/${articleId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, file, { upsert: true });
  if (uploadError) {
    console.error("Error uploading article image:", uploadError);
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
  const ext = file.name.split(".").pop();
  const path = `gallery/${galleryId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, file, { upsert: true });
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
  const ext = file.name.split(".").pop();
  const path = `achievements/${achievementId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, file, { upsert: true });
  if (uploadError) {
    console.error("Error uploading achievement image:", uploadError);
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