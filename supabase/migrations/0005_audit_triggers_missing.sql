-- ============================================================================
-- 0005 — Audit trigger untuk tabel yang belum tercatat
--
-- 15 dari 30 tabel sudah punya trigger `log_audit()`. Yang belum: faqs,
-- downloads, ekskuls, quran_pillars, agenda_blocks, agenda_slots,
-- site_settings, feature_flags, categories.
--
-- Dampaknya nyata: perubahan FAQ, unduhan, ekskul, konten /program, dan
-- KONFIGURASI SITUS tidak meninggalkan jejak siapa yang mengubah. Padahal
-- site_settings memuat identitas sekolah, kontak, dan palet warna — perubahan
-- tak tercatat di sana adalah lubang audit paling mencolok.
--
-- `categories` bahkan lebih buruk: policy tulisnya `(true)` untuk semua user
-- login, tanpa audit sama sekali (policy itu sudah diperketat di 0003).
--
-- Idempoten: drop trigger if exists → create trigger.
-- Prasyarat: 0004 (bentuk detail before/after) sudah diterapkan.
-- ============================================================================

do $$
declare
  pair record;
begin
  for pair in
    select * from (values
      ('faqs',          'faqs'),
      ('downloads',     'downloads'),
      ('ekskuls',       'ekskuls'),
      ('quran_pillars', 'quran_pillars'),
      ('agenda_blocks', 'agenda_blocks'),
      ('agenda_slots',  'agenda_slots'),
      ('site_settings', 'site_settings'),
      ('feature_flags', 'feature_flags'),
      ('categories',    'categories')
    ) as t(table_name, entity_name)
  loop
    -- Lewati tabel yang belum ada (DB mungkin belum menerima migrasi modulnya).
    if to_regclass('public.' || pair.table_name) is null then
      raise notice 'Lewati %: tabel belum ada', pair.table_name;
      continue;
    end if;

    execute format(
      'drop trigger if exists %I on public.%I',
      'audit_log_' || pair.table_name, pair.table_name);

    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.log_audit(%L)',
      'audit_log_' || pair.table_name, pair.table_name, pair.entity_name);
  end loop;
end $$;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select c.relname as tabel, t.tgname as trigger
--     from pg_trigger t
--     join pg_class c on c.oid = t.tgrelid
--     join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public'
--      and not t.tgisinternal
--      and pg_get_triggerdef(t.oid) like '%log_audit%'
--    order by 1;
--   -- harus mencakup 24 tabel (15 lama + 9 baru).
