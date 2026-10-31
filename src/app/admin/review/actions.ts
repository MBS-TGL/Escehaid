"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ReviewResult = {
  success: boolean;
  error?: string;
};

/**
 * Menyimpan snapshot versi ke content_revisions.
 */
export async function recordRevisionAction(input: {
  entityType: "news" | "articles";
  entityId: string;
  snapshot: Record<string, unknown>;
  note?: string;
}): Promise<ReviewResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  try {
    const { error } = await supabase.from("content_revisions").insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      snapshot: input.snapshot,
      editor_id: userId || null,
      note: input.note || "Perubahan konten",
    });

    if (error) {
      console.warn("Gagal mencatat content revision:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Mengajukan konten untuk ditinjau oleh reviewer/admin.
 */
export async function submitForReviewAction(input: {
  entityType: "news" | "articles";
  entityId: string;
  title: string;
  note?: string;
}): Promise<ReviewResult> {
  const supabase = await createClient();

  const table = input.entityType === "news" ? "news" : "articles";

  try {
    // Pastikan tidak published saat diajukan
    const { error } = await supabase
      .from(table)
      .update({
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.entityId);

    if (error) return { success: false, error: error.message };

    // Catat notifikasi untuk para reviewer/admin
    const { data: reviewers } = await supabase
      .from("user_profiles")
      .select("id")
      .in("role", ["developer", "admin"]);

    if (reviewers && reviewers.length > 0) {
      const notifs = reviewers.map((r) => ({
        user_id: r.id,
        title: `Pengajuan Review: ${input.title}`,
        message: input.note || "Ada konten baru yang diajukan untuk ditinjau sebelum diterbitkan.",
        type: "info",
        link: `/admin/review?type=${input.entityType}&id=${input.entityId}`,
      }));
      await supabase.from("notifications").insert(notifs);
    }

    revalidatePath(`/admin/${input.entityType}`);
    revalidatePath("/admin/review");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Menyetujui dan langsung menerbitkan konten (atau menjadwalkan).
 */
export async function approveAndPublishAction(input: {
  entityType: "news" | "articles";
  entityId: string;
  publishImmediately?: boolean;
}): Promise<ReviewResult> {
  const supabase = await createClient();
  const table = input.entityType === "news" ? "news" : "articles";

  try {
    const updatePayload: Record<string, unknown> = {
      is_published: true,
      updated_at: new Date().toISOString(),
    };
    if (input.publishImmediately) {
      updatePayload.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", input.entityId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/${input.entityType}`);
    revalidatePath("/admin/review");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Memulihkan konten dari snapshot revisi tertentu.
 */
export async function restoreRevisionAction(input: {
  entityType: "news" | "articles";
  entityId: string;
  revisionId: string;
}): Promise<ReviewResult> {
  const supabase = await createClient();
  const table = input.entityType === "news" ? "news" : "articles";

  try {
    const { data: rev, error: revErr } = await supabase
      .from("content_revisions")
      .select("snapshot")
      .eq("id", input.revisionId)
      .single();

    if (revErr || !rev) {
      return { success: false, error: "Snapshot revisi tidak ditemukan." };
    }

    const snapshot = rev.snapshot as Record<string, unknown>;
    // Bersihkan field sistem agar tidak menimpa ID / metadata
    delete snapshot.id;
    delete snapshot.created_at;
    snapshot.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from(table)
      .update(snapshot)
      .eq("id", input.entityId);

    if (error) return { success: false, error: error.message };

    // Catat bahwa pemulihan adalah revisi baru
    await recordRevisionAction({
      entityType: input.entityType,
      entityId: input.entityId,
      snapshot,
      note: "Dipulihkan dari revisi sebelumnya",
    });

    revalidatePath(`/admin/${input.entityType}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
