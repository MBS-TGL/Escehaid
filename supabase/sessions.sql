-- ============================================================================
-- Tabel `sessions` — daftar perangkat/sesi aktif admin (fitur "Keamanan").
-- Di-upsert oleh GET /api/auth/session setiap halaman admin dibuka; ditampilkan
-- di /admin/security; "keluarkan semua sesi lain" memakai signOut({scope:
-- "others"}) native Supabase + menandai baris lain revoked.
--
-- Jalankan di Supabase SQL Editor SEBELUM deploy kode terkait. Idempoten.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- session_id dari claim JWT Supabase — identitas sesi yang stabil.
  session_id text NOT NULL UNIQUE,
  user_agent text DEFAULT ''::text,
  ip text DEFAULT ''::text,
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  -- Terisi = sesi sudah dikeluarkan (tidak aktif lagi).
  revoked_at timestamp with time zone,
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS sessions_user_last_seen_idx
  ON public.sessions (user_id, last_seen_at);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Pengguna hanya melihat/mengelola sesi miliknya sendiri.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Users manage own sessions') THEN
    CREATE POLICY "Users manage own sessions"
      ON public.sessions FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;
