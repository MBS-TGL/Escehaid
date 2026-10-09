import { supabase } from "../supabase";
import type { ContactMessage } from "../supabase";
import { notifyAllAdmins } from "./users";

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
