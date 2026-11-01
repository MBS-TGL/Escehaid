import { supabase } from "../supabase";
import type { ContactMessage } from "../supabase";
import { sanitizeSearchTerm, tableHasColumn } from "./shared";
import { CONTACT_CATEGORY_KEYWORDS } from "../admin-display";
import { notifyAllAdmins } from "./users";

/** Probe kolom `is_archived` (migrasi 0021) — memoized. */
export function contactHasArchiveColumn(): Promise<boolean> {
  return tableHasColumn("contact_messages", "is_archived");
}

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
/**
 * DEPRECATED — form publik kini lewat `POST /api/contact` (rate-limit +
 * honeypot + validasi di server). Dipertahankan agar pemanggil lama tidak
 * rusak; TANPA proteksi spam.
 */
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

  // In-app notification to admins
  notifyAllAdmins(
    "Pesan Baru dari Website",
    `${message.name} mengirim pesan: "${message.subject || message.message.slice(0, 50)}..."`,
    "info",
    "/admin/contact"
  ).catch(() => {});

  return { success: true };
}

export type ContactListFilter = "all" | "unread" | "read" | "archived";
export type ContactSortField = "created_at" | "name" | "is_read";

export type ContactCategoryFilter = "all" | "spmb" | "akademik" | "layanan" | "umum";

export interface ContactListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: ContactListFilter | string;
  /** Dugaan kategori (heuristik kata kunci, tanpa kolom DB). */
  category?: ContactCategoryFilter | string;
  sortField?: ContactSortField | string;
  sortDir?: "asc" | "desc";
}

export interface ContactListResult {
  /** Baris ringan TANPA isi `message` (kolom diambil saat detail dibuka). */
  rows: Omit<ContactMessage, "message">[];
  /** Total baris yang cocok dengan filter/search (untuk pagination). */
  count: number;
  /** false = kolom arsip belum ada (SQL 0021 belum jalan) — UI sembunyikan filter arsip. */
  archiveAvailable: boolean;
}

/** Kolom ringan daftar (tanpa `message` yang bisa panjang). */
const CONTACT_LIST_COLUMNS = "id, name, email, phone, subject, is_read, created_at";
const CONTACT_LIST_COLUMNS_ARCHIVED = `${CONTACT_LIST_COLUMNS}, is_archived`;

/**
 * Daftar pesan dengan pagination + filter + search di sisi server (PostgREST).
 * Search mencakup nama, email, subjek, DAN isi pesan.
 * Filter default menyembunyikan arsip; filter "archived" hanya arsip.
 */
