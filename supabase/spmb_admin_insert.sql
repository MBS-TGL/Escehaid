-- Migration: izinkan ADMIN (login, role panel admin) menambah pendaftar SPMB
-- lewat panel /admin/admission — tombol "Tambah Pendaftar".
-- Dijalankan MANUAL di Supabase SQL Editor (aturan repo: assistant hanya
-- menulis statement; semua SQL dijalankan user). Idempoten — boleh diulang.
--
-- ── HASIL VERIFIKASI (probe read-only + probe insert anon, 14 Okt 2026) ─────
--   * SELECT anon  → 200 (policy SELECT menyaring; anon tidak melihat baris).
--   * INSERT anon dengan status='pending' + wave_id=null → 201 BERHASIL.
--     => ADA policy INSERT untuk anon, tetapi hanya menerima insert default
--        (form publik). Keputusan bisnis: jangan sentuh / jangan longgarkan.
--   * INSERT anon dengan status='accepted' / wave_id terisi → 42501 DITOLAK.
--     => Admin TIDAK bisa insert dengan status/wave_id/admin_notes pilihan
--        sendiri tanpa policy INSERT authenticated di bawah ini.
--   * Kebijakan lama TIDAK dihapus/diubah — hanya menambah policy baru untuk
--     role authenticated dengan lingkaran role yang sama dengan panel admin
--     (canAccessAdminPanel: developer/admin/publisher + is_active).
--
-- ── SETELAH MENJALANKAN ─────────────────────────────────────────────────────
--   * Panel "Tambah Pendaftar" langsung bisa menyimpan (termasuk "Diterima",
--     gelombang pilihan, dan catatan admin).
--   * Bila lupa: pesan error panel menunjuk berkas ini.
--   * Verifikasi: select tablename, policyname, roles, cmd
--       from pg_policies
--      where tablename in ('spmb_registrations', 'objects')
--        and policyname like '%admin%';

-- ── 1) Tabel: INSERT untuk admin yang login ────────────────────────────────
-- GRANT dulu (tanpa ini RLS tidak sempat dinilai → 42501 "permission denied
-- for table", pola sama dengan catatan di audit_logs.sql).
grant insert on public.spmb_registrations to authenticated;

drop policy if exists "spmb_registrations admin insert" on public.spmb_registrations;
create policy "spmb_registrations admin insert"
  on public.spmb_registrations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_profiles
      where user_profiles.id = auth.uid()
        and user_profiles.is_active = true
        and user_profiles.role in ('developer', 'admin', 'publisher')
    )
  );

-- WITH CHECK di atas mengizinkan status ('pending'|'accepted'|'rejected'),
-- wave_id apa pun (termasuk null), dan admin_notes apa pun — sesuai CHECK
-- constraint tabel. TIDAK ada perubahan pada policy anon yang sudah ada.

-- ── 2) Storage: admin boleh upload (+hapus, untuk cleanup gagal simpan) ────
-- Bucket spmb-documents privat. Policy SELECT admin yang sudah ada tidak
-- disentuh. Hanya ditambah: INSERT (upload) & DELETE (cleanup best-effort
-- saat insert gagal + fitur Media library) untuk lingkaran admin aktif.
do $$
begin
  if exists (select 1 from storage.buckets where id = 'spmb-documents') then
    drop policy if exists "spmb-documents admin upload" on storage.objects;
    create policy "spmb-documents admin upload"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'spmb-documents'
        and exists (
          select 1
          from public.user_profiles
          where user_profiles.id = auth.uid()
            and user_profiles.is_active = true
            and user_profiles.role in ('developer', 'admin', 'publisher')
        )
      );

    drop policy if exists "spmb-documents admin delete" on storage.objects;
    create policy "spmb-documents admin delete"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'spmb-documents'
        and exists (
          select 1
          from public.user_profiles
          where user_profiles.id = auth.uid()
            and user_profiles.is_active = true
            and user_profiles.role in ('developer', 'admin', 'publisher')
        )
      );
  end if;
end $$;

-- ── 3) Bersihkan baris sisa verifikasi RLS (probe) ──────────────────────────
-- Baris dibuat saat probe kebijakan insert anon dan tidak bisa dihapus dari
-- sisi anon (GRANT DELETE hanya untuk authenticated). Aman dijalankan ulang.
-- Nama probe yang dipakai: '__PROBE_RLS__' dan 'SPMB Probe ...'.
delete from public.spmb_registrations
where full_name = '__PROBE_RLS__'
   or full_name ilike 'SPMB Probe%';
