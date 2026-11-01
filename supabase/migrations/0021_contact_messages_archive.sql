-- ============================================================================
-- 0021 — Arsip Pesan Kontak (bukan hapus permanen)
--
-- Sebelumnya pesan yang selesai ditindaklanjuti hanya bisa dihapus permanen
-- dari /admin/contact. Kolom `is_archived` memberi jalan tengah: arsip =
-- sembunyi dari daftar aktif (bisa dikeluarkan lagi), hapus = permanen.
--
-- Idempoten. Rilis manual via runner (npm run db:migrate) — kode toleran
-- bila kolom belum ada (probe tableHasColumn di queries/contact.ts).
-- ============================================================================

alter table public.contact_messages
  add column if not exists is_archived boolean not null default false;

create index if not exists contact_messages_archived_idx
  on public.contact_messages (is_archived);

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'contact_messages' and column_name = 'is_archived';
