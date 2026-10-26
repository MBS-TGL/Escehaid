-- ============================================================================
-- 0002 — Tutup eskalasi hak & rapikan GRANT fungsi/audit
--
-- Empat perubahan:
--   A. `has_permission()` tidak lagi meloloskan SEMUA izin bagi user legacy.
--   B. `rbac_guard_privilege()` menutup celah kolom profil yang bisa ditulis
--      sendiri (email & must_change_password).
--   C. REVOKE EXECUTE fungsi internal dari PUBLIC/anon.
--   D. REVOKE TRUNCATE dari anon (RLS tidak berlaku untuk TRUNCATE).
--
-- Urutan wajib: jalankan 0001 LEBIH DULU. Tanpa backfill, mengubah
-- `has_permission()` akan mencabut akses admin legacy yang masih
-- `system_role IS NULL`.
--
-- Idempoten: create or replace + revoke/grant berulang aman.
-- ============================================================================

-- ── A. has_permission(): fallback legacy jadi sempit ────────────────────────
--
-- Versi lama (schema_full.sql:950-952):
--     if v_legacy in ('developer','admin','publisher') then return true;
-- → user mana pun dari ketiga role itu lolos SETIAP izin, termasuk
--   `users:manage`. Itu yang membuat eskalasi lewat PATCH profil mungkin.
--
-- Versi baru: fallback hanya berlaku bila tabel `role_permissions` benar-benar
-- KOSONG (RBAC belum di-bootstrap sama sekali). Begitu ada isinya, penilaian
-- memakai peran halus saja. Dengan 0001 sudah dijalankan, `system_role` selalu
-- terisi untuk akun panel, sehingga cabang fallback tidak lagi tercapai.
create or replace function public.has_permission(p_uid uuid, p_permission text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role      text;
  v_legacy    text;
  v_cnt       int;
  v_bootstrapped boolean;
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

  -- system_role NULL (hanya mungkin untuk akun yang belum di-backfill).
  -- Jangan beri izin apa pun bila RBAC sudah punya data: fallback "semua
  -- boleh" adalah jalur eskalasi, bukan degradasi anggun.
  select exists(select 1 from public.role_permissions) into v_bootstrapped;
  if v_bootstrapped then
    return false;
  end if;

  -- RBAC belum di-bootstrap (tabel kosong): pertahankan perilaku lama supaya
  -- panel tidak terkunci sebelum migrasi role dijalankan.
  if v_legacy in ('developer', 'admin', 'publisher') then
    return true;
  end if;
  return false;
end;
$function$;

-- ── B. rbac_guard_privilege(): kolom profil yang sensitif ───────────────────
--
-- Policy `Users can update own profile` membatasi per BARIS, bukan per KOLOM.
-- Tanpa guard ini, user bisa PATCH barisnya sendiri dan mengubah kolom apa pun.
-- `system_role` / `role` / `is_active` sudah dijaga. Yang belum:
--   • `email`                — mengacaukan audit & pencarian akun.
--   • `must_change_password` — mengubah true→false = melewati paksa ganti sandi
--                              yang disetel admin setelah reset.
--
-- Catatan jujur soal sisa celah: arah true→false pada `must_change_password`
-- SENGAJA diizinkan untuk diri sendiri, karena itulah yang dilakukan alur
-- ganti-sandi yang sah (/api/auth/change-password) setelah sandi benar-benar
-- berubah. Konsekuensinya, user yang tahu endpoint itu masih bisa menghapus
-- flag tanpa mengganti sandi. Menutupnya sepenuhnya butuh RPC yang memverifikasi
-- sandi lebih dulu — di luar cakupan migrasi ini dan dicatat sebagai utang.
create or replace function public.rbac_guard_privilege()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Operasi sistem (signup trigger / service role) tidak membawa JWT.
  if auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.has_permission(auth.uid(), 'users:manage') then
      raise exception 'Anda tidak memiliki izin users:manage untuk membuat akun.';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if not public.has_permission(auth.uid(), 'users:manage') then
      raise exception 'Anda tidak memiliki izin users:manage untuk menghapus akun.';
    end if;
    return old;
  end if;

  -- UPDATE: peran, status aktif, email, dan pemaksaan ganti sandi hanya boleh
  -- diubah oleh pemegang users:manage — kecuali user membersihkan flag
  -- must_change_password miliknya sendiri (alur ganti sandi yang sah).
  if (new.role is distinct from old.role)
     or (new.system_role is distinct from old.system_role)
     or (new.is_active is distinct from old.is_active)
     or (new.email is distinct from old.email) then
    if not public.has_permission(auth.uid(), 'users:manage') then
      raise exception 'Anda tidak memiliki izin users:manage untuk mengubah peran/aktif/email akun.';
    end if;
  end if;

  if (new.must_change_password is distinct from old.must_change_password) then
    -- Diizinkan: baris sendiri, dan hanya mencabut kewajiban (true → false).
    if not (new.id = auth.uid() and new.must_change_password = false) then
      if not public.has_permission(auth.uid(), 'users:manage') then
        raise exception 'Hanya pengelola pengguna yang boleh mengubah status wajib ganti sandi.';
      end if;
    end if;
  end if;

  -- Super admin terakhir tidak boleh dinonaktifkan / diturunkan perannya.
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
$function$;

-- ── C. Hak eksekusi fungsi internal ─────────────────────────────────────────
--
-- ⚠️ JANGAN mencabut EXECUTE `has_permission()` dari `anon`.
-- Ekspresi policy RLS dievaluasi dengan hak user yang menjalankan query, dan
-- hak EXECUTE fungsi ikut diperiksa. Policy publik berbentuk
-- `is_published = true or has_permission(auth.uid(), 'berita:read')` — bila
-- anon tidak boleh mengeksekusi fungsi itu, seluruh SELECT publik GAGAL dengan
-- "permission denied for function has_permission", bukan sekadar false.
-- Itu mematikan semua halaman publik. Risiko membiarkannya terbuka kecil:
-- fungsi hanya mengembalikan boolean dan butuh UUID yang sudah diketahui.
grant execute on function public.has_permission(uuid, text) to anon, authenticated;

-- `log_activity()` TIDAK dipanggil policy mana pun — hanya dari server action
-- dengan sesi user. Default PostgreSQL memberi EXECUTE ke PUBLIC, sehingga
-- `anon` bisa `POST /rest/v1/rpc/log_activity` dan MENYISIPKAN baris audit
-- palsu beraktor "Sistem". Itu merusak kepercayaan log, jadi dicabut.
revoke all on function public.log_activity(text, text, text, jsonb) from public;
revoke all on function public.log_activity(text, text, text, jsonb) from anon;
grant execute on function public.log_activity(text, text, text, jsonb) to authenticated;

-- `log_audit()` adalah fungsi trigger. PostgreSQL tidak memeriksa EXECUTE untuk
-- pemanggilan trigger, jadi mencabutnya aman; yang penting tidak bisa dipanggil
-- lewat RPC oleh anon.
revoke all on function public.log_audit() from anon;

-- ── D. TRUNCATE dari anon ───────────────────────────────────────────────────
--
-- RLS TIDAK berlaku untuk TRUNCATE. `grants.sql:19-21` memberi anon
-- TRUNCATE pada audit_logs (dan pola sama pada banyak tabel lain), sehingga
-- seluruh jejak audit bisa dihapus. TRUNCATE tidak pernah dibutuhkan lewat
-- PostgREST — cabut dari anon & authenticated untuk tabel audit.
do $$
begin
  if to_regclass('public.audit_logs') is not null then
    execute 'revoke truncate, references, trigger on public.audit_logs from anon';
    execute 'revoke truncate, references, trigger on public.audit_logs from authenticated';
  end if;
end $$;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   -- tidak boleh ada lagi user panel dengan system_role NULL:
--   select count(*) from public.user_profiles
--    where system_role is null and role in ('developer','admin','publisher');
--
--   -- fallback tidak lagi memberi izin bila RBAC sudah terisi:
--   select public.has_permission(
--     (select id from public.user_profiles where system_role is null limit 1),
--     'users:manage');
--
--   -- anon tidak boleh bisa eksekusi log_activity:
--   --   curl -X POST "$URL/rest/v1/rpc/log_activity" -H "apikey: $ANON" ...
--   --   → 401/403, bukan 204.
