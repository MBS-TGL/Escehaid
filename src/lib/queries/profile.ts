import { cache } from "react";
import { supabase } from "../supabase";
import type { SchoolProfile } from "../supabase";

export const getSchoolProfile = cache(
  async function getSchoolProfile(): Promise<SchoolProfile | null> {
    const { data, error } = await supabase
      .from("school_profile")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  }
);

/** Fallback visi bila kolom kosong/null (selaras dengan profil sekolah). */
export const VISION_FALLBACK =
  "Menjadi lembaga pencetak kader da'i dan ulama hafidz yang menguasai ilmu pengetahuan dan teknologi berwawasan global serta peduli dan berbudaya lingkungan.";

/** Fallback butir misi bila kolom kosong/null. */
export const MISSION_FALLBACK: string[] = [
  "Menanamkan kepribadian Islam dan kepedulian terhadap lingkungan",
  "Menanamkan karakter unggul: lurus aqidah, bagus ibadah, mulia akhlak",
  "Melaksanakan pembelajaran aktif, inovatif, kreatif, dan menyenangkan",
  "Menumbuhkan potensi keberbakatan dalam setiap siswa",
  "Berbasis Boarding School dan Full Day School dengan kurikulum Nasional & Muhammadiyah",
  "Mewujudkan generasi emas 2045: One Home One Hafidz",
];

/** Visi sekolah yang sudah di-trim; jatuh ke fallback bila kosong/null. */
export function resolveVision(profile: Pick<SchoolProfile, "vision"> | null | undefined): string {
  return profile?.vision?.trim() || VISION_FALLBACK;
}

/**
 * Parse kolom `mission` menjadi daftar butir. Menerima JSON array of string,
 * teks bernomor ("1. ... 2. ..."), atau teks utuh (satu butir).
 */
export function parseMissionItems(mission: string | null | undefined): string[] {
  if (!mission) return MISSION_FALLBACK;
  try {
    const parsed = JSON.parse(mission);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter((s): s is string => typeof s === "string");
  } catch {}
  const items = mission
    .split(/\d+\.\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length > 0) return items;
  return MISSION_FALLBACK;
}

// ============ NEWS ============
