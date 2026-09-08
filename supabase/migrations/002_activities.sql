-- ============================================================
-- ACTIVITIES TABLE
-- Semua helper functions sudah ada, tinggal jalankan SQL ini.
-- ============================================================

-- 1. Table

CREATE TABLE IF NOT EXISTS activities (
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

-- 2. Triggers

DROP TRIGGER IF EXISTS trg_slug_activities ON activities;
CREATE TRIGGER trg_slug_activities
  BEFORE INSERT ON activities
  FOR EACH ROW EXECUTE FUNCTION generate_unique_slug();

DROP TRIGGER IF EXISTS trg_set_updated_at_activities ON activities;
CREATE TRIGGER trg_set_updated_at_activities
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_slug_activities_update ON activities;
CREATE TRIGGER trg_slug_activities_update
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION regenerate_slug_on_title_change();

-- 3. RLS

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read activities" ON activities;
CREATE POLICY "Public read activities" ON activities FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Staff manage activities" ON activities;
CREATE POLICY "Staff manage activities" ON activities FOR ALL
  USING (current_user_role() IN ('developer', 'admin', 'publisher'))
  WITH CHECK (current_user_role() IN ('developer', 'admin', 'publisher'));

-- 4. Indexes

CREATE INDEX IF NOT EXISTS idx_activities_slug ON activities(slug);
CREATE INDEX IF NOT EXISTS idx_activities_published ON activities(is_published, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
