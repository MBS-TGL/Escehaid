import { supabase } from "../supabase";

export interface SpmbMessageTemplate {
  key: string;
  label: string;
  body: string;
  sort_order: number;
  is_active: boolean;
}

export async function getSpmbMessageTemplates(): Promise<SpmbMessageTemplate[]> {
  const { data, error } = await supabase
    .from("spmb_message_templates")
    .select("key, label, body, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return [];
    console.error("Error fetching SPMB templates:", error);
    return [];
  }
  return (data ?? []) as SpmbMessageTemplate[];
}

export async function updateSpmbMessageTemplate(
  key: string,
  body: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("spmb_message_templates")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) return { error: error.message };
  return {};
}
