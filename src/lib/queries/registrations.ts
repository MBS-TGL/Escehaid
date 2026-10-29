import { supabase } from "../supabase";
import type { SpmbDocumentKey, SpmbDocumentVerification, SpmbRegistration } from "../supabase";
import { removeViaRoute } from "../storage-remote";
import { notifyAllAdmins } from "./users";
import { getPublishedWaves, getWaveStatus } from "./waves";
import { isFeatureEnabled } from "@/lib/flags";
import { mergeSpmbDocuments } from "@/lib/spmb-registration";
import {
  normalizeName,
  normalizeSchool,
  normalizeParentName,
  normalizePhone,
} from "@/lib/format-name";

/** Kunci documents yang berisi NAMA — dinormalisasi saat simpan (merge-safe). */
const REG_NAME_DOC_KEYS = new Set(["nickname", "father_name", "mother_name"]);

/**
 * Normalisasi INPUT DATA PENDAFTAR sebelum ditulis ke DB — dipanggil dari
 * SEMUA pintu masuk (submit form publik, tambah/edit manual admin, impor
 * massal) agar nama selalu konsisten di tiga lapis (DB, admin, publik).
 *
 * Aturan:
 * - full_name/parent_name/previous_school + kunci nama di documents
 *   (nickname, father_name, mother_name) → Title Case (format-name.ts).
 * - email → trim + lowercase.
 * - phone → buang spasi/tanda hubung (awalan 0 / +62 dipertahankan).
 * - documents: hanya kunci nama yang disentuh — kunci lain (cf_*, berkas,
 *   input_source, ....) dipertahankan apa adanya. Untuk UPDATE, merge dengan
 *   row lama tetap ditangani mergeSpmbDocuments di tempat pemanggil.
 */
export function normalizeRegistrationInput<
  T extends {
    full_name?: string;
    parent_name?: string;
    previous_school?: string;
    email?: string;
    phone?: string;
    documents?: Record<string, string | null>;
  },
>(input: T): T {
  const out: T = {
    ...input,
    full_name: normalizeName(input.full_name ?? ""),
    parent_name: input.parent_name === undefined ? undefined : normalizeParentName(input.parent_name),
    previous_school:
      input.previous_school === undefined ? undefined : normalizeSchool(input.previous_school),
    email: input.email === undefined ? undefined : input.email.trim().toLowerCase(),
    phone: input.phone === undefined ? undefined : normalizePhone(input.phone),
  };
  if (input.documents) {
    out.documents = Object.fromEntries(
      Object.entries(input.documents).map(([k, v]) =>
        REG_NAME_DOC_KEYS.has(k) && typeof v === "string" && v ? [k, normalizeName(v)] : [k, v]
      )
    );
  }
  return out;
}

export async function submitRegistration(registration: {
  full_name: string;
  birth_place?: string;
  birth_date?: string;
  gender: "L" | "P";
  address?: string;
  phone?: string;
  email?: string;
  parent_name?: string;
  parent_occupation?: string;
  previous_school?: string;
  registration_path: "reguler" | "prestasi" | "beasiswa";
  documents?: Record<string, string | null>;
}): Promise<{ success: boolean; error?: string }> {
  // Cek feature flag spmb_registration_open — tolak submit jika ditutup.
  const spmbOpen = await isFeatureEnabled("spmb_registration_open");
  if (!spmbOpen) {
    return { success: false, error: "Pendaftaran SPMB saat ini ditutup. Silakan coba lagi nanti." };
  }

  // Fase 4: catat gelombang yang sedang "open" saat pendaftar mengirim form.
  // Kalau tidak ada gelombang terbuka (atau gagal membaca), wave_id = null dan
  // pendaftaran TETAP disimpan — jangan blokir.
  let waveId: string | null = null;
  try {
    const now = new Date();
    waveId = (await getPublishedWaves()).find((w) => getWaveStatus(w, now) === "open")?.id ?? null;
  } catch {
    waveId = null;
  }

  const reg = normalizeRegistrationInput(registration);
  const { error } = await supabase.from("spmb_registrations").insert({
    full_name: reg.full_name,
    birth_place: reg.birth_place,
    birth_date: reg.birth_date,
    gender: reg.gender,
    address: reg.address,
    phone: reg.phone,
    parent_name: reg.parent_name,
    parent_occupation: reg.parent_occupation,
    previous_school: reg.previous_school,
    registration_path: reg.registration_path,
    // Email wajib ikut tersimpan — kolom dipakai pencarian & tab Kontak di admin.
    email: reg.email,
    documents: reg.documents || {},
    wave_id: waveId,
  });

  if (error) {
    console.error("Error submitting registration:", error);
    return { success: false, error: error.message };
  }

  // In-app notification to admins
  const pathLabel = reg.registration_path === "prestasi" ? "Prestasi" : reg.registration_path === "beasiswa" ? "Beasiswa" : "Reguler";
  notifyAllAdmins(
    "Pendaftaran SPMB Baru",
    `${reg.full_name} mendaftar via jalur ${pathLabel} dari ${reg.previous_school || "-"}.`,
    "info",
    "/admin/admission"
  ).catch(() => {});

  return { success: true };
}

