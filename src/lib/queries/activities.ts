import { supabase } from "../supabase";
import type { Activity } from "../supabase";
import { tryCompressImage } from "../compress-image";
import { cleanupOldFiles, deleteStorageFileByUrl } from "./shared";

export async function getActivityList(limit?: number): Promise<Activity[]> {
  let query = supabase
    .from("activities")
    .select("id, title, slug, description, activity_type, activity_date, image_url, is_published, created_at")
    .eq("is_published", true)
    .order("activity_date", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching activities:", JSON.stringify(error), error.message, error.code, error.details, error.hint);
    return [];
  }
  return (data || []) as Activity[];
}

export async function getActivityBySlug(slug: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching activity by slug:", error);
    return null;
  }
  return data;
}

export async function getActivityListAll(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all activities:", error);
    return [];
  }
  return data || [];
}

export async function createActivity(activity: {
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  activity_date?: string;
  activity_type?: string;
  location?: string;
  image_url?: string;
  is_published?: boolean;
}): Promise<{ data: Activity | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!activity.slug) {
    activity.slug = activity.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  const { data, error } = await supabase
    .from("activities")
    .insert({ ...activity, author_id: user?.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating activity:", error);
    return { data: null, error: error.message };
  }
  return { data };
}

export async function updateActivity(
  id: string,
  activity: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    activity_date?: string;
    activity_type?: string;
    location?: string;
    image_url?: string;
    is_published?: boolean;
  }
): Promise<{ data: Activity | null; error?: string }> {
  // Ambil URL gambar lama supaya file lama bisa dibersihkan bila berganti
  let oldImageUrl: string | null = null;
  if (typeof activity.image_url === "string") {
    const { data: current } = await supabase.from("activities").select("image_url").eq("id", id).single();
    oldImageUrl = current?.image_url || null;
  }
  if (activity.title && !activity.slug) {
    activity.slug = activity.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  const { data, error } = await supabase
    .from("activities")
    .update(activity)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating activity:", error);
    return { data: null, error: error.message };
  }
  // Bersihkan file lama hanya bila URL benar-benar berubah (best-effort)
  if (oldImageUrl && oldImageUrl !== activity.image_url) {
    deleteStorageFileByUrl(oldImageUrl).catch(() => {});
  }
  return { data };
}

export async function deleteActivity(id: string): Promise<{ error?: string }> {
  // Ambil URL gambar SEBELUM row dihapus supaya file storage tidak jadi orphan
  const { data: row } = await supabase.from("activities").select("image_url").eq("id", id).single();
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) {
    console.error("Error deleting activity:", error);
    return { error: error.message };
  }
  if (row?.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  return {};
}

export async function deleteActivityBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase.from("activities").select("image_url").in("id", ids);
  const { error } = await supabase.from("activities").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting activities:", error);
    return { error: error.message };
  }
  for (const row of rows || []) {
    if (row.image_url) deleteStorageFileByUrl(row.image_url).catch(() => {});
  }
  return {};
}

export async function togglePublishActivity(
  id: string,
  is_published: boolean
): Promise<{ error?: string }> {
  const { error } = await supabase.from("activities").update({ is_published }).eq("id", id);
  if (error) {
    console.error("Error toggling activity publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function togglePublishActivityBulk(
  ids: string[],
  is_published: boolean
): Promise<{ error?: string }> {
  const { error } = await supabase.from("activities").update({ is_published }).in("id", ids);
  if (error) {
    console.error("Error bulk toggling activity publish:", error);
    return { error: error.message };
  }
  return {};
}

export async function uploadActivityImage(
  file: File,
  activityId: string
): Promise<{ url: string | null; error?: string }> {
  const { file: compressed, error: compressError } = await tryCompressImage(file);
  if (!compressed) return { url: null, error: compressError };
  const path = `activities/${activityId}.jpg`;

  await cleanupOldFiles("activities", activityId);

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, compressed, { upsert: true, cacheControl: "31536000" });
  if (uploadError) {
    console.error("Error uploading activity image:", uploadError);
    return { url: null, error: uploadError.message };
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

// ============ GALLERY CRUD ============
