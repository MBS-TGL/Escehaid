import { supabase } from "../supabase";

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
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function getActiveAgendaEvents(): Promise<AgendaEvent[]> {
  const { data, error } = await supabase
    .from("agenda_events")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data || [];
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
  const { error } = await supabase.from("agenda_events").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAgendaEventBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("agenda_events").delete().in("id", ids);
  if (error) return { error: error.message };
  return {};
}

// ============================================================
// Teachers (Guru & Staff)
// ============================================================
