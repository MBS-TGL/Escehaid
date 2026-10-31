"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

const MAX_VIEWS_PER_USER_MODULE = 20;

/**
 * Menyimpan atau memperbarui preset filter modul tertentu.
 */
export async function saveViewAction(input: {
  id?: string;
  module: string;
  name: string;
  params: Record<string, unknown>;
  isShared?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { success: false, error: "Sesi tidak sah. Silakan login ulang." };

  const name = input.name.trim();
  if (!name) return { success: false, error: "Nama tampilan wajib diisi." };
  if (name.length > 80) return { success: false, error: "Nama tampilan maksimal 80 karakter." };

  try {
    if (input.id) {
      // Update
      const { error } = await supabase
        .from("admin_saved_views")
        .update({
          name,
          params: input.params,
          is_shared: Boolean(input.isShared),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("user_id", userId);

      if (error) return { success: false, error: error.message };
      revalidatePath(`/admin/${input.module}`);
      return { success: true, data: { id: input.id } };
    }

    // Cek batas simpan per user per modul
    const { count, error: countErr } = await supabase
      .from("admin_saved_views")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("module", input.module);

    if (!countErr && typeof count === "number" && count >= MAX_VIEWS_PER_USER_MODULE) {
      return {
        success: false,
        error: `Batas maksimal ${MAX_VIEWS_PER_USER_MODULE} tampilan tersimpan per modul telah tercapai. Hapus salah satu terlebih dahulu.`,
      };
    }

    // Insert baru
    const { data, error } = await supabase
      .from("admin_saved_views")
      .insert({
        user_id: userId,
        module: input.module,
        name,
        params: input.params,
        is_shared: Boolean(input.isShared),
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(`/admin/${input.module}`);
    return { success: true, data: { id: data.id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan tampilan.";
    return { success: false, error: msg };
  }
}

/**
 * Menghapus tampilan tersimpan milik pengguna aktif.
 */
export async function deleteViewAction(id: string, module: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { success: false, error: "Sesi tidak sah." };

  try {
    const { error } = await supabase
      .from("admin_saved_views")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/admin/${module}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghapus tampilan.";
    return { success: false, error: msg };
  }
}
