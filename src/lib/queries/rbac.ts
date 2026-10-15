import { supabase } from "../supabase";
import type { UserProfile } from "../auth";

/**
 * Query RBAC (baca) — Pengguna & Peran.
 *
 * Pembacaan memakai klien browser (RLS tetap berlaku). Semua TULIS user/role
 * yang menyentuh otorisasi lewat server action (`/admin/users/actions.ts`)
 * agar divalidasi `requirePermission` di server — bukan dari sini.
 */

export interface RoleRow {
  key: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Baris pengguna untuk tabel "Pengguna" (profil + kolom RBAC). */
export interface AdminUserRow extends UserProfile {
  email?: string | null;
  system_role?: string | null;
  must_change_password?: boolean;
  last_login_at?: string | null;
}

/**
 * Daftar pengguna untuk tabel admin. Bila kolom `system_role` belum ada
 * (migrasi belum jalan), query gagal → kembalikan [] dan UI menampilkan panel
 * "jalankan SQL" (degradasi anggun, pola sama dengan audit.ts).
 */
export async function getUserList(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user list:", error);
    return [];
  }
  return (data as AdminUserRow[]) ?? [];
}

/** Daftar peran (untuk dropdown & tab "Peran"). */
export async function getRoleList(): Promise<RoleRow[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
  return (data as RoleRow[]) ?? [];
}

/**
 * Matriks izin: kunci peran → daftar izin. Bila tabel `role_permissions` belum
 * ada → {} (UI menampilkan panel "jalankan SQL").
 */
export async function getRolePermissions(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("role_key, permission");

  if (error) {
    console.error("Error fetching role permissions:", error);
    return {};
  }
  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const key = row.role_key as string;
    if (!map[key]) map[key] = [];
    map[key].push(row.permission as string);
  }
  return map;
}

/** Apakah tabel RBAC (roles/role_permissions) sudah tersedia di DB? */
export async function rbacTablesReady(): Promise<boolean> {
  const { error } = await supabase.from("roles").select("key").limit(1);
  return !error;
}

/** Hitung pengguna per system_role (untuk ditampilkan di daftar peran). */
export async function getUserCountByRole(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("system_role");
  
  if (error) {
    console.error("Error fetching user count by role:", error);
    return {};
  }
  
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = (row.system_role ?? "—") as string;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
