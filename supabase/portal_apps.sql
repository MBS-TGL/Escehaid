-- Migration: portal_apps — daftar aplikasi untuk grid "Aplikasi Sekolah" di /portal
-- Dijalankan MANUAL di Supabase SQL Editor (tidak dijalankan otomatis oleh repo).
--
-- Status: tabel + RLS + policy SELECT sudah pernah dijalankan manual dengan nama
-- policy "portal_apps public read". Bagian yang VERIVIKASI IDEMPOTEN di sini:
--   1) create table if not exists  → no-op kalau sudah ada
--   2) policy dengan nama yang SAMA (drop if exists + create) → tidak dobel
--   3) GRANT SELECT               → INI yang kurang: tanpa grant, role anon
--      dapat 42501 "permission denied for table portal_apps" SEBELUM RLS dibaca,
--      sehingga getPortalApps() error → /portal selalu "Belum ada aplikasi".
--
-- Catatan RLS: database.sql tidak memuat satu pun CREATE POLICY (termasuk
-- agenda_events), jadi tidak ada pola RLS repo yang bisa ditiru — dipakai pola
-- standar Supabase: RLS aktif, SELECT publik terbatas baris is_active = true,
-- tanpa policy INSERT/UPDATE/DELETE untuk anon.

create table if not exists portal_apps (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text not null default '',
  href text not null,
  icon text not null default 'SquaresFour',
  color text not null default 'navy',
  is_external boolean not null default true,
  is_coming_soon boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- RLS aktif: tanpa policy INSERT/UPDATE/DELETE, anon tidak bisa menulis apa pun.
alter table portal_apps enable row level security;

-- SELECT publik hanya baris aktif — nama policy sama dengan yang sudah ada
-- supaya tidak terbentuk dua policy.
drop policy if exists "portal_apps public read" on portal_apps;
create policy "portal_apps public read"
  on portal_apps
  for select
  using (is_active = true);

-- ★ BAGIAN YANG KURANG: baca publik tanpa GRANT ini tetap 42501.
grant select on portal_apps to anon, authenticated;

-- Write: hanya role admin/developer — pola database.md
-- ("RLS berbasis role ... pakai current_user_role()").
-- GRANT DML juga wajib: tabel ini tidak kena default privileges Supabase
-- (terbukti dari hilangnya GRANT SELECT tadi); RLS-lah yang membatasi
-- siapa yang boleh menulis, bukan GRANT.
grant insert, update, delete on portal_apps to authenticated;

drop policy if exists "portal_apps_admin_write" on portal_apps;
create policy "portal_apps_admin_write"
  on portal_apps
  for all
  to authenticated
  using (current_user_role() in ('developer', 'admin'))
  with check (current_user_role() in ('developer', 'admin'));


-- ============================================================
-- (OPSIONAL) Seed — hanya menyisipkan kalau tabel masih KOSONG.
-- 6 tile "Segera hadir" untuk sub-app Fase 2; hapus blok ini kalau
-- tidak diinginkan atau kalau Anda sudah mengisi sendiri.
-- ============================================================
insert into portal_apps (label, description, href, icon, color, is_external, is_coming_soon, sort_order)
select * from (values
  ('Nilai & Rapor', 'Cek nilai dan rapor siswa', '#', 'ChartBar', 'blue', false, true, 10),
  ('Jadwal Pelajaran', 'Jadwal kelas per minggu', '#', 'CalendarBlank', 'violet', false, true, 20),
  ('Presensi', 'Kehadiran siswa harian', '#', 'Clock', 'teal', false, true, 30),
  ('E-Learning', 'Kelas dan tugas online', '#', 'GraduationCap', 'sky', false, true, 40),
  ('Perpustakaan', 'Katalog dan peminjaman buku', '#', 'BookOpen', 'emerald', false, true, 50),
  ('Informasi SPP', 'Tagihan dan pembayaran', '#', 'HandCoins', 'amber', false, true, 60)
) as v(label, description, href, icon, color, is_external, is_coming_soon, sort_order)
where not exists (select 1 from portal_apps);
