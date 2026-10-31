/**
 * Analitik publik internal (fase 1) — pembacaan agregat dari RPC
 * `admin_analytics_summary` (0017). Semua pembacaan lewat sesi admin
 * (cookie) dan RPC Security DEFINER memeriksa izin `analitik:read`.
 *
 * Tanpa tampilan IP / UA — datanya memang tidak tersimpan.
 */
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient;

export interface DailyView {
  /** ISO tanggal (awal hari WIB, "2026-10-31T00:00:00.000+07:00"). */
  day: string;
  views: number;
}

export interface PathView {
  path: string;
  views: number;
}

export interface HostView {
  host: string;
  views: number;
}

export interface DeviceView {
  device_class: string;
  views: number;
}

export interface AnalyticsSummary {
  total_views: number | null;
  daily: DailyView[];
  top_paths: PathView[];
  top_referrers: HostView[];
  devices: DeviceView[];
}

/** RPC null = izin ditolak / error; diterjemahkan agar UI tahu harus "—". */
export async function getAnalyticsSummary(
  sb: Db,
  fromIso: string,
  toIso: string
): Promise<{ data: AnalyticsSummary | null; error: string | null }> {
  const { data, error } = await sb.rpc("admin_analytics_summary", {
    p_from: fromIso,
    p_to: toIso,
  }) as unknown as { data: AnalyticsSummary | null; error: { message: string } | null };
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/** Cache baca ringkas: dipakai kartu "Analitik" di dashboard juga. */
export const getCachedAnalytics = cache(getAnalyticsSummary);

/** Peringkat kelas perangkat terbersih untuk akses cepat di UI. */
export function deviceShare(devices: DeviceView[]): { label: string; views: number }[] {
  const map = new Map<string, number>();
  for (const d of devices) map.set(d.device_class, d.views);
  return [
    { label: "Mobile", views: map.get("mobile") ?? 0 },
    { label: "Tablet", views: map.get("tablet") ?? 0 },
    { label: "Desktop", views: map.get("desktop") ?? 0 },
  ];
}
