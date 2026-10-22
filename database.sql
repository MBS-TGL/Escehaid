-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  full_name text NOT NULL DEFAULT ''::text,
  role USER-DEFINED NOT NULL DEFAULT 'student'::user_role,
  avatar_url text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  system_role text,
  email text,
  must_change_password boolean NOT NULL DEFAULT false,
  last_login_at timestamp with time zone,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT user_profiles_system_role_fkey FOREIGN KEY (system_role) REFERENCES public.roles(key)
);
CREATE TABLE public.user_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT user_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.school_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_name text NOT NULL DEFAULT 'SMP Muhammadiyah 4 Tanggul'::text,
  address text NOT NULL DEFAULT 'Jl. Pemandian No. 88, Patemon, Tanggul, Jember 68154'::text,
  phone text NOT NULL DEFAULT '0858-5200-4008'::text,
  email text NOT NULL DEFAULT 'smpm4tangguljember@gmail.com'::text,
  website text DEFAULT 'https://esceha.id'::text,
  vision text NOT NULL DEFAULT ''::text,
  mission text NOT NULL DEFAULT ''::text,
  history text DEFAULT ''::text,
  logo_url text DEFAULT '/images/Logo-Sekolah.png'::text,
  banner_url text DEFAULT ''::text,
  principal_name text DEFAULT ''::text,
  principal_photo_url text DEFAULT ''::text,
  principal_quote text DEFAULT ''::text,
  total_teachers integer DEFAULT 0,
  total_students integer DEFAULT 0,
  total_classes integer DEFAULT 0,
  accreditation text DEFAULT 'A'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  registration_mode text NOT NULL DEFAULT 'google_form'::text,
  google_form_url text,
  spmb_brochure_url text CHECK (spmb_brochure_url IS NULL OR spmb_brochure_url ~ '^https://'::text),
  spmb_offline_form_url text CHECK (spmb_offline_form_url IS NULL OR spmb_offline_form_url ~ '^https://'::text),
  spmb_contact_phone text,
  spmb_highlight_text text,
  npsn text,
  spmb_form_schema jsonb,
  CONSTRAINT school_profile_pkey PRIMARY KEY (id)
);
CREATE TABLE public.news (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text NOT NULL DEFAULT ''::text,
  content text NOT NULL DEFAULT ''::text,
  category text NOT NULL DEFAULT 'berita'::text CHECK (category = ANY (ARRAY['berita'::text, 'pengumuman'::text, 'agenda'::text])),
  image_url text DEFAULT ''::text,
  author_id uuid,
  is_published boolean DEFAULT false,
  published_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  writer_name text DEFAULT ''::text,
  editor_name text DEFAULT ''::text,
  cover_image_position text DEFAULT 'center'::text,
  attachment_url text DEFAULT ''::text,
  attachment_name text DEFAULT ''::text,
  image_alt text,
  is_pinned boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone,
  CONSTRAINT news_pkey PRIMARY KEY (id),
  CONSTRAINT news_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT ''::text,
  media_type text NOT NULL DEFAULT 'foto'::text CHECK (media_type = ANY (ARRAY['foto'::text, 'video'::text])),
  url text NOT NULL,
  thumbnail_url text DEFAULT ''::text,
  category text NOT NULL DEFAULT 'umum'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gallery_pkey PRIMARY KEY (id)
);
CREATE TABLE public.spmb_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  birth_place text DEFAULT ''::text,
  birth_date date,
  gender text NOT NULL CHECK (gender = ANY (ARRAY['L'::text, 'P'::text])),
  address text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  email text DEFAULT ''::text,
  parent_name text DEFAULT ''::text,
  parent_occupation text DEFAULT ''::text,
  previous_school text DEFAULT ''::text,
  registration_path text NOT NULL DEFAULT 'reguler'::text CHECK (registration_path = ANY (ARRAY['reguler'::text, 'prestasi'::text, 'beasiswa'::text])),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])),
  documents jsonb DEFAULT '{}'::jsonb,
  admin_notes text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  wave_id uuid,
  CONSTRAINT spmb_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT spmb_registrations_wave_id_fkey FOREIGN KEY (wave_id) REFERENCES public.spmb_waves(id)
);
CREATE TABLE public.teachers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text DEFAULT ''::text,
  photo_url text DEFAULT ''::text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teachers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.facilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT ''::text,
  image_url text DEFAULT ''::text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT facilities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text DEFAULT ''::text,
  content text NOT NULL DEFAULT ''::text,
  author_id uuid,
  category text DEFAULT 'umum'::text,
  image_url text DEFAULT ''::text,
  is_published boolean DEFAULT false,
  published_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  author_name text,
  editor_name text,
  attachment_url text,
  attachment_name text,
  image_alt text,
  is_pinned boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone,
  CONSTRAINT articles_pkey PRIMARY KEY (id),
  CONSTRAINT articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT ''::text,
  category text DEFAULT 'akademik'::text,
  year integer DEFAULT (EXTRACT(year FROM now()))::integer,
  image_url text DEFAULT ''::text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  rank_label text,
  level text,
  participants text,
  organizer text,
  is_featured boolean NOT NULL DEFAULT false,
  image_alt text,
  results jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(results) = 'array'::text),
  event_name text,
  location text,
  event_start date,
  event_end date,
  team_name text,
  -- Tautan opsional ke tabel ekskuls (halaman detail /ekskul/[slug]);
  -- FK SET NULL agar menghapus ekskul tidak turut menghapus prestasi.
  ekskul_id uuid,
  CONSTRAINT achievements_ekskul_id_fkey FOREIGN KEY (ekskul_id) REFERENCES public.ekskuls (id) ON DELETE SET NULL,
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT ''::text,
  subject text DEFAULT ''::text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  text text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agenda_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agenda_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT ''::text,
  content text DEFAULT ''::text,
  activity_date timestamp with time zone DEFAULT now(),
  activity_type text DEFAULT 'umum'::text CHECK (activity_type = ANY (ARRAY['kajian'::text, 'peringatan'::text, 'lomba'::text, 'upacara'::text, 'ekskul'::text, 'umum'::text, 'penampilan'::text])),
  location text DEFAULT ''::text,
  image_url text DEFAULT ''::text,
  is_published boolean DEFAULT false,
  author_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  activity_time text,
  live_url text,
  end_date timestamp with time zone,
  registration_url text,
  contact_person text,
  is_featured boolean NOT NULL DEFAULT false,
  video_url text,
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.spmb_waves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  note text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT spmb_waves_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text])),
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.portal_apps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  href text NOT NULL,
  icon text NOT NULL DEFAULT 'SquaresFour'::text,
  color text NOT NULL DEFAULT 'navy'::text,
  is_external boolean NOT NULL DEFAULT true,
  is_coming_soon boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT portal_apps_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  type text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text NOT NULL CHECK (action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text])),
  entity_type text NOT NULL,
  entity_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.roles (
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (key)
);
CREATE TABLE public.role_permissions (
  role_key text NOT NULL,
  permission text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_key, permission),
  CONSTRAINT role_permissions_role_key_fkey FOREIGN KEY (role_key) REFERENCES public.roles(key)
);
-- Ekstrakurikuler dinamis (beranda + profil + panel admin) — migrasi lengkap:
-- supabase/ekskul.sql (tabel + RLS + seed 6 ekskul + izin peran bawaan).
CREATE TABLE public.ekskuls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT ''::text,
  -- Sejarah (halaman detail /ekskul/[slug]; paragraf dipisah baris kosong).
  history text DEFAULT ''::text,
  icon text DEFAULT ''::text,
  schedule_day smallint,
  schedule_time time without time zone,
  schedule_note text DEFAULT ''::text,
  coach text DEFAULT ''::text,
  image_url text DEFAULT ''::text,
  image_alt text DEFAULT ''::text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ekskuls_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS ekskuls_sort_idx ON public.ekskuls (sort_order);