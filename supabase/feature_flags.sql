-- ══════════════════════════════════════════════════════════════════════════
-- PHASE C — FEATURE FLAGS (migrasi ke-3 setelah site_settings.sql)
-- Jalankan di Supabase SQL Editor, BERURUTAN setelah rbac_foundation.sql & site_settings.sql.
-- ══════════════════════════════════════════════════════════════════════════
--
-- Tabel `feature_flags` menyimpan flag fitur dengan penjadwalan opsional.
-- Skema, label, deskripsi, dan default ada di REGISTRI KODE
-- (src/lib/flags/registry.ts) — tabel hanya menyimpan override.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.feature_flags (
  key           text primary key
                constraint feature_flags_key_format check (key ~ '^[a-z0-9_]+$'),
  name          text not null,
  description   text,
  enabled       boolean not null default false,
  start_at      timestamptz,
  end_at        timestamptz,
  updated_by    uuid references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now()
);

comment on table public.feature_flags is
  'Feature flags dengan penjadwalan opsional. Skema & default di registry kode.';
comment on column public.feature_flags.enabled is 'Aktif/dinonaktifkan manual oleh admin.';
comment on column public.feature_flags.start_at is 'Bila diisi, flag hanya aktif SETELAH waktu ini (UTC).';
comment on column public.feature_flags.end_at is 'Bila diisi, flag hanya aktif SEBELUM waktu ini (UTC).';

alter table public.feature_flags enable row level security;

-- Baca publik: status flag bisa dibaca siapa saja (digunakan untuk kondisional UI).
drop policy if exists "feature_flags select public" on public.feature_flags;
create policy "feature_flags select public"
  on public.feature_flags for select
  to anon, authenticated
  using (true);

-- Tulis hanya untuk pemegang izin flags:manage.
drop policy if exists "feature_flags write managed" on public.feature_flags;
create policy "feature_flags write managed"
  on public.feature_flags for all
  to authenticated
  using (public.has_permission(auth.uid(), 'flags:manage'))
  with check (public.has_permission(auth.uid(), 'flags:manage'));

grant select on public.feature_flags to anon;

-- Seed default flags (idempotent — upsert on conflict).
-- maintenance_mode: mode pemeliharaan — redirect publik ke halaman maintenance.
-- spmb_registration_open: buka/tutup pendaftaran SPMB.
-- announcement_banner: tampilkan banner pengumuman di halaman publik.
-- module_beta: aktifkan modul beta (placeholder untuk fitur eksperimen).
insert into public.feature_flags (key, name, description, enabled, start_at, end_at)
values
  ('maintenance_mode', 'Mode Pemeliharaan', 'Sembunyikan situs publik, tampilkan halaman maintenance. Admin tetap bisa akses /admin.', false, null, null),
  ('spmb_registration_open', 'Pendaftaran SPMB Dibuka', 'Izinkan pendaftaran SPMB dari halaman publik.', true, null, null),
  ('announcement_banner', 'Banner Pengumuman', 'Tampilkan banner pengumuman di header halaman publik.', false, null, null),
  ('module_beta', 'Modul Beta', 'Aktifkan fitur eksperimental/beta (placeholder).', false, null, null)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  enabled = excluded.enabled,
  start_at = excluded.start_at,
  end_at = excluded.end_at;