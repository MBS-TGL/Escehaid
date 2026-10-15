"use server";

/**
 * Server action modul Feature Flags (Phase C).
 *
 * Semua aksi tulis dieksekusi DI SINI (server), divalidasi `requirePermission`
 * ("flags:manage"), dan dicatat ke `audit_logs` lewat `log_activity` dengan
 * diff nilai sebelum/sesudah.
 */
import { createClient as createSessionClient } from "@/lib/supabase-server";
import { updateTag } from "next/cache";
import { requirePermission } from "@/lib/rbac/server";
import { FEATURE_FLAGS, FEATURE_FLAG_MAP, type FeatureFlagKey } from "@/lib/flags/registry";
import { FEATURE_FLAGS_TAG } from "@/lib/flags";

export type ActionResult = {
  success: boolean;
  error?: string;
  /** Jumlah flag yang benar-benar berubah. */
  changes?: number;
};

type SupabaseSession = Awaited<ReturnType<typeof createSessionClient>>;

async function logActivity(
  supabase: SupabaseSession,
  action: "create" | "update" | "delete",
  detail: Record<string, unknown>
) {
  try {
    await supabase.rpc("log_activity", {
      p_action: action,
      p_entity_type: "feature_flags",
      p_entity_id: null,
      p_detail: detail,
    });
  } catch (e) {
    console.warn("log_activity gagal (non-fatal):", e);
  }
}

function revalidateFlags() {
  updateTag(FEATURE_FLAGS_TAG);
}

/**
 * Ubah status enabled + jadwal satu flag.
 * `enabled` = true/false; `startAt`/`endAt` = ISO string atau null (kosongkan = hapus jadwal).
 */
export async function saveFlagSettings(
  key: string,
  payload: { enabled: boolean; startAt: string | null; endAt: string | null }
): Promise<ActionResult> {
  const guard = requirePermission("flags:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  if (!(key in FEATURE_FLAG_MAP)) {
    return { success: false, error: "Feature flag tidak dikenal." };
  }

  try {
    const supabase = await createSessionClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Baca nilai saat ini untuk diff
    const { data: current } = await supabase
      .from("feature_flags")
      .select("enabled, start_at, end_at")
      .eq("key", key)
      .single();

    const before = current
      ? { enabled: current.enabled, startAt: current.start_at, endAt: current.end_at }
      : { enabled: FEATURE_FLAG_MAP[key].defaultEnabled, startAt: null, endAt: null };

    const { enabled, startAt, endAt } = payload;
    const changed =
      before.enabled !== enabled ||
      before.startAt !== startAt ||
      before.endAt !== endAt;

    if (!changed) {
      return { success: true, changes: 0, error: "Tidak ada perubahan untuk disimpan." };
    }

    const { error } = await supabase.from("feature_flags").upsert(
      {
        key,
        enabled,
        start_at: startAt,
        end_at: endAt,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return { success: false, error: humanizeWriteError(error.message) };
    }

    await logActivity(supabase, "update", {
      module: "flags",
      flag: key,
      changes: { before, after: { enabled, startAt, endAt } },
    });

    revalidateFlags();

    return { success: true, changes: 1 };
  } catch (e) {
    console.error("saveFlagSettings gagal:", e);
    return { success: false, error: "Terjadi kesalahan tak terduga saat menyimpan." };
  }
}

/** Kembalikan flag ke default bawaan (hapus override). */
export async function resetFlagSettings(key: string): Promise<ActionResult> {
  const guard = requirePermission("flags:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  if (!(key in FEATURE_FLAG_MAP)) {
    return { success: false, error: "Feature flag tidak dikenal." };
  }

  try {
    const supabase = await createSessionClient();

    const { data: current } = await supabase
      .from("feature_flags")
      .select("enabled, start_at, end_at")
      .eq("key", key)
      .single();

    if (!current) {
      return { success: true, changes: 0, error: "Flag sudah menggunakan nilai bawaan." };
    }

    const before = { enabled: current.enabled, startAt: current.start_at, endAt: current.end_at };

    const { error } = await supabase.from("feature_flags").delete().eq("key", key);
    if (error) return { success: false, error: humanizeWriteError(error.message) };

    await logActivity(supabase, "update", {
      module: "flags",
      flag: key,
      changes: { before, after: "default" },
    });

    revalidateFlags();

    return { success: true, changes: 1 };
  } catch (e) {
    console.error("resetFlagSettings gagal:", e);
    return { success: false, error: "Terjadi kesalahan tak terduga saat mereset." };
  }
}

function humanizeWriteError(message: string): string {
  if (/does not exist|schema cache/i.test(message)) {
    return "Tabel feature_flags belum ada. Jalankan supabase/feature_flags.sql di Supabase SQL Editor terlebih dahulu.";
  }
  return `Gagal menyimpan: ${message}`;
}