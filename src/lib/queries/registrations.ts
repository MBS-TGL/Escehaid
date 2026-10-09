import { supabase } from "../supabase";
import type { SpmbRegistration } from "../supabase";
import { notifyAllAdmins } from "./users";
import { getPublishedWaves, getWaveStatus } from "./waves";

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

  const { error } = await supabase.from("spmb_registrations").insert({
    full_name: registration.full_name,
    birth_place: registration.birth_place,
    birth_date: registration.birth_date,
    gender: registration.gender,
    address: registration.address,
    phone: registration.phone,
    parent_name: registration.parent_name,
    parent_occupation: registration.parent_occupation,
    previous_school: registration.previous_school,
    registration_path: registration.registration_path,
    // Email wajib ikut tersimpan — kolom dipakai pencarian & tab Kontak di admin.
    email: registration.email,
    documents: registration.documents || {},
    wave_id: waveId,
  });

  if (error) {
    console.error("Error submitting registration:", error);
    return { success: false, error: error.message };
  }

  // Email notifications —暂时 DISABLED (belum diverifikasi domain Resend)
  // Aktifkan lagi setelah custom domain ter-verify di Resend
  // sendRegistrationEmail({
  //   full_name: registration.full_name,
  //   email: registration.email,
  //   registration_path: registration.registration_path,
  //   parent_name: registration.parent_name,
  // }).catch(() => {});
  // sendRegistrationAdminEmail({
  //   full_name: registration.full_name,
  //   parent_name: registration.parent_name,
  //   phone: registration.phone,
  //   email: registration.email,
  //   registration_path: registration.registration_path,
  //   previous_school: registration.previous_school,
  // }).catch(() => {});

  // In-app notification to admins
  const pathLabel = registration.registration_path === "prestasi" ? "Prestasi" : registration.registration_path === "beasiswa" ? "Beasiswa" : "Reguler";
  notifyAllAdmins(
    "Pendaftaran SPMB Baru",
    `${registration.full_name} mendaftar via jalur ${pathLabel} dari ${registration.previous_school || "-"}.`,
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
    return [];
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
    const { error } = await supabase.storage.from("spmb-documents").remove(paths);
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

// ============ TEACHERS ============
