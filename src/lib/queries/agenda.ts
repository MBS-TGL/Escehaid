import { supabase } from "../supabase";
import { reorderRows } from "./shared";

export interface AgendaEvent {
  id: string;
  title: string;
  event_date: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getAgendaEvents(): Promise<AgendaEvent[]> {
  const { data, error } = await supabase
    .from("agenda_events")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) {
    // Melempar error agar panel admin bisa membedakan "kosong" vs "gagal
    // memuat" — pemanggil (panel agenda) menangkap dan menampilkan retry.
    console.error("Error fetching agenda events:", error);
    throw new Error(error.message);
  }
  return data || [];
}

export async function getActiveAgendaEvents(): Promise<AgendaEvent[]> {
  const { data, error } = await supabase
    .from("agenda_events")
    .select("id, title, event_date")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data || []) as AgendaEvent[];
}

/** Acara yang belum dimulai (event_date > `now`) — helper murni supaya
 *  komponen server tidak memanggil Date.now() langsung di badan render. */
export function filterUpcomingEvents(
  events: AgendaEvent[],
  now: Date = new Date()
): AgendaEvent[] {
  return events.filter((e) => new Date(e.event_date).getTime() > now.getTime());
}

export async function createAgendaEvent(title: string, event_date: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("agenda_events").insert({ title, event_date });
  if (error) return { error: error.message };
  return {};
}

export async function updateAgendaEvent(id: string, data: Partial<Pick<AgendaEvent, "title" | "event_date" | "is_active" | "sort_order">>): Promise<{ error?: string }> {
  const { error } = await supabase.from("agenda_events").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAgendaEvent(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("agenda_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAgendaEventBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("agenda_events")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { error: error.message };
  return {};
}

/** Hapus permanen dari Sampah (bukan dipakai UI modul Agenda). */
export async function purgeAgendaEvent(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("agenda_events").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

/** Simpan urutan baru acara agenda (drag & drop). Pemanggil renumber 1..n. */
export function reorderAgendaEvents(
  items: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  return reorderRows("agenda_events", items);
}

// ============================================================
// Teachers (Guru & Staff)
// ============================================================
