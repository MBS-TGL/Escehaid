import { supabase } from "../supabase";
import type { ImportTarget } from "../gemini";

/**
 * Klien untuk endpoint /api/ai/refine — merapikan catatan mentah via Gemini.
 * Token sesi disertakan di header (pola sama dengan postRevalidate di
 * queries/revalidate.ts) agar route bisa memeriksa profil & izin admin.
 */

/**
 * Hasil AI dari route — semua field string ter-garansi ("" bila tidak
 * relevan dengan target, route yang memvalidasi per modul).
 */
export interface RefineData {
  title: string;
  summary: string;
  content: string;
  category: string;
  activity_type: string;
  location: string;
  activity_date: string;
  announcement: string;
}

type RefineResult = { ok: true; data: RefineData } | { ok: false; error: string };

type RoutePayload = Partial<RefineData> & { error?: string };

const EMPTY: RefineData = {
  title: "",
  summary: "",
  content: "",
  category: "",
  activity_type: "",
  location: "",
  activity_date: "",
  announcement: "",
};

const STRING_FIELDS = Object.keys(EMPTY) as (keyof RefineData)[];

export async function refineDraft(target: ImportTarget, rawText: string): Promise<RefineResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch("/api/ai/refine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ target, rawText }),
    });

    let payload: RoutePayload = {};
    try {
      payload = (await res.json()) as RoutePayload;
    } catch {
      // body bukan JSON — biarkan kosong, pakai pesan bawaan
    }

    if (!res.ok) {
      const message = typeof payload?.error === "string" ? payload.error : "";
      return { ok: false, error: message || `Gagal merapikan catatan (HTTP ${res.status}).` };
    }

    // Route memvalidasi field per target; di klien cukup garansikan string.
    const data = { ...EMPTY };
    for (const key of STRING_FIELDS) {
      if (typeof payload?.[key] === "string") data[key] = payload[key] as string;
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "gagal menghubungi server" };
  }
}
