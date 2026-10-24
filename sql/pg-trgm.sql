-- ============================================================================
-- pg_trgm — toleransi typo DB-level utk pencarian publik
-- ============================================================================
-- DOKUMEN: file ini dijalankan MANUAL via Supabase → SQL Editor
-- (repo ini tanpa sistem migration). Runtime otomatis mendeteksi ketersediaan
-- fungsinya (`search_trgm_enabled` + `search_*_ids`): bila belum ada → semua
-- pencarian jatuh ke fallback `.or()` ilike (substring) — nol crash.
--
-- Apa yang diberikan:
--   1) ekstensi pg_trgm + GIN trgm index di semua kolom pencarian publik;
--   2) probe `search_trgm_enabled()` — jawaban runtime, bukan penebakan;
--   3) fungsi kandidat `search_<tabel>_ids(tokens, max_rows)` — item masuk
--      bila SALAH SATU token berada di atas ambang similarity 0.25 pada kolom
--      pencarian modul (semantik sama dengan jalur ilike multi-token).
-- Ranking final tetap dihitung di aplikasi (scoreSearchItem). RLS tetap
-- berlaku di fungsi-fungsi ini (security invoker / default Supabase).
--
-- Cara jalan:
--   Supabase → SQL Editor → paste seluruh file ini → Run. Per-execution idempoten.
-- ============================================================================

-- 1) Ekstensi -----------------------------------------------------------------
create extension if not exists pg_trgm;

-- 2) Probe runtime ------------------------------------------------------------
create or replace function public.search_trgm_enabled()
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select exists (select 1 from pg_extension where extname = 'pg_trgm');
$$;

revoke all on function public.search_trgm_enabled() from public;
grant execute on function public.search_trgm_enabled() to anon, authenticated;

-- GIN trgm index (percepat similarity; dibuat BELAKANG fungsi probe agar
-- gagal di kuartal mana pun tetap menandai "pg_trgm tidak siap").
create index if not exists news_title_trgm       on public.news         using gin (title       gin_trgm_ops);
create index if not exists news_summary_trgm     on public.news         using gin (summary     gin_trgm_ops);
create index if not exists news_content_trgm     on public.news         using gin (content     gin_trgm_ops);
create index if not exists articles_title_trgm   on public.articles     using gin (title       gin_trgm_ops);
create index if not exists articles_excerpt_trgm on public.articles     using gin (excerpt     gin_trgm_ops);
create index if not exists articles_content_trgm on public.articles     using gin (content     gin_trgm_ops);
create index if not exists activities_title_trgm on public.activities   using gin (title       gin_trgm_ops);
create index if not exists activities_descr_trgm on public.activities   using gin (description gin_trgm_ops);
create index if not exists activities_content_trgm on public.activities using gin (content     gin_trgm_ops);
create index if not exists achievements_title_trgm on public.achievements using gin (title     gin_trgm_ops);
create index if not exists achievements_descr_trgm on public.achievements using gin (description gin_trgm_ops);
create index if not exists ekskuls_name_trgm     on public.ekskuls      using gin (name        gin_trgm_ops);
create index if not exists ekskuls_descr_trgm    on public.ekskuls      using gin (description gin_trgm_ops);

-- 3) Kandidat per tabel -------------------------------------------------------
-- Kontrak bersama: param `tokens text[]`, `max_rows int default 60`,
-- return `setof uuid`, security invoker (RLS aktif), ambang 0.25.

create or replace function public.search_news_ids(tokens text[], max_rows int default 60)
returns setof public.news.id%type
language sql
stable
as $$
  select n.id
  from public.news n
  where exists (
    select 1
    from unnest(tokens) t
    where similarity(n.title, t) > 0.25
       or similarity(n.summary, t) > 0.25
       or similarity(n.content, t) > 0.25
  )
  limit greatest(coalesce(max_rows, 60), 1);
$$;

create or replace function public.search_articles_ids(tokens text[], max_rows int default 60)
returns setof public.articles.id%type
language sql
stable
as $$
  select a.id
  from public.articles a
  where exists (
    select 1
    from unnest(tokens) t
    where similarity(a.title, t) > 0.25
       or similarity(a.excerpt, t) > 0.25
       or similarity(a.content, t) > 0.25
  )
  limit greatest(coalesce(max_rows, 60), 1);
$$;

create or replace function public.search_activities_ids(tokens text[], max_rows int default 60)
returns setof public.activities.id%type
language sql
stable
as $$
  select a.id
  from public.activities a
  where exists (
    select 1
    from unnest(tokens) t
    where similarity(a.title, t) > 0.25
       or similarity(a.description, t) > 0.25
       or similarity(a.content, t) > 0.25
  )
  limit greatest(coalesce(max_rows, 60), 1);
$$;

create or replace function public.search_achievements_ids(tokens text[], max_rows int default 60)
returns setof public.achievements.id%type
language sql
stable
as $$
  select a.id
  from public.achievements a
  where exists (
    select 1
    from unnest(tokens) t
    where similarity(a.title, t) > 0.25
       or similarity(a.description, t) > 0.25
  )
  limit greatest(coalesce(max_rows, 60), 1);
$$;

create or replace function public.search_ekskuls_ids(tokens text[], max_rows int default 60)
returns setof public.ekskuls.id%type
language sql
stable
as $$
  select e.id
  from public.ekskuls e
  where exists (
    select 1
    from unnest(tokens) t
    where similarity(e.name, t) > 0.25
       or similarity(e.description, t) > 0.25
  )
  limit greatest(coalesce(max_rows, 60), 1);
$$;

grant execute on function
  public.search_news_ids(text[], int),
  public.search_articles_ids(text[], int),
  public.search_activities_ids(text[], int),
  public.search_achievements_ids(text[], int),
  public.search_ekskuls_ids(text[], int)
to anon, authenticated;
