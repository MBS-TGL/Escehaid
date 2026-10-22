## Table `user_profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `full_name` | `text` |  |
| `role` | `user_role` |  |
| `avatar_url` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `system_role` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `must_change_password` | `bool` |  |
| `last_login_at` | `timestamptz` |  Nullable |

## Table `user_audit_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `action` | `text` |  |
| `details` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `school_profile`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `school_name` | `text` |  |
| `address` | `text` |  |
| `phone` | `text` |  |
| `email` | `text` |  |
| `website` | `text` |  Nullable |
| `vision` | `text` |  |
| `mission` | `text` |  |
| `history` | `text` |  Nullable |
| `logo_url` | `text` |  Nullable |
| `banner_url` | `text` |  Nullable |
| `principal_name` | `text` |  Nullable |
| `principal_photo_url` | `text` |  Nullable |
| `principal_quote` | `text` |  Nullable |
| `total_teachers` | `int4` |  Nullable |
| `total_students` | `int4` |  Nullable |
| `total_classes` | `int4` |  Nullable |
| `accreditation` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `registration_mode` | `text` |  |
| `google_form_url` | `text` |  Nullable |
| `spmb_brochure_url` | `text` |  Nullable |
| `spmb_offline_form_url` | `text` |  Nullable |
| `spmb_contact_phone` | `text` |  Nullable |
| `spmb_highlight_text` | `text` |  Nullable |
| `npsn` | `text` |  Nullable |
| `spmb_form_schema` | `jsonb` |  Nullable |

## Table `news`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `slug` | `text` |  Unique |
| `summary` | `text` |  |
| `content` | `text` |  |
| `category` | `text` |  |
| `image_url` | `text` |  Nullable |
| `author_id` | `uuid` |  Nullable |
| `is_published` | `bool` |  Nullable |
| `published_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `writer_name` | `text` |  Nullable |
| `editor_name` | `text` |  Nullable |
| `cover_image_position` | `text` |  Nullable |
| `attachment_url` | `text` |  Nullable |
| `attachment_name` | `text` |  Nullable |
| `image_alt` | `text` |  Nullable |
| `is_pinned` | `bool` |  |
| `expires_at` | `timestamptz` |  Nullable |

## Table `gallery`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `media_type` | `text` |  |
| `url` | `text` |  |
| `thumbnail_url` | `text` |  Nullable |
| `category` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `spmb_registrations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `full_name` | `text` |  |
| `birth_place` | `text` |  Nullable |
| `birth_date` | `date` |  Nullable |
| `gender` | `text` |  |
| `address` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `parent_name` | `text` |  Nullable |
| `parent_occupation` | `text` |  Nullable |
| `previous_school` | `text` |  Nullable |
| `registration_path` | `text` |  |
| `status` | `text` |  |
| `documents` | `jsonb` |  Nullable |
| `admin_notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `wave_id` | `uuid` |  Nullable |

## Table `teachers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `position` | `text` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `facilities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `image_url` | `text` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `articles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `slug` | `text` |  Unique |
| `excerpt` | `text` |  Nullable |
| `content` | `text` |  |
| `author_id` | `uuid` |  Nullable |
| `category` | `text` |  Nullable |
| `image_url` | `text` |  Nullable |
| `is_published` | `bool` |  Nullable |
| `published_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `author_name` | `text` |  Nullable |
| `editor_name` | `text` |  Nullable |
| `attachment_url` | `text` |  Nullable |
| `attachment_name` | `text` |  Nullable |
| `image_alt` | `text` |  Nullable |
| `is_pinned` | `bool` |  |
| `expires_at` | `timestamptz` |  Nullable |

## Table `achievements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `category` | `text` |  Nullable |
| `year` | `int4` |  Nullable |
| `image_url` | `text` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `rank_label` | `text` |  Nullable |
| `level` | `text` |  Nullable |
| `participants` | `text` |  Nullable |
| `organizer` | `text` |  Nullable |
| `is_featured` | `bool` |  |
| `image_alt` | `text` |  Nullable |
| `results` | `jsonb` |  |
| `event_name` | `text` |  Nullable |
| `location` | `text` |  Nullable |
| `event_start` | `date` |  Nullable |
| `event_end` | `date` |  Nullable |
| `team_name` | `text` |  Nullable |

