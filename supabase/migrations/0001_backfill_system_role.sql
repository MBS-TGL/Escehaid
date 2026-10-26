-- ============================================================================
-- 0001 — Backfill `user_profiles.system_role`
--
-- MENGAPA
-- Fungsi `has_permission()` punya jalur fallback legacy:
--
--     if v_legacy in ('developer','admin','publisher') then return true;
--
-- Artinya user dengan `system_role IS NULL` dan role legacy apa pun dari
-- ketiganya lolos SEMUA izin — termasuk `users:manage`. Digabung dengan policy
-- `Users can update own profile` (yang hanya membatasi per BARIS, bukan kolom),
-- seorang `publisher` bisa PATCH barisnya sendiri ke `system_role =
-- 'SUPER_ADMIN'`. Itu eskalasi hak penuh. Jalur itu hanya bisa ditutup kalau
-- tidak ada lagi baris dengan `system_role IS NULL`.
--
-- PEMETAAN (disetujui pemilik repo): PERTAHANKAN AKSES.
-- developer/admin/publisher → SUPER_ADMIN, persis seperti
-- `LEGACY_ROLE_TO_SYSTEM_ROLE` di `src/lib/rbac/roles.ts`, sehingga tidak ada
-- admin yang kehilangan akses saat migrasi ini dijalankan. Penurunan peran
-- dilakukan SADAR lewat /admin/users setelahnya, bukan sebagai efek samping
-- migrasi.
--
-- teacher/student sengaja TIDAK dipetakan (tetap NULL → tanpa izin), sama
-- dengan perilaku kode saat ini.
--
-- Idempoten: hanya menyentuh baris yang `system_role IS NULL`.
-- ============================================================================

-- ── PREFLIGHT (baca dulu, tidak mengubah apa pun) ───────────────────────────
-- Jalankan SELECT ini lebih dulu untuk melihat siapa yang akan terpengaruh:
--
--   select role, count(*) as jumlah
--     from public.user_profiles
--    where system_role is null
--    group by role
--    order by role;
--
--   select id, email, role, is_active
--     from public.user_profiles
--    where system_role is null
--    order by role, email;
--
-- Ekspektasi: hanya `developer`, `admin`, `publisher` yang akan berubah.
-- Bila ada role lain dengan `is_active = true`, putuskan sadar sebelum lanjut.

-- ── BACKFILL ────────────────────────────────────────────────────────────────
update public.user_profiles
   set system_role = 'SUPER_ADMIN'
 where system_role is null
   and role in ('developer', 'admin', 'publisher');

-- ── VERIFIKASI (harus 0 baris untuk role admin) ─────────────────────────────
--   select role, count(*) as sisa
--     from public.user_profiles
--    where system_role is null
--      and role in ('developer','admin','publisher')
--    group by role;
--
-- Bila hasilnya > 0, JANGAN lanjut ke 0002 — jalankan 0001 ulang lebih dulu.
