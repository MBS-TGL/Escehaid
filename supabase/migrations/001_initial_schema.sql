-- ============================================
-- SMP Muhammadiyah 4 Tanggul - SIS Database
-- All table/column names in English
-- ============================================

-- Drop old tables if exist
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS gallery CASCADE;
DROP TABLE IF EXISTS berita CASCADE;
DROP TABLE IF EXISTS ppdb_pendaftar CASCADE;
DROP TABLE IF EXISTS profil_sekolah CASCADE;

DROP TYPE IF EXISTS jalur_ppdb CASCADE;
DROP TYPE IF EXISTS status_ppdb CASCADE;
DROP TYPE IF EXISTS kategori_berita CASCADE;
DROP TYPE IF EXISTS tipe_gallery CASCADE;

-- 1. School Profile (singleton - only 1 row)
CREATE TABLE school_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'SMP Muhammadiyah 4 Tanggul',
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  vision TEXT,
  mission TEXT,
  history TEXT,
  logo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PPDB Registrations
CREATE TYPE registration_path AS ENUM ('reguler', 'prestasi', 'beasiswa');
CREATE TYPE registration_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE ppdb_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  birth_place TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('L', 'P')),
  address TEXT,
  phone TEXT,
  email TEXT,
  parent_name TEXT,
  parent_occupation TEXT,
  previous_school TEXT,
  registration_path registration_path DEFAULT 'reguler',
  status registration_status DEFAULT 'pending',
  documents_url TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. News/Announcements
CREATE TYPE news_category AS ENUM ('berita', 'pengumuman', 'agenda');

CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content TEXT,
  category news_category DEFAULT 'berita',
  image_url TEXT,
  author TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Gallery
CREATE TYPE media_type AS ENUM ('foto', 'video');

CREATE TABLE gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_type media_type DEFAULT 'foto',
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Admin Users (extends Supabase Auth)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_ppdb_status ON ppdb_registrations(status);
CREATE INDEX idx_ppdb_created ON ppdb_registrations(created_at DESC);
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_published ON news(is_published, published_at DESC);
CREATE INDEX idx_gallery_category ON news(category);
CREATE INDEX idx_gallery_created ON gallery(created_at DESC);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE school_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppdb_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public can read school profile
CREATE POLICY "Public can read school_profile" ON school_profile
  FOR SELECT USING (true);

-- Public can read published news
CREATE POLICY "Public can read published news" ON news
  FOR SELECT USING (is_published = true);

-- Public can read gallery
CREATE POLICY "Public can read gallery" ON gallery
  FOR SELECT USING (true);

-- Public can insert PPDB registration
CREATE POLICY "Public can insert registration" ON ppdb_registrations
  FOR INSERT WITH CHECK (true);

-- Public can read own registration status
CREATE POLICY "Public can read own registration" ON ppdb_registrations
  FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Admin full access school_profile" ON school_profile
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin full access ppdb_registrations" ON ppdb_registrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin full access news" ON news
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin full access gallery" ON gallery
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admin read admin_users" ON admin_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_school_profile_updated
  BEFORE UPDATE ON school_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_ppdb_updated
  BEFORE UPDATE ON ppdb_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_news_updated
  BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'gi'));
    NEW.slug := trim(both '-' from NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_news_slug
  BEFORE INSERT OR UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION generate_slug();

-- ============================================
-- SEED DATA
-- ============================================
INSERT INTO school_profile (school_name, address, phone, email, vision, mission)
VALUES (
  'SMP Muhammadiyah 4 Tanggul',
  'Jl. Contoh No. 123, Tanggul, Jember',
  '(0334) 123456',
  'info@smpmuh4tanggul.sch.id',
  'Mencerdaskan generasi unggul berlandaskan iman dan takwa.',
  '[
    "Menyelenggarakan pendidikan berkualitas",
    "Mengembangkan potensi siswa secara optimal",
    "Membentuk karakter Islami",
    "Menjalin kerjasama dengan masyarakat"
  ]'
);
