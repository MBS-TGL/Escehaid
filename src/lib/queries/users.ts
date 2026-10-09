import { supabase } from "../supabase";
import type { UserProfile } from "../auth";

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
