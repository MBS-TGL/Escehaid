"use server";

/**
 * Server action modul Pengaturan Situs (Phase B).
 *
 * Semua aksi tulis dieksekusi DI SINI (server), divalidasi `requirePermission`
 * ("settings:manage"), dan dicatat ke `audit_logs` lewat `log_activity` dengan
 * diff nilai sebelum/sesudah.
 *
 * Semantik form:
 *   - Kolom KOSONG = "hapus override" → nilai kembali ke school_profile/default
 *     (jalan tanpa tombol reset terpisah per kolom).
 *   - Tabel `site_settings` hanya menyimpan override; skema & default ada di
 *     registry kode, sehingga migrasi SQL boleh dijalankan belakangan.
 *
 * Tidak butuh service role: klien sesi (cookie) sudah cukup karena policy RLS
 * mengizinkan tulis bagi pemegang izin settings:manage.
 */
import { createClient as createSessionClient } from "@/lib/supabase-server";
import { revalidatePath, updateTag } from "next/cache";
import { requirePermission } from "@/lib/rbac/server";
import {
  SETTING_GROUPS,
  SETTING_FIELD_MAP,
  fieldsForGroup,
  validateSettingValue,
  type SettingGroup,
} from "@/lib/settings/registry";
import { SITE_SETTINGS_TAG } from "@/lib/settings";
import { normalizeHex } from "@/lib/settings/contrast";
import { validateThemePair } from "@/lib/settings/theme";

export type ActionResult = {
  success: boolean;
  error?: string;
  /** Jumlah kunci yang benar-benar berubah (0 = tidak ada perubahan). */
  changes?: number;
  /** Error validasi per kunci (menampilkan inline di bawah input). */
  fieldErrors?: Record<string, string>;
};

type SupabaseSession = Awaited<ReturnType<typeof createSessionClient>>;

function isSettingGroup(value: string): value is SettingGroup {
  return (SETTING_GROUPS as string[]).includes(value);
}

/** Baca override saat ini (langsung, bukan dari cache) untuk menghitung diff. */
async function readCurrentOverrides(
  supabase: SupabaseSession
): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) return {};
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: unknown }[]) {
    if (typeof row.value === "string") out[row.key] = row.value;
  }
  return out;
}

async function logActivity(
  supabase: SupabaseSession,
  action: "create" | "update" | "delete",
  detail: Record<string, unknown>
) {
  try {
    await supabase.rpc("log_activity", {
      p_action: action,
      p_entity_type: "site_settings",
      p_entity_id: null,
      p_detail: detail,
    });
  } catch (e) {
    // audit_logs mungkin belum ada — degradasi anggun, aksi tetap jalan.
    console.warn("log_activity gagal (non-fatal):", e);
  }
}

