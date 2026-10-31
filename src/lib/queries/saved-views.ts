import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminSavedView {
  id: string;
  user_id: string;
  module: string;
  name: string;
  params: Record<string, string | number | boolean>;
  is_shared: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Membaca daftar tampilan tersimpan untuk sebuah modul.
 * Mengembalikan tampilan milik user ATAU yang dibagikan (is_shared = true).
 * RLS di tabel `admin_saved_views` (0016) sudah otomatis membatasi baris.
 */
export async function getSavedViewsForModule(
  supabase: SupabaseClient,
  module: string
): Promise<AdminSavedView[]> {
  try {
    const { data, error } = await supabase
      .from("admin_saved_views")
      .select("*")
      .eq("module", module)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      // Tabel belum dimigrasi di database lokal/preview → kembalikan array kosong tanpa crash.
      if (error.code === "42P01" || /does not exist/i.test(error.message)) return [];
      console.warn(`Gagal memuat saved views modul ${module}:`, error.message);
      return [];
    }
    return (data || []) as AdminSavedView[];
  } catch (err) {
    console.warn(`Exception getSavedViewsForModule (${module}):`, err);
    return [];
  }
}

export const getCachedSavedViews = cache(getSavedViewsForModule);
