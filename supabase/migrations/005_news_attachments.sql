-- ============================================================
-- LAMPIRAN FILE BERITA (attachment)
-- ============================================================
-- Berita (mis. pengumuman PDF) bisa menyertakan satu file lampiran.
-- Jalankan di Supabase Dashboard → SQL Editor sebelum deploy.
-- ============================================================

-- 1. Kolom baru di tabel news
ALTER TABLE news ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT '';
ALTER TABLE news ADD COLUMN IF NOT EXISTS attachment_name text DEFAULT '';

COMMENT ON COLUMN news.attachment_url IS 'URL publik file lampiran (bucket documents)';
COMMENT ON COLUMN news.attachment_name IS 'Nama file asli untuk ditampilkan';

-- 2. Bucket khusus dokumen (publik, maks 10 MB, hanya dokumen)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text',
    'text/plain',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS: publik boleh baca, staff boleh kelola
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
CREATE POLICY "Public read documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Staff manage documents" ON storage.objects;
CREATE POLICY "Staff manage documents" ON storage.objects
  FOR ALL USING (bucket_id = 'documents' AND current_user_role() IN ('developer', 'admin', 'publisher'))
  WITH CHECK (bucket_id = 'documents' AND current_user_role() IN ('developer', 'admin', 'publisher'));

-- 4. Grant (kalau belum)
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'documents';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'news' AND column_name LIKE 'attachment%';