## Table `contact_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `email` | `text` |  |
| `phone` | `text` |  Nullable |
| `subject` | `text` |  Nullable |
| `message` | `text` |  |
| `is_read` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `announcements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `text` | `text` |  |
| `is_active` | `bool` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `agenda_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `event_date` | `timestamptz` |  |
| `is_active` | `bool` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `activities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `slug` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `content` | `text` |  Nullable |
| `activity_date` | `timestamptz` |  Nullable |
| `activity_type` | `text` |  Nullable |
| `location` | `text` |  Nullable |
| `image_url` | `text` |  Nullable |
| `is_published` | `bool` |  Nullable |
| `author_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `activity_time` | `text` |  Nullable |
| `live_url` | `text` |  Nullable |
| `end_date` | `timestamptz` |  Nullable |
| `registration_url` | `text` |  Nullable |
| `contact_person` | `text` |  Nullable |
| `is_featured` | `bool` |  |
| `video_url` | `text` |  Nullable |

## Table `spmb_waves`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  |
| `note` | `text` |  Nullable |
| `is_published` | `bool` |  |
| `sort_order` | `int4` |  |
| `result_published_at` | `timestamptz` |  Nullable — kolom migrasi `supabase/spmb_status_check.sql`. NULL = hasil seleksi belum diumumkan (status pendaftar tampil "Dalam Proses" di halaman publik cek status) |
| `created_at` | `timestamptz` |  Nullable |

## Table `downloads`

Area unduhan publik (brosur, formulir, juklak) — migrasi `supabase/downloads.sql`. Berkas tersimpan di bucket Storage `documents` folder `downloads/`.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary, default `gen_random_uuid()` |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `category` | `text` | Default `'Umum'` |
| `file_url` | `text` |  |
| `file_name` | `text` |  Nullable |
| `file_size` | `int8` |  Nullable (byte) |
| `is_active` | `bool` | Default `true` |
| `sort_order` | `int4` | Default `0` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

## Table `ekskuls`

Ekstrakurikuler dinamis (beranda + profil + panel admin `/admin/ekskul`) — migrasi `supabase/ekskul.sql` (idempoten: tabel + RLS + seed 6 ekskul awal + izin peran bawaan). Foto tersimpan di bucket Storage `images` folder `ekskuls/<id>/`.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary, default `gen_random_uuid()` |
| `slug` | `text` | Unique, NOT NULL |
| `name` | `text` | NOT NULL |
| `description` | `text` | Default `''` |
| `icon` | `text` | Kunci ikon (soccer/pingpong/tent/target/microphone/trophy); kosong → pemetaan slug |
| `schedule_day` | `int2` | 0=Minggu .. 6=Sabtu, Nullable (CHECK 0-6) |
| `schedule_time` | `time` | Nullable |
| `schedule_note` | `text` | Default `''` |
| `coach` | `text` | Default `''` |
| `image_url` | `text` | Default `''` |
| `image_alt` | `text` | Default `''` |
| `is_active` | `bool` | Default `true` |
| `sort_order` | `int4` | Default `0`, index `ekskuls_sort_idx` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

## Table `notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `message` | `text` |  |
| `type` | `text` |  |
| `link` | `text` |  Nullable |
| `is_read` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `portal_apps`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `label` | `text` |  |
| `description` | `text` |  |
| `href` | `text` |  |
| `icon` | `text` |  |
| `color` | `text` |  |
| `is_external` | `bool` |  |
| `is_coming_soon` | `bool` |  |
| `is_active` | `bool` |  |
| `sort_order` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Nullable Unique |
| `type` | `text` |  Nullable |
| `sort_order` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `actor_id` | `uuid` |  Nullable |
| `actor_name` | `text` |  Nullable |
| `action` | `text` |  |
| `entity_type` | `text` |  |
| `entity_id` | `text` |  Nullable |
| `detail` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `key` | `text` | Primary |
| `name` | `text` |  |
| `description` | `text` |  |
| `is_system` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `role_permissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `role_key` | `text` | Primary |
| `permission` | `text` | Primary |
| `created_at` | `timestamptz` |  |

## Custom Types / Enums

### `user_role`

`developer` | `admin` | `publisher` | `teacher` | `student`

## RLS Policies

### `contact_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can send contact messages` | INSERT | public | PERMISSIVE | — | `(is_read = false)` |
| `Admins can manage contact messages` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |

### `facilities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read active facilities` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |
| `Admins can manage facilities` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |

### `ekskuls`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read active ekskul` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |
| `Admins can manage ekskul` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |
| `Panel roles manage ekskul` | ALL | authenticated | PERMISSIVE | `(EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role]) AND up.is_active = true))` | idem USING |

### `school_profile`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read school profile` | SELECT | public | PERMISSIVE | `true` | — |
| `Admins can manage school profile` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |

