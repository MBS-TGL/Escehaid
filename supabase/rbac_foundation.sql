-- ============================================================================
-- MIGRASI FONDASI RBAC — Pengguna & Peran, izin halus (modul:aksi)
-- ----------------------------------------------------------------------------
-- Dijalankan MANUAL di Supabase SQL Editor (aturan repo: assistant hanya
-- menulis statement; semua SQL dijalankan user). Idempoten — boleh diulang
-- tanpa merusak edit admin yang sudah ada.
--
-- Yang dibuat:
--   1. Tabel `roles` + `role_permissions` (matriks izin, bisa diedit super admin).
--   2. Kolom baru di `user_profiles`:
--        system_role           — peran halus (FK ke roles.key). NULL = belum
--                                di-set; helper jatuh ke pemetaan legacy.
--        email                 — disalin dari auth.users (untuk UI pengguna).
--        must_change_password  — dipakai reset password + paksa ganti saat
--                                login berikutnya.
--        last_login_at         — untuk tampilan "login terakhir".
--   3. Backfill idempoten:
--        * email & last_login_at dari auth.users,
--        * system_role='SUPER_ADMIN' untuk semua user panel admin yang ada
--          (developer/admin/publisher) supaya tidak ada yang terkunci.
--   4. Seed peran default + izinnya (ON CONFLICT DO NOTHING → tidak menimpa
--      edit admin pada pemutaran ulang).
--   5. Fungsi `has_permission(uid, perm)` (SECURITY DEFINER) — dipakai trigger
--      guard & query izin sisi DB.
--   6. Fungsi `log_activity(...)` (SECURITY DEFINER) — mencatat aksi modul
--      sistem (peran/izin/pengguna) ke `audit_logs` bila tabel itu ada.
--   7. RLS untuk `roles`/`role_permissions` + trigger anti-eskalasi di
--      `user_profiles` (lapisan pertahanan DB, melengkapi guard aplikasi).
--
-- Setelah menjalankan: tidak ada perubahan perilaku paksa — user lama tetap
-- SUPER_ADMIN, dan modul legacy tetap berjalan seperti sebelumnya.
-- ============================================================================

-- ── 1) Tabel peran ──────────────────────────────────────────────────────────
create table if not exists public.roles (
  key         text primary key,
  name        text not null,
  description text not null default '',
  -- Peran sistem tidak boleh dihapus; izin SUPER_ADMIN tidak boleh dikurangi.
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 2) Tabel matriks izin peran ─────────────────────────────────────────────
create table if not exists public.role_permissions (
  role_key   text not null references public.roles (key) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  primary key (role_key, permission)
);

create index if not exists idx_role_permissions_role_key
  on public.role_permissions (role_key);

-- ── 3) Kolom baru di user_profiles ──────────────────────────────────────────
-- email/system_role boleh nullable agar aman bila kolom sudah ada sebelumnya.
alter table public.user_profiles
  add column if not exists system_role text
    references public.roles (key) on update cascade on delete set null;

alter table public.user_profiles
  add column if not exists email text;

alter table public.user_profiles
  add column if not exists must_change_password boolean not null default false;

alter table public.user_profiles
  add column if not exists last_login_at timestamptz;

create index if not exists idx_user_profiles_system_role
  on public.user_profiles (system_role);

-- ── 4) Seed peran default + izinnya (idempoten, tidak menimpa edit) ─────────
insert into public.roles (key, name, description, is_system) values
  ('SUPER_ADMIN',    'Super Admin',
   'Akses penuh ke seluruh modul, termasuk Pengguna, Pengaturan, Feature Flags, dan Log.', true),
  ('ADMIN_SEKOLAH',  'Admin Sekolah',
   'Semua modul konten dan SPMB (termasuk data sensitif), serta pesan masuk. Tanpa pengelolaan pengguna/peran.', false),
  ('OPERATOR_KONTEN','Operator Konten',
   'Modul konten utama (berita, artikel, pengumuman, dst.), galeri, media, dan prestasi. Tanpa SPMB, pengguna, atau pengaturan.', false),
  ('PANITIA_SPMB',   'Panitia SPMB',
   'Khusus SPMB (pendaftar, verifikasi, impor/ekspor, data sensitif) serta pesan masuk.', false)
