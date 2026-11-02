-- ============================================================================
-- 0022 — Daftar ulang & pembayaran SPMB + template WA tambahan
--
-- A. Alur pasca-diterima (admin-only, tanpa permukaan publik baru):
--    - reregistration_status: not_started → invited → submitted → verified
--      (atau declined bila batal). `verified` = resmi terdaftar.
--    - payment_status: unpaid → pending → verified (atau rejected),
--      melengkapi bukti_transfer yang sudah ada sebagai dokumen.
--    - payment_amount default diambil dari wave.registration_fee di UI
--      (bukan di DB), agar satu kolom fleksibel untuk beasiswa/potongan.
--
-- B. Template WA (0022 melengkapi seed 0015): undangan wawancara,
--    pengingat pending/berkas kurang, undangan daftar ulang.
--    Placeholder yang didukung fillSpmbTemplate(): {nama}, {orang_tua},
--    {gelombang}, {jalur}, {program}, {nisn}.
--
-- Idempoten. RLS: update memakai policy spmb:update yang sudah ada;
-- audit trigger spmb_registrations mencatat perubahan otomatis.
-- ============================================================================

alter table public.spmb_registrations
  add column if not exists reregistration_status text not null default 'not_started'
    check (reregistration_status in ('not_started', 'invited', 'submitted', 'verified', 'declined')),
  add column if not exists reregistration_at timestamptz,
  add column if not exists reregistration_note text not null default '',
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'verified', 'rejected')),
  add column if not exists payment_amount numeric(12, 2),
  add column if not exists paid_at timestamptz,
  add column if not exists payment_note text not null default '',
  add column if not exists payment_verified_by uuid references public.user_profiles(id) on delete set null,
  add column if not exists payment_verified_at timestamptz;

create index if not exists spmb_reg_rereg_status_idx
  on public.spmb_registrations (reregistration_status);
create index if not exists spmb_reg_payment_status_idx
  on public.spmb_registrations (payment_status);

-- Template WA tambahan (0015 men-seed accepted/rejected/incomplete_docs).
insert into public.spmb_message_templates (key, label, body, sort_order) values
  ('interview_invite', 'Undangan Wawancara',
   'Assalamu''alaikum {nama}, Anda diundang wawancara SPMB {gelombang} SMP Muhammadiyah 4 Tanggul. Jadwal tercantum pada pengumuman panitia. NISN: {nisn}.',
   4),
  ('reminder_pending', 'Pengingat Status',
   'Assalamu''alaikum {nama}, pendaftaran SPMB {gelombang} Anda masih dalam proses verifikasi panitia. Pastikan berkas sudah lengkap. NISN: {nisn}.',
   5),
  ('reminder_docs', 'Pengingat Berkas',
   'Assalamu''alaikum {nama}, masih ada berkas SPMB {gelombang} yang belum lengkap/terverifikasi. Mohon lengkapi segera agar seleksi tidak tertunda. NISN: {nisn}.',
   6),
  ('reregistration', 'Undangan Daftar Ulang',
   'Assalamu''alaikum {nama}, selamat! Silakan lakukan daftar ulang SPMB {gelombang} SMP Muhammadiyah 4 Tanggul sesuai jadwal panitia. NISN: {nisn}.',
   7)
on conflict (key) do nothing;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'spmb_registrations'
--      and column_name in ('reregistration_status','payment_status');
--   select key, label from public.spmb_message_templates order by sort_order;
