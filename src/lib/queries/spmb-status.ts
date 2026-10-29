import { supabase } from "../supabase";

/**
 * Cek status pendaftaran SPMB dari sisi publik.
 *
 * Pencarian memakai fungsi SQL `spmb_public_status(nisn, tanggal_lahir)`
 * (lihat supabase/spmb_status_check.sql) — SECURITY DEFINER, karena anon
 * tidak punya SELECT ke spmb_registrations. Fungsi hanya mengembalikan
 * kolom yang aman dipublikasikan; identitas diverifikasi ganda (NISN +
 * tanggal lahir) supaya status tidak bisa ditebak dari satu data saja.
 *
 * `status` pendaftar memakai nilai kolom `status` apa adanya
 * ("pending" | "accepted" | "rejected"); keputusan menampilkan hasil
 * seleksi (accepted/rejected) atau menyamar sebagai "Dalam Proses"
 * diambil dari `result_published` di halaman publik — hasil baru boleh
 * terlihat setelah panitia mempublikasikannya per gelombang.
 */

export interface SpmbStatusData {
  full_name: string;
  status: string;
  wave_name: string | null;
  wave_id: string | null;
  registered_at: string | null;
  result_published: boolean;
  /** Agregat verifikasi berkas (migrasi 0014); null bila belum tersedia. */
  doc_verified: number | null;
  doc_total: number | null;
  doc_pending: number | null;
  doc_rejected: number | null;
}

export type SpmbStatusLookup =
  | { kind: "found"; data: SpmbStatusData }
  | { kind: "not_found" }
  /** Fungsi SQL belum ada (migrasi belum dijalankan) / gangguan DB. */
  | { kind: "unavailable" };

export async function checkSpmbStatus(
  nisn: string,
  birthDate: string
): Promise<SpmbStatusLookup> {
  try {
    const { data, error } = await supabase.rpc("spmb_public_status", {
      p_nisn: nisn,
      p_birth_date: birthDate,
    });

    if (error) {
      // PGRST202 = fungsi tidak ditemukan di schema cache (migrasi belum jalan).
      if (error.code === "PGRST202" || /could not find|does not exist|schema cache/i.test(error.message || "")) {
        return { kind: "unavailable" };
      }
      console.error("checkSpmbStatus:", error.message);
      return { kind: "unavailable" };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row.full_name !== "string") {
      return { kind: "not_found" };
    }

    // Agregat verifikasi berkas — RPC terpisah agar fungsi status lama tidak
    // perlu diubah. Gagal/tabel belum ada → null (UI tidak mengklaim apa pun).
    let docVerified: number | null = null;
    let docTotal: number | null = null;
    let docPending: number | null = null;
    let docRejected: number | null = null;
    try {
      const { data: summary, error: sumErr } = await supabase.rpc(
        "spmb_public_document_summary",
        { p_nisn: nisn, p_birth_date: birthDate }
      );
      const s = Array.isArray(summary) ? summary[0] : summary;
      if (!sumErr && s) {
        docVerified = Number(s.verified) || 0;
        docTotal = Number(s.total) || 0;
        docPending = Number(s.pending) || 0;
        docRejected = Number(s.rejected) || 0;
      }
    } catch {
      // biarkan null
    }

    return {
      kind: "found",
      data: {
        full_name: row.full_name,
        status: typeof row.status === "string" ? row.status : "pending",
        wave_name: typeof row.wave_name === "string" && row.wave_name ? row.wave_name : null,
        wave_id: typeof row.wave_id === "string" && row.wave_id ? row.wave_id : null,
        registered_at: typeof row.registered_at === "string" ? row.registered_at : null,
        result_published: row.result_published === true,
        doc_verified: docVerified,
        doc_total: docTotal,
        doc_pending: docPending,
        doc_rejected: docRejected,
      },
    };
  } catch (e) {
    console.error("checkSpmbStatus:", e);
    return { kind: "unavailable" };
  }
}
