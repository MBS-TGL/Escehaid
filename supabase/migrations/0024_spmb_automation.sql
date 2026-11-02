-- ============================================================================
-- 0024 — Pengaturan otomatisasi SPMB + run log + realtime pendaftar
--
-- A. Toggle otomatisasi di `school_profile` (dibaca script terjadwal
--    `scripts/spmb-jobs.mjs`, diatur dari kartu "Otomatisasi" di tab
--    Pengaturan /admin/admission):
--      spmb_auto_publish_results — publikasikan hasil otomatis saat result_at
--                                   lewat dan hasil belum dipublikasikan.
--      spmb_reminder_enabled    — kirim pengingat WA (pending lama, berkas
--                                 kurang, wawancara besok, daftar ulang belum
--                                 bayar).
--      spmb_reminder_days       — umur pending (hari) pemicu pengingat.
--      spmb_digest_enabled      — kirim rekap harian ke seluruh admin.
--
-- B. `spmb_job_runs` mencatat setiap eksekusi script (observabilitas di UI).
--    Ditulis service-role; admin baca (spmb:read).
--
-- C. Pendaftar baru masuk publication supabase_realtime supaya halaman admin
--    bisa berlangganan INSERT dan menampilkan toast "pendaftar baru".
--    Idempoten via blok exception.
--
-- Idempoten.
-- ============================================================================

-- ── A. Pengaturan otomatisasi ────────────────────────────────────────────────

alter table public.school_profile
  add column if not exists spmb_auto_publish_results boolean not null default false,
  add column if not exists spmb_reminder_enabled boolean not null default false,
  add column if not exists spmb_reminder_days integer not null default 3,
  add column if not exists spmb_digest_enabled boolean not null default false;

-- ── B. Run log ───────────────────────────────────────────────────────────────

create table if not exists public.spmb_job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  run_at timestamptz not null default now(),
  counts jsonb not null default '{}'::jsonb,
  error text not null default ''
);

alter table public.spmb_job_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where tablename = 'spmb_job_runs'
       and policyname = 'SPMB readers read job runs'
  ) then
    create policy "SPMB readers read job runs"
      on public.spmb_job_runs for select
      to authenticated
      using (public.has_permission(auth.uid(), 'spmb:read'));
  end if;
end $$;

grant select on public.spmb_job_runs to authenticated;
grant insert on public.spmb_job_runs to authenticated;

-- ── C. Realtime pendaftar ────────────────────────────────────────────────────

do $$
begin
  alter publication supabase_realtime add table public.spmb_registrations;
exception
  when duplicate_object then null;
end $$;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'school_profile'
--      and column_name like 'spmb\_auto%' or column_name like 'spmb\_reminder%' or column_name like 'spmb\_digest%';
--   select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'spmb_registrations';
