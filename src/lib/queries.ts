import { supabase } from "./supabase";
import type { SchoolProfile, News, Gallery, SpmbRegistration, Teacher, Facility, Article, Achievement, ContactMessage } from "./supabase";

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
export async function getNewsList(limit?: number): Promise<News[]> {
  let query = supabase
    .from("news")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching news:", JSON.stringify(error), error.message, error.code);
    return [];
  }
  return data || [];
}

export async function getNewsListAll(): Promise<News[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all news:", error);
    return [];
  }
  return data || [];
}

export async function getNewsBySlug(slug: string): Promise<News | null> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching news by slug:", error);
    return null;
  }
  return data;
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
export async function getArticleList(limit?: number): Promise<Article[]> {
  let query = supabase
    .from("articles")
    .select("*")
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
  return data || [];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching article by slug:", error);
    return null;
  }
  return data;
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