export async function getRegistrationList(): Promise<SpmbRegistration[]> {
  const { data, error } = await supabase
    .from("spmb_registrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching registrations:", error);
    // Dilempar agar panel bisa membedakan "gagal memuat" vs "belum ada data".
    throw new Error(error.message);
  }
  return data || [];
}

export async function updateRegistrationStatus(
  id: string,
  status: "accepted" | "rejected",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("spmb_registrations")
    .update({ status, admin_notes: notes })
    .eq("id", id);

  if (error) {
    console.error("Error updating status:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateRegistrationNotes(
  id: string,
  admin_notes: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("spmb_registrations")
    .update({ admin_notes })
    .eq("id", id);

  if (error) {
    console.error("Error updating notes:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateRegistrationBulkStatus(
  ids: string[],
  status: "accepted" | "rejected"
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("spmb_registrations")
    .update({ status })
    .in("id", ids);

  if (error) {
    console.error("Error bulk updating status:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** Kunci berkas pada jsonb documents pendaftar (kunci lain = data teks, bukan path). */
const REG_DOC_KEYS = ["kk", "akta", "surat_sekolah", "ktp_ortu", "bukti_transfer"] as const;

/** Kumpulkan path file berkas dari jsonb documents (abaikan nilai yang bukan path). */
function collectRegDocPaths(documents: Record<string, unknown> | null | undefined): string[] {
  if (!documents) return [];
  return REG_DOC_KEYS.map((k) => documents[k]).filter(
    (v): v is string => typeof v === "string" && v.length > 0 && !v.startsWith("http")
  );
}

/** Hapus file berkas pendaftar di bucket spmb-documents (best-effort, tidak menggagalkan delete). */
async function removeRegDocFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await removeViaRoute("spmb-documents", paths);
    if (error) console.warn("[removeRegDocFiles] remove failed:", error.message);
  } catch (e) {
    console.warn("[removeRegDocFiles] error:", e);
  }
}

export async function deleteRegistration(id: string): Promise<{ error?: string }> {
  // Ambil path berkas SEBELUM row dihapus supaya dokumen sensitif tidak jadi orphan
  const { data: row } = await supabase
    .from("spmb_registrations")
    .select("documents")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("spmb_registrations").delete().eq("id", id);
  if (error) {
    console.error("Error deleting registration:", error);
    return { error: error.message };
  }
  removeRegDocFiles(collectRegDocPaths(row?.documents)).catch(() => {});
  return {};
}

export async function deleteRegistrationBulk(ids: string[]): Promise<{ error?: string }> {
  const { data: rows } = await supabase
    .from("spmb_registrations")
    .select("documents")
    .in("id", ids);
  const { error } = await supabase.from("spmb_registrations").delete().in("id", ids);
  if (error) {
    console.error("Error bulk deleting registrations:", error);
    return { error: error.message };
  }
  const docPaths: string[] = [];
  for (const row of rows || []) {
    docPaths.push(...collectRegDocPaths(row.documents));
  }
  removeRegDocFiles(docPaths).catch(() => {});
  return {};
}

// ============ ADMIN: TAMBAH PENDAFTAR (INPUT MANUAL) ============

/** Input "Tambah Pendaftar" oleh admin — bentuk data sama dengan form publik. */
export type AdminCreateRegistrationInput = {
  full_name: string;
  birth_place?: string;
  /** "YYYY-MM-DD"; "" / null → null (kolom date tidak menerima ""). */
  birth_date?: string | null;
  gender: "L" | "P";
  address?: string;
  phone?: string;
  email?: string;
  parent_name?: string;
  parent_occupation?: string;
  previous_school?: string;
  registration_path: "reguler" | "prestasi" | "beasiswa";
  /** Default "pending" (hanya "pending" | "accepted" yang bisa dipilih admin). */
  status?: "pending" | "accepted";
  /** Pilihan admin; null = tanpa gelombang (TIDAK otomatis seperti submitRegistration). */
  wave_id?: string | null;
  admin_notes?: string;
  documents?: Record<string, string | null>;
};

/**
 * Insert pendaftar oleh admin (panel /admin/admission — "Tambah Pendaftar").
 * Tanpa notifyAllAdmins: admin yang mengetik datanya sendiri, bukan pendaftaran
 * publik baru. Butuh policy INSERT authenticated (lihat
 * supabase/spmb_admin_insert.sql) karena policy anon hanya menerima insert
 * default (status pending / tanpa gelombang).
 */
export async function adminCreateRegistration(
  input: AdminCreateRegistrationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const birthDate = input.birth_date?.trim() || "";
    const normalized = normalizeRegistrationInput(input);
    const { error } = await supabase.from("spmb_registrations").insert({
      full_name: normalized.full_name,
      birth_place: normalized.birth_place?.trim() || "",
      birth_date: birthDate || null,
      gender: normalized.gender,
      address: normalized.address?.trim() || "",
      phone: normalized.phone || "",
      email: normalized.email || "",
      parent_name: normalized.parent_name ?? "",
      parent_occupation: normalized.parent_occupation ?? "",
      previous_school: normalized.previous_school?.trim() || "",
      registration_path: normalized.registration_path,
      status: normalized.status ?? "pending",
      admin_notes: normalized.admin_notes?.trim() || "",
      documents: normalized.documents || {},
      wave_id: normalized.wave_id ?? null,
    });

    if (error) {
      console.error("Error creating registration (admin):", error);
      // RLS menolak → pesan yang menunjuk ke migrasi, bukan pesan mentah membingungkan.
      if (error.code === "42501" || /row-level security/i.test(error.message || "")) {
        return {
          success: false,
          error:
            "Database menolak penyimpanan (policy RLS insert admin belum aktif) — jalankan supabase/spmb_admin_insert.sql di Supabase SQL Editor.",
        };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error creating registration (admin):", e);
    return { success: false, error: message };
  }
}

/** Baris pendaftar yang NISN/NIK-nya sama dengan input yang sedang disusun. */
export type SpmbRegistrationDuplicate = {
  id: string;
  full_name: string;
  /** Field identik yang cocok dengan data input. */
  matched: ("nisn" | "nik")[];
};

/**
 * Cari pendaftar dengan NISN/NIK sama (via documents->>nisn / documents->>nik).
 * `excludeId` untuk mode EDIT — baris yang sedang diedit tidak dihitung
 * duplikat terhadap dirinya sendiri.
 * Best-effort: hanya dipakai untuk peringatan "kemungkinan duplikat" di panel
 * admin — kegagalan query diam-diam dianggap [] dan TIDAK memblokir simpan.
 */
export async function findDuplicateRegistrations({
  nisn,
  nik,
  excludeId,
}: {
  nisn?: string;
  nik?: string;
  /** id pendaftar yang sedang diedit — dikecualikan dari hasil. */
  excludeId?: string;
}): Promise<SpmbRegistrationDuplicate[]> {
  const n = nisn?.trim() || "";
  const k = nik?.trim() || "";
  if (!n && !k) return [];

  const byId = new Map<string, SpmbRegistrationDuplicate>();
  async function findBy(column: "nisn" | "nik", value: string): Promise<void> {
    if (!value) return;
    try {
      const { data, error } = await supabase
        .from("spmb_registrations")
        .select("id, full_name, documents")
        .filter(`documents->>${column}`, "eq", value);
      if (error) {
        console.warn("findDuplicateRegistrations:", error.message);
        return;
      }
      for (const row of data || []) {
        if (excludeId && row.id === excludeId) continue;
        const existing = byId.get(row.id);
        if (existing) {
          if (!existing.matched.includes(column)) existing.matched.push(column);
        } else {
          byId.set(row.id, { id: row.id, full_name: row.full_name, matched: [column] });
        }
      }
    } catch (e) {
      console.warn("findDuplicateRegistrations:", e);
    }
  }

  await findBy("nisn", n);
  await findBy("nik", k);
  return Array.from(byId.values());
}

/**
 * Update penuh satu pendaftar oleh admin (mode EDIT panel /admin/admission).
 * Bentuk input SAMA dengan adminCreateRegistration; kolom `status` SENGAJA
 * tidak diikutkan — perubahan status tetap lewat alur Terima/Tolak yang
 * berkonfirmasi di daftar pendaftar.
 *
 * documents di-MERGE (bukan ditimpa): kunci data & berkas yang diganti
 * menimpa, kunci asing (cf_* pertanyaan non-aktif, input_source, dll.)
 * dipertahankan — lihat mergeSpmbDocuments. Pemanggil hanya menyertakan
 * kunci berkas yang benar-benar diganti (keep-or-replace).
 */
export async function adminUpdateRegistration(
  id: string,
  input: AdminCreateRegistrationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const birthDate = input.birth_date?.trim() || "";
    const normalized = normalizeRegistrationInput(input);

    // Ambil documents lama untuk merge; gagal baca → anggap kosong (merge
    // jadi timpa penuh — perilaku menyimpang hanya bila SELECT ditolak RLS,
    // dan penulis pun pasti ditolak juga).
    const { data: existingRow } = await supabase
      .from("spmb_registrations")
      .select("documents")
      .eq("id", id)
      .maybeSingle();

    const documents = mergeSpmbDocuments(
      existingRow?.documents ?? null,
      normalized.documents || {}
    );

    const { data, error } = await supabase
      .from("spmb_registrations")
      .update({
        full_name: normalized.full_name,
        birth_place: normalized.birth_place?.trim() || "",
        birth_date: birthDate || null,
        gender: normalized.gender,
        address: normalized.address?.trim() || "",
        phone: normalized.phone || "",
        email: normalized.email || "",
        parent_name: normalized.parent_name ?? "",
        parent_occupation: normalized.parent_occupation ?? "",
        previous_school: normalized.previous_school?.trim() || "",
        registration_path: normalized.registration_path,
        wave_id: normalized.wave_id ?? null,
        admin_notes: normalized.admin_notes?.trim() || "",
        documents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("Error updating registration (admin):", error);
      if (error.code === "42501" || /row-level security/i.test(error.message || "")) {
        return {
          success: false,
          error:
            "Database menolak perubahan (policy RLS update belum mengizinkan peran ini).",
        };
      }
      return { success: false, error: error.message };
    }
    // UPDATE dengan RLS bisa "berhasil" tanpa menyentuh baris → deteksi di sini.
    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Perubahan tidak tersimpan — tidak ada baris yang terupdate (cek policy RLS).",
      };
    }
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error updating registration (admin):", e);
    return { success: false, error: message };
  }
}

// ============ TEACHERS ============

// ─────────────────────────────────────────────────────────────────────────────
// VERIFIKASI BERKAS SPMB (migrasi 0014)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDocumentVerifications(
  registrationId: string
): Promise<SpmbDocumentVerification[]> {
  const { data, error } = await supabase
    .from("spmb_document_verifications")
    .select("registration_id, document_key, status, note, verified_by, verified_at")
    .eq("registration_id", registrationId);
  if (error) {
    // Tabel belum dimigrasi → anggap belum ada verifikasi.
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as SpmbDocumentVerification[];
}

export async function saveDocumentVerification(input: {
  registrationId: string;
  documentKey: SpmbDocumentKey;
  status: "pending" | "verified" | "rejected";
  note?: string;
}): Promise<{ error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("spmb_document_verifications").upsert(
    {
      registration_id: input.registrationId,
      document_key: input.documentKey,
      status: input.status,
      note: input.note ?? "",
      verified_by: input.status === "pending" ? null : userData.user?.id ?? null,
      verified_at: input.status === "pending" ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "registration_id,document_key" }
  );
  if (error) return { error: error.message };
  return {};
}

/** Pindahkan pendaftar terpilih ke gelombang lain. */
export async function updateRegistrationWaveBulk(
  ids: string[],
  waveId: string | null
): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const { error } = await supabase
    .from("spmb_registrations")
    .update({ wave_id: waveId, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { error: error.message };
  return {};
}

/** Kembalikan banyak pendaftar ke status Menunggu. */
export async function setRegistrationPendingBulk(ids: string[]): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const { error } = await supabase
    .from("spmb_registrations")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { error: error.message };
  return {};
}
