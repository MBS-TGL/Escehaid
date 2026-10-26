-- ============================================================================
-- 0006 — Akses baca `schema_migrations` untuk panel /admin/sql
--
-- Runner (`scripts/db-migrate.mjs`) membuat tabel `schema_migrations` dan
-- mencatat setiap berkas yang diterapkan. Halaman /admin/sql membacanya lewat
-- klien browser (user login), jadi aksesnya dibatasi:
--   • hanya `authenticated` (bukan anon),
--   • hanya pemegang `users:manage` (halaman itu sendiri sudah digate begitu).
--
-- Tabel dibuat runner, tapi berkas ini tetap aman dijalankan lebih dulu: blok
-- `do` melewati semuanya bila tabel belum ada.
--
-- Idempoten.
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
      using (public.has_permission(auth.uid(), 'users:manage'))
  $p$;

  execute 'revoke all on public.schema_migrations from anon';
  execute 'grant select on public.schema_migrations to authenticated';
end $$;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select filename, applied_at from public.schema_migrations order by filename;
--   -- sebagai user non-manager, query di atas harus mengembalikan 0 baris.
