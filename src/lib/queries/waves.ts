import { supabase } from "../supabase";
import type { SpmbWave } from "../supabase";

export async function getPublishedWaves(): Promise<SpmbWave[]> {
  const { data, error } = await supabase
    .from("spmb_waves")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Error fetching published waves:", error);
    return [];
  }
  return (data || []) as SpmbWave[];
}

/**
 * Untuk panel admin — semua gelombang termasuk yang is_published = false.
 */
export async function getWavesAll(): Promise<SpmbWave[]> {
  const { data, error } = await supabase
    .from("spmb_waves")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Error fetching all waves:", error);
    return [];
  }
  return (data || []) as SpmbWave[];
}

export async function createWave(wave: {
  name: string;
  start_date: string;
  end_date: string;
  note?: string | null;
  is_published?: boolean;
  sort_order?: number;
}): Promise<{ data: SpmbWave | null; error?: string }> {
  const { data, error } = await supabase
    .from("spmb_waves")
    .insert({
      name: wave.name,
      start_date: wave.start_date,
      end_date: wave.end_date,
      note: wave.note ?? null,
      is_published: wave.is_published ?? true,
      sort_order: wave.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating wave:", error);
    return { data: null, error: error.message };
  }
  return { data: data as SpmbWave };
}

export async function updateWave(
  id: string,
  wave: Partial<{
    name: string;
    start_date: string;
    end_date: string;
    note: string | null;
    is_published: boolean;
    sort_order: number;
  }>
): Promise<{ data: SpmbWave | null; error?: string }> {
  const { data, error } = await supabase
    .from("spmb_waves")
    .update(wave)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating wave:", error);
    return { data: null, error: error.message };
  }
  return { data: data as SpmbWave };
}

export async function deleteWave(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("spmb_waves")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting wave:", error);
    return { error: error.message };
  }
  return {};
}

/**
 * Hitung status gelombang relatif terhadap `now` dalam zona waktu WIB (Asia/Jakarta, UTC+7).
 * `end_date` dianggap inklusif sampai 23:59:59 WIB.
 *
 * @returns "upcoming" | "open" | "closed"
 *
 * Contoh pengujian (anggap start_date="2026-10-20", end_date="2026-12-30"):
 *
 *   [1] Sebelum start — now = 2026-10-19T23:59:59+07:00
 *       startWIB = 2026-10-20T00:00:00+07:00
 *       endWIB   = 2026-12-30T23:59:59+07:00
 *       now < startWIB → "upcoming"
 *
 *   [2] Tepat di start — now = 2026-10-20T00:00:00+07:00
 *       now >= startWIB && now <= endWIB → "open"
 *
 *   [3] Tepat di hari end — now = 2026-12-30T23:59:59+07:00
 *       now >= startWIB && now <= endWIB → "open"  (end_date inklusif)
 *
 *   [4] Sehari setelah end — now = 2026-12-31T00:00:00+07:00
 *       now > endWIB → "closed"
 */
export function getWaveStatus(
  wave: Pick<SpmbWave, "start_date" | "end_date">,
  now: Date = new Date()
): "upcoming" | "open" | "closed" {
  const WIB_OFFSET = 7 * 60; // menit

  // Konversi date string ("YYYY-MM-DD") ke epoch UTC dengan asumsi WIB
  function wibDateToMs(dateStr: string, endOfDay = false): number {
    const [y, m, d] = dateStr.split("-").map(Number);
    const hours = endOfDay ? 23 : 0;
    const mins = endOfDay ? 59 : 0;
    const secs = endOfDay ? 59 : 0;
    // Buat Date di UTC, lalu kurangi offset WIB agar mewakili "jam X WIB"
    return Date.UTC(y, m - 1, d, hours - WIB_OFFSET / 60, mins, secs);
  }

  const startMs = wibDateToMs(wave.start_date, false); // 00:00:00 WIB
  const endMs   = wibDateToMs(wave.end_date, true);    // 23:59:59 WIB
  const nowMs   = now.getTime();

  if (nowMs < startMs) return "upcoming";
  if (nowMs > endMs)   return "closed";
  return "open";
}
