-- ============================================================
-- SMP Muhammadiyah 4 Tanggul - Database Schema
-- Run this in Supabase SQL Editor to create all tables
-- NOTE: RLS auto-enabled by rls_auto_enable event trigger
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. SCHOOL PROFILE
-- ============================================================
create table if not exists school_profile (
  id uuid primary key default uuid_generate_v4(),
  school_name text not null default 'SMP Muhammadiyah 4 Tanggul',
  address text not null default 'Jl. Pemandian No. 88, Patemon, Tanggul, Jember 68154',
  phone text not null default '0858-5200-4008',
  email text not null default 'smpm4tangguljember@gmail.com',
  website text default 'https://esceha.id',
  vision text not null default '',
  mission text not null default '',
  history text default '',
  logo_url text default '/images/Logo-Sekolah.png',
  banner_url text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into school_profile (school_name, address, phone, email, website, vision, mission)
values (
  'SMP Muhammadiyah 4 Tanggul',
  'Jl. Pemandian No. 88, Patemon, Kec. Tanggul, Kab. Jember, Jawa Timur 68154',
  '0858-5200-4008',
  'smpm4tangguljember@gmail.com',
  'https://esceha.id',
  'Unggul dalam Ibadah, Unggul dalam IPTEK, Unggul dalam Akhlak',
  '1. Menyiapkan kader Islam yang beriman, bertaqwa, dan berilmu.
2. Mengembangkan potensi siswa secara optimal dan seimbang.
3. Membentuk siswa yang berakhlak mulia dan mandiri.
4. Mewujudkan pembelajaran yang kreatif, inovatif, dan menyenangkan.'
)
on conflict (id) do nothing;

-- ============================================================
-- 2. NEWS / BERITA
-- ============================================================
create table if not exists news (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  summary text not null default '',
  content text not null default '',
  category text not null default 'berita' check (category in ('berita', 'pengumuman', 'agenda')),
  image_url text default '',
  author text default '',
  is_published boolean default false,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function update_news_slug()
returns trigger as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := lower(replace(replace(replace(new.title, ' ', '-'), '.', ''), ',', ''));
    new.slug := regexp_replace(new.slug, '[^a-z0-9-]', '', 'g');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_news_slug
  before insert on news
  for each row execute function update_news_slug();

-- ============================================================
-- 3. GALLERY
-- ============================================================
create table if not exists gallery (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  media_type text not null default 'foto' check (media_type in ('foto', 'video')),
  url text not null,
  thumbnail_url text default '',
  category text not null default 'umum',
  created_at timestamptz default now()
);

-- ============================================================
-- 4. PPDB REGISTRATIONS
-- ============================================================
create table if not exists ppdb_registrations (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  birth_place text default '',
  birth_date date,
  gender text not null check (gender in ('L', 'P')),
  address text default '',
  phone text default '',
  email text default '',
  parent_name text default '',
  parent_occupation text default '',
  previous_school text default '',
  registration_path text not null default 'reguler' check (registration_path in ('reguler', 'prestasi', 'beasiswa')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  documents_url text default '',
  admin_notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 5. TEACHERS / GURU
-- ============================================================
create table if not exists teachers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subject text default '',
  position text default '',
  photo_url text default '',
  bio text default '',
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into teachers (name, subject, position, sort_order) values
  ('Durrotun Nasyihin, S.Ag', 'Pendidikan Agama Islam', 'Guru PAI', 1),
  ('Ainul Farhan, S.Pd', 'Matematika', 'Guru Matematika', 2),
  ('Rudi Hartono, S.Pd', 'Bahasa Inggris', 'Guru Bahasa Inggris', 3),
  ('Jimi Priyo Assiddiq, S.Pd., M.Pd', 'TIK', 'Guru TIK', 4),
  ('Muhammad Arif, S.Pd., M.Pd', 'IPA', 'Guru IPA', 5),
  ('Khoirul Anwar, S.Pd', 'Administrasi', 'Operator Sekolah', 6),
  ('Dr. Burhanudin Harahap, S.Pd, M.Pd', 'Kepala Sekolah', 'Kepala Sekolah', 0)
on conflict do nothing;

-- ============================================================
-- 6. FACILITIES / FASILITAS
-- ============================================================
create table if not exists facilities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text default '',
  image_url text default '',
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into facilities (name, description, sort_order) values
  ('Ruang Kelas', 'Ruang nyaman dengan Projector, Whiteboard, dan IFP interaktif', 1),
  ('Lab Komputer', 'Ruang lab yang nyaman dengan komputer dan internet untuk belajar serta variasi materi', 2),
  ('Masjid', 'Pusat ibadah, kajian keislaman, dan kegiatan tahfidz Qur''an', 3),
  ('Lapangan Olahraga', 'Lapangan terawat untuk kegiatan olahraga dan aktivitas fisik siswa', 4)
on conflict do nothing;

-- ============================================================
-- 7. ARTICLES / ARTIKEL
-- ============================================================
create table if not exists articles (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  excerpt text default '',
  content text not null default '',
  author text default '',
  category text default 'umum',
  image_url text default '',
  is_published boolean default false,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function update_articles_slug()
returns trigger as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := lower(replace(replace(replace(new.title, ' ', '-'), '.', ''), ',', ''));
    new.slug := regexp_replace(new.slug, '[^a-z0-9-]', '', 'g');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_articles_slug
  before insert on articles
  for each row execute function update_articles_slug();

-- ============================================================
-- 8. ACHIEVEMENTS / PRESTASI
-- ============================================================
create table if not exists achievements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  category text default 'akademik',
  year int default extract(year from now()),
  image_url text default '',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- 9. CONTACT MESSAGES / PESAN KONTAK
-- ============================================================
create table if not exists contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text default '',
  subject text default '',
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS POLICIES
-- rls_auto_enable event trigger handles ENABLE ROW LEVEL SECURITY
-- We just need to create the policies
-- ============================================================

-- Public read policies
create policy "Public read school_profile" on school_profile for select using (true);
create policy "Public read news" on news for select using (is_published = true);
create policy "Public read gallery" on gallery for select using (true);
create policy "Public read teachers" on teachers for select using (is_active = true);
create policy "Public read facilities" on facilities for select using (is_active = true);
create policy "Public read articles" on articles for select using (is_published = true);
create policy "Public read achievements" on achievements for select using (true);

-- Admin full access (authenticated users)
create policy "Admin manage school_profile" on school_profile for all using (auth.role() = 'authenticated');
create policy "Admin manage news" on news for all using (auth.role() = 'authenticated');
create policy "Admin manage gallery" on gallery for all using (auth.role() = 'authenticated');
create policy "Admin manage ppdb_registrations" on ppdb_registrations for all using (auth.role() = 'authenticated');
create policy "Admin manage teachers" on teachers for all using (auth.role() = 'authenticated');
create policy "Admin manage facilities" on facilities for all using (auth.role() = 'authenticated');
create policy "Admin manage articles" on articles for all using (auth.role() = 'authenticated');
create policy "Admin manage achievements" on achievements for all using (auth.role() = 'authenticated');
create policy "Admin manage contact_messages" on contact_messages for all using (auth.role() = 'authenticated');

-- Anonymous insert for public forms
create policy "Public insert ppdb_registrations" on ppdb_registrations for insert with check (true);
create policy "Public insert contact_messages" on contact_messages for insert with check (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_news_slug on news(slug);
create index if not exists idx_news_published on news(is_published, published_at desc);
create index if not exists idx_gallery_category on gallery(category);
create index if not exists idx_ppdb_status on ppdb_registrations(status);
create index if not exists idx_articles_slug on articles(slug);
create index if not exists idx_articles_published on articles(is_published, published_at desc);
create index if not exists idx_teachers_active on teachers(is_active);
create index if not exists idx_facilities_active on facilities(is_active);