on conflict (key) do nothing;

-- Izin default per peran. ON CONFLICT DO NOTHING → pemutaran ulang migrasi TIDAK
-- menimpa matriks yang sudah diedit super admin lewat UI.
with perms (role_key, permission) as (
  values
    -- ADMIN_SEKOLAH: seluruh konten + SPMB + pesan
    ('ADMIN_SEKOLAH','berita:read'), ('ADMIN_SEKOLAH','berita:create'),
    ('ADMIN_SEKOLAH','berita:update'), ('ADMIN_SEKOLAH','berita:delete'),
    ('ADMIN_SEKOLAH','berita:publish'),
    ('ADMIN_SEKOLAH','artikel:read'), ('ADMIN_SEKOLAH','artikel:create'),
    ('ADMIN_SEKOLAH','artikel:update'), ('ADMIN_SEKOLAH','artikel:delete'),
    ('ADMIN_SEKOLAH','artikel:publish'),
    ('ADMIN_SEKOLAH','pengumuman:read'), ('ADMIN_SEKOLAH','pengumuman:create'),
    ('ADMIN_SEKOLAH','pengumuman:update'), ('ADMIN_SEKOLAH','pengumuman:delete'),
    ('ADMIN_SEKOLAH','pengumuman:publish'),
    ('ADMIN_SEKOLAH','kegiatan:read'), ('ADMIN_SEKOLAH','kegiatan:create'),
    ('ADMIN_SEKOLAH','kegiatan:update'), ('ADMIN_SEKOLAH','kegiatan:delete'),
    ('ADMIN_SEKOLAH','kegiatan:publish'),
    ('ADMIN_SEKOLAH','agenda:read'), ('ADMIN_SEKOLAH','agenda:create'),
    ('ADMIN_SEKOLAH','agenda:update'), ('ADMIN_SEKOLAH','agenda:delete'),
    ('ADMIN_SEKOLAH','galeri:read'), ('ADMIN_SEKOLAH','galeri:create'),
    ('ADMIN_SEKOLAH','galeri:update'), ('ADMIN_SEKOLAH','galeri:delete'),
    ('ADMIN_SEKOLAH','media:read'), ('ADMIN_SEKOLAH','media:upload'),
    ('ADMIN_SEKOLAH','media:delete'),
    ('ADMIN_SEKOLAH','prestasi:read'), ('ADMIN_SEKOLAH','prestasi:create'),
    ('ADMIN_SEKOLAH','prestasi:update'), ('ADMIN_SEKOLAH','prestasi:delete'),
    ('ADMIN_SEKOLAH','prestasi:publish'),
    ('ADMIN_SEKOLAH','guru:read'), ('ADMIN_SEKOLAH','guru:create'),
    ('ADMIN_SEKOLAH','guru:update'), ('ADMIN_SEKOLAH','guru:delete'),
    ('ADMIN_SEKOLAH','guru:publish'),
    ('ADMIN_SEKOLAH','fasilitas:read'), ('ADMIN_SEKOLAH','fasilitas:create'),
    ('ADMIN_SEKOLAH','fasilitas:update'), ('ADMIN_SEKOLAH','fasilitas:delete'),
    ('ADMIN_SEKOLAH','fasilitas:publish'),
    ('ADMIN_SEKOLAH','portal:read'), ('ADMIN_SEKOLAH','portal:create'),
    ('ADMIN_SEKOLAH','portal:update'), ('ADMIN_SEKOLAH','portal:delete'),
    ('ADMIN_SEKOLAH','spmb:read'), ('ADMIN_SEKOLAH','spmb:create'),
    ('ADMIN_SEKOLAH','spmb:update'), ('ADMIN_SEKOLAH','spmb:verify'),
    ('ADMIN_SEKOLAH','spmb:import'), ('ADMIN_SEKOLAH','spmb:export'),
    ('ADMIN_SEKOLAH','spmb:delete'), ('ADMIN_SEKOLAH','spmb:view_sensitive'),
    ('ADMIN_SEKOLAH','kontak:read'), ('ADMIN_SEKOLAH','kontak:update'),
    ('ADMIN_SEKOLAH','kontak:delete'),
    -- OPERATOR_KONTEN: seluruh konten (tanpa SPMB/sistem)
    ('OPERATOR_KONTEN','berita:read'), ('OPERATOR_KONTEN','berita:create'),
    ('OPERATOR_KONTEN','berita:update'), ('OPERATOR_KONTEN','berita:delete'),
    ('OPERATOR_KONTEN','berita:publish'),
    ('OPERATOR_KONTEN','artikel:read'), ('OPERATOR_KONTEN','artikel:create'),
    ('OPERATOR_KONTEN','artikel:update'), ('OPERATOR_KONTEN','artikel:delete'),
    ('OPERATOR_KONTEN','artikel:publish'),
    ('OPERATOR_KONTEN','pengumuman:read'), ('OPERATOR_KONTEN','pengumuman:create'),
    ('OPERATOR_KONTEN','pengumuman:update'), ('OPERATOR_KONTEN','pengumuman:delete'),
    ('OPERATOR_KONTEN','pengumuman:publish'),
    ('OPERATOR_KONTEN','kegiatan:read'), ('OPERATOR_KONTEN','kegiatan:create'),
    ('OPERATOR_KONTEN','kegiatan:update'), ('OPERATOR_KONTEN','kegiatan:delete'),
    ('OPERATOR_KONTEN','kegiatan:publish'),
    ('OPERATOR_KONTEN','agenda:read'), ('OPERATOR_KONTEN','agenda:create'),
    ('OPERATOR_KONTEN','agenda:update'), ('OPERATOR_KONTEN','agenda:delete'),
    ('OPERATOR_KONTEN','galeri:read'), ('OPERATOR_KONTEN','galeri:create'),
    ('OPERATOR_KONTEN','galeri:update'), ('OPERATOR_KONTEN','galeri:delete'),
    ('OPERATOR_KONTEN','media:read'), ('OPERATOR_KONTEN','media:upload'),
    ('OPERATOR_KONTEN','media:delete'),
    ('OPERATOR_KONTEN','prestasi:read'), ('OPERATOR_KONTEN','prestasi:create'),
    ('OPERATOR_KONTEN','prestasi:update'), ('OPERATOR_KONTEN','prestasi:delete'),
    ('OPERATOR_KONTEN','prestasi:publish'),
    ('OPERATOR_KONTEN','guru:read'), ('OPERATOR_KONTEN','guru:create'),
    ('OPERATOR_KONTEN','guru:update'), ('OPERATOR_KONTEN','guru:delete'),
    ('OPERATOR_KONTEN','guru:publish'),
    ('OPERATOR_KONTEN','fasilitas:read'), ('OPERATOR_KONTEN','fasilitas:create'),
    ('OPERATOR_KONTEN','fasilitas:update'), ('OPERATOR_KONTEN','fasilitas:delete'),
    ('OPERATOR_KONTEN','fasilitas:publish'),
    ('OPERATOR_KONTEN','portal:read'), ('OPERATOR_KONTEN','portal:create'),
    ('OPERATOR_KONTEN','portal:update'), ('OPERATOR_KONTEN','portal:delete'),
    -- PANITIA_SPMB: SPMB + pesan
    ('PANITIA_SPMB','spmb:read'), ('PANITIA_SPMB','spmb:create'),
    ('PANITIA_SPMB','spmb:update'), ('PANITIA_SPMB','spmb:verify'),
    ('PANITIA_SPMB','spmb:import'), ('PANITIA_SPMB','spmb:export'),
    ('PANITIA_SPMB','spmb:delete'), ('PANITIA_SPMB','spmb:view_sensitive'),
    ('PANITIA_SPMB','kontak:read'), ('PANITIA_SPMB','kontak:update'),
    -- SUPER_ADMIN: seluruh izin (disimpan eksplisit agar UI matriks lengkap)
    ('SUPER_ADMIN','berita:read'), ('SUPER_ADMIN','berita:create'),
    ('SUPER_ADMIN','berita:update'), ('SUPER_ADMIN','berita:delete'),
    ('SUPER_ADMIN','berita:publish'),
    ('SUPER_ADMIN','artikel:read'), ('SUPER_ADMIN','artikel:create'),
    ('SUPER_ADMIN','artikel:update'), ('SUPER_ADMIN','artikel:delete'),
    ('SUPER_ADMIN','artikel:publish'),
    ('SUPER_ADMIN','pengumuman:read'), ('SUPER_ADMIN','pengumuman:create'),
    ('SUPER_ADMIN','pengumuman:update'), ('SUPER_ADMIN','pengumuman:delete'),
    ('SUPER_ADMIN','pengumuman:publish'),
    ('SUPER_ADMIN','kegiatan:read'), ('SUPER_ADMIN','kegiatan:create'),
    ('SUPER_ADMIN','kegiatan:update'), ('SUPER_ADMIN','kegiatan:delete'),
    ('SUPER_ADMIN','kegiatan:publish'),
    ('SUPER_ADMIN','agenda:read'), ('SUPER_ADMIN','agenda:create'),
    ('SUPER_ADMIN','agenda:update'), ('SUPER_ADMIN','agenda:delete'),
    ('SUPER_ADMIN','galeri:read'), ('SUPER_ADMIN','galeri:create'),
    ('SUPER_ADMIN','galeri:update'), ('SUPER_ADMIN','galeri:delete'),
    ('SUPER_ADMIN','media:read'), ('SUPER_ADMIN','media:upload'),
    ('SUPER_ADMIN','media:delete'),
    ('SUPER_ADMIN','prestasi:read'), ('SUPER_ADMIN','prestasi:create'),
    ('SUPER_ADMIN','prestasi:update'), ('SUPER_ADMIN','prestasi:delete'),
    ('SUPER_ADMIN','prestasi:publish'),
    ('SUPER_ADMIN','guru:read'), ('SUPER_ADMIN','guru:create'),
    ('SUPER_ADMIN','guru:update'), ('SUPER_ADMIN','guru:delete'),
    ('SUPER_ADMIN','guru:publish'),
    ('SUPER_ADMIN','fasilitas:read'), ('SUPER_ADMIN','fasilitas:create'),
    ('SUPER_ADMIN','fasilitas:update'), ('SUPER_ADMIN','fasilitas:delete'),
    ('SUPER_ADMIN','fasilitas:publish'),
    ('SUPER_ADMIN','portal:read'), ('SUPER_ADMIN','portal:create'),
    ('SUPER_ADMIN','portal:update'), ('SUPER_ADMIN','portal:delete'),
    ('SUPER_ADMIN','kontak:read'), ('SUPER_ADMIN','kontak:update'),
    ('SUPER_ADMIN','kontak:delete'),
    ('SUPER_ADMIN','spmb:read'), ('SUPER_ADMIN','spmb:create'),
    ('SUPER_ADMIN','spmb:update'), ('SUPER_ADMIN','spmb:verify'),
    ('SUPER_ADMIN','spmb:import'), ('SUPER_ADMIN','spmb:export'),
    ('SUPER_ADMIN','spmb:delete'), ('SUPER_ADMIN','spmb:view_sensitive'),
    ('SUPER_ADMIN','users:manage'), ('SUPER_ADMIN','settings:manage'),
    ('SUPER_ADMIN','flags:manage'), ('SUPER_ADMIN','logs:read')
)
insert into public.role_permissions (role_key, permission)
select perms.role_key, perms.permission from perms
on conflict (role_key, permission) do nothing;

