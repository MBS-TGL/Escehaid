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
--      bila SALAH SATU token (≥3 huruf) memiliki `word_similarity` > 0.50
--      terhadap kolom pencarian modul; kandidat diurut skor terbaik desc
--      sebelum dipotong `max_rows` (bukan subset arbitrer).
--
--      Riwayat ambang (semua empiris, diuji live thd data produksi):
--        v1: similarity(kolom, token) 0.25 — kemiripan SELURUH-STRING; thd
--            judul panjang selalu < 0.25 → kandidat selalu kosong → regresi
--            0 hasil di semua pencarian DB.
--        v2: word_similarity(token, kolom) 0.25 — argumen dibalik, cocok per
--            jendela kata; typo hidup, TAPI potongan kata ikut lolos
--            ("tapak" vs "Pendaftar" ≈ 0.33) → presisi jebol.
--        v3: ambang 0.50 + guard token ≥3 huruf + order by skor. Jurang
--            empiris: kata utuh = 1.0 · typo asli ("ustadzhtub" thd
--            "Ustadzah") ≈ 0.55–0.67 · noise sub-kata ≤ 0.40.
--      Semantik OR per token sama dengan jalur ilike multi-token. Ranking
--      final tetap dihitung di aplikasi (scoreSearchItem). RLS tetap
--      berlaku (security invoker / default Supabase).
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
-- return `setof uuid`, security invoker (RLS aktif), ambang word_similarity
-- 0.50, token <3 huruf diabaikan (trigram noise; dilayani fallback ilike).
-- ARGUMEN DIBALIK vs similarity(): needle (token) di depan, kolom teks
-- panjang di belakang — jangan kembalikan ke urutan v1. `greatest` mengabaikan
-- NULL (kolom opsional seperti summary/content boleh kosong).

create or replace function public.search_news_ids(tokens text[], max_rows int default 60)
returns setof public.news.id%type
language sql
stable
as $$
  select s.id
  from (
    select n.id,
           max(greatest(
             word_similarity(t, n.title),
             word_similarity(t, n.summary),
             word_similarity(t, n.content)
           )) as score
    from public.news n
    cross join unnest(tokens) t
    where char_length(t) >= 3
    group by n.id
  ) s
  where s.score > 0.50
  order by s.score desc
  limit greatest(coalesce(max_rows, 60), 1);
$$;

create or replace function public.search_articles_ids(tokens text[], max_rows int default 60)
returns setof public.articles.id%type
language sql
stable
as $$
  select s.id
  from (
    select a.id,
           max(greatest(
             word_similarity(t, a.title),
             word_similarity(t, a.excerpt),
             word_similarity(t, a.content)
           )) as score
    from public.articles a
    cross join unnest(tokens) t
    where char_length(t) >= 3
    group by a.id
  ) s
  where s.score > 0.50
  order by s.score desc
  limit greatest(coalesce(max_rows, 60), 1);
$$;

create or replace function public.search_activities_ids(tokens text[], max_rows int default 60)
returns setof public.activities.id%type
language sql
stable
as $$
  select s.id
  from (
    select a.id,
           max(greatest(
             word_similarity(t, a.title),
             word_similarity(t, a.description),
             word_similarity(t, a.content)
           )) as score
    from public.activities a
    cross join unnest(tokens) t
    where char_length(t) >= 3
    group by a.id
  ) s
  where s.score > 0.50
  order by s.score desc
  limit greatest(coalesce(max_rows, 60), 1);
$$;

create or replace function public.search_achievements_ids(tokens text[], max_rows int default 60)
returns setof public.achievements.id%type
language sql
stable
as $$
  select s.id
  from (
    select a.id,
           max(greatest(
             word_similarity(t, a.title),
             word_similarity(t, a.description)
           )) as score
    from public.achievements a
    cross join unnest(tokens) t
    where char_length(t) >= 3
    group by a.id
  ) s
  where s.score > 0.50
  order by s.score desc
  limit greatest(coalesce(max_rows, 60), 1);
$$;

create or replace function public.search_ekskuls_ids(tokens text[], max_rows int default 60)
returns setof public.ekskuls.id%type
language sql
stable
as $$
  select s.id
  from (
    select e.id,
           max(greatest(
             word_similarity(t, e.name),
             word_similarity(t, e.description)
           )) as score
    from public.ekskuls e
    cross join unnest(tokens) t
    where char_length(t) >= 3
    group by e.id
  ) s
  where s.score > 0.50
  order by s.score desc
  limit greatest(coalesce(max_rows, 60), 1);
$$;

grant execute on function
  public.search_news_ids(text[], int),
  public.search_articles_ids(text[], int),
  public.search_activities_ids(text[], int),
  public.search_achievements_ids(text[], int),
  public.search_ekskuls_ids(text[], int)
to anon, authenticated;
