-- Migration: audit_logs — log aktivitas admin (P2.8 "Log Aktivitas")
-- Dijalankan MANUAL di Supabase SQL Editor (tidak dijalankan otomatis oleh repo).
--
-- Desain:
--   1) Tabel audit_logs hanya bisa DIBACA (RLS SELECT) oleh role panel admin
--      (developer/admin/publisher + is_active = true) — meniru canAccessAdminPanel
--      (src/lib/auth.ts) supaya lingkaran pembaca log = lingkaran admin.
--   2) Penulisan TIDAK lewat klien: trigger SECURITY DEFINER mencatat setiap
--      INSERT/UPDATE/DELETE pada tabel konten & SPMB — siapa (auth.uid() +
--      snapshot nama), apa (aksi + tabel + field yang berubah), kapan (now()).
--      Tanpa policy & GRANT tulis, klien tidak bisa menyentuh tabel ini:
--      jejak audit tidak bisa dimanipulasi dari aplikasi.
--   3) Idempoten: create table if not exists, policy drop+create nama sama,
--      drop trigger if exists — boleh dijalankan ulang tanpa efek samping.
--   4) Semua tabel di daftar trigger wajib sudah ada (15 tabel itu dipakai
--      oleh kode aplikasi — dicek lewat grep seluruh .from(...) di src/).
--
-- Setelah SQL ini jalan, halaman /admin/logs otomatis menampilkan log.
-- Sebelum SQL: kode aplikasi sudah terpasang dan menampilkan panel
-- "jalankan SQL" yang anggun (degradasi tanpa error).

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text not null check (action in ('create', 'update', 'delete')),
  entity_type text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
  on audit_logs (created_at desc);

-- RLS: hanya role panel admin yang boleh membaca.
alter table audit_logs enable row level security;

drop policy if exists "audit_logs admin read" on audit_logs;
create policy "audit_logs admin read"
  on audit_logs
  for select
  using (
    exists (
      select 1
      from user_profiles
      where user_profiles.id = auth.uid()
        and user_profiles.is_active = true
        and user_profiles.role in ('developer', 'admin', 'publisher')
    )
  );

-- GRANT SELECT wajib (pola portal_apps.sql: tanpa GRANT, baca bisa 42501
-- sebelum RLS sempat dibaca). TANPA grant insert/update/delete — satu-satunya
-- penulis adalah trigger di bawah (owner = postgres, bypass RLS).
grant select on audit_logs to authenticated;

-- ── Fungsi trigger ─────────────────────────────────────────────────────────
-- tg_argv[0] = nama entitas (dicek di CREATE TRIGGER di bawah).
-- Nilai >600 karakter dipotong agar baris log tetap ringan; untuk UPDATE
-- hanya field yang nilainya berubah yang dicatat.

create or replace function public.log_audit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity text := tg_argv[0];
  v_old jsonb;
  v_new jsonb;
  v_detail jsonb := '{}'::jsonb;
  v_actor_id uuid := auth.uid();
  v_actor_name text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(
             key,
             case when length(value::text) <= 600 then value
                  else to_jsonb('...(nilai terlalu panjang: ' || length(value::text) || ' karakter)') end
           ), '{}'::jsonb)
      into v_detail
      from jsonb_each(v_new)
     where (v_old -> key) is distinct from value;
  else
    select coalesce(jsonb_object_agg(
             key,
             case when length(value::text) <= 600 then value
                  else to_jsonb('...(nilai terlalu panjang: ' || length(value::text) || ' karakter)') end
           ), '{}'::jsonb)
      into v_detail
      from jsonb_each(case when tg_op = 'INSERT' then v_new else v_old end);
  end if;

  select up.full_name
    into v_actor_name
    from user_profiles up
   where up.id = v_actor_id
   limit 1;

  insert into audit_logs (actor_id, actor_name, action, entity_type, entity_id, detail)
  values (
    v_actor_id,
    coalesce(v_actor_name,
             case when v_actor_id is null then 'Publik' else 'Tidak dikenal' end),
    case tg_op
      when 'INSERT' then 'create'
      when 'UPDATE' then 'update'
      else 'delete'
    end,
    v_entity,
    coalesce(v_new ->> 'id', v_old ->> 'id'),
    coalesce(v_detail, '{}'::jsonb)
  );

  return coalesce(new, old);
end;
$$;

-- ── Pasang trigger di 15 tabel konten & SPMB ───────────────────────────────
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'news', 'articles', 'activities', 'achievements', 'gallery',
    'announcements', 'agenda_events', 'facilities', 'teachers',
    'portal_apps', 'spmb_registrations', 'spmb_waves',
    'contact_messages', 'user_profiles', 'school_profile'
  ]
  loop
    execute format('drop trigger if exists audit_log_%s on public.%I',
                   v_table, v_table);
    execute format(
      'create trigger audit_log_%s after insert or update or delete on public.%I for each row execute function public.log_audit(%L)',
      v_table, v_table, v_table
    );
  end loop;
end;
$$;
