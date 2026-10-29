-- ============================================================================
-- 0012 — Ganti izin peran dalam SATU transaksi
--
-- Server action lama melakukan `delete` lalu `insert` terpisah. Bila insert
-- gagal (jaringan/RLS), role bisa tertinggal tanpa izin. RPC ini menjalankan
-- keduanya dalam satu transaksi dan hanya boleh dipanggil pemegang
-- `users:manage` (SUPER_ADMIN tetap wildcard).
--
-- Idempoten.
-- ============================================================================

create or replace function public.replace_role_permissions(
  p_role_key text,
  p_permissions text[]
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.has_permission(auth.uid(), 'users:manage') then
    raise exception 'Tidak berizin mengubah izin peran.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.roles where key = p_role_key) then
    raise exception 'Peran tidak ditemukan: %', p_role_key using errcode = 'P0001';
  end if;

  delete from public.role_permissions where role_key = p_role_key;

  insert into public.role_permissions (role_key, permission)
  select p_role_key, unnest(p_permissions)
  on conflict (role_key, permission) do nothing;
end;
$function$;

revoke all on function public.replace_role_permissions(text, text[]) from public;
grant execute on function public.replace_role_permissions(text, text[]) to authenticated;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select public.replace_role_permissions('ADMIN_SEKOLAH', array['berita:read']);
--   select count(*) from public.role_permissions where role_key = 'ADMIN_SEKOLAH';