export async function getContactMessageList(
  params: ContactListParams = {}
): Promise<ContactListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const hasArchive = await contactHasArchiveColumn();

  let query = supabase
    .from("contact_messages")
    .select(hasArchive ? CONTACT_LIST_COLUMNS_ARCHIVED : CONTACT_LIST_COLUMNS, { count: "exact" });

  const filter = params.filter ?? "all";
  if (filter === "unread") query = query.eq("is_read", false);
  else if (filter === "read") query = query.eq("is_read", true);
  // Arsip disembunyikan dari semua tampilan kecuali filter "archived"
  // (bila kolom belum ada, semua baris dianggap aktif).
  if (hasArchive) {
    query = filter === "archived" ? query.eq("is_archived", true) : query.eq("is_archived", false);
  } else if (filter === "archived") {
    return { rows: [], count: 0, archiveAvailable: false };
  }

  const term = sanitizeSearchTerm(params.search ?? "");
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,email.ilike.%${term}%,subject.ilike.%${term}%,message.ilike.%${term}%`
    );
  }

  // Filter dugaan kategori: ilike per kata kunci di subjek ATAU isi.
  // "umum" = TIDAK memuat kata kunci kategori mana pun (NOT + AND).
  const category = params.category ?? "all";
  const catWords =
    category === "spmb" || category === "akademik" || category === "layanan"
      ? CONTACT_CATEGORY_KEYWORDS[category]
      : null;
  if (catWords) {
    const orParts = catWords.flatMap((w) => [`subject.ilike.%${w}%`, `message.ilike.%${w}%`]);
    query = query.or(orParts.join(","));
  } else if (category === "umum") {
    const allWords = Object.values(CONTACT_CATEGORY_KEYWORDS).flat();
    for (const w of allWords) {
      query = query.not("subject", "ilike", `%${w}%`).not("message", "ilike", `%${w}%`);
    }
  }

  const sortField: ContactSortField =
    params.sortField === "name" || params.sortField === "is_read"
      ? params.sortField
      : "created_at";
  const ascending = (params.sortDir ?? "desc") === "asc";

  // select string runtime tidak bisa di-infer Supabase (kolom arsip opsional)
  // → cast manual, pola yang sama dipakai articles.ts untuk author_name.
  const { data, error, count } = (await query
    .order(sortField, { ascending })
    // Tiebreak agar urutan stabil antar halaman saat nilai sort sama.
    .order("id", { ascending: false })
    .range(from, from + pageSize - 1)) as unknown as {
    data: Omit<ContactMessage, "message">[] | null;
    error: { message?: string } | null;
    count: number | null;
  };

  if (error) {
    console.error("Error fetching contacts:", error);
    // Melempar error agar panel admin bisa membedakan "kosong" vs "gagal
    // memuat" — pemanggil (panel kontak) menangkap dan menampilkan retry.
    throw new Error(error.message);
  }
  return { rows: data ?? [], count: count ?? 0, archiveAvailable: hasArchive };
}

/**
 * Arsipkan / keluarkan pesan dari arsip (butuh kolom is_archived, migrasi 0021).
 * Mengarsipkan otomatis menandai sudah dibaca (arsip = selesai ditindaklanjuti)
 * sehingga hitungan "belum dibaca" di dashboard ikut turun tanpa query baru.
 */
export async function setContactArchived(id: string, archived: boolean): Promise<{ error?: string }> {
  const patch = archived ? { is_archived: true, is_read: true } : { is_archived: false };
  const { error } = await supabase
    .from("contact_messages")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.error("Error archiving contact:", error);
    return { error: error.message };
  }
  return {};
}

/** Arsipkan / keluarkan banyak pesan sekaligus dari arsip. */
export async function setContactArchivedBulk(ids: string[], archived: boolean): Promise<{ error?: string }> {
  const patch = archived ? { is_archived: true, is_read: true } : { is_archived: false };
  const { error } = await supabase
    .from("contact_messages")
    .update(patch)
    .in("id", ids);
  if (error) {
    console.error("Error bulk archiving contacts:", error);
    return { error: error.message };
  }
  return {};
}

/** Awal hari ini zona Asia/Jakarta sebagai ISO UTC (tengah malam WIB). */
function jakartaStartOfDayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 7 * 3_600_000).toISOString();
}

/**
 * Statistik ringkas untuk kartu StatPill: total/belum-dibaca/hari-ini AKTIF
 * (di luar arsip) + jumlah arsip. Bila kolom arsip belum ada, arsip = 0 dan
 * angka aktif = seluruh tabel.
 */
export async function getContactStats(): Promise<{ total: number; unread: number; today: number; archived: number; archiveAvailable: boolean }> {
  const startOfDay = jakartaStartOfDayISO();
  const hasArchive = await contactHasArchiveColumn();

  // Filter builder PostgREST bisa dirangkai kondisional sebelum dieksekusi.
  const totalQ = supabase.from("contact_messages").select("id", { count: "exact", head: true });
  const unreadQ = supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false);
  const todayQ = supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay);
  if (hasArchive) {
    totalQ.eq("is_archived", false);
    unreadQ.eq("is_archived", false);
    todayQ.eq("is_archived", false);
  }

  const [total, unread, today, archived] = await Promise.all([
    totalQ,
    unreadQ,
    todayQ,
    hasArchive
      ? supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_archived", true)
      : Promise.resolve({ count: 0 as number | null, error: null }),
  ]);

  if (total.error) throw new Error(total.error.message);
  return {
    total: total.count ?? 0,
    unread: unread.count ?? 0,
    today: today.count ?? 0,
    archived: archived.count ?? 0,
    archiveAvailable: hasArchive,
  };
}

/** Satu pesan penuh (termasuk isi) untuk SlideOver detail. */
export async function getContactMessageDetail(id: string): Promise<ContactMessage> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Error fetching contact detail:", error);
    throw new Error(error?.message || "Pesan tidak ditemukan.");
  }
  return data as ContactMessage;
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

// ============ USER PROFILES ============
