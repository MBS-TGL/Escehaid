import { supabase } from "../supabase";
import type { SpmbRegistration } from "../supabase";
import { sanitizeSearchTerm } from "./shared";

/**
 * Daftar pendaftar SPMB sisi-server (Fase 1): filter/pencarian/sort/paginasi
 * lewat view `spmb_admin_registrations` (migrasi 0023), bukan load-all di
 * klien. View bersifat security_invoker → RLS `spmb:read` tetap berlaku.
 *
 * Semantik filter mengikuti `filterSpmbRegistrations` (lib/spmb-filter.ts):
 * pencarian mencakup nama, sekolah, email, telepon, NISN/NIK, program,
 * jalur, serta "putra/putri". JSONB `cf_*` dan label jalur tidak bisa
 * disaring di `.or()` secara murah — kata kunci itu jatuh ke filter klien
 * pasca-halaman (lihat `clientSearchRemainder`).
 */

export type SpmbSortField = "created_at" | "full_name" | "status" | "registration_path" | "gender";
export type SpmbSortDir = "asc" | "desc";

export interface SpmbListQuery {
  search?: string;
  status?: string;
  path?: string;
  program?: string;
  gender?: string;
  /**
   * Filter cepat "perlu tindakan":
   * - overdue: pending & lewat SLA (is_overdue dari view)
   * - docs_rejected: ada berkas ditolak
   * - docs_incomplete: berkas belum lengkap (uploaded < 5) atau belum
   *   terverifikasi penuh (doc_verified < 5) atau ada yang ditolak
   * - no_wave: tanpa gelombang
   * - duplicates: id ada di `duplicateIds`
   */
  action?: "all" | "overdue" | "docs_rejected" | "docs_incomplete" | "no_wave" | "duplicates";
  /** Id duplikat (dari getDuplicateCandidates) — dipakai action=duplicates. */
  duplicateIds?: string[];
  /**
   * Filter wawancara: scheduled (punya jadwal), unscheduled (pending tanpa
   * jadwal), this_week (jadwal 7 hari ke depan), overdue (jadwal lewat &
   * masih pending).
   */
  interview?: "all" | "scheduled" | "unscheduled" | "this_week" | "overdue";
  page?: number;
  pageSize?: number;
  sortField?: SpmbSortField;
  sortDir?: SpmbSortDir;
}

/** Baris view = SpmbRegistration + kolom turunan agregat. */
export interface SpmbAdminListRow extends SpmbRegistration {
  doc_total: number;
  doc_verified: number;
  doc_rejected: number;
  doc_pending: number;
  uploaded_docs: number;
  wave_name: string | null;
  wave_quota: number | null;
  is_overdue: boolean;
}

export interface SpmbListResult {
  rows: SpmbAdminListRow[];
  total: number;
}

function genderSearchTerm(q: string): "L" | "P" | null {
  const t = q.trim().toLowerCase();
  if (!t || t.length < 2) return null;
  if ("putra laki".includes(t)) return "L";
  if ("putri perempuan".includes(t)) return "P";
  return null;
}

/**
 * Sisa pencarian yang TIDAK bisa diekspresikan di `.or()` server
 * (jawaban `cf_*`, label jalur, alias gender panjang) — diterapkan ke
 * hasil halaman di klien. Return true bila baris cocok dengan sisa itu.
 */
export function clientSearchRemainder(row: SpmbRegistration, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const docs = row.documents ?? {};
  const customText = Object.keys(docs)
    .filter((key) => key.startsWith("cf_"))
    .map((key) => docs[key] || "")
    .join(" ")
    .toLowerCase();
  const pathLabels: Record<string, string> = { reguler: "reguler", prestasi: "prestasi", beasiswa: "beasiswa" };
  const path = row.registration_path || "";
  const genderText = row.gender === "P" ? "putri perempuan" : "putra laki";
  return customText.includes(q) || (pathLabels[path] || "").includes(q) || genderText.includes(q);
}

const VALID_SORT: Record<string, string> = {
  created_at: "created_at",
  full_name: "full_name",
  status: "status",
  registration_path: "registration_path",
  gender: "gender",
};

function normalized(params: SpmbListQuery) {
  return {
    search: sanitizeSearchTerm(params.search ?? ""),
    sortField: VALID_SORT[params.sortField ?? "created_at"] ?? "created_at",
    ascending: (params.sortDir ?? "desc") === "asc",
  };
}

