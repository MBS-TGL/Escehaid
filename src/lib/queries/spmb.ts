import { supabase } from "../supabase";
import type { SchoolProfile, SpmbFormField, SpmbFieldType } from "../supabase";
import { getSchoolProfile } from "./profile";

export const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScGq3QR_ohqV-lBPtM7wgS-1IqXeUVqvFGwm3XO3VSJGBjw8w/viewform";

/**
 * Tujuan CTA "Daftar" berdasarkan school_profile.registration_mode + google_form_url.
 * - "internal" → form bawaan /admission/register
 * - mode Google Form → link kustom admin (bila ada), kalau kosong → GOOGLE_FORM_URL bawaan
 * - kolom belum ada / null → Google Form — perilaku default.
 */
export function registrationHref(
  profile: Pick<SchoolProfile, "registration_mode" | "google_form_url"> | null | undefined
): string {
  if (profile?.registration_mode === "internal") return "/admission/register";
  return profile?.google_form_url?.trim() || GOOGLE_FORM_URL;
}

/**
 * Simpan mode sumber pendaftaran (admin — policy "Staff manage school_profile").
 * Mode "google_form" + googleFormUrl (bila diberikan; null = kembali ke link bawaan)
 * ikut disimpan ke school_profile.google_form_url.
 * Pakai .select() supaya kegagalan RLS yang diam-diam (0 baris) tetap terdeteksi.
 */
export async function setRegistrationMode(
  mode: "google_form" | "internal",
  googleFormUrl?: string | null
): Promise<{ error?: string }> {
  try {
    // PostgREST menolak UPDATE tanpa WHERE ("UPDATE requires a WHERE clause"),
    // jadi ambil id profil (tabel singleton) dulu lalu filter berdasarkan id.
    const profile = await getSchoolProfile();
    if (!profile?.id) {
      return { error: "Profil sekolah tidak ditemukan — mode tidak tersimpan." };
    }
    const payload: { registration_mode: string; google_form_url?: string | null } = {
      registration_mode: mode,
    };
    if (mode === "google_form" && googleFormUrl !== undefined) {
      payload.google_form_url = googleFormUrl;
    }
    const { data, error } = await supabase
      .from("school_profile")
      .update(payload)
      .eq("id", profile.id)
      .select("registration_mode");
    if (error) {
      console.error("Error saving registration mode:", error);
      return { error: error.message };
    }
    if (!data || data.length === 0) {
      return { error: "Mode tidak tersimpan — tidak ada baris yang terupdate (cek policy RLS)." };
    }
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error saving registration mode:", e);
    return { error: message };
  }
}

/**
 * Simpan pengaturan SPMB (brosur, formulir offline, nomor WA panitia,
 * sorotan hasil seleksi) ke school_profile (admin).
 * Pola sama dengan setRegistrationMode: ambil id dulu, UPDATE ... WHERE id, deteksi 0 baris.
 */
export async function setSpmbDocuments(docs: {
  spmb_brochure_url: string | null;
  spmb_offline_form_url: string | null;
  spmb_contact_phone: string | null;
  spmb_highlight_text: string | null;
}): Promise<{ error?: string }> {
  try {
    const profile = await getSchoolProfile();
    if (!profile?.id) {
      return { error: "Profil sekolah tidak ditemukan — dokumen tidak tersimpan." };
    }
    const { data, error } = await supabase
      .from("school_profile")
      .update(docs)
      .eq("id", profile.id)
      .select("spmb_brochure_url, spmb_offline_form_url, spmb_contact_phone, spmb_highlight_text");
    if (error) {
      console.error("Error saving spmb documents:", error);
      return { error: error.message };
    }
    if (!data || data.length === 0) {
      return { error: "Tidak tersimpan — tidak ada baris yang terupdate (cek policy RLS)." };
    }
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error saving spmb documents:", e);
    return { error: message };
  }
}

// ============ SPMB FORM BUILDER (PERTANYAAN CUSTOM) ============
/** Jenis pertanyaan yang didukung builder + label tampilan (dipakai admin & form publik). */
export const SPMB_FIELD_TYPES: { value: SpmbFieldType; label: string }[] = [
  { value: "text", label: "Jawaban Singkat" },
  { value: "textarea", label: "Jawaban Panjang" },
  { value: "number", label: "Angka" },
  { value: "date", label: "Tanggal" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Nomor Telepon" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Pilihan Ganda" },
  { value: "checkbox", label: "Centang (bisa pilih lebih dari satu)" },
];

