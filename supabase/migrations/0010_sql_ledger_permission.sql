-- ============================================================================
-- 0010 — Policy baca `schema_migrations` mengikuti izin halaman /admin/sql
--
-- MENGAPA
-- `0006` membuat policy dengan `has_permission(auth.uid(), 'users:manage')`
-- karena saat itu halaman /admin/sql masih digate `users:manage`.
-- Sejak izin `sql:manage` diperkenalkan, gate halaman memakai `sql:manage`.
-- Bila policy tetap `users:manage`, pemegang `sql:manage` saja bisa membuka
-- halaman tetapi ledger-nya terbaca kosong → semua migrasi runner tampil
-- "Belum" (false negative).
--
-- SUPER_ADMIN tetap lolos keduanya (wildcard `has_permission`), jadi migrasi
-- ini tidak mengubah perilaku pemilik — ia hanya menyelaraskan policy dengan
-- izin halaman.
--
-- Idempoten. Jangan mengubah `0006` (checksum runner akan menolak).
-- ============================================================================

do $$
begin
  if to_regclass('public.schema_migrations') is null then
    raise notice 'schema_migrations belum ada — jalankan `npm run db:migrate` dulu. Berkas ini dilewati.';
    return;
  end if;

  execute 'alter table public.schema_migrations enable row level security';

  execute 'drop policy if exists "schema_migrations read manager" on public.schema_migrations';
  execute $p$
    create policy "schema_migrations read manager" on public.schema_migrations
      for select to authenticated
      using (public.has_permission(auth.uid(), 'sql:manage'))
  $p$;

  execute 'revoke all on public.schema_migrations from anon';
  execute 'grant select on public.schema_migrations to authenticated';
end $$;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select filename, applied_at from public.schema_migrations order by filename;
--   -- sebagai user tanpa sql:manage, query di atas harus mengembalikan 0 baris.
