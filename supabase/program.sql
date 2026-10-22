-- ============================================================================
-- Konten halaman /program — 3 tabel:
--   `quran_pillars`  : 5 pilar Pembelajaran Al-Qur'an (Metode Wafa)
--   `agenda_blocks`  : 4 blok ringkasan hari santri (kartu beranda + /program)
--   `agenda_slots`   : 14 slot jam kegiatan harian (items jsonb per slot)
--
-- Sumber seed: data statis `src/lib/data/mbs-quran.ts` + `mbs-schedule.ts`
-- (transkripsi dokumen "AGENDA KEGIATAN HARIAN MBS"). Draft ber-flag
-- needsReview: ejaan/jam/perinci wajib ditinjau admin sekolah — sekali
-- disunting lewat /admin/program, seed tidak menimpanya lagi (ON CONFLICT
-- DO NOTHING / kondisi WHERE PENDEKAT idempoten).
--
-- Jalankan di Supabase SQL Editor. Idempoten: aman dijalankan berulang.
-- Panel: /admin/program (izin `program:read` / `program:update`).
-- ============================================================================

-- ── 1. quran_pillars ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quran_pillars (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  -- Label urut dua digit ("01", dst.) — teks bebas, admin bisa mengubah.
  number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text DEFAULT ''::text,
  -- Label waktu (menggantikan "TARGET" di dokumen sumber).
  time_label text DEFAULT ''::text,
  -- Baris target tambahan; kosong → tidak dirender.
  target text DEFAULT ''::text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quran_pillars_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS quran_pillars_sort_idx ON public.quran_pillars (sort_order);

-- ── 2. agenda_blocks (4 kartu ringkasan) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agenda_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  -- Kunci stabil untuk asosiasi & animasi; dipetakan BlockKey di kode.
  key text NOT NULL UNIQUE,
  button_text text DEFAULT ''::text,
  title text NOT NULL,
  summary text DEFAULT ''::text,
  -- Rentang jam mentah ("03:00" dsb) di samping label tampilan.
  start_time text DEFAULT ''::text,
  end_time text DEFAULT ''::text,
  time_label text DEFAULT ''::text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agenda_blocks_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS agenda_blocks_sort_idx ON public.agenda_blocks (sort_order);

-- ── 3. agenda_slots (14 slot jam; items jsonb) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.agenda_slots (
  -- Id stabil dari transkripsi ("dini-1", "psm-3", dst.) — dipakai kode
  -- (badge "Sedang berlangsung" dsb.).
  id text NOT NULL,
  -- Kunci blok pemilik slot ("dini-hari" | "pagi-siang" | "sore-maghrib" | "malam").
  block_key text NOT NULL,
  -- "HH:MM" WIB; end < start = slot melintasi tengah malam.
  start_time text NOT NULL,
  end_time text NOT NULL,
  -- Daftar item kegiatan slot: [{ "label": "…", "days": ["Senin", …] | null }]
  -- days null/tidak ada = setiap hari.
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agenda_slots_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS agenda_slots_sort_idx ON public.agenda_slots (sort_order);
CREATE INDEX IF NOT EXISTS agenda_slots_block_idx ON public.agenda_slots (block_key);

-- ── RLS (tabel publik: hanya baris aktif yang dibaca publik) ─────────────────
ALTER TABLE public.quran_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_slots ENABLE ROW LEVEL SECURITY;

-- Publik hanya membaca baris aktif dari tiap tabel program.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quran_pillars' AND policyname = 'Public can read active program') THEN
    CREATE POLICY "Public can read active program"
      ON public.quran_pillars FOR SELECT
      TO public
      USING (is_active = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agenda_blocks' AND policyname = 'Public can read active program') THEN
    CREATE POLICY "Public can read active program"
      ON public.agenda_blocks FOR SELECT
      TO public
      USING (is_active = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agenda_slots' AND policyname = 'Public can read active program') THEN
    CREATE POLICY "Public can read active program"
      ON public.agenda_slots FOR SELECT
      TO public
      USING (is_active = true);
  END IF;
END
$$;

-- Admin panel (role legacy: developer/admin) mengelola semua baris — pola ekskul.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quran_pillars' AND policyname = 'Admins can manage program') THEN
    CREATE POLICY "Admins can manage program"
      ON public.quran_pillars FOR ALL
      TO public
      USING ((current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role])))
      WITH CHECK ((current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role])));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agenda_blocks' AND policyname = 'Admins can manage program') THEN
    CREATE POLICY "Admins can manage program"
      ON public.agenda_blocks FOR ALL
      TO public
      USING ((current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role])))
      WITH CHECK ((current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role])));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agenda_slots' AND policyname = 'Admins can manage program') THEN
    CREATE POLICY "Admins can manage program"
      ON public.agenda_slots FOR ALL
      TO public
      USING ((current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role])))
      WITH CHECK ((current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role])));
  END IF;
