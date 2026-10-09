import { supabase } from "../supabase";
import { sanitizeSearchTerm } from "./shared";

/**
 * Log aktivitas admin (P2.8) — pembacaan tabel `audit_logs`.
 *
 * Penulisan bukan urusan kode ini: trigger `log_audit()` (lihat
 * `supabase/audit_logs.sql`) mencatat setiap INSERT/UPDATE/DELETE di tabel
 * konten & SPMB dengan `auth.uid()` sebagai aktor. Kode di sini hanya membaca,
 * dengan degradasi anggun: bila tabel belum dibuat (user belum menjalankan
 * SQL), halaman menampilkan panel "jalankan SQL" — tanpa error.
 */

export type AuditAction = "create" | "update" | "delete";

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

/** Label Indonesia untuk aksi log. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Tambah",
  update: "Ubah",
  delete: "Hapus",
};

/** Label Indonesia untuk tabel yang dicatat trigger (15 tabel). */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  news: "Berita",
  articles: "Artikel",
  activities: "Kegiatan",
  achievements: "Prestasi",
  gallery: "Galeri",
  announcements: "Pengumuman",
  agenda_events: "Agenda",
  facilities: "Fasilitas",
  teachers: "Guru",
  portal_apps: "Aplikasi Portal",
  spmb_registrations: "Pendaftar SPMB",
  spmb_waves: "Gelombang SPMB",
  contact_messages: "Pesan Masuk",
  user_profiles: "Pengguna",
  school_profile: "Profil Sekolah",
};

/**
 * Probe sekali per sesi: apakah tabel audit_logs sudah ada?
 * Head-count tidak mengembalikan baris — error = tabel belum dibuat (atau
 * belum di-GRANT), sukses = tersedia. Hasil di-cache supaya kunjungan berikut
 * tidak memanggil DB lagi.
 */
let auditProbe: Promise<boolean> | null = null;

async function probeAuditTable(): Promise<boolean> {
  // JANGAN pakai head:true di sini: respons HEAD tanpa body menyembunyikan
  // error "Could not find the table" (postgrest-js tak bisa membacanya) sehingga
  // tabel yang hilang dikira ada — padahal query GET biasa akan gagal.
  // GET kecil (limit 1) membawa body error sehingga probe membaca kebenaran.
  const { error } = await supabase.from("audit_logs").select("id").limit(1);
  if (error) console.info("audit_logs belum tersedia:", error.message);
  return !error;
}

export function auditLogsAvailable(): Promise<boolean> {
  auditProbe ??= probeAuditTable();
  return auditProbe;
}

export interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  action?: AuditAction | "";
  entity?: string | "";
  search?: string;
}

export interface AuditLogResult {
  /** false = tabel belum dibuat (SQL belum dijalankan user). */
  available: boolean;
  rows: AuditLogRow[];
  count: number;
  error: string | null;
}

const PAGE_SIZE_DEFAULT = 20;

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResult> {
  const available = await auditLogsAvailable();
  if (!available) return { available: false, rows: [], count: 0, error: null };

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? PAGE_SIZE_DEFAULT;
  const from = (page - 1) * pageSize;

  let query = supabase.from("audit_logs").select("*", { count: "exact" });

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entity) query = query.eq("entity_type", filters.entity);

  const term = sanitizeSearchTerm(filters.search ?? "");
  if (term) query = query.or(`actor_name.ilike.%${term}%,entity_id.ilike.%${term}%`);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("Error fetching audit logs:", JSON.stringify(error), error.message);
    // Skema PostgREST bisa saja belum mengenali tabel ini (cache skema) —
    // perlakukan seperti "belum siap", bukan error merah.
    if (error.message.includes("Could not find the table")) {
      return { available: false, rows: [], count: 0, error: null };
    }
    return { available: true, rows: [], count: 0, error: error.message };
  }
  return {
    available: true,
    rows: (data ?? []) as AuditLogRow[],
    count: count ?? 0,
    error: null,
  };
}

/** Statistik ringkas (total + hari ini) untuk kartu di atas tabel. */
export async function getAuditStats(): Promise<{ total: number; today: number } | null> {
  const available = await auditLogsAvailable();
  if (!available) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [total, today] = await Promise.all([
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
  ]);

  return { total: total.count ?? 0, today: today.count ?? 0 };
}
