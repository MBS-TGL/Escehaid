-- ============================================================================
-- 0009 — Normalisasi `school_profile.mission` ke teks satu butir per baris
--
-- MENGAPA
-- Kolom `mission` menyimpan JSON array of string (peninggalan impor awal).
-- Sejak /admin/settings dapat mengedit visi & misi, nilai kolom ini juga
-- ditampilkan di textarea — JSON mentah sulit dibaca/diedit manusia.
--
-- Kode sudah toleran terhadap kedua format (`missionToItems` di
-- src/lib/site-content.ts menerima JSON array, teks bernomor, atau baris),
-- jadi migrasi ini murni merapikan data: setelah dijalankan, textarea
-- menampilkan butir yang bisa langsung diedit.
--
-- Idempoten: hanya menyentuh baris yang diawali '[' DAN valid sebagai JSON
-- array. Nilai teks biasa (atau JSON rusak) dibiarkan apa adanya.
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select ctid, mission
      from public.school_profile
     where coalesce(btrim(mission), '') like '[%'
  loop
    begin
      if jsonb_typeof(r.mission::jsonb) = 'array' then
        update public.school_profile p
           set mission = (
                 select string_agg(value, E'\n' order by ord)
                   from jsonb_array_elements_text(r.mission::jsonb) with ordinality as t(value, ord)
               )
         where p.ctid = r.ctid;
      end if;
    exception
      when others then
        -- Bukan JSON valid; biarkan nilai aslinya.
        null;
    end;
  end loop;
end $$;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
-- 1. Tidak ada lagi mission berformat JSON array:
--
--   select count(*) from public.school_profile
--    where coalesce(btrim(mission), '') like '[%';
--   -- harus 0 (kecuali memang teks biasa yang kebetulan diawali '[')
--
-- 2. Isi tetap lengkap (enam butir, satu per baris):
--
--   select mission from public.school_profile;