/** Tanggal Indonesia "19 Oktober 2026" — untuk cap pembaruan dokumen legal. */
function todayId(): string {
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const d = new Date();
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Pasangan body → kunci tanggalnya. Bila body diisi/diubah tapi tanggal
 * tidak ikut diubah manual, tanggal diisi otomatis hari ini.
 */
const LEGAL_DATE_PAIRS: Record<string, string> = {
  legal_privacy_body: "legal_privacy_updated",
  legal_terms_body: "legal_terms_updated",
};

/** Setelah tulis: buang cache data + render ulang seluruh layout (publik & admin). */
function revalidateEverything(group: SettingGroup) {
  // `updateTag` = kedaluwarsa seketika (read-your-own-writes): admin langsung
  // melihat hasil simpannya, bukan nilai lama dari cache stale-while-revalidate.
  updateTag(SITE_SETTINGS_TAG);
  revalidatePath("/", "layout");
  // Dokumen legal punya ISR sendiri (revalidate harian) — segarkan eksplisit
  // agar perubahan admin langsung tampil di /privacy & /terms.
  if (group === "footer") {
    revalidatePath("/privacy");
    revalidatePath("/terms");
  }
}

/**
 * Inti penyimpanan satu grup.
 * `desired` = nilai per kunci dari form ("" = hapus override).
 */
async function applyGroupValues(
  group: SettingGroup,
  desired: Record<string, string>
): Promise<ActionResult> {
  const fields = fieldsForGroup(group);

  // 1. Validasi per kunci.
  const fieldErrors: Record<string, string> = {};
  const values: Record<string, string> = {};
  for (const field of fields) {
    if (!(field.key in desired)) continue; // kolom tidak dikirim form → lewati
    // Body richtext dipertahankan apa adanya (HTML); yang lain di-trim.
    const raw = desired[field.key] ?? "";
    const value = field.type === "richtext" ? raw : raw.trim();
    const message = validateSettingValue(field, value);
    if (message) fieldErrors[field.key] = message;
    values[field.key] = value;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, error: "Beberapa isian belum valid.", fieldErrors };
  }

  // 1b. Cap tanggal otomatis dokumen legal: body diisi/diubah tapi tanggal
  // tidak ikut diubah manual → isi hari ini. Body dikosongkan → tanggal ikut
  // dihapus (kembali ke naskah bawaan + tanggal bawaan).
  for (const [bodyKey, dateKey] of Object.entries(LEGAL_DATE_PAIRS)) {
    if (!(bodyKey in values)) continue;
    const bodyDirty = values[bodyKey].trim() !== "";
    const dateSent = dateKey in values;
    const dateValue = (values[dateKey] ?? "").trim();
    if (bodyDirty && !dateSent) values[dateKey] = todayId();
    else if (!bodyDirty && !dateSent) values[dateKey] = "";
    else values[dateKey] = dateValue;
  }

  // 2. Validasi lintas-kunci khusus tema (kontras WCAG).
  if (group === "tema") {
    const primary = normalizeHex(values.theme_primary ?? "") ?? "#082b59";
    const accent = normalizeHex(values.theme_accent ?? "") ?? "#1767b1";
    const verdict = validateThemePair(primary, accent);
    if (!verdict.ok) {
      return { success: false, error: verdict.errors.join(" "), fieldErrors: {} };
    }
  }

  // 3. Siapkan klien sesi + baca override saat ini untuk diff.
  const supabase = await createSessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const current = await readCurrentOverrides(supabase);

  // 4. Hitung baris yang perlu diubah.
  type Row = { key: string; before: string | null; after: string | null };
  const rows: Row[] = [];
  for (const field of fields) {
    if (!(field.key in values)) continue;
    const next = values[field.key];
    const before = current[field.key] ?? null;

    if (next === before) continue; // tidak berubah → tidak disentuh
    rows.push({ key: field.key, before, after: next === "" ? null : next });
  }

  if (rows.length === 0) {
    return { success: true, changes: 0, error: "Tidak ada perubahan untuk disimpan." };
  }

  // 5. Hapus override yang dikosongkan, lalu simpan override baru.
  const cleared = rows.filter((r) => r.after === null).map((r) => r.key);
  if (cleared.length > 0) {
    const { error } = await supabase.from("site_settings").delete().in("key", cleared);
    if (error) return { success: false, error: humanizeWriteError(error.message) };
  }

  const upserts = rows
    .filter((r) => r.after !== null)
    .map((r) => {
      const field = SETTING_FIELD_MAP[r.key];
      return {
        key: r.key,
        value: r.after,
        setting_group: field?.group ?? group,
        value_type: field?.type ?? "text",
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
    });

  if (upserts.length > 0) {
    const { error } = await supabase.from("site_settings").upsert(upserts, { onConflict: "key" });
    if (error) return { success: false, error: humanizeWriteError(error.message) };
  }

  // 6. Catat perubahan (diff sebelum/sesudah; nilai teks biasa, bukan rahasia).
  await logActivity(supabase, "update", {
    module: "settings",
    group,
    changes: rows.map((r) => ({ key: r.key, before: r.before, after: r.after })),
  });

  revalidateEverything(group);

  return { success: true, changes: rows.length };
}

/** Pesan ramah bila tabel belum dimigrasi. */
function humanizeWriteError(message: string): string {
  if (/does not exist|schema cache/i.test(message)) {
    return "Tabel site_settings belum ada. Jalankan supabase/site_settings.sql di Supabase SQL Editor terlebih dahulu.";
  }
  return `Gagal menyimpan: ${message}`;
}

/**
 * Simpan seluruh isian satu tab/grup.
 * Kolom yang tidak dikirim diabaikan; kolom "" dihapus override-nya.
 */
export async function saveGroupSettings(
  group: string,
  values: Record<string, string>
): Promise<ActionResult> {
  const guard = requirePermission("settings:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  if (!isSettingGroup(group)) {
    return { success: false, error: "Grup pengaturan tidak dikenal." };
  }

  try {
    return await applyGroupValues(group, values);
  } catch (e) {
    console.error("saveGroupSettings gagal:", e);
    return { success: false, error: "Terjadi kesalahan tak terduga saat menyimpan." };
  }
}

/** Kembalikan satu grup ke nilai bawaan (hapus semua override di grup itu). */
export async function resetGroupSettings(group: string): Promise<ActionResult> {
  const guard = requirePermission("settings:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  if (!isSettingGroup(group)) {
    return { success: false, error: "Grup pengaturan tidak dikenal." };
  }

  try {
    const blank: Record<string, string> = {};
    for (const field of fieldsForGroup(group)) blank[field.key] = "";
    return await applyGroupValues(group, blank);
  } catch (e) {
    console.error("resetGroupSettings gagal:", e);
    return { success: false, error: "Terjadi kesalahan tak terduga saat mereset." };
  }
}
