-- ============================================================================
-- 0014 — Verifikasi berkas SPMB per dokumen
--
-- Sebelumnya tab Berkas hanya bisa dilihat; halaman status publik bahkan
-- menyebut "berkas sudah diverifikasi" hanya karena status != pending.
-- Tabel ini menyimpan status per dokumen + catatan + verifier.
--
-- RPC publik `spmb_public_document_summary` mengembalikan agregat saja
-- (tanpa catatan/berkas), setelah identitas diverifikasi NISN + tanggal lahir.
--
-- Idempoten.
-- ============================================================================

create table if not exists public.spmb_document_verifications (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.spmb_registrations(id) on delete cascade,
  document_key text not null check (
    document_key in ('kk', 'akta', 'surat_sekolah', 'ktp_ortu', 'bukti_transfer')
  ),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  note text not null default '',
  verified_by uuid references public.user_profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, document_key)
);

create index if not exists spmb_doc_verif_reg_idx
  on public.spmb_document_verifications (registration_id);

alter table public.spmb_document_verifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where tablename = 'spmb_document_verifications'
       and policyname = 'SPMB verifiers manage document verification'
  ) then
    create policy "SPMB verifiers manage document verification"
      on public.spmb_document_verifications for all
      to authenticated
      using (public.has_permission(auth.uid(), 'spmb:verify'))
      with check (public.has_permission(auth.uid(), 'spmb:verify'));
  end if;
end $$;

grant select, insert, update, delete on public.spmb_document_verifications to authenticated;

-- Agregat untuk halaman cek status publik. SECURITY DEFINER + verifikasi
-- identitas ganda; tidak membocorkan catatan verifier.
create or replace function public.spmb_public_document_summary(
  p_nisn text,
  p_birth_date date
)
returns table (
  total int,
  verified int,
  rejected int,
  pending int
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  select r.id into v_id
    from public.spmb_registrations r
   where (r.documents ->> 'nisn') = p_nisn
     and r.birth_date = p_birth_date
   order by r.created_at desc
   limit 1;

  if v_id is null then
    return;
  end if;

  return query
  select
    count(*)::int,
    count(*) filter (where v.status = 'verified')::int,
    count(*) filter (where v.status = 'rejected')::int,
    count(*) filter (where v.status = 'pending')::int
  from public.spmb_document_verifications v
  where v.registration_id = v_id;
end;
$function$;

revoke all on function public.spmb_public_document_summary(text, date) from public;
grant execute on function public.spmb_public_document_summary(text, date) to anon, authenticated;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select * from public.spmb_public_document_summary('1234567890', '2012-01-01');