-- ── 5) Backfill idempoten ───────────────────────────────────────────────────
-- 5a. Salin email & last_sign_in_at dari auth.users (aman bila sudah ada).
update public.user_profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;

update public.user_profiles p
set last_login_at = u.last_sign_in_at
from auth.users u
where u.id = p.id
  and u.last_sign_in_at is not null
  and p.last_login_at is distinct from u.last_sign_in_at;

-- 5b. Semua user panel admin yang ada otomatis menjadi SUPER_ADMIN
--     (developer/admin/publisher) supaya tidak ada yang terkunci.
--     Hanya mengisi yang masih NULL → idempoten & tidak menurunkan peran
--     yang sudah diset admin.
update public.user_profiles
set system_role = 'SUPER_ADMIN'
where system_role is null
  and role in ('developer', 'admin', 'publisher');

-- ── 6) Fungsi bantuan ───────────────────────────────────────────────────────
-- 6a. has_permission(uid, perm) — pengecekan izin sisi DB (SECURITY DEFINER).
--     Fallback ke pemetaan legacy bila system_role NULL.
create or replace function public.has_permission(p_uid uuid, p_permission text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role      text;
  v_legacy    text;
  v_cnt       int;
begin
  if p_uid is null then
    return false;
  end if;

  select system_role, role into v_role, v_legacy
  from public.user_profiles
  where id = p_uid and is_active = true;

  if v_role is null and v_legacy is null then
    return false; -- profil tidak ada / nonaktif
  end if;

  if v_role = 'SUPER_ADMIN' then
    return true; -- wildcard
  end if;

  if v_role is not null then
    select count(*) into v_cnt
    from public.role_permissions
    where role_key = v_role and permission = p_permission;
    return v_cnt > 0;
  end if;

  -- Fallback legacy (sebelum backfill): developer/admin/publisher semuanya
  -- di-backfill menjadi SUPER_ADMIN, jadi perlakukan sama di sini agar
  -- konsisten dengan `LEGACY_ROLE_TO_SYSTEM_ROLE` di kode (tanpa jendela
  -- perilaku berbeda sebelum & sesudah migrasi).
  if v_legacy in ('developer', 'admin', 'publisher') then
    return true;
  end if;
  return false;
end;
$$;

grant execute on function public.has_permission(uuid, text) to authenticated;

-- 6b. log_activity(...) — mencatat aksi modul sistem ke audit_logs bila ada.
--     SECURITY DEFINER supaya dapat menulis ke audit_logs tanpa tergantung
--     policy RLS audit_logs (yang tidak ada di repo).
--     `detail` menampung diff sebelum/sesudah; jangan pernah diisi
--     password/token.
create or replace function public.log_activity(
  p_action      text,
  p_entity_type text,
  p_entity_id   text default null,
  p_detail      jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id   uuid := auth.uid();
  v_actor_name text;
begin
  -- Degradasi anggun: bila tabel audit_logs belum dibuat, fungsi ini no-op.
  if to_regclass('public.audit_logs') is null then
    return;
  end if;

  select full_name into v_actor_name
  from public.user_profiles where id = v_actor_id;

  insert into public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, detail)
  values (
    v_actor_id,
    coalesce(v_actor_name, 'Sistem'),
    p_action,
    p_entity_type,
    p_entity_id,
    p_detail
  );
end;
$$;

grant execute on function public.log_activity(text, text, text, jsonb) to authenticated;

-- ── 7) RLS untuk tabel peran ────────────────────────────────────────────────
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;

