-- ============================================================================
-- Unduhan (Area Download publik): brosur, formulir, juklak, dst.
-- Jalankan seluruh isi file ini di Supabase SQL Editor (idempoten).
--
-- Isi:
--   1. Tabel downloads + RLS (publik hanya membaca baris aktif; staff panel
--      mengelola — pola "Panel roles" sama seperti achievements).
--   2. Seed izin RBAC modul "unduhan" ke role_permissions (idempoten;
--      SUPER_ADMIN wildcard tidak butuh baris, tapi ikut disematkan agar
--      matriks izin konsisten).
-- ============================================================================

-- ── 1. Tabel ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  /** Kategori bebas untuk pengelompokan tampilan (mis. "SPMB", "Siswa"). */
  category text NOT NULL DEFAULT 'Umum',
  /** URL publik berkas di Storage (bucket "documents", folder downloads/). */
  file_url text NOT NULL,
  /** Nama asli berkas — ditampilkan sebagai teks tombol unduh. */
  file_name text,
  /** Ukuran berkas dalam byte (opsional, untuk tampilan). */
  file_size bigint,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Publik (anon): hanya baris aktif.
DROP POLICY IF EXISTS "Public can read active downloads" ON public.downloads;
CREATE POLICY "Public can read active downloads" ON public.downloads
  FOR SELECT
  USING (is_active = true);

-- Staff panel (authenticated): developer/admin/publisher aktif mengelola.
-- Pola identik dengan policy "Panel roles manage achievements".
DROP POLICY IF EXISTS "Panel roles can manage downloads" ON public.downloads;
CREATE POLICY "Panel roles can manage downloads" ON public.downloads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.is_active = true
        AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.is_active = true
        AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])
    )
  );

-- ── 2. Hak akses tabel (GRANT) ─────────────────────────────────────────────
-- Tabel yang dibuat lewat SQL Editor TIDAK otomatis mendapat GRANT untuk
-- anon/authenticated — tanpa ini query gagal 42501 "permission denied for
-- table downloads" meski policy RLS sudah benar. GRANT bersifat idempoten.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.downloads TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.downloads TO authenticated;

-- ── 3. Seed izin RBAC modul "unduhan" ──────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'role_permissions'
  ) THEN
    INSERT INTO public.role_permissions (role_key, permission)
    SELECT r.role_key, r.permission
    FROM (VALUES
      ('SUPER_ADMIN',    'unduhan:read'),
      ('SUPER_ADMIN',    'unduhan:create'),
      ('SUPER_ADMIN',    'unduhan:update'),
      ('SUPER_ADMIN',    'unduhan:delete'),
      ('ADMIN_SEKOLAH',  'unduhan:read'),
      ('ADMIN_SEKOLAH',  'unduhan:create'),
      ('ADMIN_SEKOLAH',  'unduhan:update'),
      ('ADMIN_SEKOLAH',  'unduhan:delete'),
      ('OPERATOR_KONTEN','unduhan:read'),
      ('OPERATOR_KONTEN','unduhan:create'),
      ('OPERATOR_KONTEN','unduhan:update'),
      ('OPERATOR_KONTEN','unduhan:delete')
    ) AS r(role_key, permission)
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;
