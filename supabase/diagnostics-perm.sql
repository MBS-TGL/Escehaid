-- ============================================================================
-- Izin modul "diagnostik" (halaman /admin/diagnostics) — jalankan SEKALI di
-- Supabase SQL Editor. Idempoten.
--
-- SUPER_ADMIN sudah wildcard via can(); baris eksplisit ditambah agar matriks
-- izin di panel menampilkan daftar lengkap. ADMIN_SEKOLAH boleh melihat
-- status sistem (read-only).
-- ============================================================================

INSERT INTO public.role_permissions (role_key, permission) VALUES
  ('SUPER_ADMIN',   'diagnostik:read'),
  ('ADMIN_SEKOLAH', 'diagnostik:read')
ON CONFLICT (role_key, permission) DO NOTHING;
