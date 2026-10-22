import { supabase } from "../supabase";
import type {
  AgendaBlockRow,
  AgendaSlotItemRecord,
  AgendaSlotRow,
  QuranPillarRow,
} from "../supabase";
import type { BlockSummary, BlockKey, Day, Slot, SlotItem } from "../data/mbs-schedule";
import { postRevalidate } from "./revalidate";

/**
 * Konten halaman /program dari 3 tabel (supabase/program.sql):
 * `quran_pillars`, `agenda_blocks`, `agenda_slots`. Dikelola lewat
 * /admin/program (edit-only: `program:read` / `program:update` — set baris
 * terbatas, tidak ada create/delete).
 *
 * Pola tulis identik ekskul (browser → PostgREST + RLS). Bila SQL belum
 * dijalankan, getter mengembalikan [] — konsumen publik fallback ke data
 * statis di lib/data/mbs-*.ts sehingga situs tidak pernah rusak.
 */

/** Pesan ramah bila tabel/RLS belum disiapkan dan kesalahan umum lainnya. */
function friendlyError(error: { message?: string; code?: string } | null | undefined): string {
  const msg = error?.message || "";
  const missing =
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /Could not find the table|schema cache|does not exist/i.test(msg);
  if (missing) {
    return "Tabel program belum tersedia — jalankan supabase/program.sql di Supabase SQL Editor.";
  }
  return msg || "Terjadi kesalahan tidak terduga.";
}

function isNotYetMigrated(error: { message?: string; code?: string } | null | undefined): boolean {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /Could not find the table|schema cache|does not exist/i.test(error?.message || "")
  );
}

// ============ GETTER (bila SQL belum jalan → [] = fallback statis) ===========

/** Pilar Al-Qur'an aktif, urut sort_order. */
export async function getQuranPillarsList(): Promise<QuranPillarRow[]> {
  const { data, error } = await supabase
    .from("quran_pillars")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    if (!isNotYetMigrated(error)) {
      console.error("Error fetching quran_pillars:", error);
    }
    return [];
  }
  return (data || []) as QuranPillarRow[];
}

/** Semua pilar (termasuk nonaktif) untuk panel admin. */
export async function getQuranPillarsAll(): Promise<QuranPillarRow[]> {
  const { data, error } = await supabase
    .from("quran_pillars")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching quran_pillars (all):", error);
    throw new Error(friendlyError(error));
  }
  return (data || []) as QuranPillarRow[];
}

/** Blok agenda aktif, urut sort_order. */
export async function getAgendaBlocksList(): Promise<AgendaBlockRow[]> {
  const { data, error } = await supabase
    .from("agenda_blocks")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    if (!isNotYetMigrated(error)) {
      console.error("Error fetching agenda_blocks:", error);
    }
    return [];
  }
  return (data || []) as AgendaBlockRow[];
}

/** Semua blok (termasuk nonaktif) untuk panel admin. */
export async function getAgendaBlocksAll(): Promise<AgendaBlockRow[]> {
  const { data, error } = await supabase
    .from("agenda_blocks")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching agenda_blocks (all):", error);
    throw new Error(friendlyError(error));
  }
  return (data || []) as AgendaBlockRow[];
}

/** Slot jam aktif, urut sort_order. */
export async function getAgendaSlotsList(): Promise<AgendaSlotRow[]> {
  const { data, error } = await supabase
    .from("agenda_slots")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    if (!isNotYetMigrated(error)) {
      console.error("Error fetching agenda_slots:", error);
    }
    return [];
  }
  return (data || []) as AgendaSlotRow[];
}

/** Semua slot (termasuk nonaktif) untuk panel admin. */
export async function getAgendaSlotsAll(): Promise<AgendaSlotRow[]> {
  const { data, error } = await supabase
    .from("agenda_slots")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching agenda_slots (all):", error);
    throw new Error(friendlyError(error));
  }
  return (data || []) as AgendaSlotRow[];
}

// ============ UPDATE (edit-only; updated_at disetel eksplisit) ===============

export type QuranPillarInput = Partial<
  Pick<QuranPillarRow, "number" | "title" | "description" | "time_label" | "target" | "is_active" | "sort_order">
>;

