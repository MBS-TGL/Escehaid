-- ============================================================
-- SMP Muhammadiyah 4 Tanggul — DATABASE RESET v4
-- Perbaikan dari versi sebelumnya:
--   1. handle_new_user() TIDAK LAGI percaya role dari client metadata
--      (dulu: siapapun bisa signup langsung jadi 'developer')
--   2. Trigger anti self role-escalation di user_profiles
--      (dulu: user bisa UPDATE role diri sendiri jadi admin)
--   3. RLS "Admin manage X" beneran cek role, bukan cuma auth.role()='authenticated'
--      (dulu: student pun full CRUD ke semua tabel konten)
--   4. Public insert spmb_registrations dikunci status='pending'
--      (dulu: pendaftar publik bisa insert langsung status='accepted')
--   5. Slug generator digeneralisasi + auto-handle collision + no double-dash
--   6. Auto set_updated_at() trigger di semua tabel yang punya kolom itu
--   7. Bucket "images" ditambahkan (dulu gak ada tempat upload foto konten)
--   8. Full cleanup di Phase 0 (drop policy dulu) supaya script ini AMAN
--      dijalankan berkali-kali tanpa error "already exists"
--   9. GRANT statements otomatis expose semua tabel ke PostgREST
--      (WAJIB kalau "Automatically expose new tables" = OFF di Dashboard)
--  10. Developer user bootstrap otomatis (gak perlu manual insert)
--  11. Principal & stats fields di school_profile (gabungan 002_add_principal_stats)
--  12. Slug UPDATE trigger — auto-regenerate slug kalau title berubah
--
-- Jalankan di Supabase SQL Editor, project BARU (kosong) ATAU existing.
-- Catatan project settings (Supabase Dashboard → Database → API):
--   - Automatically expose new tables: OFF
--   - Enable automatic RLS: OFF
-- ============================================================

-- ============================================================
-- PHASE 0: FULL CLEANUP — aman dijalankan berkali-kali (idempotent)
-- ============================================================
-- auth.users selalu ada di Supabase, jadi ini aman standalone
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Tabel-tabel di bawah ini BELUM TENTU ada (misal project baru/kosong),
-- dan "DROP TRIGGER IF EXISTS x ON tabel" tetap error kalau tabelnya sendiri
-- gak ada (IF EXISTS cuma nge-skip triggernya, bukan tabelnya). Makanya
-- di-cek dulu keberadaan tabel via to_regclass() sebelum drop trigger.
DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_prevent_privilege_escalation ON user_profiles';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_set_updated_at_user_profiles ON user_profiles';
  END IF;
  IF to_regclass('public.school_profile') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_set_updated_at_school_profile ON school_profile';
  END IF;
  IF to_regclass('public.news') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_set_updated_at_news ON news';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_slug_news ON news';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_slug_news_update ON news';
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_news_slug ON news';
  END IF;
  IF to_regclass('public.articles') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_set_updated_at_articles ON articles';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_slug_articles ON articles';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_slug_articles_update ON articles';
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_articles_slug ON articles';
  END IF;
  IF to_regclass('public.activities') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_set_updated_at_activities ON activities';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_slug_activities ON activities';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_slug_activities_update ON activities';
  END IF;
  IF to_regclass('public.spmb_registrations') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_set_updated_at_spmb ON spmb_registrations';
  END IF;
END $$;

DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS prevent_privilege_escalation();
DROP FUNCTION IF EXISTS set_updated_at();
DROP FUNCTION IF EXISTS generate_unique_slug();
DROP FUNCTION IF EXISTS regenerate_slug_on_title_change();
DROP FUNCTION IF EXISTS update_news_slug();
DROP FUNCTION IF EXISTS update_articles_slug();
DROP FUNCTION IF EXISTS current_user_role();

-- Drop semua policy lama (biar CREATE POLICY di bawah gak pernah bentrok)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DROP TABLE IF EXISTS user_audit_log CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS spmb_registrations CASCADE;
DROP TABLE IF EXISTS ppdb_registrations CASCADE; -- nama lama, jaga-jaga
DROP TABLE IF EXISTS gallery CASCADE;
DROP TABLE IF EXISTS news CASCADE;
DROP TABLE IF EXISTS school_profile CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- buat gen_random_uuid()

