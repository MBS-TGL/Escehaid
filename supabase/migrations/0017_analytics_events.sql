-- ============================================================================
-- 0017 — Kumpulan data analitik internal (page views tanpa cookie)
--
-- Beacon `/api/track` mengisi tabel ini hanya dengan: path, host perujuk,
-- kelas perangkat (mobile/desktop/tablet — dari UA yang sudah dipangkas).
-- TIDAK ada IP, user-agent mentah, atau cookie → tidak butuh banner consent.
--
-- Halaman publik saja; server action menolak path `/admin*`, `/api*`, dan
-- berkas statis. Simpan raw event sampai 90 hari; agregat harian dihitung
-- on-the-fly lewat fungsi admin (lihat 0021), bukan tabel terpisah.
--
-- Idempoten.
-- ============================================================================

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) <= 300),
  referrer_host text check (char_length(referrer_host) <= 200),
  device_class text not null default 'desktop' check (device_class in ('mobile', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at);

create index if not exists analytics_events_path_created_idx
  on public.analytics_events (path, created_at);

alter table public.analytics_events enable row level security;

-- Tidak ada policy draft: hanya service-role (beacon server / script) dan
-- fungsi SECURITY DEFINER milik admin yang membacanya. Policy explicitly
-- default-deny untuk anon & authenticated.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where tablename = 'analytics_events'
       and policyname = 'Analytics read needs permission'
  ) then
    create policy "Analytics read needs permission"
      on public.analytics_events for select
      to authenticated
      using (public.has_permission(auth.uid(), 'analitik:read'));
  end if;
end $$;

-- Tabel hanya ditulis lewat service-role (beacon server); admin panel hanya
-- membaca lewat fungsi agregat SECURITY DEFINER.
grant select on public.analytics_events to authenticated;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select policyname from pg_policies where tablename = 'analytics_events';
--   select indexname from pg_indexes where tablename = 'analytics_events';
