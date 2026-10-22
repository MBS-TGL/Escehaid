-- ============================================================================
-- Tabel `ekskuls` — Ekstrakurikuler dinamis (beranda + profil + panel admin)
--
-- Jalankan di Supabase SQL Editor. Idempoten: aman dijalankan berulang.
-- Seed mengisi 6 ekskul yang sebelumnya hardcode di `src/app/ekskul-data.ts`
-- (tanpa deskripsi/foto — lengkapi lewat panel admin: /admin/ekskul).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ekskuls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT ''::text,
  -- Kunci ikon tampilan (soccer/pingpong/tent/target/microphone/trophy).
  -- Kosong → dicari dari pemetaan slug → fallback trophy.
  icon text DEFAULT ''::text,
  -- Jadwal terstruktur: 0=Minggu .. 6=Sabtu; NULL = jadwal belum ditetapkan.
  schedule_day smallint CHECK (schedule_day IS NULL OR (schedule_day >= 0 AND schedule_day <= 6)),
  schedule_time time without time zone,
  -- Catatan jadwal bebas (mis. "khusus santri karantina").
  schedule_note text DEFAULT ''::text,
  -- Nama pembina (tampil di kartu bila terisi).
  coach text DEFAULT ''::text,
  image_url text DEFAULT ''::text,
  image_alt text DEFAULT ''::text,
  is_active boolean DEFAULT true,
  -- Urut kecil tampil lebih dulu di beranda & profil. Baru otomatis urutan
  -- terbesar +10 via panel admin.
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ekskuls_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ekskuls_sort_idx ON public.ekskuls (sort_order);

ALTER TABLE public.ekskuls ENABLE ROW LEVEL SECURITY;

-- Publik hanya membaca ekskul aktif.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ekskuls' AND policyname = 'Public can read active ekskul') THEN
    CREATE POLICY "Public can read active ekskul"
      ON public.ekskuls FOR SELECT
      TO public
      USING (is_active = true);
  END IF;
END
$$;

-- Admin panel (role legacy: developer/admin) mengelola semua baris.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ekskuls' AND policyname = 'Admins can manage ekskul') THEN
    CREATE POLICY "Admins can manage ekskul"
      ON public.ekskuls FOR ALL
      TO public
      USING (
        (current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))
      )
      WITH CHECK (
        (current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))
      );
  END IF;
END
$$;

-- Peran halus panel (developer/admin/publisher aktif) via system_role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ekskuls' AND policyname = 'Panel roles manage ekskul') THEN
    CREATE POLICY "Panel roles manage ekskul"
      ON public.ekskuls FOR ALL
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

-- ── Seed awal data ekskul (idempoten) — 6 ekskul saat ini ─────────────────
-- schedule_day: 0=Minggu, 3=Rabu, 6=Sabtu. Urutan berurut mulai dari 1 —
-- penomoran lanjutan dipatur panel admin (baru = terbesar + 1).
INSERT INTO public.ekskuls (slug, name, schedule_day, schedule_time, icon, sort_order) VALUES
  ('hizbul-wathan', 'Hizbul Wathan', 6, '08:00', 'tent',      1),
  ('bulu-tangkis',  'Bulu Tangkis',  6, '09:30', 'pingpong',  2),
  ('sepak-bola',    'Sepak Bola',    6, '09:30', 'soccer',    3),
  ('panahan',       'Panahan',       6, '12:30', 'target',    4),
  ('futsal',        'Futsal',        0, '09:00', 'soccer',    5),
  ('qiroah',        'Qiroah',        3, '20:00', 'microphone', 6)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed izin modul untuk peran bawaan (idempoten) ─────────────────────────
-- `can()` memperlakukan SUPER_ADMIN sebagai wildcard, tetapi baris eksplisit
-- ditambah agar seed DB & UI matriks izin menampilkan daftar lengkap.
-- ADMIN_SEKOLAH = semua konten + SPMB; OPERATOR_KONTEN = modul konten.
INSERT INTO public.role_permissions (role_key, permission) VALUES
  ('SUPER_ADMIN',    'ekskul:read'),
  ('SUPER_ADMIN',    'ekskul:create'),
  ('SUPER_ADMIN',    'ekskul:update'),
  ('SUPER_ADMIN',    'ekskul:delete'),
  ('ADMIN_SEKOLAH',  'ekskul:read'),
  ('ADMIN_SEKOLAH',  'ekskul:create'),
  ('ADMIN_SEKOLAH',  'ekskul:update'),
  ('ADMIN_SEKOLAH',  'ekskul:delete'),
  ('OPERATOR_KONTEN','ekskul:read'),
  ('OPERATOR_KONTEN','ekskul:create'),
  ('OPERATOR_KONTEN','ekskul:update'),
  ('OPERATOR_KONTEN','ekskul:delete')
ON CONFLICT (role_key, permission) DO NOTHING;

