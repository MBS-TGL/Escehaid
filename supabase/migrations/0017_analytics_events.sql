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

-- ── Fungsi agregat (SECURITY DEFINER + cek izin analitik:read) ───────────────

-- Deret harian jumlah page-view + host perujuk terpopuler + kelas perangkat.
-- Panggilan satu request → dashboard analitik tanpa round-trip ganda.

create or replace function public.admin_analytics_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.has_permission(auth.uid(), 'analitik:read') then
    return null;
  end if;

  select jsonb_build_object(
    'total_views', (
      select count(*) from analytics_events e
       where e.created_at >= p_from and e.created_at < p_to
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day, 'views', coalesce(c.views, 0)
      ) order by d.day), '[]'::jsonb)
      from (
        select generate_series(
          (p_from at time zone 'Asia/Jakarta')::date,
          ((p_to at time zone 'Asia/Jakarta')::date)::timestamp,
          interval '1 day'
        ) as day
      ) d
      left join (
        select (created_at at time zone 'Asia/Jakarta')::date as day,
               count(*)::int as views
          from analytics_events
         where created_at >= p_from and created_at < p_to
         group by 1
      ) c on c.day = d.day
    ),
    'top_paths', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', views)), '[]'::jsonb)
      from (
        select path, count(*)::int as views
          from analytics_events
         where created_at >= p_from and created_at < p_to
         group by path
         order by views desc, path asc
         limit 12
      ) t
    ),
    'top_referrers', (
      select coalesce(jsonb_agg(jsonb_build_object('host', host, 'views', views)), '[]'::jsonb)
      from (
        select referrer_host as host, count(*)::int as views
          from analytics_events
         where created_at >= p_from and created_at < p_to
           and referrer_host is not null
         group by referrer_host
         order by views desc
         limit 8
      ) r
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('device_class', device_class, 'views', views)), '[]'::jsonb)
      from (
        select device_class, count(*)::int as views
          from analytics_events
         where created_at >= p_from and created_at < p_to
         group by device_class
      ) dv
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_analytics_summary(timestamptz, timestamptz) from public;
-- Administrator panel membaca lewat sesi cookie (PostgREST RPC).
grant execute on function public.admin_analytics_summary(timestamptz, timestamptz) to authenticated;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select policyname from pg_policies where tablename = 'analytics_events';
--   select indexname from pg_indexes where tablename = 'analytics_events';
--   \df+ admin_analytics_summary