END
$$;

-- Peran halus panel (developer/admin/publisher aktif) via system_role — pola ekskul.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quran_pillars' AND policyname = 'Panel roles manage program') THEN
    CREATE POLICY "Panel roles manage program"
      ON public.quran_pillars FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
            AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])
            AND up.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
            AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])
            AND up.is_active = true
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agenda_blocks' AND policyname = 'Panel roles manage program') THEN
    CREATE POLICY "Panel roles manage program"
      ON public.agenda_blocks FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
            AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])
            AND up.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
            AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])
            AND up.is_active = true
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agenda_slots' AND policyname = 'Panel roles manage program') THEN
    CREATE POLICY "Panel roles manage program"
      ON public.agenda_slots FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
            AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])
            AND up.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
            AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])
            AND up.is_active = true
        )
      );
  END IF;
END
$$;

-- ── Seed pilar Al-Qur'an (idempoten: number UNIQUE) — konten draft saat ini ──
-- needsReview: jam & perinci pilar ditinjau admin (khususnya 07.30–08.10 dsb.).
INSERT INTO public.quran_pillars (number, title, description, time_label, target, sort_order) VALUES
  ('01', 'Wafa – BTA',
    'Belajar baca tulis Al-Qur''an (BTA) dengan Metode Wafa, metode belajar Al-Qur''an otak kanan, setiap hari sekolah sebelum KBM.',
    'Senin–Jumat · 07.30–08.10 WIB', '', 1),
  ('02', 'Ngaji Harian',
    'Mengaji bersama setelah shalat Subuh, Dzuhur, dan Ashar.',
    'Setiap hari', '', 2),
  ('03', 'Tahfidz Siang',
    'Menghafal dan menguatkan hafalan Al-Qur''an di sela jam sekolah, sebelum shalat Ashar.',
    'Senin–Jumat · 14.05–14.45 WIB', '', 3),
  ('04', 'Tahfidz & Mufrodat Malam',
    'Menjaga hafalan dan menambah kosakata bahasa Arab (mufrodat) setelah shalat Isya''.',
    '19.00–21.00 WIB', '', 4),
  ('05', 'Kajian & Pendalaman',
    'Kajian sore menjelang Maghrib: Hadis Arba''in, Al-Kahfi pada hari Jumat, dan Ngaji Juz 30 pada hari Ahad.',
    '16.45–19.00 WIB', '', 5)
ON CONFLICT (number) DO NOTHING;

-- ── Seed blok agenda (idempoten: key UNIQUE) ─────────────────────────────────
INSERT INTO public.agenda_blocks (key, button_text, title, summary, start_time, end_time, time_label, sort_order) VALUES
  ('dini-hari', 'Dini Hari & Subuh', 'Dini Hari & Subuh',
    'Qiyamul lail, shalat Subuh, ngaji, dan kultum; dilanjutkan olahraga dan piket pagi. Senin dan Kamis diawali sahur.',
    '03:00', '06:30', '03.00-06.30 WIB', 1),
  ('pagi-siang', 'Pagi & Siang', 'Pagi & Siang',
    'Giat mandiri, shalat Dhuha, Wafa – BTA, KBM, shalat Dzuhur dan ngaji, lalu tahfidz. Sabtu dan Ahad diisi kegiatan ekstra.',
    '06:30', '14:45', '06.30-14.45 WIB', 2),
  ('sore-maghrib', 'Sore & Maghrib', 'Sore & Maghrib',
    'Shalat Ashar dan ngaji, giat mandiri, kajian sore, shalat Maghrib, dan makan malam.',
    '14:45', '19:00', '14.45-19.00 WIB', 3),
  ('malam', 'Malam & Istirahat', 'Malam & Istirahat',
    'Shalat Isya'', tahfidz, mufrodat, belajar malam, lalu tahajjud dan istirahat.',
    '19:00', '03:00', '19.00-03.00 WIB', 4)
ON CONFLICT (key) DO NOTHING;

