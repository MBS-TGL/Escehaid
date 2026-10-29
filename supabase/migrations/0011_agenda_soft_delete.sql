-- ============================================================================
-- 0011 — Soft delete Agenda (masuk Sampah)
--
-- Sebelumnya `agenda_events` dihapus permanen sehingga tidak pernah muncul di
-- /admin/trash. Kolom `deleted_at` membuat perilaku sama dengan 8 modul konten
-- lain: hapus = pindah ke Sampah, pulihkan = NULL, purge = hapus permanen.
--
-- Idempoten.
-- ============================================================================

alter table public.agenda_events
  add column if not exists deleted_at timestamptz;

create index if not exists agenda_events_deleted_idx
  on public.agenda_events (deleted_at);

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'agenda_events' and column_name = 'deleted_at';
