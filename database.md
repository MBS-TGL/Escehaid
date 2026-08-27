# Database Schema - SMP Muhammadiyah 4 Tanggul

## Overview

Database Supabase (PostgreSQL) untuk website Esceha.id. Total **9 tables**.

## Setup

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy seluruh isi `database.sql`
3. Paste dan klik **Run**
4. Semua tables, data default, RLS policies, dan indexes akan otomatis dibuat

## Tables

### 1. `school_profile`
Profil sekolah (hanya 1 baris).

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `school_name` | text | Nama sekolah |
| `address` | text | Alamat lengkap |
| `phone` | text | Nomor telepon |
| `email` | text | Email sekolah |
| `website` | text | URL website |
| `vision` | text | Visi sekolah |
| `mission` | text | Misi sekolah |
| `history` | text | Sejarah sekolah |
| `logo_url` | text | URL logo |
| `banner_url` | text | URL banner |
| `created_at` | timestamptz | Waktu pembuatan |
| `updated_at` | timestamptz | Waktu update terakhir |

### 2. `news`
Berita, pengumuman, dan agenda sekolah.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `title` | text | Judul berita |
| `slug` | text (UNIQUE) | URL-friendly slug (auto-generated) |
| `summary` | text | Ringkasan singkat |
| `content` | text | Konten lengkap (HTML/Markdown) |
| `category` | text | `berita` \| `pengumuman` \| `agenda` |
| `image_url` | text | URL gambar |
| `author` | text | Nama penulis |
| `is_published` | boolean | Status publikasi |
| `published_at` | timestamptz | Tanggal publikasi |
| `created_at` | timestamptz | Waktu pembuatan |
| `updated_at` | timestamptz | Waktu update terakhir |

### 3. `gallery`
Foto dan video galeri sekolah.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `title` | text | Judul |
| `description` | text | Deskripsi |
| `media_type` | text | `foto` \| `video` |
| `url` | text | URL media |
| `thumbnail_url` | text | URL thumbnail |
| `category` | text | Kategori (umum, kegiatan, dsb) |
| `created_at` | timestamptz | Waktu pembuatan |

### 4. `ppdb_registrations`
Pendaftaran PPDB (Penerimaan Peserta Didik Baru).

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `full_name` | text | Nama lengkap siswa |
| `birth_place` | text | Tempat lahir |
| `birth_date` | date | Tanggal lahir |
| `gender` | text | `L` (Laki-laki) \| `P` (Perempuan) |
| `address` | text | Alamat |
| `phone` | text | No. telepon |
| `email` | text | Email |
| `parent_name` | text | Nama orang tua |
| `parent_occupation` | text | Pekerjaan orang tua |
| `previous_school` | text | Asal sekolah |
| `registration_path` | text | `reguler` \| `prestasi` \| `beasiswa` |
| `status` | text | `pending` \| `accepted` \| `rejected` |
| `documents_url` | text | URL dokumen |
| `admin_notes` | text | Catatan admin |
| `created_at` | timestamptz | Waktu pendaftaran |
| `updated_at` | timestamptz | Waktu update terakhir |

### 5. `teachers`
Data guru dan staf sekolah.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Nama lengkap |
| `subject` | text | Mata pelajaran / bidang |
| `position` | text | Jabatan |
| `photo_url` | text | URL foto profil |
| `bio` | text | Biografi singkat |
| `sort_order` | int | Urutan tampilan |
| `is_active` | boolean | Status aktif |
| `created_at` | timestamptz | Waktu pembuatan |

### 6. `facilities`
Fasilitas sekolah.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Nama fasilitas |
| `description` | text | Deskripsi |
| `image_url` | text | URL foto |
| `sort_order` | int | Urutan tampilan |
| `is_active` | boolean | Status aktif |
| `created_at` | timestamptz | Waktu pembuatan |

### 7. `articles`
Artikel dan tips pendidikan.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `title` | text | Judul artikel |
| `slug` | text (UNIQUE) | URL-friendly slug (auto-generated) |
| `excerpt` | text | Ringkasan singkat |
| `content` | text | Konten lengkap |
| `author` | text | Nama penulis |
| `category` | text | Kategori artikel |
| `image_url` | text | URL gambar |
| `is_published` | boolean | Status publikasi |
| `published_at` | timestamptz | Tanggal publikasi |
| `created_at` | timestamptz | Waktu pembuatan |
| `updated_at` | timestamptz | Waktu update terakhir |

### 8. `achievements`
Prestasi sekolah dan siswa.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `title` | text | Judul prestasi |
| `description` | text | Deskripsi |
| `category` | text | Kategori (akademik, non-akademik, dsb) |
| `year` | int | Tahun pencapaian |
| `image_url` | text | URL foto/sertifikat |
| `sort_order` | int | Urutan tampilan |
| `created_at` | timestamptz | Waktu pembuatan |

### 9. `contact_messages`
Pesan dari formulir kontak.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Nama pengirim |
| `email` | text | Email pengirim |
| `phone` | text | No. telepon |
| `subject` | text | Subjek pesan |
| `message` | text | Isi pesan |
| `is_read` | boolean | Status dibaca |
| `created_at` | timestamptz | Waktu pengiriman |

## RLS Policies

| Table | Public Read | Public Insert | Admin Full Access |
|-------|:-----------:|:-------------:|:-----------------:|
| `school_profile` | Yes | No | Yes (auth) |
| `news` | Published only | No | Yes (auth) |
| `gallery` | Yes | No | Yes (auth) |
| `ppdb_registrations` | No | Yes | Yes (auth) |
| `teachers` | Active only | No | Yes (auth) |
| `facilities` | Active only | No | Yes (auth) |
| `articles` | Published only | No | Yes (auth) |
| `achievements` | Yes | No | Yes (auth) |
| `contact_messages` | No | Yes | Yes (auth) |

## Indexes

- `news`: slug, is_published + published_at
- `gallery`: category
- `ppdb_registrations`: status
- `articles`: slug, is_published + published_at
- `teachers`: is_active
- `facilities`: is_active

## Notes

- Semua table menggunakan `uuid` sebagai primary key
- `slug` fields auto-generated dari title (menggunakan trigger)
- `is_published` / `is_active` untuk soft delete
- `created_at` dan `updated_at` otomatis diisi
- Auth menggunakan Supabase Auth (`auth.role() = 'authenticated'`)
