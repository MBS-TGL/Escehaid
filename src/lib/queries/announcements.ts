import { supabase } from "../supabase";

export interface Announcement {
  id: string;
  text: string;
  is_active: boolean;
  sort_order: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  /** Terisi bila item di-soft-delete (lihat /admin/trash). */
  deleted_at?: string | null;
}

/** Tanggal hari ini (zona WIB) sebagai "YYYY-MM-DD" — pola sama dengan admission/page.tsx. */
function todayWIB(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching announcements:", error);
    // Melempar error agar panel admin bisa membedakan "kosong" vs "gagal
    // memuat" — pemanggil (panel pengumuman) menangkap dan menampilkan retry.
    throw new Error(error.message);
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
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.code === "PGRST204" || /expires_at|42703|schema cache/i.test(error.message || "")) {
      const fallback = await supabase
        .from("announcements")
        .select("text")
        .eq("is_active", true)
        .is("deleted_at", null)
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

let announcementSourceColPromise: Promise<boolean> | null = null;
/**
 * Probe sekali per proses: apakah kolom `source` sudah ada di tabel
 * announcements (migrasi supabase/content_source.sql — penanda "panel-ai")?
 * false → payload insert disusun tanpa `source` agar createAnnouncement
 * tetap aman sebelum migrasi.
 */
export function announcementsHasSourceColumn(): Promise<boolean> {
  if (!announcementSourceColPromise) {
    announcementSourceColPromise = Promise.resolve(
      supabase.from("announcements").select("source").limit(0)
    ).then(
      ({ error }) => !error || !/does not exist|42703/.test(error.message || ""),
      () => false
    );
  }
  return announcementSourceColPromise;
}

export async function createAnnouncement(
  text: string,
  expiresAt?: string | null,
  /** Penanda asal pengumuman, mis. "panel-ai" (butuh kolom source — content_source.sql). */
  source?: string
): Promise<{ error?: string }> {
  // Penanda sumber hanya dikirim bila kolomnya sudah ada (migrasi belum jalan → lewati diam-diam).
  const hasSourceCol = source ? await announcementsHasSourceColumn() : false;
  const payload: Record<string, unknown> = { text, expires_at: expiresAt || null };
  if (hasSourceCol) payload.source = source;
  const { error } = await supabase.from("announcements").insert(payload);
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

/** Soft-delete — item pindah ke Sampah (/admin/trash). */
export async function deleteAnnouncement(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("announcements").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAnnouncementBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("announcements").update({ deleted_at: new Date().toISOString() }).in("id", ids);
  if (error) return { error: error.message };
  return {};
}

// ============================================================
// Agenda Events (countdown timer homepage)
// ============================================================
