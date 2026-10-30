import type { SpmbRegistration } from "./supabase";

/** Label tampilan jalur pendaftaran — dipakai filter, tabel, dan detail. */
export const SPMB_PATH_LABELS: Record<string, string> = {
  reguler: "Reguler",
  prestasi: "Prestasi",
  beasiswa: "Beasiswa",
};

/** Label gender untuk daftar admin — "Putra"/"Putri" (nilai DB tetap L/P). */
export const SPMB_GENDER_LABELS: Record<string, string> = {
  L: "Putra",
  P: "Putri",
};

export function spmbGenderLabel(gender: string): string {
  return SPMB_GENDER_LABELS[gender] ?? "—";
}

/** Nilai filter "tanpa program" untuk baris lama yang belum punya `documents.program`. */
export const SPMB_NO_PROGRAM = "none";

export type SpmbFilterState = {
  /** Kata kunci pencarian bebas. */
  search: string;
  /** Status: `"all"` atau salah satu status pendaftaran. */
  status: string;
  /** Jalur: `"all"`, `reguler`, `prestasi`, atau `beasiswa`. */
  path: string;
  /** Program: `"all"`, `SPMB_NO_PROGRAM`, atau nama program. */
  program: string;
  /** Jenis kelamin: `"all"`, `"L"`, atau `"P"`. */
  gender: string;
};

/** Program yang tersimpan di jsonb `documents.program` ("" bila belum diisi). */
export function spmbProgramOf(row: Pick<SpmbRegistration, "documents">): string {
  return row.documents?.program ?? "";
}

/**
 * Apakah baris cocok dengan kata kunci. Mencakup data utama (nama, sekolah,
 * email, telepon), dokumen (NISN/NIK), jawaban pertanyaan tambahan (`cf_*`),
 * serta **program** dan **jalur** agar admin bisa mencari "boarding",
 * "full day", "prestasi", "beasiswa", dsb.
 */
export function matchesSpmbSearch(row: SpmbRegistration, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;

  const docs = row.documents ?? {};
  const customText = Object.keys(docs)
    .filter((key) => key.startsWith("cf_"))
    .map((key) => docs[key] || "")
    .join(" ")
    .toLowerCase();
  const program = (docs.program || "").toLowerCase();
  const path = (row.registration_path || "").toLowerCase();
  const pathLabel = (SPMB_PATH_LABELS[row.registration_path] || row.registration_path || "").toLowerCase();
  // "putra"/"putri"/"laki"/"perempuan". Huruf tunggal L/P tidak dipakai di
  // pencarian (terlalu ramai — "reguler" pun mengandung "l"); pakai filter JK.
  const genderSearch = row.gender === "P" ? "putri perempuan" : "putra laki laki";
  const genderMatch = genderSearch.includes(q);

  return (
    (row.full_name || "").toLowerCase().includes(q) ||
    (row.previous_school || "").toLowerCase().includes(q) ||
    (row.email || "").toLowerCase().includes(q) ||
    (row.phone || "").toLowerCase().includes(q) ||
    (docs.nisn || "").toLowerCase().includes(q) ||
    (docs.nik || "").toLowerCase().includes(q) ||
    customText.includes(q) ||
    program.includes(q) ||
    path.includes(q) ||
    pathLabel.includes(q) ||
    genderMatch
  );
}

/**
 * Saring daftar pendaftar berdasarkan pencarian + status + jalur + program.
 * Predikat dapat dikombinasikan (mis. jalur prestasi DAN program SMA Boarding).
 */
export function filterSpmbRegistrations(
  rows: SpmbRegistration[],
  state: SpmbFilterState
): SpmbRegistration[] {
  const { search, status, path, program, gender } = state;

  return rows.filter((row) => {
    const matchStatus = !status || status === "all" || row.status === status;
    const matchPath = !path || path === "all" || row.registration_path === path;
    const matchGender = !gender || gender === "all" || row.gender === gender;

    const rowProgram = spmbProgramOf(row);
    const matchProgram =
      !program ||
      program === "all" ||
      (program === SPMB_NO_PROGRAM ? rowProgram === "" : rowProgram === program);

    return matchStatus && matchPath && matchGender && matchProgram && matchesSpmbSearch(row, search);
  });
}
