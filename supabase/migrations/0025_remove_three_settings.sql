-- ============================================================================
-- 0025 — Hapus override settings ornamen 3D (fase clear-up Three.js).
--
-- Seluruh runtime 3D (three + @react-three/fiber), komponen
-- `src/components/three/`, route `/three`, dan 8 kunci registry `three_*`
-- dihapus dari kode pada commit yang sama. Baris override yang telanjur
-- tersimpan di tabel ini menjadi yatim: tidak dibaca kode baru
-- (`resolveSettings` hanya mengiterasi `SETTING_FIELDS`), tidak merusak
-- render — tetapi dibersihkan agar tabel tidak berisi sampah.
--
-- Idempoten (DELETE berulang aman). Pola LIKE + ESCAPE supaya hanya kunci
-- berprefix `three_` yang kena: `three_enabled`, `three_portal_enabled`,
-- `three_visi_enabled`, `three_profile_enabled`, `three_program_enabled`,
-- `three_color`, `three_accent_color`, `three_poster_url`.
-- ============================================================================

delete from public.site_settings where key like 'three\_%' escape '\';
