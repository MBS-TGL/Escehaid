/**
 * Helper murni (tanpa dependensi Supabase) — aman diimpor langsung oleh
 * komponen client tanpa menarik barrel `@/lib/queries`.
 */

/** Label jenis lampiran dari ekstensi, mis. "PDF", "DOCX". */
export function attachmentKind(name?: string | null): string {
  const ext = (name || "").split(".").pop()?.toUpperCase() || "FILE";
  return ext.length <= 5 ? ext : "FILE";
}

/** Kunci jawaban pendaftar di spmb_registrations.documents untuk sebuah field. */
export function spmbAnswerKey(fieldId: string): string {
  return `cf_${fieldId}`;
}
