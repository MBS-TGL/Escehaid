import { supabase } from "../supabase";
import { reorderRows } from "./shared";

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

/** Item pengumuman siap render: teks + tautan opsional.
 *  `href` hanya terisi bila teks memakai pemisah `|` (mis. `SPMB dibuka! | /admission`)
 *  atau cocok aturan auto-link (SPMB → /admission, prestasi → /achievements). */
export interface AnnouncementLink {
  text: string;
  href?: string;
}

const AUTO_LINK_RULES: { pattern: RegExp; href: string }[] = [
  { pattern: /spmb|ppdb|penerimaan murid|daftar ulang|pendaftaran/i, href: "/admission" },
  { pattern: /prestasi|juara|medali|olimpiade|penghargaan/i, href: "/achievements" },
];

/** Validasi href aman: path internal `/...` atau URL http(s) penuh. */
function isSafeHref(raw: string): boolean {
  const v = raw.trim();
  if (/^https?:\/\/[^\s]+$/i.test(v)) return true;
  return /^\/[a-z0-9\-/_#?=&.%]*$/i.test(v);
}

/**
 * Parse satu baris pengumuman menjadi teks + tautan opsional (tanpa migrasi DB).
 * - Format eksplisit: `Teks tampil | /tujuan` (pemisah `|` terakhir; href tak valid → teks polos).
 * - Tanpa pemisah: auto-link keyword SPMB → /admission, prestasi → /achievements.
 */
export function parseAnnouncementLink(raw: string): AnnouncementLink {
  const trimmed = raw.trim();
  if (!trimmed) return { text: "" };
  const sepIdx = trimmed.lastIndexOf("|");
  if (sepIdx > 0) {
    const text = trimmed.slice(0, sepIdx).trim();
    const href = trimmed.slice(sepIdx + 1).trim();
    if (text && href && isSafeHref(href)) return { text, href };
    if (text) return { text };
  }
  const rule = AUTO_LINK_RULES.find((r) => r.pattern.test(trimmed));
  return rule ? { text: trimmed, href: rule.href } : { text: trimmed };
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

/** Simpan urutan baru pengumuman (drag & drop). Pemanggil renumber 1..n. */
export function reorderAnnouncements(
  items: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  return reorderRows("announcements", items);
}

// ============================================================
// Arsip publik /pengumuman
// ============================================================

/** Baris arsip untuk halaman publik /pengumuman. */
export interface AnnouncementArchiveItem {
  id: string;
  text: string;
  created_at: string;
  /** Null bila tanpa kedaluwarsa ATAU kolomnya belum dimigrasi. */
  expires_at: string | null;
}

/**
 * Arsip pengumuman publik (/pengumuman): seluruh baris aktif yang tidak
 * di-soft-delete, TERMASUK yang sudah lewat `expires_at` — bagian "sudah
 * berlalu" halaman memakainya sebagai riwayat. Urutan `sort_order` (kurasi
 * yang sama dengan bar berjalan). Tangguh seperti `getActiveAnnouncements`:
 * kolom `expires_at` belum ada → fallback tanpa kolom; error lain → []
 * (halaman tampil kosong, bukan 500).
 */
export async function getAnnouncementArchive(): Promise<AnnouncementArchiveItem[]> {
  const primary = await supabase
    .from("announcements")
    .select("id, text, created_at, expires_at")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (primary.error && (primary.error.code === "PGRST204" || /expires_at|42703|schema cache/i.test(primary.error.message || ""))) {
    const fallback = await supabase
      .from("announcements")
      .select("id, text, created_at")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    if (fallback.error) {
      console.error("Error fetching announcement archive:", fallback.error);
      return [];
    }
    // Kolom expires_at belum ada → semua dianggap tanpa kedaluwarsa.
    return ((fallback.data || []) as Omit<AnnouncementArchiveItem, "expires_at">[]).map((d) => ({
      ...d,
      expires_at: null,
    }));
  }
  if (primary.error) {
    console.error("Error fetching announcement archive:", primary.error);
    return [];
  }
  return (primary.data || []) as AnnouncementArchiveItem[];
}

// ============================================================
// Agenda Events (countdown timer homepage)
// ============================================================
