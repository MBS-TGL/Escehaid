-- ══════════════════════════════════════════════════════════════════════════
-- PHASE B — PENGATURAN SITUS  (migrasi ke-2 setelah rbac_foundation.sql)
-- Jalankan di Supabase SQL Editor, BERURUTAN setelah rbac_foundation.sql.
-- ══════════════════════════════════════════════════════════════════════════
--
-- Tabel `site_settings` menyimpan *override* admin terhadap nilai situs.
-- Skema, label, grup, tipe, validasi, dan nilai default ada di REGISTRI KODE
-- (src/lib/settings/registry.ts) — bukan di sini — supaya situs tetap tampil
-- benar walau tabel ini kosong (fallback: override → school_profile → default).
--
-- Kolom `setting_group` / `value_type` di sini hanyalah salinan dari registry
-- untuk keperluan laporan tingkat SQL; sumber kebenaran tetap registry.
-- Karena itu boleh NULL (baris yang ditulis aplikasi selalu terisi).
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.site_settings (
  key           text primary key
                constraint site_settings_key_format check (key ~ '^[a-z0-9_]+$'),
  value         jsonb not null,
  setting_group text,
  value_type    text,
  updated_by    uuid references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now()
);

comment on table public.site_settings is
  'Override pengaturan situs per kunci. Skema & default ada di registry kode.';
comment on column public.site_settings.value is
  'Nilai tersimpan sebagai JSON string (mis. "SMP Muhammadiyah 4 Tanggul").';

alter table public.site_settings enable row level security;

-- Baca publik: seluruh isi pengaturan memang ditampilkan ke pengunjung situs
-- (nama, kontak, media sosial, warna tema). Tidak ada rahasia di tabel ini.
drop policy if exists "site_settings select public" on public.site_settings;
create policy "site_settings select public"
  on public.site_settings for select
  to anon, authenticated
  using (true);

-- Tulis hanya untuk pemegang izin settings:manage (diperiksa lewat fungsi
-- Phase A `has_permission()`). Aplikasi juga memeriksa di lapisan server
-- (requirePermission) — RLS ini lapisan pertahanan kedua.
drop policy if exists "site_settings write managed" on public.site_settings;
create policy "site_settings write managed"
  on public.site_settings for all
  to authenticated
  using (public.has_permission(auth.uid(), 'settings:manage'))
  with check (public.has_permission(auth.uid(), 'settings:manage'));

grant select on public.site_settings to anon;
