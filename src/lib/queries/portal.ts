import { supabase } from "../supabase";
import { postRevalidate } from "./revalidate";

export interface PortalApp {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  is_external: boolean;
  is_coming_soon: boolean;
}

/** Aplikasi portal yang aktif saja, diurut sort_order (baca publik). */
export async function getPortalApps(): Promise<PortalApp[]> {
  const { data, error } = await supabase
    .from("portal_apps")
    .select(
      "id, label, description, href, icon, color, is_external, is_coming_soon"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching portal apps:", error);
    return [];
  }
  return data ?? [];
}

/** Semua aplikasi (termasuk nonaktif) untuk halaman admin /admin/portal. */
export interface PortalAppAdmin extends PortalApp {
  is_active: boolean;
  sort_order: number;
}

export async function getPortalAppsAdmin(): Promise<PortalAppAdmin[]> {
  const { data, error } = await supabase
    .from("portal_apps")
    .select(
      "id, label, description, href, icon, color, is_external, is_coming_soon, is_active, sort_order"
    )
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching portal apps (admin):", error);
    return [];
  }
  return data ?? [];
}

export type PortalAppInput = Omit<PortalAppAdmin, "id">;

export async function createPortalApp(input: PortalAppInput): Promise<{ error?: string }> {
  const { error } = await supabase.from("portal_apps").insert(input);
  if (error) return { error: error.message };
  return {};
}

export async function updatePortalApp(
  id: string,
  input: Partial<PortalAppInput>
): Promise<{ error?: string }> {
  const { error } = await supabase.from("portal_apps").update(input).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deletePortalApp(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("portal_apps").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

/**
 * Simpan urutan baru (drag & drop di /admin/portal) — update batch.
 * PostgREST tidak punya update multi-baris dengan nilai berbeda dalam satu
 * request (tanpa RPC), jadi baris dikirim paralel; jumlah baris kecil (≤ 50).
 */
export async function reorderPortalApps(
  items: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  const results = await Promise.all(
    items.map((item) =>
      supabase.from("portal_apps").update({ sort_order: item.sort_order }).eq("id", item.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };
  return {};
}

/**
 * Invalidasi ISR halaman /portal via API route /api/revalidate.
 * Dipanggil dari halaman admin /admin/portal setelah simpan/hapus.
 */
export async function revalidatePortal(): Promise<void> {
  await postRevalidate(["/portal"], "revalidatePortal");
}

// ============ SPMB WAVES (Gelombang Pendaftaran) ============

/**
 * Untuk halaman publik — hanya gelombang yang is_published = true,
 * diurutkan sort_order ASC, start_date ASC.
 */