-- ============================================================
-- PHASE 1: ENUM
-- ============================================================
CREATE TYPE user_role AS ENUM ('developer', 'admin', 'publisher', 'teacher', 'student');

-- ============================================================
-- PHASE 2: AUTH TABLES
-- ============================================================
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'student',
  avatar_url text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PHASE 3: SIGNUP TRIGGER — role SELALU 'student', gak peduli
-- apa yang dikirim client di raw_user_meta_data.
-- Promosi role WAJIB manual lewat admin panel / SQL, bukan signup.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'student',   -- HARDCODE, jangan pernah ambil dari metadata client
    true
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PHASE 4: ANTI PRIVILEGE-ESCALATION
-- Blok perubahan role/is_active kecuali dilakukan oleh
-- developer/admin, ATAU dijalankan lewat SQL Editor/service_role
-- (auth.uid() IS NULL) untuk keperluan bootstrap.
-- ============================================================
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    IF auth.uid() IS NOT NULL
       AND (current_user_role() IS NULL OR current_user_role() NOT IN ('developer', 'admin')) THEN
      RAISE EXCEPTION 'Hanya developer/admin yang boleh mengubah role atau status aktif';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_privilege_escalation
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_privilege_escalation();

-- ============================================================
-- PHASE 5: RLS user_profiles / user_audit_log
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
  -- catatan: kolom role/is_active tetap dilindungi oleh trigger di atas,
  -- bukan oleh policy ini — RLS gak bisa restrict per-kolom.

CREATE POLICY "Admin manage profiles"
  ON user_profiles FOR ALL
  USING (current_user_role() IN ('developer', 'admin'))
  WITH CHECK (current_user_role() IN ('developer', 'admin'));

CREATE POLICY "Audit log admin only"
  ON user_audit_log FOR ALL
  USING (current_user_role() IN ('developer', 'admin'));

-- ============================================================
-- PHASE 6: HELPER TRIGGERS (dipakai berulang di banyak tabel)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Slug generator generic: lowercase, ganti karakter non-alfanumerik jadi
-- satu dash, trim dash di ujung, dan auto-append -2, -3, dst kalau bentrok.
CREATE OR REPLACE FUNCTION generate_unique_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
  counter int := 1;
  slug_exists boolean;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(NEW.title);
  ELSE
    base_slug := lower(NEW.slug);
  END IF;

  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'item';
  END IF;

  candidate_slug := base_slug;

  LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I WHERE slug = $1 AND id <> $2)',
      TG_TABLE_NAME
    ) INTO slug_exists USING candidate_slug, NEW.id;

    EXIT WHEN NOT slug_exists;
    counter := counter + 1;
    candidate_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := candidate_slug;
  RETURN NEW;
END;
$$;

-- ============================================================
-- PHASE 7: TABEL KONTEN
-- ============================================================

-- School Profile (single row)
CREATE TABLE school_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL DEFAULT 'SMP Muhammadiyah 4 Tanggul',
  address text NOT NULL DEFAULT 'Jl. Pemandian No. 88, Patemon, Tanggul, Jember 68154',
  phone text NOT NULL DEFAULT '0858-5200-4008',
  email text NOT NULL DEFAULT 'smpm4tangguljember@gmail.com',
  website text DEFAULT 'https://esceha.id',
  vision text NOT NULL DEFAULT '',
  mission text NOT NULL DEFAULT '',
  history text DEFAULT '',
  logo_url text DEFAULT '/images/Logo-Sekolah.png',
  banner_url text DEFAULT '',
  principal_name text DEFAULT '',
  principal_photo_url text DEFAULT '',
  principal_quote text DEFAULT '',
  total_teachers integer DEFAULT 0,
  total_students integer DEFAULT 0,
  total_classes integer DEFAULT 0,
  accreditation text DEFAULT 'A',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO school_profile (school_name, address, phone, email, website, vision, mission,
  principal_name, principal_photo_url, principal_quote, total_teachers, total_students, total_classes, accreditation)
