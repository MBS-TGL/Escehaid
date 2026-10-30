import type { SpmbRegistration } from "./supabase";

/** Label tampilan jalur pendaftaran — dipakai filter, tabel, dan detail. */
export const SPMB_PATH_LABELS: Record<string, string> = {
  reguler: "Reguler",
  prestasi: "Prestasi",
  beasiswa: "Beasiswa",
};

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
    pathLabel.includes(q)
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
  const { search, status, path, program } = state;

  return rows.filter((row) => {
    const matchStatus = !status || status === "all" || row.status === status;
    const matchPath = !path || path === "all" || row.registration_path === path;

    const rowProgram = spmbProgramOf(row);
    const matchProgram =
      !program ||
      program === "all" ||
      (program === SPMB_NO_PROGRAM ? rowProgram === "" : rowProgram === program);

    return matchStatus && matchPath && matchProgram && matchesSpmbSearch(row, search);
  });
}
