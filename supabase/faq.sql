-- ============================================================================
-- Tabel `faqs` — FAQ dinamis (beranda + halaman SPMB + panel admin /admin/faq)
--
-- Jalankan di Supabase SQL Editor. Idempoten: aman dijalankan berulang.
-- Seed mengisi 13 FAQ yang sebelumnya hardcode di `src/app/faq-data.ts`
-- (6 scope 'home' untuk beranda, 7 scope 'spmb' untuk /admission).
-- Selama tabel kosong/belum dibuat, halaman publik memakai fallback statis
-- `faq-data.ts` — aman di-deploy sebelum SQL ini dijalankan.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  -- Cakupan tampilan: 'home' = beranda, 'spmb' = halaman /admission.
  scope text NOT NULL DEFAULT 'home' CONSTRAINT faqs_scope_check CHECK (scope IN ('home', 'spmb')),
  question text NOT NULL,
  answer text NOT NULL,
  is_active boolean DEFAULT true,
  -- Urut kecil tampil lebih dulu. Baru otomatis urutan terbesar +1 via panel.
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT faqs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS faqs_scope_sort_idx ON public.faqs (scope, sort_order);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Publik hanya membaca FAQ aktif.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'faqs' AND policyname = 'Public can read active faq') THEN
    CREATE POLICY "Public can read active faq"
      ON public.faqs FOR SELECT
      TO public
      USING (is_active = true);
  END IF;
END
$$;

-- Admin panel (role legacy: developer/admin) mengelola semua baris.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'faqs' AND policyname = 'Admins can manage faq') THEN
    CREATE POLICY "Admins can manage faq"
      ON public.faqs FOR ALL
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

-- Peran halus panel (developer/admin/publisher aktif) via user_profiles.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'faqs' AND policyname = 'Panel roles manage faq') THEN
    CREATE POLICY "Panel roles manage faq"
      ON public.faqs FOR ALL
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

-- ── Seed awal (idempoten) — sekali per scope, tidak menimpa suntingan admin ──
INSERT INTO public.faqs (scope, question, answer, sort_order)
SELECT 'home', q.question, q.answer, q.ord
FROM (VALUES
  ('Bagaimana cara mendaftarkan anak ke SMP Muhammadiyah 4 Tanggul?', 'Pendaftaran dapat dilakukan secara online melalui halaman SPMB kami. Isi data calon peserta didik, lengkapi dokumen yang diperlukan, dan ikuti tahapan seleksi yang akan diinformasikan oleh panitia.', 1),
  ('Apa saja program unggulan yang tersedia?', 'Kami memiliki 6 program unggulan: Program Tahfidz, Program Keberbakatan, Program Bahasa, Program Kepesantrenan, Program Akademik, dan 7 Golden Habits.', 2),
  ('Berapa biaya masuk dan SPP per bulan?', 'Rincian biaya pendidikan, boarding, dan kegiatan tersedia pada brosur resmi sekolah di halaman SPMB. Untuk rincian terbaru, silakan hubungi panitia SPMB. Kami juga menyediakan beasiswa bagi siswa berprestasi.', 3),
  ('Apakah tersedia fasilitas asrama?', 'Ya, kami menyediakan fasilitas asrama yang nyaman dan aman bagi siswa program Boarding School. Asrama dilengkapi dengan fasilitas penunjang pembelajaran dan pembiasaan ibadah.', 4),
  ('Bagaimana dengan kurikulum yang diterapkan?', 'Kami menggunakan Kurikulum Merdeka yang dipadukan dengan ISMUBA (Al-Islam, Kemuhammadiyahan, dan Bahasa Arab) sebagai kurikulum khas Muhammadiyah. Pembelajaran terintegrasi antara sains, teknologi, dan nilai-nilai keislaman.', 5),
  ('Apakah ada kegiatan ekstrakurikuler?', 'Tentu! Kami menyediakan berbagai kegiatan ekstrakurikuler seperti Sepak Bola, Futsal, Bulu Tangkis, Hizbul Wathan, Qiroah, dan masih banyak lagi untuk mengembangkan bakat siswa.', 6)
) AS q(question, answer, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE scope = 'home');

INSERT INTO public.faqs (scope, question, answer, sort_order)
SELECT 'spmb', q.question, q.answer, q.ord
FROM (VALUES
  ('Bagaimana cara mendaftar SPMB secara online?', 'Pilih gelombang yang sedang dibuka pada jadwal, lalu isi formulir pendaftaran online. Hasil penerimaan diumumkan melalui website sekolah, dan calon murid yang diterima melakukan daftar ulang sesuai jadwal pada pengumuman.', 1),
  ('Apa saja jalur pendaftaran yang tersedia?', 'Tersedia tiga jalur: Jalur Reguler yang terbuka untuk semua calon murid, Jalur Prestasi untuk calon murid berprestasi akademik maupun non-akademik, dan Jalur Beasiswa untuk calon murid dari keluarga dengan keterbatasan ekonomi.', 2),
  ('Program pendidikan apa saja yang ditawarkan?', 'SMP Boarding (asrama penuh sejak 2018/2019), SMP Reguler (pembelajaran penuh hari Senin-Sabtu pukul 07.00-15.00), dan SMA Boarding (asrama penuh jenjang SMA dengan kurikulum Tahfidz dan keunggulan akademik).', 3),
  ('Bagaimana cara mengecek status dan hasil seleksi?', 'Buka tautan "Cek status pendaftaran & hasil seleksi" pada bagian jadwal untuk memeriksa status pendaftaran dan hasil seleksi secara online.', 4),
  ('Berapa total biaya pendidikan yang harus dibayarkan?', 'Rincian biaya pendidikan, boarding, dan kegiatan tersedia pada brosur resmi sekolah (tautan pada bagian Jadwal Pendaftaran). Untuk rincian terbaru, silakan hubungi panitia SPMB.', 5),
  ('Dokumen apa saja yang perlu disiapkan?', 'Daftar berkas persyaratan akan diinformasikan oleh panitia SPMB. Silakan hubungi panitia untuk informasi lengkapnya.', 6),
  ('Bagaimana cara menghubungi panitia SPMB?', 'Hubungi panitia SPMB melalui WhatsApp atau halaman Kontak. Formulir offline dapat dikumpulkan di Kantor MBS Tanggul.', 7)
) AS q(question, answer, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE scope = 'spmb');

-- ── Seed izin modul untuk peran bawaan (idempoten) ─────────────────────────
-- `can()` memperlakukan SUPER_ADMIN sebagai wildcard, tetapi baris eksplisit
-- ditambah agar seed DB & UI matriks izin menampilkan daftar lengkap.
-- ADMIN_SEKOLAH = semua konten + SPMB; OPERATOR_KONTEN = modul konten.
INSERT INTO public.role_permissions (role_key, permission) VALUES
  ('SUPER_ADMIN',     'faq:read'),
  ('SUPER_ADMIN',     'faq:create'),
  ('SUPER_ADMIN',     'faq:update'),
  ('SUPER_ADMIN',     'faq:delete'),
  ('ADMIN_SEKOLAH',   'faq:read'),
  ('ADMIN_SEKOLAH',   'faq:create'),
  ('ADMIN_SEKOLAH',   'faq:update'),
  ('ADMIN_SEKOLAH',   'faq:delete'),
  ('OPERATOR_KONTEN', 'faq:read'),
  ('OPERATOR_KONTEN', 'faq:create'),
  ('OPERATOR_KONTEN', 'faq:update'),
  ('OPERATOR_KONTEN', 'faq:delete')
ON CONFLICT (role_key, permission) DO NOTHING;
