-- ============================================================================
-- 0013 — Index untuk halaman Log Aktivitas
--
-- Filter tanggal + entity + aktor akan dipakai UI Logs. Tanpa index, query
-- akan full-scan saat audit_logs membesar.
--
-- Idempoten.
-- ============================================================================

create index if not exists audit_logs_created_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_entity_created_idx
  on public.audit_logs (entity_type, created_at desc);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select indexname from pg_indexes where tablename = 'audit_logs';