function applySearch<T extends { or: (s: string) => T }>(query: T, search: string): T {
  if (!search) return query;
  const like = `%${search}%`;
  const g = genderSearchTerm(search);
  // Catatan: jsonb `documents->>nisn` valid di sintaks `.or()` PostgREST.
  const or = [
    `full_name.ilike.${like}`,
    `previous_school.ilike.${like}`,
    `email.ilike.${like}`,
    `phone.ilike.${like}`,
    `documents->>nisn.ilike.${like}`,
    `documents->>nik.ilike.${like}`,
    `documents->>program.ilike.${like}`,
    `registration_path.ilike.${like}`,
  ];
  if (g) or.push(`gender.eq.${g}`);
  return query.or(or.join(","));
}

function applyExact<T extends { eq: (c: string, v: string | boolean) => T; filter: (c: string, op: string, v: string) => T; or: (s: string) => T; is: (c: string, v: null) => T; not: (c: string, op: string, v: string | null) => T; gt: (c: string, v: number) => T; lt: (c: string, v: number | string) => T; gte: (c: string, v: string) => T; lte: (c: string, v: string) => T; in: (c: string, v: string[]) => T }>(
  query: T,
  params: SpmbListQuery
): T {
  let q = query;
  if (params.status && params.status !== "all") q = q.eq("status", params.status);
  if (params.path && params.path !== "all") q = q.eq("registration_path", params.path);
  if (params.gender && params.gender !== "all") q = q.eq("gender", params.gender);
  if (params.program && params.program !== "all") {
    q =
      params.program === "none"
        ? q.or("documents->>program.is.null,documents->>program.eq.")
        : q.filter("documents->>program", "eq", params.program);
  }
  // ── Filter cepat "perlu tindakan" ──
  switch (params.action) {
    case "overdue":
      q = q.eq("status", "pending").eq("is_overdue", true);
      break;
    case "docs_rejected":
      q = q.gt("doc_rejected", 0);
      break;
    case "docs_incomplete":
      // Belum lengkap (uploaded < 5) ATAU belum terverifikasi penuh ATAU ada yang ditolak.
      q = q.or("uploaded_docs.lt.5,doc_verified.lt.5,doc_rejected.gt.0");
      break;
    case "no_wave":
      q = q.is("wave_id", null);
      break;
    case "duplicates":
      if (params.duplicateIds && params.duplicateIds.length > 0) {
        q = q.in("id", params.duplicateIds.slice(0, 2000));
      } else {
        // Tanpa kandidat duplikat tidak ada hasil — cegah "tampil semua".
        q = q.eq("id", "00000000-0000-0000-0000-000000000000");
      }
      break;
    default:
      break;
  }
  // ── Filter wawancara ──
  const now = new Date().toISOString();
  const week = new Date(Date.now() + 7 * 86400000).toISOString();
  switch (params.interview) {
    case "scheduled":
      q = q.not("interview_at", "is", null);
      break;
    case "unscheduled":
      q = q.eq("status", "pending").is("interview_at", null);
      break;
    case "this_week":
      q = q.gte("interview_at", now).lte("interview_at", week);
      break;
    case "overdue":
      q = q.eq("status", "pending").lt("interview_at", now);
      break;
    default:
      break;
  }
  return q;
}

export async function getRegistrationPage(params: SpmbListQuery): Promise<SpmbListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = [10, 25, 50, 100].includes(params.pageSize ?? 10) ? (params.pageSize ?? 10) : 10;
  const { search, sortField, ascending } = normalized(params);
  const from = (page - 1) * pageSize;

  let query = supabase.from("spmb_admin_registrations").select("*", { count: "exact" });
  query = applySearch(query, search);
  query = applyExact(query, params);
  const { data, error, count } = await query
    .order(sortField, { ascending })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    // View belum dimigrasi → lempar agar panel menampilkan pesan SQL,
    // bukan data kosong yang menyesatkan.
    throw new Error(error.message);
  }
  return { rows: ((data ?? []) as SpmbAdminListRow[]), total: count ?? 0 };
}