VALUES (
  'SMP Muhammadiyah 4 Tanggul',
  'Jl. Pemandian No. 88, Patemon, Kec. Tanggul, Kab. Jember, Jawa Timur 68154',
  '0858-5200-4008',
  'smpm4tangguljember@gmail.com',
  'https://esceha.id',
  'Menjadi lembaga pencetak kader da''i dan ulama hafidz yang menguasai ilmu pengetahuan dan teknologi berwawasan global serta peduli dan berbudaya lingkungan.',
  '[
    "Menanamkan kepribadian Islam dan kepedulian terhadap lingkungan",
    "Menanamkan karakter unggul: lurus aqidah, bagus ibadah, mulia akhlak",
    "Melaksanakan pembelajaran aktif, inovatif, kreatif, dan menyenangkan",
    "Menumbuhkan potensi keberbakatan dalam setiap siswa",
    "Berbasis Boarding School dan Full Day School dengan kurikulum Nasional & Muhammadiyah",
    "Mewujudkan generasi emas 2045: One Home One Hafidz"
  ]',
  'Khoirul Anwar, S.Pd',
  '/images/Kepala-Sekolah.jpg',
  'Selamat datang di SMP Muhammadiyah 4 Tanggul. Kami berkomitmen mencerdaskan kehidupan bangsa melalui pendidikan berkualitas yang memadukan keunggulan akademik dan pembentukan karakter Islami.',
  14,
  164,
  7,
  'A'
);

CREATE TRIGGER trg_set_updated_at_school_profile
  BEFORE UPDATE ON school_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- News
CREATE TABLE news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'berita' CHECK (category IN ('berita', 'pengumuman', 'agenda')),
  image_url text DEFAULT '',
  cover_image_position text DEFAULT 'center' CHECK (cover_image_position IN ('top', 'center', 'bottom')),
  writer_name text DEFAULT '',
  editor_name text DEFAULT '',
  author_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  is_published boolean DEFAULT false,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_slug_news
  BEFORE INSERT ON news
  FOR EACH ROW EXECUTE FUNCTION generate_unique_slug();

CREATE TRIGGER trg_set_updated_at_news
  BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Slug auto-regenerate when title changes (UPDATE only, not on INSERT)
CREATE OR REPLACE FUNCTION regenerate_slug_on_title_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
  counter int := 1;
  slug_exists boolean;
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    base_slug := lower(NEW.title);
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN
      base_slug := 'item';
    END IF;

    candidate_slug := base_slug;
    LOOP
      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM %I WHERE slug = $1 AND id <> $2)',
        TG_TABLE_NAME
      ) INTO slug_exists USING candidate_slug, NEW.id;

      EXIT WHEN NOT slug_exists;
      counter := counter + 1;
      candidate_slug := base_slug || '-' || counter;
    END LOOP;

    NEW.slug := candidate_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_slug_news_update
  BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION regenerate_slug_on_title_change();

-- Gallery
CREATE TABLE gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  media_type text NOT NULL DEFAULT 'foto' CHECK (media_type IN ('foto', 'video')),
  url text NOT NULL,
  thumbnail_url text DEFAULT '',
  category text NOT NULL DEFAULT 'umum',
  created_at timestamptz DEFAULT now()
);

