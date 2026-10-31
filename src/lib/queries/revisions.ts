import type { SupabaseClient } from "@supabase/supabase-js";

export interface ContentRevision {
  id: string;
  entity_type: string;
  entity_id: string;
  snapshot: Record<string, unknown>;
  editor_id: string | null;
  editor_name?: string | null;
  note: string;
  created_at: string;
}

/**
 * Membaca daftar riwayat revisi untuk sebuah entitas konten.
 */
export async function getContentRevisions(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string
): Promise<ContentRevision[]> {
  try {
    const { data, error } = await supabase
      .from("content_revisions")
      .select("id, entity_type, entity_id, snapshot, editor_id, note, created_at, user_profiles(full_name)")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) return [];
      console.warn("Gagal memuat revisi konten:", error.message);
      return [];
    }

    type RawRev = {
      id: string;
      entity_type: string;
      entity_id: string;
      snapshot: Record<string, unknown>;
      editor_id: string | null;
      note: string;
      created_at: string;
      user_profiles?: { full_name?: string | null } | null;
    };

    return ((data || []) as RawRev[]).map((row) => ({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      snapshot: row.snapshot,
      editor_id: row.editor_id,
      editor_name: row.user_profiles?.full_name ?? null,
      note: row.note,
      created_at: row.created_at,
    }));
  } catch (e) {
    console.warn("Exception getContentRevisions:", e);
    return [];
  }
}