export async function updateQuranPillar(
  id: string,
  patch: QuranPillarInput
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("quran_pillars")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Error updating quran_pillar:", error);
    return { error: friendlyError(error) };
  }
  return {};
}

export type AgendaBlockInput = Partial<
  Pick<
    AgendaBlockRow,
    "key" | "button_text" | "title" | "summary" | "start_time" | "end_time" | "time_label" | "is_active" | "sort_order"
  >
>;

export async function updateAgendaBlock(
  id: string,
  patch: AgendaBlockInput
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("agenda_blocks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Error updating agenda_block:", error);
    return { error: friendlyError(error) };
  }
  return {};
}

export type AgendaSlotInput = Partial<
  Pick<
    AgendaSlotRow,
    "block_key" | "start_time" | "end_time" | "items" | "is_active" | "sort_order"
  >
>;

export async function updateAgendaSlot(
  id: string,
  patch: AgendaSlotInput
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("agenda_slots")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Error updating agenda_slot:", error);
    return { error: friendlyError(error) };
  }
  return {};
}

/**
 * Simpan urutan hasil geser panah di panel /admin/program: update per baris,
 * laporkan error pertama yang gagal (pola reorderEkskuls). Hanya baris yang
 * sort_order-nya benar-benar berubah yang dikirim.
 */
export type ProgramTable = "quran_pillars" | "agenda_blocks" | "agenda_slots";

export async function reorderProgramRows(
  table: ProgramTable,
  rows: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  const results = await Promise.all(
    rows.map((row) =>
      supabase
        .from(table)
        .update({ sort_order: row.sort_order, updated_at: new Date().toISOString() })
        .eq("id", row.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: friendlyError(failed.error) };
  return {};
}

// ============ REVALIDATE =====================================================

/**
 * Invalidasi ISR halaman yang menampilkan konten program — /program,
 * beranda (kartu agenda + ringkasan section) dan /profile lewat API route
 * /api/revalidate. Dipanggil dari panel /admin/program setelah edit sukses.
 */
export async function revalidateProgram(): Promise<void> {
  await postRevalidate(["/program", "/", "/profile"], "revalidateProgram");
}

// ============ VIEW MAPPERS (baris DB → bentuk view publik statis) ============

/**
 * Pilar tampilan publik: bentuk sama dengan `QuranPillar` (mbs-quran.ts)
 * tanpa field needsReview (flag itu hanya milik seed/draft statis; konten
 * DB tampil apa adanya).
 */
export interface QuranPillarView {
  number: string;
  title: string;
  description: string;
  time: string;
  target: string;
}

export function pillarRowToView(row: QuranPillarRow): QuranPillarView {
  return {
    number: row.number,
    title: row.title,
    description: row.description,
    time: row.time_label,
    target: row.target,
  };
}

export interface AgendaBlockView {
  key: string;
  buttonText: string;
  title: string;
  summary: string;
  timeLabel: string;
}

export function blockRowToView(row: AgendaBlockRow): AgendaBlockView {
  return {
    key: row.key,
    buttonText: row.button_text || row.title,
    title: row.title,
    summary: row.summary,
    timeLabel: row.time_label,
  };
}

/**
 * Baris slot → bentuk `Slot` (mbs-schedule.ts) agar WeeklySchedule bisa
 * memakai seluruh helper jadwal (slot lintas tengah malam dsb.) tanpa beda.
 */
export function slotRowToSlot(row: AgendaSlotRow): Slot {
  const items: SlotItem[] = (row.items || []).map((it: AgendaSlotItemRecord) => ({
    label: it.label,
    days: (it.days || null) as Day[] | null,
  }));
  return {
    id: row.id,
    start: row.start_time,
    end: row.end_time,
    block: row.block_key as BlockKey,
    items,
  };
}

/**
 * Bentuk tampilan 4 blok agenda untuk kartu (identik BlockSummary statis,
 * start/end tetap diisi agar kompatibel penuh dengan type existing).
 */
export function blockRowToSummary(row: AgendaBlockRow): BlockSummary {
  return {
    key: row.key as BlockKey,
    buttonText: row.button_text || row.title,
    start: row.start_time,
    end: row.end_time,
    timeLabel: row.time_label,
    title: row.title,
    summary: row.summary,
  };
}
