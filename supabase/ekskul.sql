-- ============================================================================
-- Tabel `ekskuls` — Ekstrakurikuler dinamis (beranda + profil + panel admin)
-- + halaman detail publik /ekskul/[slug] + tautan prestasi (achievements).
--
-- Jalankan di Supabase SQL Editor. Idempoten: aman dijalankan berulang.
-- Seed mengisi 6 ekskul yang sebelumnya hardcode di `src/app/ekskul-data.ts`
-- (tanpa foto — lengkapi lewat panel admin: /admin/ekskul).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ekskuls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT ''::text,
  -- Sejarah ekskul (halaman detail /ekskul/[slug]; dipisah paragraf dengan
  -- baris kosong). Kosong → bagian sejarah tidak dirender.
  history text DEFAULT ''::text,
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

-- Kolom sejarah untuk instalasi lama (fresh install sudah dapat dari CREATE TABLE).
ALTER TABLE public.ekskuls ADD COLUMN IF NOT EXISTS history text DEFAULT ''::text;

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

-- ── Seed draft sejarah (needsReview — WAJIB ditinjau admin sekolah) ────────
-- Draft ini otomatis mengisi kolom history bila masih kosong, sehingga
-- sekali admin menyunting lewat /admin/ekskul nilainya TIDAK tertimpa lagi.
UPDATE public.ekskuls SET history = $where$Hizbul Wathan (HW) adalah gerakan kepramukaan di dalam Persyarikatan Muhammadiyah yang dideklarasikan pada 31 Oktober 1918 di Yogyakarta oleh para tokoh Muhammadiyah. Sebagai gerakan wajib Muhammadiyah, HW membina anggotanya dengan sifat serta semangat agama, Indonesia, dan kekeluargaan.

Di SMP Muhammadiyah 4 Tanggul, ekskul Hizbul Wathan menjadi wadah pembinaan karakter dan kepemimpinan santri melalui kegiatan kepramukaan: baris berbaris, perkemahan, serta kegiatan keterampilan lainnya yang menanamkan kemandirian, kedisiplinan, dan sikap Islami sejak usia muda.$where$ WHERE slug = 'hizbul-wathan' AND (history = '' OR history IS NULL);
UPDATE public.ekskuls SET history = $where$Ekskul Bulu Tangkis membina minat dan bakat siswa dalam olahraga raket yang menuntut ketangkasan, refleks, dan ketelitian. Latihan mencakup teknik dasar forehand dan backhand, footwork, hingga pola permainan tunggal maupun ganda.

Pembinaan bersifat berjenjang — dari pemula hingga siap turnamen — dan para anggota antusias mengikuti kejuaraan pelajar tingkat kabupaten maupun liga pelajar nasional.$where$ WHERE slug = 'bulu-tangkis' AND (history = '' OR history IS NULL);
UPDATE public.ekskuls SET history = $where$Sepak bola merupakan ekskul unggulan yang membina siswa melalui olahraga paling populer di dunia. Program latihan mencakup kebugaran fisik, teknik dasar passing dan dribbling, serta penguasaan strategi permainan.

Melalui latihan rutin dan partisipasi turnamen antar sekolah maupun tingkat kecamatan, ekskul ini menumbuhkan sportivitas, kerja sama tim, dan mental juara.$where$ WHERE slug = 'sepak-bola' AND (history = '' OR history IS NULL);
UPDATE public.ekskuls SET history = $where$Ekskul Panahan memperkenalkan siswa pada olahraga ketepatan yang melatih konsentrasi, fokus, dan pengendalian diri. Latihan diawali dengan penekanan keselamatan (safety) sebelum melangkah ke teknik dasar menembak dengan busur recurve.

Anggota dibimbing berjenjang sesuai standar perlombaan — mulai jarak pendek hingga jarak perlombaan, dipersiapkan untuk kejuaraan tingkat kabupaten/provinsi.$where$ WHERE slug = 'panahan' AND (history = '' OR history IS NULL);
UPDATE public.ekskuls SET history = $where$Futsal mengasah kemampuan teknik bermain dalam ruang kecil: dribbling cepat, wall pass, dan formasi permainan 5 orang. Ekskul ini menjadi favorit siswa lantaran ritme permainannya yang cepat dan menyenangkan.

Latihan rutin serta kejuaraan futsal antar sekolah menjadi sarana menyalurkan bakat sekaligus menumbuhkan semangat tim dan kebersamaan.$where$ WHERE slug = 'futsal' AND (history = '' OR history IS NULL);
UPDATE public.ekskuls SET history = $where$Qiroah adalah ekskul seni baca dan musikalisasi Al-Qur'an yang memperindah tilawah dengan ilmu tajwid serta nuansa qasidah yang syahdu. Anggota belajar langgam tadarus, murattal, hingga musikalisasi khas ekskul ini.

Para anggota rutin murojaah dan tuntunan bacaan, lalu tampil memeriahkan acara-acara sekolah serta berlaga dalam lomba MTQ tingkat kabupaten maupun kejuaraan musikalisasi.$where$ WHERE slug = 'qiroah' AND (history = '' OR history IS NULL);

-- ── Tautan prestasi ↔ ekskul (tabel achievements) ─────────────────────────
-- Prestasi dapat terhubung ke ekskul tertentu (halaman detail /ekskul/[slug]
-- menampilkan prestasi tersebut). Kolom nullable; FK SET NULL supaya menghapus
-- ekskul tidak ikut menghapus dat prestasi (riwayat tetap utuh).
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS ekskul_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'achievements_ekskul_id_fkey') THEN
    ALTER TABLE public.achievements ADD CONSTRAINT achievements_ekskul_id_fkey
      FOREIGN KEY (ekskul_id) REFERENCES public.ekskuls (id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Pencarian prestasi per ekskul di halaman detail.
CREATE INDEX IF NOT EXISTS achievements_ekskul_idx ON public.achievements (ekskul_id);

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

