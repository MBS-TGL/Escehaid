-- ============================================================================
-- 0015 — Kuota/jadwal gelombang, template pesan WA, index pencarian SPMB
--
-- Idempoten.
-- ============================================================================

alter table public.spmb_waves
  add column if not exists quota integer,
  add column if not exists registration_fee numeric(12, 2),
  add column if not exists announcement_at timestamptz,
  add column if not exists result_at timestamptz,
  add column if not exists is_archived boolean not null default false;

create table if not exists public.spmb_message_templates (
  key text primary key,
  label text not null,
  body text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.spmb_message_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where tablename = 'spmb_message_templates'
       and policyname = 'SPMB readers read templates'
  ) then
    create policy "SPMB readers read templates"
      on public.spmb_message_templates for select
      to authenticated
      using (public.has_permission(auth.uid(), 'spmb:read'));
  end if;

  if not exists (
    select 1 from pg_policies
     where tablename = 'spmb_message_templates'
       and policyname = 'SPMB editors write templates'
  ) then
    create policy "SPMB editors write templates"
      on public.spmb_message_templates for all
      to authenticated
      using (public.has_permission(auth.uid(), 'spmb:update'))
      with check (public.has_permission(auth.uid(), 'spmb:update'));
  end if;
end $$;

grant select, insert, update, delete on public.spmb_message_templates to authenticated;

insert into public.spmb_message_templates (key, label, body, sort_order) values
  ('accepted', 'Diterima',
   'Assalamu''alaikum {nama}, alhamdulillah Anda dinyatakan LULUS seleksi SPMB {gelombang} SMP Muhammadiyah 4 Tanggul. Silakan lanjutkan daftar ulang sesuai jadwal. NISN: {nisn}.',
   1),
  ('rejected', 'Ditolak',
   'Assalamu''alaikum {nama}, terima kasih telah mendaftar SPMB {gelombang}. Mohon maaf Anda belum lolos seleksi kali ini. NISN: {nisn}.',
   2),
  ('incomplete_docs', 'Berkas kurang',
   'Assalamu''alaikum {nama}, berkas pendaftaran SPMB {gelombang} Anda belum lengkap. Mohon lengkapi dokumen yang ditandai di portal. NISN: {nisn}.',
   3)
on conflict (key) do nothing;

-- Pencarian cepat NISN/NIK (di jsonb) + telepon.
create index if not exists spmb_reg_documents_nisn_idx
  on public.spmb_registrations ((documents ->> 'nisn'));
create index if not exists spmb_reg_documents_nik_idx
  on public.spmb_registrations ((documents ->> 'nik'));
create index if not exists spmb_reg_phone_idx
  on public.spmb_registrations (phone);

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'spmb_waves' and column_name in ('quota','registration_fee');
--   select key, label from public.spmb_message_templates order by sort_order;
