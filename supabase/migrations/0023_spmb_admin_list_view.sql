-- ============================================================================
-- 0023 — View daftar admin SPMB + index pencarian/filter
--
-- A. View `spmb_admin_registrations`: satu baris = satu pendaftar dengan
--    agregat verifikasi berkas + info gelombang + flag turunan yang dipakai
--    filter server-side panel admin (pagination, facet, "perlu tindakan").
--    `security_invoker = true` supaya RLS tabel dasar tetap berlaku: hanya
--    pemegang `spmb:read` yang bisa membaca (anon/publik tidak).
--
--    Kolom turunan:
--      doc_total      — jumlah berkas yang punya verifikasi tercatat
--      doc_verified   — yang berstatus verified
--      doc_rejected   — yang berstatus rejected
--      doc_pending    — verified/rejected ditolak? bukan: total - verified - rejected
--      uploaded_docs  — jumlah dari 5 kunci dokumen yang terisi (kk, akta,
--                       surat_sekolah, ktp_ortu, bukti_transfer)
--      wave_name      — nama gelombang (null bila tanpa gelombang)
--      wave_quota     — kuota gelombang (null bila tak diset)
--      is_overdue     — pending dan umur pendaftaran >= 3 hari (SLA)
--
-- B. Index untuk pencarian/filter daftar (melengkapi index 0015):
--    status, wave_id, registration_path, gender, created_at,
--    lower(full_name), lower(previous_school).
--
-- Idempoten. View di-drop + dibuat ulang (tidak ada dependensi lain).
-- ============================================================================

-- ── B. Index ─────────────────────────────────────────────────────────────────

create index if not exists spmb_reg_status_created_idx
  on public.spmb_registrations (status, created_at desc);
create index if not exists spmb_reg_wave_idx
  on public.spmb_registrations (wave_id);
create index if not exists spmb_reg_path_idx
  on public.spmb_registrations (registration_path);
create index if not exists spmb_reg_gender_idx
  on public.spmb_registrations (gender);
create index if not exists spmb_reg_name_lower_idx
  on public.spmb_registrations (lower(full_name));
create index if not exists spmb_reg_school_lower_idx
  on public.spmb_registrations (lower(previous_school));

-- ── A. View daftar admin ─────────────────────────────────────────────────────

drop view if exists public.spmb_admin_registrations;

create view public.spmb_admin_registrations
with (security_invoker = true) as
select
  r.*,
  coalesce(v.total, 0)    as doc_total,
  coalesce(v.verified, 0) as doc_verified,
  coalesce(v.rejected, 0) as doc_rejected,
  coalesce(v.total, 0) - coalesce(v.verified, 0) - coalesce(v.rejected, 0) as doc_pending,
  (
    (case when nullif(r.documents ->> 'kk', '') is not null then 1 else 0 end) +
    (case when nullif(r.documents ->> 'akta', '') is not null then 1 else 0 end) +
    (case when nullif(r.documents ->> 'surat_sekolah', '') is not null then 1 else 0 end) +
    (case when nullif(r.documents ->> 'ktp_ortu', '') is not null then 1 else 0 end) +
    (case when nullif(r.documents ->> 'bukti_transfer', '') is not null then 1 else 0 end)
  ) as uploaded_docs,
  coalesce(w.name, null) as wave_name,
  w.quota as wave_quota,
  (
    r.status = 'pending'
    and r.created_at < now() - interval '3 days'
  ) as is_overdue
from public.spmb_registrations r
left join lateral (
  select
    count(*)                                                        as total,
    count(*) filter (where s.status = 'verified')                    as verified,
    count(*) filter (where s.status = 'rejected')                    as rejected
  from public.spmb_document_verifications s
  where s.registration_id = r.id
) v on true
left join public.spmb_waves w on w.id = r.wave_id;

-- View tanpa RLS sendiri (security_invoker → policy tabel dasar berlaku).
-- Akses kolom tetap lewat policy spmb:read di spmb_registrations.
grant select on public.spmb_admin_registrations to authenticated;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select * from public.spmb_admin_registrations limit 1;
