-- ============================================================================
-- 0019 — Aturan otomatis (alert rules) + riwayat kirim alert
--
-- Evaluasi dijalankan terjadwal (GitHub Actions cron → scripts/check-alerts)
-- dengan service-role DATABASE_URL. `alert_rules` milik admin; setiap kirim
-- tercatat di `alert_events` supaya cooldown & ack bisa ditelusuri.
--
-- evaluator SQL (metrik) tidak disimpan sebagai perintah bebas dari admin —
-- hanya rujukan `metric_key` dari katalog yang ter-hardcode di kode
-- (`src/lib/alerts/catalog.ts`), supaya admin tidak bisa memelesetkan SQL
-- sembarang lewat UI.
--
-- Idempoten.
-- ============================================================================

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 80),
  metric_key text not null check (char_length(metric_key) <= 40),
  comparator text not null check (comparator in ('gt', 'gte', 'lt', 'lte', 'eq', 'neq')),
  threshold numeric not null default 0,
  enabled boolean not null default true,
  channel text not null default 'webhook' check (channel in ('webhook', 'whatsapp', 'telegram')),
  recipients jsonb not null default '[]'::jsonb, -- nomor WA grup/individu atau null
  cooldown_minutes integer not null default 60 check (cooldown_minutes between 0 and 10080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alert_rules_name_unique unique (name)
);

create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.alert_rules(id) on delete cascade,
  rule_name text not null,
  metric_key text not null,
  observed_value numeric not null,
  message text not null default '',
  delivered_at timestamptz,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed', 'skipped_cooldown')),
  delivery_error text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists alert_events_created_idx
  on public.alert_events (created_at desc);
create index if not exists alert_events_rule_idx
  on public.alert_events (rule_id, created_at desc);

alter table public.alert_rules enable row level security;
alter table public.alert_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where tablename = 'alert_rules'
       and policyname = 'Alert rules manager full access'
  ) then
    create policy "Alert rules manager full access"
      on public.alert_rules for all
      to authenticated
      using (public.has_permission(auth.uid(), 'otomasi:manage'))
      with check (public.has_permission(auth.uid(), 'otomasi:manage'));
  end if;

  -- Halaman history butuh baca; pengelola butuh full. Pisah biar role read-only
  -- tetap bisa melihat apa yang sudah terkirim.
  if not exists (
    select 1 from pg_policies
     where tablename = 'alert_events'
       and policyname = 'Alert events manage'
  ) then
    create policy "Alert events manage"
      on public.alert_events for all
      to authenticated
      using (public.has_permission(auth.uid(), 'otomasi:manage'))
      with check (public.has_permission(auth.uid(), 'otomasi:manage'));
  end if;

  if not exists (
    select 1 from pg_policies
     where tablename = 'alert_events'
       and policyname = 'Alert events read'
  ) then
    create policy "Alert events read"
      on public.alert_events for select
      to authenticated
      using (public.has_permission(auth.uid(), 'otomasi:read'));
  end if;
end $$;

grant select, insert, update, delete on public.alert_rules to authenticated;
grant select, insert, update            on public.alert_events to authenticated;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select writedata_needed, tablename, policyname from pg_policies
--    where tablename in ('alert_rules','alert_events');