-- Baca: semua user login (sidebar/UI butuh daftar peran & izin untuk render).
-- Tulis: hanya super admin (dicek aplikasi; policy DB sebagai lapis kedua).
drop policy if exists "roles select" on public.roles;
create policy "roles select"
  on public.roles for select to authenticated
  using (true);

drop policy if exists "role_permissions select" on public.role_permissions;
create policy "role_permissions select"
  on public.role_permissions for select to authenticated
  using (true);

drop policy if exists "roles write superadmin" on public.roles;
create policy "roles write superadmin"
  on public.roles for all to authenticated
  using (public.has_permission(auth.uid(), 'users:manage'))
  with check (public.has_permission(auth.uid(), 'users:manage'));

drop policy if exists "role_permissions write superadmin" on public.role_permissions;
create policy "role_permissions write superadmin"
  on public.role_permissions for all to authenticated
  using (public.has_permission(auth.uid(), 'users:manage'))
  with check (public.has_permission(auth.uid(), 'users:manage'));

-- ── 8) Trigger guard RBAC di user_profiles (lapisan pertahanan DB, ADDITIF) ──
-- CATATAN:nama fungsi/trigger BARU (rbac_guard_privilege) — sengaja TIDAK
-- menimpa trigger `prevent_privilege_escalation` lama yang sudah ada di DB
-- (dokumentasi database.md; definisinya tidak ada di repo). Trigger lama tetap
-- melindungi kolom `role`/`is_active`; trigger ini MENAMBAH perlindungan
-- `system_role`, guard super-admin-terakhir, serta cek INSERT/DELETE. Bila
-- keduanya aktif, tumpang-tindihnya tidak konflik (sama-sama memblokir yang
-- tak berwenang).
create or replace function public.rbac_guard_privilege()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Operasi oleh sistem (signup trigger / service role) tidak membawa JWT →
  -- auth.uid() null. Biarkan lewat (peran & aktif diisi oleh logika aplikasi).
  if auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Pembuatan profil oleh user login hanya boleh oleh yang berwenang.
    if not public.has_permission(auth.uid(), 'users:manage') then
      raise exception 'Anda tidak memiliki izin users:manage untuk membuat akun.';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    -- Penghapusan profil hanya boleh oleh yang berwenang.
    if not public.has_permission(auth.uid(), 'users:manage') then
      raise exception 'Anda tidak memiliki izin users:manage untuk menghapus akun.';
    end if;
    return old;
  end if;

  -- UPDATE: hanya pihak berizin users:manage boleh mengubah peran legacy,
  -- peran halus, maupun status aktif. (Perlindungan `role`/`is_active` juga
  -- dimiliki trigger lama — di sini ditambah sebagai defense-in-depth plus
  -- `system_role` yang baru.)
  if (new.role is distinct from old.role)
     or (new.system_role is distinct from old.system_role)
     or (new.is_active is distinct from old.is_active) then
    if not public.has_permission(auth.uid(), 'users:manage') then
      raise exception 'Anda tidak memiliki izin users:manage untuk mengubah peran/aktif akun.';
    end if;
  end if;

  -- Super admin terakhir tidak boleh dinonaktifkan / diturunkan perannya
  -- (mencegah panel terkunci permanen).
  if old.system_role = 'SUPER_ADMIN'
     and old.is_active = true
     and (new.system_role is distinct from 'SUPER_ADMIN' or new.is_active = false) then
    if not exists (
      select 1 from public.user_profiles
      where system_role = 'SUPER_ADMIN' and is_active = true and id <> old.id
    ) then
      raise exception 'Tidak bisa menonaktifkan/menurunkan Super Admin terakhir.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_rbac_guard_privilege on public.user_profiles;
create trigger trg_rbac_guard_privilege
  before insert or update or delete on public.user_profiles
  for each row execute function public.rbac_guard_privilege();

-- ── Selesai ────────────────────────────────────────────────────────────────
-- Verifikasi (opsional):
--   select key, (select count(*) from role_permissions rp where rp.role_key = r.key)
--     as izin from roles r order by key;
--   select id, email, role, system_role, is_active from user_profiles
--     order by created_at;
