import { supabase } from "../supabase";
import type { Teacher } from "../supabase";
import { tryCompressImage, TEACHER_PHOTO } from "../compress-image";
import { cleanupOldFiles, deleteStorageFileByUrl } from "./shared";
import { uploadFileViaRoute } from "../storage-remote";

/**
 * Daftar guru aktif (urut `sort_order`).
 * `limit` (opsional) membatasi jumlah baris — dipakai beranda agar transfer
 * data tidak membawa seluruh daftar guru.
 */
export async function getTeacherList(limit?: number): Promise<Teacher[]> {
  let query = supabase
    .from("teachers")
    .select("id, name, position, photo_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching teachers:", error);
    return [];
  }
  return (data || []) as Teacher[];
}

// ============ FACILITIES ============

export async function uploadTeacherPhoto(
  file: File,
  teacherId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file, TEACHER_PHOTO);
  if (!compressed) return { url: null, error: compressError };
  const path = `teachers/${teacherId}.jpg`;

  await cleanupOldFiles("teachers", teacherId);

  const uploaded = await uploadFileViaRoute("images", path, compressed, {
    upsert: true,
    cacheControl: "31536000",
    contentType: "image/jpeg",
  });

  if (uploaded.error) {
    console.error("Error uploading teacher photo:", uploaded.error);
    return { url: null, error: uploaded.error };
  }

  return { url: `${uploaded.url}?v=${Date.now()}` };
}

// ============ CONTACT MESSAGES CRUD ============

export async function getAllTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    // Melempar error agar panel admin bisa membedakan "kosong" vs "gagal
    // memuat" — pemanggil (panel guru, satu-satunya) menampilkan retry.
    console.error("Error fetching teachers:", error);
    throw new Error(error.message);
  }
  return data || [];
}

export async function createTeacher(data: { name: string; position?: string; photo_url?: string }): Promise<{ error?: string }> {
  const { error } = await supabase.from("teachers").insert(data);
  if (error) return { error: error.message };
  return {};
}

export async function updateTeacher(id: string, data: Partial<Pick<Teacher, "name" | "position" | "photo_url" | "sort_order" | "is_active">>): Promise<{ error?: string }> {
  // Ambil URL foto lama supaya file lama bisa dibersihkan bila berganti
  let oldPhotoUrl: string | null = null;
  if (typeof data.photo_url === "string") {
    const { data: current } = await supabase.from("teachers").select("photo_url").eq("id", id).single();
    oldPhotoUrl = current?.photo_url || null;
  }
  const { error } = await supabase.from("teachers").update(data).eq("id", id);
  if (error) return { error: error.message };
  // Bersihkan file lama hanya bila URL benar-benar berubah (best-effort)
  if (oldPhotoUrl && oldPhotoUrl !== data.photo_url) {
    deleteStorageFileByUrl(oldPhotoUrl).catch(() => {});
  }
  return {};
}

export async function deleteTeacher(id: string): Promise<{ error?: string }> {
  // Ambil URL foto SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("teachers").select("photo_url").eq("id", id).single();
  const { error } = await supabase.from("teachers").delete().eq("id", id);
  if (error) return { error: error.message };
  if (row?.photo_url) deleteStorageFileByUrl(row.photo_url).catch(() => {});
  return {};
}

export async function deleteTeacherBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("teachers").select("photo_url").in("id", ids);
  const { error } = await supabase.from("teachers").delete().in("id", ids);
  if (error) return { error: error.message };
  for (const row of rows || []) {
    if (row.photo_url) deleteStorageFileByUrl(row.photo_url).catch(() => {});
  }
  return {};
}

// ============ NOTIFICATIONS ============