### `agenda_events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admins can manage agenda events` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |
| `Public can read active agenda events` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |

### `achievements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read achievements` | SELECT | public | PERMISSIVE | `true` | — |
| `Admins can manage achievements` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |
| `Publishers can manage achievements` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM user_profiles   WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'publisher'::user_role) AND (user_profiles.is_active = true))))` | `(EXISTS ( SELECT 1    FROM user_profiles   WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'publisher'::user_role) AND (user_profiles.is_active = true))))` |
| `achievements public read` | SELECT | public | PERMISSIVE | `true` | — |
| `Panel roles manage achievements` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM user_profiles up   WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])) AND (up.is_active = true))))` | `(EXISTS ( SELECT 1    FROM user_profiles up   WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])) AND (up.is_active = true))))` |

### `spmb_waves`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read published SPMB waves` | SELECT | public | PERMISSIVE | `(is_published = true)` | — |
| `Admins can manage SPMB waves` | ALL | authenticated | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |

### `announcements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read active announcements` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |
| `Admins can manage announcements` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |

### `spmb_registrations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can submit pending registrations` | INSERT | public | PERMISSIVE | — | `(status = 'pending'::text)` |
| `Admins can manage registrations` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |
| `spmb_registrations admin insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM user_profiles   WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.is_active = true) AND (user_profiles.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])))))` |

### `teachers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read active teachers` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |
| `Admins can manage teachers` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |

### `user_audit_log`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admins can access audit log` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | — |

### `user_profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admins can manage profiles` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |
| `Users can read own profile` | SELECT | public | PERMISSIVE | `(id = auth.uid())` | — |
| `Users can update own profile` | UPDATE | public | PERMISSIVE | `(id = auth.uid())` | `(id = auth.uid())` |

### `activities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read published activities` | SELECT | public | PERMISSIVE | `(is_published = true)` | — |
| `Editors can manage activities` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role]))` |

### `articles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read published articles` | SELECT | public | PERMISSIVE | `(is_published = true)` | — |
| `Editors can manage articles` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role]))` |

### `gallery`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read gallery` | SELECT | public | PERMISSIVE | `true` | — |
| `Editors can manage gallery` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role]))` |

### `news`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read published news` | SELECT | public | PERMISSIVE | `(is_published = true)` | — |
| `Editors can manage news` | ALL | public | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role]))` |

### `notifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can read own notifications` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Admins can create notifications` | INSERT | public | PERMISSIVE | — | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |
| `Users can update own notifications` | UPDATE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |
| `Users can delete own notifications` | DELETE | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `portal_apps`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `portal_apps public read` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |
| `portal_apps_admin_write` | ALL | authenticated | PERMISSIVE | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` | `(current_user_role() = ANY (ARRAY['developer'::user_role, 'admin'::user_role]))` |

### `categories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read categories` | SELECT | public | PERMISSIVE | `true` | — |
| `Authenticated can manage categories` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `audit_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `audit_logs admin read` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM user_profiles   WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.is_active = true) AND (user_profiles.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])))))` | — |

### `roles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `roles select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `roles write superadmin` | ALL | authenticated | PERMISSIVE | `has_permission(auth.uid(), 'users:manage'::text)` | `has_permission(auth.uid(), 'users:manage'::text)` |

### `role_permissions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `role_permissions select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `role_permissions write superadmin` | ALL | authenticated | PERMISSIVE | `has_permission(auth.uid(), 'users:manage'::text)` | `has_permission(auth.uid(), 'users:manage'::text)` |

### `downloads`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Public can read active downloads` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |
| `Panel roles can manage downloads` | ALL | authenticated | PERMISSIVE | `(EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_active = true AND up.role = ANY (ARRAY['developer'::user_role, 'admin'::user_role, 'publisher'::user_role])))` | sama dengan USING |

## Functions

### `spmb_public_status(p_nisn text, p_birth_date date)`

Migrasi `supabase/spmb_status_check.sql`. `STABLE SECURITY DEFINER`, `GRANT EXECUTE` ke `anon` + `authenticated` (REVOKE dari `PUBLIC`).

Mengembalikan maks. 1 baris (terbaru) dari `spmb_registrations` yang `documents->>'nisn'` = `p_nisn` **dan** `birth_date = p_birth_date`, di-join `spmb_waves` untuk nama gelombang + penanda `result_published`. Kolom yang dikembalikan terbatas untuk publik: `full_name, status, wave_name, wave_id, registered_at, result_published` — tanpa alamat, orang tua, kontak, berkas, atau catatan admin.

