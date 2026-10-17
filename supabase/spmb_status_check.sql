-- ============================================================================
-- SPMB: Cek Status Pendaftaran (publik) + Publikasi Hasil Seleksi
-- Jalankan seluruh isi file ini di Supabase SQL Editor (idempoten — aman
-- dijalankan berulang).
--
-- Bagian:
--   1. Kolom result_published_at di spmb_waves (penanda "hasil sudah
--      diumumkan" per gelombang).
--   2. Fungsi spmb_public_status(nisn, tanggal_lahir) — SECURITY DEFINER.
--      Anonim TIDAK punya SELECT ke spmb_registrations (hanya INSERT),
--      sehingga pencocokan dilakukan di dalam fungsi dan HANYA mengembalikan
--      kolom yang aman dipublikasikan (tanpa alamat, orang tua, berkas, dsb.)
-- ============================================================================

-- ── 1. Kolom publikasi hasil per gelombang ─────────────────────────────────
-- NULL = hasil belum diumumkan (status accepted/rejected disembunyikan dari
-- publik dan tampil sebagai "Dalam Proses"). Diisi timestamp saat panitia
-- menekan "Publikasikan Hasil" di /admin/admission.
ALTER TABLE public.spmb_waves
  ADD COLUMN IF NOT EXISTS result_published_at timestamptz;

-- ── 2. Fungsi cek status publik ─────────────────────────────────────────────
-- Identitas diverifikasi ganda: NISN (documents->>'nisn') + tanggal lahir
-- harus keduanya cocok, sehingga penebangan nomor tunggal tidak membocorkan
-- status milik orang lain. Pendaftar lama tanpa NISN tidak dapat mencari —
-- tampilan publik sudah menyarankan menghubungi panitia.
CREATE OR REPLACE FUNCTION public.spmb_public_status(
  p_nisn text,
  p_birth_date date
)
RETURNS TABLE (
  full_name text,
  status text,
  wave_name text,
  wave_id uuid,
  registered_at timestamptz,
  result_published boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nisn text := btrim(coalesce(p_nisn, ''));
BEGIN
  -- Input kosong / NISN tidak wajar → tidak ada baris (bukan error).
  IF v_nisn = '' OR char_length(v_nisn) > 30 OR p_birth_date IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      r.full_name,
      r.status,
      w.name,
      r.wave_id,
      r.created_at,
      (w.result_published_at IS NOT NULL) AS result_published
    FROM spmb_registrations r
    LEFT JOIN spmb_waves w ON w.id = r.wave_id
    WHERE r.documents->>'nisn' = v_nisn
      AND r.birth_date = p_birth_date
    ORDER BY r.created_at DESC
    LIMIT 1;
END;
$$;

-- Batasi siapa yang boleh mengeksekusi (default Postgres = PUBLIC).
REVOKE ALL ON FUNCTION public.spmb_public_status(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spmb_public_status(text, date)
  TO anon, authenticated;
