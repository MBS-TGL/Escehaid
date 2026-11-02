import type { SpmbFieldType } from "@/lib/supabase";

/** Tab utama halaman: daftar pendaftar atau pengelolaan gelombang. */
export type MainTab = "registrations" | "pipeline" | "waves" | "form" | "settings";

export type SortField = "created_at" | "full_name" | "status" | "registration_path" | "gender";
export type SortDir = "asc" | "desc";

/** Tab modal detail pendaftar. */
export type SpmbDetailTab = "siswa" | "kontak" | "ayah" | "ibu" | "berkas" | "tambahan";

/** State form tambah/edit gelombang pendaftaran. */
export type WaveFormState = {
  name: string;
  start_date: string;
  end_date: string;
  note: string;
  is_published: boolean;
  quota: string;
  registration_fee: string;
  announcement_at: string;
  result_at: string;
  is_archived: boolean;
};

/** Draft form tambah/edit pertanyaan custom (builder ala Google Form). */
export type FieldDraft = {
  label: string;
  type: SpmbFieldType;
  required: boolean;
  active: boolean;
  placeholder: string;
  help: string;
  /** Daftar opsi untuk select/radio/checkbox — satu opsi per baris. */
  optionsText: string;
};
