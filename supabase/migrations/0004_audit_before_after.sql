-- ============================================================================
-- 0004 — `log_audit()` menyimpan nilai SEBELUM, bukan hanya sesudah
--
-- MASALAH
-- Versi lama (schema_full.sql:868-876) mengiterasi `jsonb_each(v_new)` dan
-- hanya menyimpan nilai BARU untuk kolom yang berubah:
--
--     select jsonb_object_agg(key, value) from jsonb_each(v_new)
--      where (v_old -> key) is distinct from value;
--
-- `v_old` hanya dipakai sebagai penyaring, tidak pernah ditulis. Akibatnya log
-- tidak bisa menjawab pertanyaan dasar audit: "dari nilai berapa diubah?".
-- Yang tersisa hanya "menjadi berapa".
--
-- BENTUK BARU (untuk UPDATE)
--     { "before": { "judul": "Lama" }, "after": { "judul": "Baru" } }
--
-- Untuk INSERT dan DELETE bentuk lama dipertahankan (seluruh baris) supaya
-- pembaca yang ada tidak rusak — UI /admin/logs hanya melakukan
-- `JSON.stringify(detail)`, tidak ada parser yang bergantung pada bentuk
-- tertentu (sudah diverifikasi).
--
-- `entity_id` juga diperbaiki: `coalesce(v_new->>'id', v_old->>'id', key)`
-- supaya tabel ber-PK `key` (site_settings, feature_flags) tidak menghasilkan
-- entity_id NULL.
--
-- Idempoten: create or replace function.
-- ============================================================================

create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_entity     text := tg_argv[0];
  v_old        jsonb;
  v_new        jsonb;
  v_before     jsonb := '{}'::jsonb;
  v_after      jsonb := '{}'::jsonb;
  v_detail     jsonb := '{}'::jsonb;
  v_actor_id   uuid := auth.uid();
  v_actor_name text;
  v_entity_id  text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    -- Hanya kolom yang benar-benar berubah, lengkap dengan nilai lama & baru.
    -- Perbandingan memakai nilai mentah (sebelum pemotongan) supaya perubahan
    -- tidak pernah tersembunyi oleh aturan truncate di bawah.
    select
      coalesce(jsonb_object_agg(key, case
        when length((v_old -> key)::text) <= 600 then (v_old -> key)
        else to_jsonb('...(nilai terlalu panjang: ' || length((v_old -> key)::text) || ' karakter)')
      end), '{}'::jsonb),
      coalesce(jsonb_object_agg(key, case
        when length(value::text) <= 600 then value
        else to_jsonb('...(nilai terlalu panjang: ' || length(value::text) || ' karakter)')
      end), '{}'::jsonb)
      into v_before, v_after
      from jsonb_each(v_new)
     where (v_old -> key) is distinct from value;

    v_detail := jsonb_build_object('before', v_before, 'after', v_after);
  else
    -- INSERT/DELETE: seluruh baris, bentuk lama dipertahankan.
    select coalesce(jsonb_object_agg(key, case
             when length(value::text) <= 600 then value
             else to_jsonb('...(nilai terlalu panjang: ' || length(value::text) || ' karakter)')
           end), '{}'::jsonb)
      into v_detail
      from jsonb_each(case when tg_op = 'INSERT' then v_new else v_old end);
  end if;

  select up.full_name
    into v_actor_name
    from public.user_profiles up
   where up.id = v_actor_id
   limit 1;

  -- Tabel ber-PK `key` (site_settings, feature_flags) tidak punya kolom `id`.
  v_entity_id := coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key');

  insert into public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, detail)
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
    v_entity_id,
    coalesce(v_detail, '{}'::jsonb)
  );

  return coalesce(new, old);
end;
$function$;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   -- ubah satu berita, lalu:
--   select action, entity_type, detail
--     from public.audit_logs
--    where entity_type = 'news'
--    order by created_at desc
--    limit 1;
--   -- detail harus memuat kunci "before" dan "after".
