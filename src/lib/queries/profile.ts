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

// ============ NEWS ============
