import { createClient } from "@/lib/supabase-server";
import type { User } from "@supabase/supabase-js";

export type UserRole = "developer" | "admin" | "publisher" | "teacher" | "student";

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getProfile();
  return profile?.role ?? null;
}

export async function hasRole(roles: UserRole[]): Promise<boolean> {
  const role = await getUserRole();
  return role !== null && roles.includes(role);
}

export async function isDeveloper(): Promise<boolean> {
  return hasRole(["developer"]);
}

export async function isAdmin(): Promise<boolean> {
  return hasRole(["developer", "admin"]);
}

export async function isTeacher(): Promise<boolean> {
  return hasRole(["developer", "admin", "publisher", "teacher"]);
}

export async function isStudent(): Promise<boolean> {
  const role = await getUserRole();
  return role === "student";
}
