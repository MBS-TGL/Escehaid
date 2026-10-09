-- ============================================================================
-- MIGRASI FITUR KEGIATAN (jalankan MANUAL di SQL Editor Supabase)
-- ----------------------------------------------------------------------------
-- File ini TIDAK dijalankan otomatis oleh aplikasi. Jalankan satu per satu
-- setelah backup. Sampai migrasi dijalankan, situs tetap berjalan normal
-- (query kode fallback otomatis tanpa kolom/activity_type baru).
-- ============================================================================


-- ── (A) Fase 1: izinkan tipe "penampilan" ──────────────────────────────────
-- Aktivitas: kolom activities.activity_type punya CHECK constraint yang hanya
-- mengizinkan 6 nilai lama. Tanpa ALTER ini, menyimpan tipe "Penampilan"
-- akan DITOLAK database.
ALTER TABLE public.activities
  DROP CONSTRAINT activities_activity_type_check,
  ADD CONSTRAINT activities_activity_type_check CHECK (
    activity_type = ANY (ARRAY[
      'kajian', 'peringatan', 'lomba', 'upacara', 'ekskul', 'umum', 'penampilan'
    ])
  );


-- ── (B) Fase 5: jam acara + tautan siaran langsung ──────────────────────────
-- activity_time : jam/rentang bebas, mis. "19.30 WIB - Selesai" (teks, opsional)
-- live_url      : tautan siaran langsung, mis. Instagram Live (teks, opsional)
-- Kedua kolom OPSIONAL — semua tampilan menyembunyikan elemennya bila kosong.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS activity_time text,
  ADD COLUMN IF NOT EXISTS live_url text;


-- ── (C) Fase 6: kegiatan lanjutan (rentang tanggal, pendaftaran, unggulan) ───
-- end_date         : tanggal SELESAI utk kegiatan multi-hari (opsional).
--                    Tampil sebagai rentang "9–12 Okt 2026", JSON-LD endDate,
--                    status "Berlangsung", dan tombol kalender multi-hari.
-- registration_url : tautan pendaftaran (Google Form, dll.) → tombol kuning
--                    "Daftar Sekarang" di sidebar detail.
-- contact_person   : kontak panitia, mis. "Bu Siti — 0812-3456-7890" → baris
--                    "Kontak Panitia" di sidebar detail.
-- is_featured      : pin kegiatan sebagai kartu unggulan besar di /activities
--                    (tanpa pin → unggulan otomatis = kegiatan terdekat).
-- Semua kolom OPSIONAL/aman default — situs tetap berjalan sebelum migrasi ini.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS registration_url text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