-- ── Seed slot jam (idempoten: PK id stabil) — 14 slot, urut dokumen sumber ───
-- items jsonb: label + days (null/atritable → setiap hari). Di dalam string SQL,
-- kutip satu ditulis ganda ('' ) — baca "Shalat Isya'", "Arba'in", "Qori'".
-- needsReview: lihat REVIEW_NOTES di mbs-schedule.ts (Shalat Jumat, urutan
-- 03:00, "Ngaji", puasa sunnah, ejaan Ifthor/Muhadharah/Muhadatsah/Qori'). 
INSERT INTO public.agenda_slots (id, block_key, start_time, end_time, items, sort_order) VALUES
  ('dini-1', 'dini-hari', '03:00', '05:30', '[
    {"label": "Sahur", "days": ["Senin", "Kamis"]},
    {"label": "Qiyamul Lail"},
    {"label": "Shalat Subuh"},
    {"label": "Ngaji"},
    {"label": "Kultum"}
  ]'::jsonb, 1),
  ('dini-2', 'dini-hari', '05:30', '06:30', '[
    {"label": "Olahraga"},
    {"label": "Piket Pagi"}
  ]'::jsonb, 2),
  ('psm-1', 'pagi-siang', '06:30', '07:00', '[{"label": "Giat Mandiri"}]'::jsonb, 3),
  ('psm-2', 'pagi-siang', '07:00', '07:30', '[{"label": "Shalat Dhuha"}]'::jsonb, 4),
  ('psm-3', 'pagi-siang', '07:30', '08:10', '[
    {"label": "Wafa – BTA", "days": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]},
    {"label": "Ekstra", "days": ["Sabtu", "Ahad"]}
  ]'::jsonb, 5),
  ('psm-4', 'pagi-siang', '08:10', '11:45', '[
    {"label": "KBM", "days": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]},
    {"label": "Ekstra", "days": ["Sabtu", "Ahad"]}
  ]'::jsonb, 6),
  ('psm-5', 'pagi-siang', '11:45', '12:45', '[
    {"label": "Shalat Dzuhur"},
    {"label": "Ngaji"}
  ]'::jsonb, 7),
  ('psm-6', 'pagi-siang', '12:45', '14:05', '[
    {"label": "KBM", "days": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]},
    {"label": "Ekstra", "days": ["Sabtu", "Ahad"]}
  ]'::jsonb, 8),
  ('psm-7', 'pagi-siang', '14:05', '14:45', '[
    {"label": "Tahfidz", "days": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]},
    {"label": "Ekstra", "days": ["Sabtu", "Ahad"]}
  ]'::jsonb, 9),
  ('sm-1', 'sore-maghrib', '14:45', '15:30', '[
    {"label": "Shalat Ashar"},
    {"label": "Ngaji"}
  ]'::jsonb, 10),
  ('sm-2', 'sore-maghrib', '15:30', '16:45', '[{"label": "Giat Mandiri"}]'::jsonb, 11),
  ('sm-3', 'sore-maghrib', '16:45', '19:00', '[
    {"label": "Kajian Ifthor", "days": ["Senin", "Kamis"]},
    {"label": "Hadis Arba''in", "days": ["Selasa", "Rabu", "Sabtu"]},
    {"label": "Al-Kahfi", "days": ["Jumat"]},
    {"label": "Ngaji Juz 30", "days": ["Ahad"]},
    {"label": "Shalat Maghrib"},
    {"label": "Makan Malam"}
  ]'::jsonb, 12),
  ('mlm-1', 'malam', '19:00', '21:00', '[
    {"label": "Shalat Isya''"},
    {"label": "Tahfidz", "days": ["Senin", "Selasa", "Rabu", "Kamis", "Ahad"]},
    {"label": "Muhadharah", "days": ["Jumat"]},
    {"label": "Muhadatsah", "days": ["Sabtu"]},
    {"label": "Mufrodat", "days": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Ahad"]},
    {"label": "Belajar Malam", "days": ["Senin", "Rabu", "Kamis", "Ahad"]},
    {"label": "Qori''", "days": ["Selasa"]}
  ]'::jsonb, 13),
  ('mlm-2', 'malam', '21:00', '03:00', '[
    {"label": "Tahajjud"},
    {"label": "Istirahat"}
  ]'::jsonb, 14)
ON CONFLICT (id) DO NOTHING;

-- ── Seed izin modul untuk peran bawaan (idempoten) ───────────────────────────
-- Konten program edit-only: `program:read` (lihat panel) + `program:update`
-- (ubah nilai pilar/blok/slot, toggle aktif, ganti urutan). Tidak ada
-- create/delete karena set baris terbatas & bipin dari seed.
INSERT INTO public.role_permissions (role_key, permission) VALUES
  ('SUPER_ADMIN',    'program:read'),
  ('SUPER_ADMIN',    'program:update'),
  ('ADMIN_SEKOLAH',  'program:read'),
  ('ADMIN_SEKOLAH',  'program:update'),
  ('OPERATOR_KONTEN','program:read'),
  ('OPERATOR_KONTEN','program:update')
ON CONFLICT (role_key, permission) DO NOTHING;
