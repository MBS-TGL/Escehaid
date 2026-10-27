import { cache } from "react";
import { supabase } from "../supabase";
import type { SchoolProfile } from "../supabase";
import { MISSION_FALLBACK, VISION_FALLBACK, missionToItems } from "../site-content";

export { MISSION_FALLBACK, VISION_FALLBACK };

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

/** Visi sekolah yang sudah di-trim; jatuh ke fallback bila kosong/null. */
export function resolveVision(profile: Pick<SchoolProfile, "vision"> | null | undefined): string {
  return profile?.vision?.trim() || VISION_FALLBACK;
}

/**
 * Parse kolom `mission` menjadi daftar butir. Menerima JSON array of string,
 * teks bernomor ("1. ... 2. ..."), atau teks utuh (satu butir).
 */
export function parseMissionItems(mission: string | null | undefined): string[] {
  const items = missionToItems(mission);
  return items.length > 0 ? items : MISSION_FALLBACK;
}

// ============ NEWS ============
