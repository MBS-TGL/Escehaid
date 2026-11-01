import { supabase } from "../supabase";

/**
 * Mutasi notifikasi milik sendiri — baca/daftar sudah ada di
 * `src/lib/queries/users.ts` (getRecentNotifications dkk.).
 *
 * RLS mengizinkan update/delete hanya untuk baris milik sendiri
 * (`auth.uid() = user_id`), jadi helper di sini aman dipakai dari browser.
 */

/** Hapus satu notifikasi milik sendiri. */
export async function deleteNotification(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

/** Hapus seluruh notifikasi yang sudah dibaca (bersih-bersih kotak masuk). */
export async function deleteReadNotifications(): Promise<{ error?: string; count?: number }> {
  const { error, count } = await supabase
    .from("notifications")
    .delete({ count: "exact" })
    .eq("is_read", true);
  if (error) return { error: error.message };
  return { count: count ?? 0 };
}
