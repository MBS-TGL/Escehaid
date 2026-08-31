# Database Schema — SMP Muhammadiyah 4 Tanggul

## Overview

Database Supabase (PostgreSQL) dengan RBAC auth system. Total **12 tables**.

- 9 content tables
- 2 auth tables (`user_profiles`, `user_audit_log`)
- 3 storage buckets (`spmb-documents`, `images`, `videos`)
- Full row-level security with role-based policies
- Auto slug generation with collision handling
- Anti-privilege escalation trigger

## Auth System

### Roles
| Role | Description |
|------|-------------|
| `developer` | Full access (creator) |
| `admin` | Full access |
| `publisher` | Content management |
| `teacher` | Article submission |
| `student` | Read-only, submit articles |

### Tables
- `auth.users` — managed by Supabase Auth
- `user_profiles` — syncs automatically via `on_auth_user_created` trigger
- `user_audit_log` — tracks all user actions

### Signup Flow
1. User signs up via Supabase Auth
2. Trigger `on_auth_user_created` auto-creates `user_profiles` with role `student`
3. Admin promotes role via SQL or admin panel

### Login Credentials
- **Developer**: `dev@mbs.id` / `dev`

## Content Tables

### 1. `school_profile`
Single row — school identity.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `school_name` | text | Nama sekolah |
| `address` | text | Alamat lengkap |
| `phone` | text | Nomor telepon |
| `email` | text | Email sekolah |
| `website` | text | URL website |
| `vision` | text | Visi |
| `mission` | text | Misi |
| `history` | text | Sejarah |
| `logo_url` | text | URL logo |
| `banner_url` | text | URL banner |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 2. `news`
Berita, pengumuman, agenda. **Author FK** → `user_profiles`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | |
| `title` | text | |
| `slug` | text (UNIQUE) | Auto-generated, collision-safe |
| `summary` | text | |
| `content` | text | |
| `category` | text | `berita` \| `pengumuman` \| `agenda` |
| `image_url` | text | |
| `author_id` | uuid → user_profiles | |
| `is_published` | boolean | |
| `published_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 3. `gallery`
Foto & video galeri.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | |
| `title` | text | |
| `description` | text | |
| `media_type` | text | `foto` \| `video` |
| `url` | text | |
| `thumbnail_url` | text | |
| `category` | text | |
| `created_at` | timestamptz | |

### 4. `spmb_registrations`
Pendaftaran SPMB (sebelumnya PPDB). Dikunci: public insert → status `pending` saja.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | |
| `full_name` | text | |
| `birth_place` | text | |
| `birth_date` | date | |
| `gender` | text | `L` \| `P` |
| `address` | text | |
| `phone` | text | |
| `email` | text | |
| `parent_name` | text | |
| `parent_occupation` | text | |
| `previous_school` | text | |
| `registration_path` | text | `reguler` \| `prestasi` \| `beasiswa` |
| `status` | text | `pending` \| `accepted` \| `rejected` |
| `documents` | jsonb | |
| `admin_notes` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 5. `teachers`
Guru & staff. Kolom `categories jsonb` untuk multi-kategori.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | |
| `name` | text | |
| `subject` | text | |
| `position` | text | |
| `categories` | jsonb | `[\"Guru Mapel\"]` dsb |
| `photo_url` | text | |
| `bio` | text | |
| `sort_order` | int | |
| `is_active` | boolean | |
| `created_at` | timestamptz | |

### 6. `facilities`
Fasilitas sekolah.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | |
| `name` | text | |
| `description` | text | |
| `image_url` | text | |
| `sort_order` | int | |
| `is_active` | boolean | |
| `created_at` | timestamptz | |

### 7. `articles`
Artikel & tips. **Author FK** → `user_profiles`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | |
| `title` | text | |
| `slug` | text (UNIQUE) | Auto-generated |
| `excerpt` | text | |
| `content` | text | |
| `author_id` | uuid → user_profiles | |
| `category` | text | `umum` dll |
| `image_url` | text | |
| `is_published` | boolean | |
| `published_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 8. `achievements`
Prestasi sekolah & siswa.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | |
| `title` | text | |
| `description` | text | |
| `category` | text | `akademik` dll |
| `year` | int | |
| `image_url` | text | |
| `sort_order` | int | |
| `created_at` | timestamptz | |

### 9. `contact_messages`
Pesan dari formulir kontak.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | |
| `name` | text | |
| `email` | text | |
| `phone` | text | |
| `subject` | text | |
| `message` | text | |
| `is_read` | boolean | |
| `created_at` | timestamptz | |

### 10. `user_profiles`
Profil pengguna — auto-synced dari `auth.users`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) → auth.users | |
| `full_name` | text | |
| `role` | user_role | `student` (default) |
| `avatar_url` | text | |
| `phone` | text | |
| `is_active` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 11. `user_audit_log`
Log audit trail semua aksi pengguna.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid → auth.users | |
| `action` | text | |
| `details` | jsonb | |
| `created_at` | timestamptz | |

## Storage Buckets

| Bucket | Public Read | Public Insert | Staff Manage | Size Limit |
|--------|:-----------:|:-------------:|:------------:|:----------:|
| `spmb-documents` | ✅ | ✅ | developer, admin | 2 MB |
| `images` | ✅ | ❌ | developer, admin, publisher | 5 MB |
| `videos` | ✅ | ❌ | developer, admin, publisher | 50 MB |

## Setup (2026-08-31 update)

The developer user `dev@mbs.id` **already exists** in `auth.users` (UUID: `dd6506f5-af48-4ca2-a541-6fc31615df9b`).

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy seluruh isi `database.sql`
3. Paste dan klik **Run** (ini akan me-reset database — drop semua tabel lalu buat ulang)
4. Setelah SQL jalan, buka **Table Editor** → `user_profiles` → **Insert row**:
   - `id`: `dd6506f5-af48-4ca2-a541-6fc31615df9b`
   - `full_name`: `Developer`
   - `role`: `developer`
   - `is_active`: `true`
   - (kolom lain kosongkan)
5. Save, lalu coba login: `dev@mbs.id` / `dev`

**Jika trigger `handle_new_user` sudah membuat profile otomatis**, skip langkah 4 dan cek apakah profile sudah ada.

> Catatan: `database.sql` sudah termasuk Phase 0 cleanup (aman dijalankan berkali-kali).

## Key Features

- **Auto slug** — `generate_unique_slug()` handle collision otomatis (appends `-2`, `-3`, dst)
- **Anti-escalation** — trigger `prevent_privilege_escalation()` blok user biasa dari mengubah role/is_active
- **RLS berbasis role** — bukan sekadar `auth.role() = 'authenticated'`, pakai `current_user_role()`
- **Auto `updated_at`** — `set_updated_at()` trigger di semua tabel
- **Hardcoded role** — signup trigger selalu set role `student`, gak peduli apa yang dikirim client
