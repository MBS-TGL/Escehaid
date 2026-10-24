-- ============================================================================
-- Izin modul "sampah" (Recycle Bin — halaman /admin/trash) — jalankan SEKALI
-- di Supabase SQL Editor. Idempoten.
--
-- SUPER_ADMIN sudah wildcard via can(); baris eksplisit ditambah agar matriks
-- izin di panel menampilkan daftar lengkap.
--   ADMIN_SEKOLAH    : lihat, pulihkan, hapus permanen
--   OPERATOR_KONTEN  : lihat & pulihkan kontennya (hapus permanen = developer)
-- ============================================================================

INSERT INTO public.role_permissions (role_key, permission) VALUES
  ('SUPER_ADMIN',     'sampah:read'),
  ('SUPER_ADMIN',     'sampah:update'),
  ('SUPER_ADMIN',     'sampah:delete'),
  ('ADMIN_SEKOLAH',   'sampah:read'),
  ('ADMIN_SEKOLAH',   'sampah:update'),
  ('ADMIN_SEKOLAH',   'sampah:delete'),
  ('OPERATOR_KONTEN', 'sampah:read'),
  ('OPERATOR_KONTEN', 'sampah:update')
ON CONFLICT (role_key, permission) DO NOTHING;
