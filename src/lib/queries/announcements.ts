import { supabase } from "../supabase";

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
