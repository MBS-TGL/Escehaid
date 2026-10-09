import { supabase } from "../supabase";
import type { Gallery } from "../supabase";
import { tryCompressImage } from "../compress-image";
import { cleanupOldFiles, deleteStorageFileByUrl } from "./shared";

export async function getGalleryList(limit?: number): Promise<Gallery[]> {
  let query = supabase
    .from("gallery")
    .select("*")
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching gallery:", error);
    return [];
  }
  return data || [];
}

export async function getGalleryPage(page: number, perPage: number = 20): Promise<Gallery[]> {
  const start = page * perPage;
  const end = start + perPage - 1;

  const { data, error } = await supabase
    .from("gallery")
    .select("id, title, description, url, thumbnail_url, category, media_type, created_at")
    .order("created_at", { ascending: false })
    .range(start, end);

  if (error) {
    console.error("Error fetching gallery page:", error);
    return [];
  }
  return data || [];
}

export async function getGalleryByCategory(category: string): Promise<Gallery[]> {
  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching gallery by category:", error);
    return [];
  }
  return data || [];
}

// ============ SPMB ============

export async function getGalleryListAll(): Promise<Gallery[]> {
  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all gallery:", error);
    return [];
  }
  return data || [];
}

export async function createGallery(gallery: {
  title: string;
  description?: string;
  url?: string;
  category?: string;
  media_type?: string;
}): Promise<{ data: Gallery | null; error?: string }> {
  const { data, error } = await supabase
    .from("gallery")
    .insert(gallery)
    .select()
    .single();

  if (error) {
    console.error("Error creating gallery:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function updateGallery(
  id: string,
  gallery: {
    title?: string;
    description?: string;
    url?: string;
    category?: string;
    media_type?: string;
  }
): Promise<{ data: Gallery | null; error?: string }> {
  // Ambil URL gambar lama supaya file lama bisa dibersihkan bila berganti
  let oldImageUrl: string | null = null;
  if (typeof gallery.url === "string") {
    const { data: current } = await supabase.from("gallery").select("url").eq("id", id).single();
    oldImageUrl = current?.url || null;
  }

  const { data, error } = await supabase
    .from("gallery")
    .update(gallery)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating gallery:", error);
    return { data: null, error: error.message };
  }
  // Bersihkan file lama hanya bila URL benar-benar berubah (best-effort)
  if (oldImageUrl && oldImageUrl !== gallery.url) {
    deleteStorageFileByUrl(oldImageUrl).catch(() => {});
  }
  return { data };
}

export async function deleteGallery(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("gallery").select("url").eq("id", id).single();
  const { error } = await supabase.from("gallery").delete().eq("id", id);
  if (error) {
    console.error("Error deleting gallery:", error);
    return { error: error.message };
  }
  if (row?.url) deleteStorageFileByUrl(row.url).catch(() => {});
  return {};
}

export async function deleteGalleryBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("gallery").select("url").in("id", ids);
  const { error } = await supabase.from("gallery").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting gallery:", error);
    return { error: error.message };
  }
  for (const row of rows || []) {
    if (row.url) deleteStorageFileByUrl(row.url).catch(() => {});
  }
  return {};
}

export async function uploadGalleryImage(
  file: File,
  galleryId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };
  const path = `gallery/${galleryId}.jpg`;

  await cleanupOldFiles("gallery", galleryId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    console.error("Error uploading gallery image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

// ============ ACHIEVEMENTS ============