/** Semua id yang cocok filter — dipakai "pilih semua hasil" & ekspor massal. */
export async function getFilteredRegistrationIds(params: SpmbListQuery): Promise<string[]> {
  const ids: string[] = [];
  const pageSize = 1000;
  const { search, sortField, ascending } = normalized(params);
  let page = 1;
  for (;;) {
    let query = supabase.from("spmb_admin_registrations").select("id");
    query = applySearch(query, search);
    query = applyExact(query, params);
    const { data, error } = await query
      .order(sortField, { ascending })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { id: string }[];
    for (const r of rows) ids.push(r.id);
    if (rows.length < pageSize || ids.length >= 20000) break;
    page += 1;
  }
  return ids;
}

/** Baris penuh by daftar id (chunk 500) — dipakai broadcast terpilih. */
export async function getRegistrationsByIds(ids: string[]): Promise<SpmbAdminListRow[]> {
  const out: SpmbAdminListRow[] = [];
  const uniq = Array.from(new Set(ids)).slice(0, 20000);
  for (let i = 0; i < uniq.length; i += 500) {
    const chunk = uniq.slice(i, i + 500);
    const { data, error } = await supabase
      .from("spmb_admin_registrations")
      .select("*")
      .in("id", chunk);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as SpmbAdminListRow[]));
  }
  return out;
}

/** Satu baris penuh by id — dipakai refresh detail setelah mutasi. */
export async function getRegistrationById(id: string): Promise<SpmbAdminListRow | null> {
  const { data, error } = await supabase
    .from("spmb_admin_registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as SpmbAdminListRow | null;
}

/** Baris pipeline (pending + interview + final) — kartu butuh kolom ringan. */
export async function getPipelineRows(): Promise<SpmbAdminListRow[]> {
  const { data, error } = await supabase
    .from("spmb_admin_registrations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as SpmbAdminListRow[]);
}

/** Kandidat duplikat: id + nama + telepon + NISN/NIK (tanpa PII lain). */
export async function getDuplicateCandidates(): Promise<
  { id: string; full_name: string; phone: string; nisn: string; nik: string }[]
> {
  const { data, error } = await supabase
    .from("spmb_admin_registrations")
    .select("id, full_name, phone, documents->>nisn, documents->>nik")
    .order("created_at", { ascending: false })
    .limit(20000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    full_name: String(r.full_name ?? ""),
    phone: String(r.phone ?? ""),
    nisn: String((r.nisn as string | null) ?? (r["documents->>nisn"] as string | null) ?? ""),
    nik: String((r.nik as string | null) ?? (r["documents->>nik"] as string | null) ?? ""),
  }));
}

// ── Agregat ringan (stats/facet/insight) ─────────────────────────────────────

/**
 * Baris agregat ringan untuk stats pills, facet filter, quick-filter
 * "perlu tindakan", dan tab Statistik — tanpa memuat documents PII,
 * berkas, atau catatan admin. Satu query, dihitung klien.
 */
export interface SpmbAggregateRow {
  id: string;
  status: string;
  registration_path: string | null;
  gender: string | null;
  previous_school: string | null;
  wave_id: string | null;
  created_at: string;
  updated_at: string;
  interview_at: string | null;
  reregistration_status: string | null;
  program: string | null;
  doc_total: number;
  doc_verified: number;
  doc_rejected: number;
  uploaded_docs: number;
  is_overdue: boolean;
}

export async function getSpmbAggregates(): Promise<SpmbAggregateRow[]> {
  const { data, error } = await supabase
    .from("spmb_admin_registrations")
    .select(
      "id, status, registration_path, gender, previous_school, wave_id, created_at, updated_at, interview_at, reregistration_status, is_overdue, doc_total, doc_verified, doc_rejected, uploaded_docs, documents->>program"
    )
    .order("created_at", { ascending: false })
    .limit(20000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    status: String(r.status),
    registration_path: (r.registration_path as string | null) ?? null,
    gender: (r.gender as string | null) ?? null,
    previous_school: (r.previous_school as string | null) ?? null,
    wave_id: (r.wave_id as string | null) ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    interview_at: (r.interview_at as string | null) ?? null,
    reregistration_status: (r.reregistration_status as string | null) ?? null,
    program: (r.program as string | null) ?? null,
    doc_total: Number(r.doc_total ?? 0),
    doc_verified: Number(r.doc_verified ?? 0),
    doc_rejected: Number(r.doc_rejected ?? 0),
    uploaded_docs: Number(r.uploaded_docs ?? 0),
    is_overdue: r.is_overdue === true,
  }));
}
