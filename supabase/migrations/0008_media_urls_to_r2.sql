-- ============================================================================
-- 0008 — Kolom media yang masih menunjuk path lokal → URL absolut R2
--
-- MENGAPA
-- Sebelum cutover Cloudflare R2, `scripts/sync-static-images.mjs` menarik
-- gambar dari Supabase Storage ke `public/images/`, lalu
-- `supabase_backup/cleanup_urls.sql` me-rewrite kolom URL di DB menjadi path
-- lokal (`/images/...`, `/documents/...`). Setelah R2 aktif, aplikasi tidak
-- lagi melayani media dari repo: semua helper unggah menulis ke R2 dan halaman
-- merender URL kolom apa adanya (tanpa rewriting saat render).
--
-- Karena itu semua path lokal harus diganti URL absolut CDN. Objeknya sudah
-- diunggah lebih dulu oleh `scripts/upload-local-media-r2.mjs` dengan key
-- `<bucket>/<path>` — persis sama dengan path lokal setelah garis miring
-- pertama. Jadi cukup menempelkan origin CDN di depan path.
--
-- URUTAN RILIS (jangan dibalik):
--   1. node scripts/upload-local-media-r2.mjs        (unggah objek)
--   2. node scripts/upload-local-media-r2.mjs --verify  (26/26 ada di CDN)
--   3. berkas ini
--   4. hapus file lokal dari `public/` (kode sudah tidak merujuknya)
--
-- Idempoten: hanya menyentuh baris yang diawali '/'. Setelah dijalankan,
-- query yang sama tidak menemukan baris lagi.
-- ============================================================================

-- ── PREFLIGHT (jalankan dulu, baca saja) ────────────────────────────────────
-- Hitung sisa path lokal per kolom sebelum update:
--
--   select 'teachers.photo_url' as kolom, count(*) from public.teachers          where photo_url like '/%'
--   union all
--   select 'facilities.image_url', count(*) from public.facilities               where image_url like '/%'
--   union all
--   select 'school_profile.principal_photo_url', count(*) from public.school_profile where coalesce(principal_photo_url,'') like '/%'
--   union all
--   select 'news.attachment_url', count(*) from public.news                      where coalesce(attachment_url,'') like '/%';
--
-- Ekspektasi saat ditulis: 18 + 4 + 1 + 1 = 24 baris.

-- ── BACKFILL ────────────────────────────────────────────────────────────────
-- Guru
update public.teachers
   set photo_url = 'https://cdn.smpmuh4tanggul.sch.id' || photo_url
 where photo_url like '/%';

-- Fasilitas
update public.facilities
   set image_url = 'https://cdn.smpmuh4tanggul.sch.id' || image_url
 where image_url like '/%';

-- Profil sekolah (foto kepala sekolah)
update public.school_profile
   set principal_photo_url = 'https://cdn.smpmuh4tanggul.sch.id' || principal_photo_url
 where coalesce(principal_photo_url, '') like '/%';

-- Berita & pengumuman (lampiran PDF)
update public.news
   set attachment_url = 'https://cdn.smpmuh4tanggul.sch.id' || attachment_url
 where coalesce(attachment_url, '') like '/%';

-- Kolom media lain: dijaga tetap nol agar tidak ada path lokal yang lolos bila
-- suatu saat ada baris lama/impor manual. Semuanya idempoten.
update public.news
   set image_url = 'https://cdn.smpmuh4tanggul.sch.id' || image_url
 where coalesce(image_url, '') like '/%';

update public.activities
   set image_url = 'https://cdn.smpmuh4tanggul.sch.id' || image_url
 where coalesce(image_url, '') like '/%';

update public.articles
   set image_url = 'https://cdn.smpmuh4tanggul.sch.id' || image_url
 where coalesce(image_url, '') like '/%';

update public.gallery
   set url = 'https://cdn.smpmuh4tanggul.sch.id' || url
 where url like '/%';

update public.gallery
   set thumbnail_url = 'https://cdn.smpmuh4tanggul.sch.id' || thumbnail_url
 where coalesce(thumbnail_url, '') like '/%';

update public.achievements
   set image_url = 'https://cdn.smpmuh4tanggul.sch.id' || image_url
 where coalesce(image_url, '') like '/%';

update public.ekskuls
   set image_url = 'https://cdn.smpmuh4tanggul.sch.id' || image_url
 where coalesce(image_url, '') like '/%';

update public.downloads
   set file_url = 'https://cdn.smpmuh4tanggul.sch.id' || file_url
 where coalesce(file_url, '') like '/%';

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
-- 1. Tidak boleh ada sisa path lokal di kolom media mana pun:
--
--   select 'teachers' as tabel, count(*) from public.teachers where photo_url like '/%'
--   union all select 'facilities', count(*) from public.facilities where image_url like '/%'
--   union all select 'school_profile', count(*) from public.school_profile where coalesce(principal_photo_url,'') like '/%'
--   union all select 'news.image', count(*) from public.news where coalesce(image_url,'') like '/%'
--   union all select 'news.attachment', count(*) from public.news where coalesce(attachment_url,'') like '/%'
--   union all select 'activities', count(*) from public.activities where coalesce(image_url,'') like '/%'
--   union all select 'articles', count(*) from public.articles where coalesce(image_url,'') like '/%'
--   union all select 'gallery.url', count(*) from public.gallery where url like '/%'
--   union all select 'gallery.thumb', count(*) from public.gallery where coalesce(thumbnail_url,'') like '/%'
--   union all select 'achievements', count(*) from public.achievements where coalesce(image_url,'') like '/%'
--   union all select 'ekskuls', count(*) from public.ekskuls where coalesce(image_url,'') like '/%'
--   union all select 'downloads', count(*) from public.downloads where coalesce(file_url,'') like '/%';
--   -- semua harus 0
--
-- 2. Foto guru terbaru dapat diakses (HTTP 200):
--
--   select photo_url from public.teachers where photo_url like 'https://cdn.%' limit 3;
--
-- 3. Beranda dan /profile menampilkan foto tanpa 404 (cek Network tab).
