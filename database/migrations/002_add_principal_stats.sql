-- Migration: Add principal and stats fields to school_profile
-- Run this AFTER the main database.sql

ALTER TABLE school_profile
  ADD COLUMN IF NOT EXISTS principal_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS principal_photo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS principal_quote text DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_teachers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_students integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_classes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accreditation text DEFAULT 'A';

-- Update the existing row with default values
UPDATE school_profile SET
  principal_name = 'Khoirul Anwar, S.Pd',
  principal_photo_url = '/images/Kepala-Sekolah.jpg',
  principal_quote = 'Selamat datang di SMP Muhammadiyah 4 Tanggul. Kami berkomitmen mencerdaskan kehidupan bangsa melalui pendidikan berkualitas yang memadukan keunggulan akademik dan pembentukan karakter Islami.',
  total_teachers = 14,
  total_students = 164,
  total_classes = 7,
  accreditation = 'A'
WHERE principal_name = '' OR principal_name IS NULL;
