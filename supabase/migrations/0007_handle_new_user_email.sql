-- ============================================================================
-- 0007 — `handle_new_user()` mengisi email + tutup jalur signup tanpa email
--
-- MASALAH 1 — email tidak pernah diisi
-- Fungsi ini jalan sebagai trigger `on_auth_user_created` setiap ada akun
-- baru, tapi INSERT-nya melewatkan kolom `email`:
--
--     INSERT INTO public.user_profiles (id, full_name, role, is_active)
--
-- Akibatnya setiap akun baru punya `email` NULL di profil walau
-- `auth.users.email` terisi. Tiga tempat bergantung pada kolom itu:
--   • /admin/users — pencarian memakai `email.ilike` (actions.ts:125),
--     jadi akun tanpa email TIDAK KETEMU saat dicari berdasarkan email.
--   • UsersTab — email tidak tampil di daftar.
--   • UsersTab — tombol "Reset Password" dinonaktifkan (`disabled={!email}`),
--     jadi admin tidak bisa mengirim tautan reset untuk akun itu.
--
-- Kasus nyata saat migrasi ini ditulis: `user@mbs.id` — email ada di
-- auth.users, NULL di user_profiles.
--
-- MASALAH 2 — signup bisa gagal total
-- Bila `raw_user_meta_data.full_name` kosong DAN email NULL (mis. signup
-- lewat telepon), ekspresi lama menghasilkan NULL:
--
--     split_part(NULL, '@', 1)  →  NULL
--
-- `full_name` bertipe NOT NULL → INSERT gagal → seluruh proses signup gagal
-- dengan pesan yang membingungkan. Belum pernah terjadi karena semua akun
-- sejauh ini memakai email, tapi jalurnya terbuka.
--
-- Idempoten: create or replace + update yang hanya menyentuh baris kosong.
-- ============================================================================

-- ── 1. Fungsi trigger ───────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.user_profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    -- Email dari auth.users. Bisa NULL untuk signup via telepon/OAuth tertentu.
    new.email,
    -- Nama: metadata → bagian lokal email → string kosong.
    --   nullif(btrim(...), '')  : metadata berisi spasi saja dianggap kosong
    --   coalesce(..., '')       : jaminan NOT NULL terpenuhi (masalah 2)
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      ''
    ),
    -- HARDCODE: jangan pernah ambil peran dari metadata client — itu jalur
    -- eskalasi hak (client bisa mengirim raw_user_meta_data sendiri).
    'student',
    true
  );
  return new;
end;
$function$;

-- ── 2. Backfill akun lama yang emailnya kosong ──────────────────────────────
-- Hanya baris yang benar-benar kosong; akun yang emailnya sudah terisi tidak
-- disentuh (termasuk bila sengaja berbeda dari auth).
--
-- Catatan: saat migrasi dijalankan lewat `npm run db:migrate`, `auth.uid()`
-- bernilai NULL, sehingga `rbac_guard_privilege()` meloloskan update ini
-- (cabang "operasi sistem"). Setiap baris yang berubah memicu `log_audit()`
-- dengan aktor "Publik" — jejak yang jujur untuk perubahan data massal.
update public.user_profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and coalesce(btrim(p.email), '') = ''
   and u.email is not null;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
-- 1. Tidak boleh ada profil yang emailnya kosong padahal auth.users punya:
--
--    select count(*) as sisa
--      from public.user_profiles p
--      join auth.users u on u.id = p.id
--     where coalesce(btrim(p.email), '') = ''
--       and u.email is not null;
--    -- harus 0
--
-- 2. Fungsi baru sudah aktif:
--
--    select prosrc from pg_proc p
--      join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public' and p.proname = 'handle_new_user';
--    -- prosrc harus memuat kolom "email" pada daftar INSERT
--
-- 3. Uji fungsional setelah migrasi:
--    • /admin/users → cari "user@mbs.id" → akun muncul
--    • tombol Reset Password untuk akun itu tidak lagi disabled