-- SPMB Registrations
CREATE TABLE spmb_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  birth_place text DEFAULT '',
  birth_date date,
  gender text NOT NULL CHECK (gender IN ('L', 'P')),
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  parent_name text DEFAULT '',
  parent_occupation text DEFAULT '',
  previous_school text DEFAULT '',
  registration_path text NOT NULL DEFAULT 'reguler' CHECK (registration_path IN ('reguler', 'prestasi', 'beasiswa')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  documents jsonb DEFAULT '{}',
  admin_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_set_updated_at_spmb
  BEFORE UPDATE ON spmb_registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Teachers
CREATE TABLE teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text DEFAULT '',
  position text DEFAULT '',
  categories jsonb DEFAULT '[]',
  photo_url text DEFAULT '',
  bio text DEFAULT '',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO teachers (name, subject, position, categories, sort_order) VALUES
  ('Khoirul Anwar, S.Pd', 'Administrasi', 'Kepala Sekolah', '["Kepala Sekolah", "Operator Sekolah"]', 0),
  ('Durrotun Nasyihin, S.Ag', 'Pendidikan Agama Islam', 'Guru PAI', '["Guru Mapel"]', 1),
  ('Ainul Farhan, S.Pd', 'Matematika', 'Guru Matematika', '["Guru Mapel"]', 2),
  ('Rudi Hartono, S.Pd', 'Bahasa Inggris', 'Guru Bahasa Inggris', '["Guru Mapel"]', 3),
  ('Jimi Priyo Assiddiq, S.Pd., M.Pd', 'TIK', 'Guru TIK', '["Guru Mapel"]', 4),
  ('Muhammad Arif, S.Pd., M.Pd', 'IPA', 'Guru IPA', '["Guru Mapel"]', 5);

-- Facilities
CREATE TABLE facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO facilities (name, description, sort_order) VALUES
  ('Ruang Kelas', 'Ruang nyaman dengan Projector, Whiteboard, dan IFP interaktif', 1),
  ('Lab Komputer', 'Ruang lab yang nyaman dengan komputer dan internet untuk belajar serta variasi materi', 2),
  ('Masjid', 'Pusat ibadah, kajian keislaman, dan kegiatan tahfidz Qur''an', 3),
  ('Lapangan Olahraga', 'Lapangan terawat untuk kegiatan olahraga dan aktivitas fisik siswa', 4);

-- Articles
CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text DEFAULT '',
  content text NOT NULL DEFAULT '',
  author_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  category text DEFAULT 'umum',
  image_url text DEFAULT '',
  is_published boolean DEFAULT false,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_slug_articles
  BEFORE INSERT ON articles
  FOR EACH ROW EXECUTE FUNCTION generate_unique_slug();

CREATE TRIGGER trg_set_updated_at_articles
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_slug_articles_update
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION regenerate_slug_on_title_change();

-- Achievements
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'akademik',
  year int DEFAULT extract(year FROM now())::int,
  image_url text DEFAULT '',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Activities (Kegiatan Sekolah)
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  content text DEFAULT '',
  activity_date timestamptz DEFAULT now(),
  activity_type text DEFAULT 'umum' CHECK (activity_type IN ('kajian', 'peringatan', 'lomba', 'upacara', 'ekskul', 'umum')),
  location text DEFAULT '',
  image_url text DEFAULT '',
  is_published boolean DEFAULT false,
  author_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_slug_activities
  BEFORE INSERT ON activities
  FOR EACH ROW EXECUTE FUNCTION generate_unique_slug();

CREATE TRIGGER trg_set_updated_at_activities
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_slug_activities_update
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION regenerate_slug_on_title_change();

-- Contact Messages
CREATE TABLE contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  subject text DEFAULT '',
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PHASE 8: RLS — role-based, bukan cuma "authenticated"
-- ============================================================
ALTER TABLE school_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE spmb_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read school_profile" ON school_profile FOR SELECT USING (true);
CREATE POLICY "Public read news" ON news FOR SELECT USING (is_published = true);
CREATE POLICY "Public read gallery" ON gallery FOR SELECT USING (true);
CREATE POLICY "Public read teachers" ON teachers FOR SELECT USING (is_active = true);
CREATE POLICY "Public read facilities" ON facilities FOR SELECT USING (is_active = true);
CREATE POLICY "Public read articles" ON articles FOR SELECT USING (is_published = true);
CREATE POLICY "Public read activities" ON activities FOR SELECT USING (is_published = true);
CREATE POLICY "Public read achievements" ON achievements FOR SELECT USING (true);

-- Staff manage (role-checked, bukan sekadar login)
CREATE POLICY "Staff manage school_profile" ON school_profile FOR ALL
  USING (current_user_role() IN ('developer', 'admin'))
  WITH CHECK (current_user_role() IN ('developer', 'admin'));

CREATE POLICY "Staff manage news" ON news FOR ALL
  USING (current_user_role() IN ('developer', 'admin', 'publisher'))
  WITH CHECK (current_user_role() IN ('developer', 'admin', 'publisher'));

CREATE POLICY "Staff manage gallery" ON gallery FOR ALL
  USING (current_user_role() IN ('developer', 'admin', 'publisher'))
  WITH CHECK (current_user_role() IN ('developer', 'admin', 'publisher'));

CREATE POLICY "Staff manage teachers" ON teachers FOR ALL
  USING (current_user_role() IN ('developer', 'admin'))
  WITH CHECK (current_user_role() IN ('developer', 'admin'));

CREATE POLICY "Staff manage facilities" ON facilities FOR ALL
  USING (current_user_role() IN ('developer', 'admin'))
  WITH CHECK (current_user_role() IN ('developer', 'admin'));

CREATE POLICY "Staff manage articles" ON articles FOR ALL
  USING (current_user_role() IN ('developer', 'admin', 'publisher'))
  WITH CHECK (current_user_role() IN ('developer', 'admin', 'publisher'));

CREATE POLICY "Staff manage activities" ON activities FOR ALL
  USING (current_user_role() IN ('developer', 'admin', 'publisher'))
  WITH CHECK (current_user_role() IN ('developer', 'admin', 'publisher'));

CREATE POLICY "Staff manage achievements" ON achievements FOR ALL
  USING (current_user_role() IN ('developer', 'admin'))
  WITH CHECK (current_user_role() IN ('developer', 'admin'));

CREATE POLICY "Staff manage contact_messages" ON contact_messages FOR ALL
  USING (current_user_role() IN ('developer', 'admin'))
  WITH CHECK (current_user_role() IN ('developer', 'admin'));

CREATE POLICY "Staff manage spmb_registrations" ON spmb_registrations FOR ALL
  USING (current_user_role() IN ('developer', 'admin'))
  WITH CHECK (current_user_role() IN ('developer', 'admin'));

-- Public insert (dikunci: gak bisa set status/is_read sendiri)
CREATE POLICY "Public insert spmb_registrations" ON spmb_registrations
  FOR INSERT WITH CHECK (status = 'pending');

CREATE POLICY "Public insert contact_messages" ON contact_messages
  FOR INSERT WITH CHECK (is_read = false);

-- ============================================================
-- PHASE 9: INDEXES
-- ============================================================
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_news_published ON news(is_published, published_at DESC);
CREATE INDEX idx_gallery_category ON gallery(category);
CREATE INDEX idx_gallery_media_type ON gallery(media_type);
CREATE INDEX idx_spmb_status ON spmb_registrations(status);
CREATE INDEX idx_spmb_created ON spmb_registrations(created_at DESC);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX idx_activities_slug ON activities(slug);
CREATE INDEX idx_activities_published ON activities(is_published, activity_date DESC);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_teachers_active ON teachers(is_active);
CREATE INDEX idx_facilities_active ON facilities(is_active);
CREATE INDEX idx_contact_unread ON contact_messages(is_read, created_at DESC);
CREATE INDEX idx_achievements_category ON achievements(category, year DESC);
CREATE INDEX idx_user_profiles_role ON user_profiles(role, is_active);

-- ============================================================
-- PHASE 10: STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('spmb-documents', 'spmb-documents', true, 2097152, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('images', 'images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('videos', 'videos', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- spmb-documents: publik bisa upload (buat form pendaftaran), staff kelola
CREATE POLICY "Public read spmb documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'spmb-documents');
CREATE POLICY "Public upload spmb documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'spmb-documents');
CREATE POLICY "Staff manage spmb documents" ON storage.objects
  FOR ALL USING (bucket_id = 'spmb-documents' AND current_user_role() IN ('developer', 'admin'));

-- images: publik cuma baca, upload cuma staff (dipakai admin panel konten)
CREATE POLICY "Public read images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Staff manage images" ON storage.objects
  FOR ALL USING (bucket_id = 'images' AND current_user_role() IN ('developer', 'admin', 'publisher'));

-- videos: sama seperti images
CREATE POLICY "Public read videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Staff manage videos" ON storage.objects
  FOR ALL USING (bucket_id = 'videos' AND current_user_role() IN ('developer', 'admin', 'publisher'));

-- ============================================================
-- PHASE 11: GRANT PRIVILEGES — expose tabel ke PostgREST
-- Supabase project settings: "Automatically expose new tables" = OFF,
-- jadi script ini HARUS grant manual supaya tabel bisa diakses
-- dari client (anon/authenticated roles).
-- ============================================================

-- Public read tables (anon bisa SELECT)
GRANT SELECT ON school_profile TO anon;
GRANT SELECT ON news TO anon;
GRANT SELECT ON gallery TO anon;
GRANT SELECT ON teachers TO anon;
GRANT SELECT ON facilities TO anon;
GRANT SELECT ON articles TO anon;
GRANT SELECT ON achievements TO anon;
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON user_audit_log TO anon;
GRANT SELECT ON spmb_registrations TO anon;
GRANT SELECT ON contact_messages TO anon;

-- Full CRUD for authenticated users (RLS handles row-level restrictions)
GRANT SELECT, INSERT, UPDATE, DELETE ON school_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON news TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gallery TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON teachers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON facilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON articles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON spmb_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_messages TO authenticated;

-- Sequences for INSERT (gen_random_uuid doesn't use sequences, but safe to grant)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Storage access
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- ============================================================
-- PHASE 12: DEVELOPER USER — auto-bootstrap
-- Kalau user dev@mbs.id udah ada di auth.users tapi belum punya
-- user_profiles, script ini auto-insert. Kalau udah ada, skip.
-- Kalau dev@mbs.id belum ada di auth.users, user harus manual
-- buat dulu di Dashboard → Authentication → Users → Add user.
-- ============================================================

-- Auto-create developer profile (upsert: INSERT kalau belum ada, UPDATE kalau ada)
INSERT INTO user_profiles (id, full_name, role, is_active)
SELECT id, 'Developer', 'developer', true
FROM auth.users
WHERE email = 'dev@mbs.id'
ON CONFLICT (id) DO UPDATE
SET role = 'developer', full_name = 'Developer', is_active = true;

-- Verify
SELECT id, full_name, role, is_active FROM user_profiles;

-- ============================================================
-- MIGRATION: Add new columns to news (run once on existing DB)
-- ============================================================
ALTER TABLE news ADD COLUMN IF NOT EXISTS cover_image_position text DEFAULT 'center';
ALTER TABLE news ADD COLUMN IF NOT EXISTS writer_name text DEFAULT '';
ALTER TABLE news ADD COLUMN IF NOT EXISTS editor_name text DEFAULT '';

-- ============================================================
-- MIGRATION: Announcements table (running text / marquee)
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read announcements" ON announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Staff manage announcements" ON announcements FOR ALL
  USING (current_user_role() IN ('developer', 'admin'))
  WITH CHECK (current_user_role() IN ('developer', 'admin'));

GRANT SELECT ON announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON announcements TO authenticated;

-- Default announcements
INSERT INTO announcements (text, sort_order) VALUES
  ('PPDB 2026/2027 Sudah Dibuka! Segera Daftar di Halaman PPDB', 1),
  ('Pengambilan Raport: 20 Juni 2026', 2),
  ('Libur Hari Raya Idul Adha: 6-7 Juni 2026', 3),
  ('Ujian Tengah Semester dilaksanakan 16-27 Juni 2026', 4);

-- ============================================================
-- MIGRATION: Agenda Events table (countdown timer homepage)
-- ============================================================
CREATE TABLE IF NOT EXISTS agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active agenda" ON agenda_events FOR SELECT USING (is_active = true);
CREATE POLICY "Staff manage agenda" ON agenda_events FOR ALL
  USING (current_user_role() IN ('developer', 'admin'))
  WITH CHECK (current_user_role() IN ('developer', 'admin'));

GRANT SELECT ON agenda_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON agenda_events TO authenticated;

-- Default agenda events
INSERT INTO agenda_events (title, event_date, sort_order) VALUES
  ('PPDB 2026/2027 Dibuka', '2026-06-15T07:00:00+07:00', 1),
  ('Ujian Tengah Semester', '2026-06-16T07:00:00+07:00', 2),
  ('Pengambilan Raport', '2026-06-20T08:00:00+07:00', 3);

-- ============================================================
-- MIGRATION: Simplify teachers table
-- ============================================================
ALTER TABLE teachers DROP COLUMN IF EXISTS categories;
ALTER TABLE teachers DROP COLUMN IF EXISTS bio;
ALTER TABLE teachers DROP COLUMN IF EXISTS subject;