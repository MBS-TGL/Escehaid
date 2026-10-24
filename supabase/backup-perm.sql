-- ============================================================================
-- Izin modul "backup" (halaman /admin/backup) — jalankan SEKALI di Supabase
-- SQL Editor setelah commit fitur Cadangan. Idempoten.
--
-- SUPER_ADMIN sudah wildcard via can(); baris eksplisit ditambah agar matriks
-- izin di panel menampilkan daftar lengkap. ADMIN_SEKOLAH boleh melihat &
-- memicu backup; OPERATOR_KONTEN tidak (urusan infrastruktur).
-- ============================================================================

INSERT INTO public.role_permissions (role_key, permission) VALUES
  ('SUPER_ADMIN',   'backup:read'),
  ('SUPER_ADMIN',   'backup:update'),
  ('ADMIN_SEKOLAH', 'backup:read'),
  ('ADMIN_SEKOLAH', 'backup:update')
ON CONFLICT (role_key, permission) DO NOTHING;
