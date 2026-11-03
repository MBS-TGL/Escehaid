-- ============================================================================
-- 0026 — Seed aturan alert probe pencarian kanonik (#41)
--
-- Metrik `search_canonical_failed` (lihat src/lib/alerts/catalog.ts +
-- scripts/check-alerts.mjs): jumlah asersi kanonik v3 yang gagal.
-- Threshold 1 + comparator gte = alarm begitu SATU asersi pun gagal.
-- Channel default telegram (sudah dipakai cron); admin bisa ubah ke
-- webhook/whatsapp lewat UI automation. Cooldown 60 menit (cron 30 menit
-- tidak spam).
--
-- Idempoten (do block + cek nama).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from public.alert_rules where name = 'Probe pencarian kanonik gagal'
  ) then
    insert into public.alert_rules (name, metric_key, comparator, threshold, enabled, channel, recipients, cooldown_minutes)
    values (
      'Probe pencarian kanonik gagal',
      'search_canonical_failed',
      'gte',
      1,
      true,
      'telegram',
      '[]'::jsonb,
      60
    );
  end if;
end $$;
