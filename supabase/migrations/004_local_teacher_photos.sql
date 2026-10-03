-- ============================================================
-- GAMBAR STATIS → /public (egress Supabase nol)
-- ============================================================
-- Prasyarat (sudah dijalankan dari lokal):
--   node scripts/sync-static-images.mjs teachers facilities
--   → file tersimpan di public/images/teachers/ dan public/images/facilities/
--
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor.
-- Setelah ini, foto guru & fasilitas dibaca dari /public (Vercel),
-- bukan dari Supabase Storage → egress nol.
--
-- Foto BARU yang di-upload lewat admin panel tetap masuk Supabase
-- (tetap tampil normal). Kapan pun mau dipindah ke lokal:
--   1. node scripts/sync-static-images.mjs teachers facilities
--   2. jalankan ulang UPDATE di bawah ini.
-- ============================================================

UPDATE teachers
SET photo_url = '/images/teachers/' || substring(photo_url from '[^/]+$')
WHERE photo_url LIKE '%/storage/v1/object/public/images/teachers/%';

UPDATE facilities
SET image_url = '/images/facilities/' || substring(image_url from '[^/]+$')
WHERE image_url LIKE '%/storage/v1/object/public/images/facilities/%';

-- ============================================================
-- VERIFICATION — harus 0 / 0
-- ============================================================
SELECT
  (SELECT count(*) FROM teachers  WHERE photo_url LIKE '%/storage/v1/object/public/%') AS teachers_masih_storage,
  (SELECT count(*) FROM facilities WHERE image_url LIKE '%/storage/v1/object/public/%') AS facilities_masih_storage;

SELECT id, name, photo_url FROM teachers ORDER BY name;
