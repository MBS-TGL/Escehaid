-- ============================================================================
-- RPC `update_own_full_name` — ubah nama tampilan akun sendiri, dari halaman
-- Pengaturan Akun (/admin/security → seksi Profil).
--
-- Mengapa RPC, bukan policy RLS UPDATE: RLS bersifat per-BARIS; policy
-- "user boleh update barisnya" akan membolehkan user mengubah kolom role /
-- is_active / system_role miliknya sendiri via PostgREST (eskalasi hak!).
-- RPC SECURITY DEFINER ini hanya menyentuh SATU kolom: full_name.
--
-- Jalankan di Supabase SQL Editor. Idempoten.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_own_full_name(p_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;
  IF p_full_name IS NULL OR length(btrim(p_full_name)) < 2 OR length(p_full_name) > 100 THEN
    RAISE EXCEPTION 'Nama tampilan harus 2-100 karakter';
  END IF;

  UPDATE public.user_profiles
     SET full_name = btrim(p_full_name)
   WHERE id = auth.uid();
END;
$$;

-- Eksekusi hanya untuk yang login (tidak untuk anon/service via API publik).
REVOKE ALL ON FUNCTION public.update_own_full_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_full_name(text) TO authenticated;
