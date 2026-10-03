-- ============================================================
-- PUBLIC READ — konten publik tidak muncul di halaman /news
-- ============================================================
-- Gejala:
--   * Berita sudah Publish di admin panel, tapi /news tetap
--     "Berita masih kosong."
--   * Cek anon (tanpa login):
--       GET /rest/v1/news?select=id&is_published=eq.true
--       -> 200 OK tapi 0 baris
--     padahal tabel lain jelas terbaca (teachers = 27 baris,
--     school_profile = 1 baris).
--   Artinya: RLS pada tabel news tidak punya policy SELECT
--   untuk publik (anon), jadi semua baris difilter habis.
--
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- Idempotent: aman dijalankan berulang.
-- ============================================================

-- 1. Pastikan RLS menyala
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 2. Policy baca publik: hanya berita yang published
DROP POLICY IF EXISTS "Public read news" ON news;
CREATE POLICY "Public read news" ON news
  FOR SELECT
  USING (is_published = true);

-- 3. Pastikan role anon boleh membaca tabelnya (PostgREST)
GRANT SELECT ON news TO anon;
GRANT SELECT ON news TO authenticated;

-- 4. Konten publik lain yang memakai pola sama
--    (halaman /articles, /activities, /gallery juga kosong
--     untuk publik — pastikan policy-nya ada)

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read articles" ON articles;
CREATE POLICY "Public read articles" ON articles
  FOR SELECT USING (is_published = true);
GRANT SELECT ON articles TO anon;

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read activities" ON activities;
CREATE POLICY "Public read activities" ON activities
  FOR SELECT USING (is_published = true);
GRANT SELECT ON activities TO anon;

ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read gallery" ON gallery;
CREATE POLICY "Public read gallery" ON gallery
  FOR SELECT USING (true);
GRANT SELECT ON gallery TO anon;

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read achievements" ON achievements;
CREATE POLICY "Public read achievements" ON achievements
  FOR SELECT USING (true);
GRANT SELECT ON achievements TO anon;

-- ============================================================
-- VERIFICATION — jalankan setelah langkah di atas
-- ============================================================

-- Harus menampilkan "Public read news" dengan cmd = SELECT
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'news'
ORDER BY policyname;

-- Query ini yang dipakai halaman /news (harus 200 + ada baris)
SELECT id, title, slug, is_published, published_at
FROM news
WHERE is_published = true
ORDER BY published_at DESC
LIMIT 9;
