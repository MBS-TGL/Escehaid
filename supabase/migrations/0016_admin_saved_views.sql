-- ============================================================================
-- 0016 — Tampilan Tersimpan (saved views) halaman daftar admin
--
-- Setiap user panel admin bisa menyimpan kombinasi filter/sort halaman daftar
-- SPMB, berita, logs, dst. sebagai "tampilan tersimpan". Bisa pribadi, atau
-- dibagikan (is_shared) ke pemegang izin `read` modul yang sama.
--
-- `params` bebas bentuk (jsonb) — validasi bentuknya di kode aplikasi per
-- modul, sehingga halaman menambah filter baru tidak perlu menambah kolom.
--
-- Idempoten.
-- ============================================================================

create table if not exists public.admin_saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  -- Kunci modul persis = kunci modul izin (`${module}:read` harus valid), supaya
  -- policy "shared" bisa mengecek izin langsung dari kolom ini.
  module text not null check (
    module in (
      'spmb', 'berita', 'artikel', 'pengumuman', 'kegiatan', 'agenda',
      'galeri', 'unduhan', 'media', 'prestasi', 'faq', 'guru', 'fasilitas',
      'ekskul', 'program', 'kontak', 'logs'
    )
  ),
  name text not null default 'Tampilan tanpa nama' check (char_length(name) <= 80),
  params jsonb not null default '{}'::jsonb,
  is_shared boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_saved_views_unique_name unique (user_id, module, name)
);

create index if not exists admin_saved_views_user_module_idx
  on public.admin_saved_views (user_id, module, sort_order);

create index if not exists admin_saved_views_shared_module_idx
  on public.admin_saved_views (module)
  where is_shared = true;

alter table public.admin_saved_views enable row level security;

-- Owner: akses penuh ke baris miliknya (dibuat saat dia memegang izin modul —
-- penegakan izin modul ada di UI/server action, bukan di sini).
do $$
begin
  if not exists (
    select 1 from pg_policies
     where tablename = 'admin_saved_views'
       and policyname = 'Saved views owner full access'
  ) then
    create policy "Saved views owner full access"
      on public.admin_saved_views for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
     where tablename = 'admin_saved_views'
       and policyname = 'Saved views shared readable'
  ) then
    create policy "Saved views shared readable"
      on public.admin_saved_views for select
      to authenticated
      using (
        is_shared
        and user_id <> auth.uid()
        and public.has_permission(auth.uid(), module || ':read')
      );
  end if;
end $$;

grant select, insert, update, delete on public.admin_saved_views to authenticated;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select policyname, cmd from pg_policies where tablename = 'admin_saved_views';
--   select count(*) from pg_indexes where tablename = 'admin_saved_views';
