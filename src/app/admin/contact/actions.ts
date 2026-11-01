"use server";

/**
 * Server action Pesan Masuk — arsip & hapus dengan jejak audit.
 *
 * Sebelumnya arsip/hapus dilakukan langsung dari browser (queries/contact.ts)
 * sehingga aktor tidak tercatat di `audit_logs`. Semua aksi tulis di sini
 * divalidasi `requirePermission` (kontak:update / kontak:delete) dan dicatat
 * lewat RPC `log_activity` dengan detail `{ module, ids, count }` + nama
 * pengirim (tanpa isi pesan — menjaga privasi di log).
 */

import { createClient as createSessionClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/rbac/server";

export type ContactActionResult = { success: boolean; error?: string };

/** Catat ke audit_logs (best-effort; gagal = tidak menjatuhkan aksi). */
async function logContact(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  action: "update" | "delete",
  detail: Record<string, unknown>
) {
  try {
    await supabase.rpc("log_activity", {
      p_action: action,
      p_entity_type: "contact_messages",
      p_entity_id: null,
      p_detail: { module: "kontak", ...detail },
    });
  } catch (e) {
    // Tabel audit_logs mungkin belum ada — biarkan (degradasi anggun).
    console.warn("log_activity kontak gagal (non-fatal):", e);
  }
}

function badIds(ids: string[]): boolean {
  return (
    ids.length === 0 ||
    ids.length > 100 ||
    ids.some((id) => typeof id !== "string" || id.length > 64)
  );
}

/** Ambil nama pengirim untuk detail audit (tanpa isi pesan). */
async function senderNames(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  ids: string[]
): Promise<string[]> {
  try {
    const { data } = await supabase.from("contact_messages").select("name").in("id", ids);
    return ((data ?? []) as { name: string }[]).map((r) => r.name).slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Arsipkan / keluarkan pesan dari arsip. Mengarsipkan otomatis menandai
 * sudah dibaca (arsip = selesai ditindaklanjuti).
 */
export async function archiveContactMessages(
  ids: string[],
  archived: boolean
): Promise<ContactActionResult> {
  const guard = requirePermission("kontak:update");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };
  if (badIds(ids)) return { success: false, error: "Daftar pesan tidak valid." };

  try {
    const supabase = await createSessionClient();
    const names = await senderNames(supabase, ids);
    const patch = archived ? { is_archived: true, is_read: true } : { is_archived: false };
    const { error } = await supabase.from("contact_messages").update(patch).in("id", ids);
    if (error) return { success: false, error: "Gagal mengubah arsip." };

    await logContact(supabase, "update", {
      aksi: archived ? "arsip" : "keluar-arsip",
      ids,
      count: ids.length,
      pengirim: names,
    });
    return { success: true };
  } catch (e) {
    console.error("archiveContactMessages gagal:", e);
    return { success: false, error: "Terjadi kesalahan tak terduga." };
  }
}

/** Hapus permanen pesan (satu / banyak). */
export async function deleteContactMessages(ids: string[]): Promise<ContactActionResult> {
  const guard = requirePermission("kontak:delete");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };
  if (badIds(ids)) return { success: false, error: "Daftar pesan tidak valid." };

  try {
    const supabase = await createSessionClient();
    const names = await senderNames(supabase, ids);
    const { error } = await supabase.from("contact_messages").delete().in("id", ids);
    if (error) return { success: false, error: "Gagal menghapus pesan." };

    await logContact(supabase, "delete", {
      aksi: "hapus-permanen",
      ids,
      count: ids.length,
      pengirim: names,
    });
    return { success: true };
  } catch (e) {
    console.error("deleteContactMessages gagal:", e);
    return { success: false, error: "Terjadi kesalahan tak terduga." };
  }
}