/** Tipe yang butuh daftar opsi. */
export function spmbFieldNeedsOptions(type: SpmbFieldType): boolean {
  return type === "select" || type === "radio" || type === "checkbox";
}

/** Kunci jawaban pendaftar di spmb_registrations.documents untuk sebuah field. */
export function spmbAnswerKey(fieldId: string): string {
  return `cf_${fieldId}`;
}

/** Batas jumlah pertanyaan custom (pertahanan terhadap jsonb korup/rakus). */
const SPMB_FIELDS_MAX = 50;

/**
 * Validasi + normalisasi skema dari jsonb: buang entri rusak, paksa tipe/panjang
 * yang aman, dedup id. Return [] bila bukan array (kolom null / belum ada).
 */
export function normalizeSpmbFormSchema(raw: unknown): SpmbFormField[] {
  if (!Array.isArray(raw)) return [];
  const validTypes = new Set<string>(SPMB_FIELD_TYPES.map((t) => t.value));
  const seen = new Set<string>();
  const out: SpmbFormField[] = [];
  for (const item of raw) {
    if (out.length >= SPMB_FIELDS_MAX) break;
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const id = typeof f.id === "string" ? f.id.trim().slice(0, 64) : "";
    const label = typeof f.label === "string" ? f.label.trim().slice(0, 200) : "";
    const type = typeof f.type === "string" && validTypes.has(f.type) ? (f.type as SpmbFieldType) : "text";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    const options = Array.isArray(f.options)
      ? f.options
          .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
          .map((o) => o.trim().slice(0, 120))
          .slice(0, 30)
      : [];
    out.push({
      id,
      label,
      type,
      required: f.required === true,
      active: f.active !== false,
      placeholder: typeof f.placeholder === "string" ? f.placeholder.trim().slice(0, 200) : "",
      help: typeof f.help === "string" ? f.help.trim().slice(0, 300) : "",
      options: spmbFieldNeedsOptions(type) && options.length > 0 ? options : [],
    });
  }
  return out;
}

/**
 * Ambil pertanyaan custom SPMB dari school_profile (hanya aktif yang dipakai
 * form publik — filter active dilakukan pemanggil). Aman sebelum ALTER TABLE:
 * kolom belum ada → profile.spmb_form_schema undefined → [].
 */
export async function getSpmbFormSchema(): Promise<SpmbFormField[]> {
  const profile = await getSchoolProfile();
  return normalizeSpmbFormSchema(profile?.spmb_form_schema);
}

/**
 * Simpan SELURUH daftar pertanyaan custom (admin — policy update school_profile).
 * Pola setSpmbDocuments: ambil id dulu, UPDATE ... WHERE id, deteksi 0 baris.
 * Kolom belum ada → pesan yang menunjuk ke SQL migrasi.
 */
export async function setSpmbFormSchema(fields: SpmbFormField[]): Promise<{ error?: string }> {
  try {
    const profile = await getSchoolProfile();
    if (!profile?.id) {
      return { error: "Profil sekolah tidak ditemukan — skema tidak tersimpan." };
    }
    const payload = { spmb_form_schema: normalizeSpmbFormSchema(fields) };
    const { data, error } = await supabase
      .from("school_profile")
      .update(payload)
      .eq("id", profile.id)
      .select("spmb_form_schema");
    if (error) {
      console.error("Error saving spmb form schema:", error);
      // Kolom belum ada (sebelum ALTER TABLE): PGRST204 = kolom tak ada di schema cache.
      if (
        error.code === "PGRST204" ||
        /does not exist|42703|schema cache/i.test(error.message || "")
      ) {
        return {
          error:
            "Kolom spmb_form_schema belum ada di database — jalankan SQL migrasi ALTER TABLE school_profile terlebih dahulu.",
        };
      }
      return { error: error.message };
    }
    if (!data || data.length === 0) {
      return { error: "Skema tidak tersimpan — tidak ada baris yang terupdate (cek policy RLS)." };
    }
    return {};
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error saving spmb form schema:", e);
    return { error: message };
  }
}

// ============ NEWS ATTACHMENT (lampiran file) ============
