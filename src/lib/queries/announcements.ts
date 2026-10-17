import { supabase } from "../supabase";

export interface Announcement {
  id: string;
  text: string;
  is_active: boolean;
  sort_order: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Tanggal hari ini (zona WIB) sebagai "YYYY-MM-DD" — pola sama dengan admission/page.tsx. */
function todayWIB(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
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

/**
 * Teks pengumuman aktif untuk bar berjalan. Pengumuman yang sudah lewat
 * `expires_at` (dibandingkan dengan tanggal hari ini di zona Asia/Jakarta)
 * tidak ditampilkan; `expires_at` null = tanpa kedaluwarsa. Bila kolom
 * `expires_at` belum dimigrasi, jatuh kembali ke perilaku lama agar bar tetap
 * tampil (bukan hilang karena error schema).
 */
export async function getActiveAnnouncements(): Promise<string[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("text, expires_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.code === "PGRST204" || /expires_at|42703|schema cache/i.test(error.message || "")) {
      const fallback = await supabase
        .from("announcements")
        .select("text")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (fallback.error) return [];
      return (fallback.data || []).map((a) => a.text);
    }
    return [];
  }

  const today = todayWIB();
  return ((data ?? []) as { text: string; expires_at: string | null }[])
    .filter((a) => !a.expires_at || a.expires_at.slice(0, 10) >= today)
    .map((a) => a.text);
}

export async function createAnnouncement(text: string, expiresAt?: string | null): Promise<{ error?: string }> {
  const { error } = await supabase.from("announcements").insert({ text, expires_at: expiresAt || null });
  if (error) return { error: error.message };
  return {};
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Pick<Announcement, "text" | "is_active" | "sort_order" | "expires_at">>
): Promise<{ error?: string }> {
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
