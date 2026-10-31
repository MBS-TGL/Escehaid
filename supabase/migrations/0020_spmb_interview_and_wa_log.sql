-- ============================================================================
-- 0020 — Wawancara SPMB + log broadcast WA (Fonnte)
--
-- A. Kolom wawancara di spmb_registrations — dipakai Pipeline (fase 5):
--    proses pendaftar bisa melewati tahap "Wawancara" sebelum dinyatakan
--    diterima/ditolak.
--
-- B. Tabel spmb_message_log + opt-out: broadcast WA via Fonnte
--    (`https://api.fonnte.com/send`). Setiap penerima = 1 baris, supaya:
--      - idempoten (unique registration+template+tanggal → tidak dobel kirim),
--      - progres per penerima terlihat di UI broadcast,
--      - status update dari webhook Fonnte bisa diterapkan per baris.
--
--    Kolom `phone` disimpan mentah supaya tidak perlu join ke tabel pendaftar
--    saat pengiriman; nomor TIDAK ditampilkan di log UI (di-redact di kode).
--
-- Idempoten.
-- ============================================================================

-- ── A. Wawancara ─────────────────────────────────────────────────────────────

alter table public.spmb_registrations
  add column if not exists interview_at timestamptz,
  add column if not exists interview_note text not null default '',
  add column if not exists interviewed_by uuid references public.user_profiles(id) on delete set null;

create index if not exists spmb_reg_interview_idx
  on public.spmb_registrations (interview_at)
  where interview_at is not null;

-- ── B. Broadcast log ────────────────────────────────────────────────────────

create table if not exists public.spmb_message_log (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.spmb_registrations(id) on delete cascade,
  -- Template key = kunci di spmb_message_templates (custom & 'broadcast:xxx').
  template_key text not null,
  phone text not null check (char_length(phone) between 8 and 20),
  provider text not null default 'fonnte',
  provider_message_id text not null default '',
  requestid bigint,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'failed', 'skipped_invalid',
                      'skipped_opt_out', 'skipped_duplicate')),
  error text not null default '',
  sent_by uuid references public.user_profiles(id) on delete set null,
  sent_queued_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists spmb_message_log_reg_idx
  on public.spmb_message_log (registration_id, sent_queued_at desc);
create index if not exists spmb_message_log_status_idx
  on public.spmb_message_log (status);

-- Idempotensi: 1 template = 1 kirim per pendaftar per hari (WIB). Batas hari
-- pada unik constraint membuat pengingat atas/gagal bisa diulang keesokan hari.
create unique index if not exists spmb_message_log_idem_idx
  on public.spmb_message_log (
    registration_id,
    template_key,
    (sent_queued_at at time zone 'Asia/Jakarta')::date
  );

-- Opt-out: nomor yang minta dihentikan tidak pernah dikirim ulang.
create table if not exists public.spmb_wa_optout (
  phone text primary key,
  note text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null
);

alter table public.spmb_message_log enable row level security;
alter table public.spmb_wa_optout enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where tablename = 'spmb_message_log'
       and policyname = 'SPMB message log manage'
  ) then
    create policy "SPMB message log manage"
      on public.spmb_message_log for all
      to authenticated
      using (public.has_permission(auth.uid(), 'spmb:update'))
      with check (public.has_permission(auth.uid(), 'spmb:update'));
  end if;

  if not exists (
    select 1 from pg_policies
     where tablename = 'spmb_wa_optout'
       and policyname = 'SPMB optout manage'
  ) then
    create policy "SPMB optout manage"
      on public.spmb_wa_optout for all
      to authenticated
      using (public.has_permission(auth.uid(), 'spmb:update'))
      with check (public.has_permission(auth.uid(), 'spmb:update'));
  end if;
end $$;

grant select, insert, update, delete on public.spmb_message_log to authenticated;
grant select, insert, update, delete on public.spmb_wa_optout to authenticated;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'spmb_registrations' and column_name like 'interview%';
--   select indexname from pg_indexes
--    where tablename = 'spmb_message_log';
