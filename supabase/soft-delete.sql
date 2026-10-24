-- ============================================================================
-- Soft-delete (Recycle Bin) — kolom `deleted_at` untuk 8 tabel konten:
-- news, articles, faqs, achievements, activities, gallery, downloads,
-- announcements.
--
-- Jalankan di Supabase SQL Editor SEBELUM deploy kode terkait (getter publik
-- memakai filter `.is("deleted_at", null)` yang error bila kolom belum ada).
-- Idempoten: aman dijalankan berulang.
--
-- Item terhapus = baris dengan deleted_at terisi; ditampilkan di halaman
-- admin /admin/trash dan dihapus permanen otomatis setelah 30 hari
-- (scripts/purge-trash.mjs via GitHub Actions mingguan).
-- ============================================================================

ALTER TABLE public.news         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.articles     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.faqs         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.activities   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.gallery      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.downloads    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Index parsial: hanya baris terhapus (sedikit) — murah & dipakai halaman Sampah.
CREATE INDEX IF NOT EXISTS news_deleted_at_idx         ON public.news (deleted_at)         WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS articles_deleted_at_idx     ON public.articles (deleted_at)     WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS faqs_deleted_at_idx         ON public.faqs (deleted_at)         WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS achievements_deleted_at_idx ON public.achievements (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS activities_deleted_at_idx   ON public.activities (deleted_at)   WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS gallery_deleted_at_idx      ON public.gallery (deleted_at)      WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS downloads_deleted_at_idx    ON public.downloads (deleted_at)    WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS announcements_deleted_at_idx ON public.announcements (deleted_at) WHERE deleted_at IS NOT NULL;

-- Catatan: tidak ada perubahan RLS. Filter `deleted_at IS NULL` dilakukan di
-- query layer aplikasi; konten yang di-soft-delete adalah konten yang sebelum
-- dihapus memang tayang publik, sehingga tidak ada kebocoran data pribadi.
