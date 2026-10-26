-- ============================================================================
-- 0003 — RLS konten: dari role legacy → izin halus
--
-- MASALAH
-- Seluruh modul konten menulis LANGSUNG dari browser ke PostgREST
-- (`src/lib/queries/*.ts` memakai klien anon). Penegakan sesungguhnya karenanya
-- ada di RLS, bukan di `can()` (itu hanya kosmetik UI). Policy yang ada masih
-- berbasis role legacy:
--
--     current_user_role() = ANY ('developer','admin','publisher')
--
-- Akibat konkret: seorang PANITIA_SPMB (legacy `admin`) bisa menulis berita,
-- galeri, dan fasilitas lewat API walau tidak punya `berita:update`. Tombolnya
-- disembunyikan di UI, tapi API-nya terbuka.
--
-- APA YANG DIUBAH
-- Policy tulis (INSERT/UPDATE/DELETE) memakai `has_permission()` dengan izin
-- modulnya. Policy SELECT publik (`is_published` / `is_active`) TIDAK disentuh —
-- pembaca anonim tetap seperti sekarang.
--
-- ⚠️ PREFLIGHT WAJIB — skrip ini MENOLAK JALAN bila datanya belum siap.
-- Blok `do $$` di bawah memeriksa bahwa setiap akun panel aktif benar-benar
-- punya minimal satu izin tulis. Bila tidak, seluruh transaksi dibatalkan
-- dengan pesan jelas, alih-alih diam-diam mengunci operator dari menyimpan.
--
-- Prasyarat: 0001 (backfill) dan 0002 (has_permission) sudah diterapkan.
-- Idempoten: drop policy if exists → create policy.
-- ============================================================================

-- ── PREFLIGHT ───────────────────────────────────────────────────────────────
do $$
declare
  v_orphan int;
  v_no_role int;
  v_list   text;
begin
  -- (1) Tidak boleh ada akun panel aktif tanpa system_role — kalau ada,
  --     `has_permission()` akan menolak semuanya dan operator kehilangan
  --     kemampuan menyimpan.
  select count(*) into v_no_role
    from public.user_profiles
   where is_active = true
     and system_role is null
     and role in ('developer', 'admin', 'publisher');

  if v_no_role > 0 then
    raise exception
      'PREFLIGHT GAGAL: % akun panel aktif masih system_role NULL. Jalankan 0001_backfill_system_role.sql lebih dulu, lalu ulangi.',
      v_no_role;
  end if;

  -- (2) Setiap akun panel aktif harus lolos minimal satu izin tulis konten.
  --     Akun yang hanya punya izin baca memang sah — jadi yang dicari adalah
  --     akun yang TIDAK punya satu pun izin tulis pada modul apa pun.
  select count(*), string_agg(coalesce(p.email, p.id::text), ', ')
    into v_orphan, v_list
    from public.user_profiles p
   where p.is_active = true
     and p.system_role is not null
     and p.system_role <> 'SUPER_ADMIN'
     and not (
       public.has_permission(p.id, 'berita:create')
       or public.has_permission(p.id, 'artikel:create')
       or public.has_permission(p.id, 'pengumuman:create')
       or public.has_permission(p.id, 'kegiatan:create')
       or public.has_permission(p.id, 'agenda:create')
       or public.has_permission(p.id, 'galeri:create')
       or public.has_permission(p.id, 'unduhan:create')
       or public.has_permission(p.id, 'prestasi:create')
       or public.has_permission(p.id, 'guru:create')
       or public.has_permission(p.id, 'fasilitas:create')
       or public.has_permission(p.id, 'ekskul:create')
       or public.has_permission(p.id, 'portal:create')
       or public.has_permission(p.id, 'faq:create')
       or public.has_permission(p.id, 'program:update')
       or public.has_permission(p.id, 'spmb:update')
       or public.has_permission(p.id, 'kontak:update')
       or public.has_permission(p.id, 'sampah:update')
     );

  if v_orphan > 0 then
    raise exception
      'PREFLIGHT GAGAL: % akun aktif tidak punya izin tulis apa pun (%). Periksa role_permissions untuk peran mereka sebelum mengaktifkan penegakan RLS.',
      v_orphan, coalesce(v_list, '-');
  end if;

  raise notice 'PREFLIGHT OK: semua akun panel aktif punya setidaknya satu izin tulis.';
end $$;

-- ── Ketahanan: lewati tabel yang belum ada ──────────────────────────────────
-- Beberapa tabel lahir dari SQL manual terpisah (faqs ← supabase/faq.sql,
-- ekskuls ← supabase/ekskul.sql, program ← supabase/program.sql, downloads ←
-- SQL yang hilang dari repo). Bila salah satunya belum pernah dibuat di DB
-- target, `drop policy ... on public.tabel` akan menggagalkan SELURUH transaksi
-- dan tidak ada policy yang diperbarui.
--
-- Solusi: policy per tabel dibungkus blok `do` yang melewati tabel yang tidak
-- ada. Tabel inti (news, articles, dst.) selalu ada, tapi guard ini membuat
-- migrasi tetap bisa diterapkan di DB yang belum lengkap — lebih baik sebagian
-- diperketat daripada tidak sama sekali, dan `raise notice` menandainya.
--
-- Pola tiap tabel tetap sama:
--     read   : <filter publik> OR has_permission(...:read)
--     insert : has_permission(...:create)
--     update : has_permission(...:update)
--     delete : has_permission(...:delete)
--
-- ⚠️ PENTING — policy SELECT admin WAJIB ada di setiap tabel yang punya filter
-- publik (`is_published` / `is_active`). Policy "manage" yang lama memberi admin
-- SELECT atas SEMUA baris; kalau hanya policy publik yang tersisa, panel admin
-- kehilangan baris draft/nonaktif (daftar tampak kosong).
-- Idempoten: drop policy if exists.

do $$
declare
  -- [tabel, modul-izin, kolom-filter-publik]
  -- kolom filter NULL = tabel sepenuhnya publik (tidak perlu policy read admin).
  spec text[][];
  s    text[];
  t    text;
  m    text;
  col  text;
  -- kolom kunci baris untuk pesan notice
  missing text[] := '{}';
begin
  spec := array[
    array['news'::text,              'berita'::text,     'is_published'::text],
    array['articles'::text,          'artikel'::text,    'is_published'::text],
    array['activities'::text,        'kegiatan'::text,   'is_published'::text],
    array['gallery'::text,           'galeri'::text,     null::text],
    array['announcements'::text,     'pengumuman'::text, 'is_active'::text],
    array['agenda_events'::text,     'agenda'::text,     'is_active'::text],
    array['achievements'::text,      'prestasi'::text,   null::text],
    array['facilities'::text,        'fasilitas'::text,  'is_active'::text],
    array['teachers'::text,          'guru'::text,       'is_active'::text],
    array['downloads'::text,         'unduhan'::text,    'is_active'::text],
    array['portal_apps'::text,       'portal'::text,     'is_active'::text],
    array['faqs'::text,              'faq'::text,        'is_active'::text],
    array['ekskuls'::text,           'ekskul'::text,     'is_active'::text]
  ];

  foreach s slice 1 in array spec loop
    t   := s[1];
    m   := s[2];
    col := s[3];

    if to_regclass('public.' || t) is null then
      missing := missing || t;
      continue;
    end if;

    -- Hapus policy lama (nama bervariasi antar tabel — semuanya didaftarkan).
    execute format('drop policy if exists %I on public.%I', 'Editors can manage ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Admins can manage ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Panel roles can manage ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Panel roles manage ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Publishers can manage ' || t, t);
    execute format('drop policy if exists %I on public.%I', t || ' read', t);
    execute format('drop policy if exists %I on public.%I', t || ' insert', t);
    execute format('drop policy if exists %I on public.%I', t || ' update', t);
    execute format('drop policy if exists %I on public.%I', t || ' delete', t);

    -- Policy nama khusus (tabel dengan nama policy historis berbeda).
    if t = 'announcements' then
      execute 'drop policy if exists "Admins can manage announcements" on public.announcements';
    elsif t = 'agenda_events' then
      execute 'drop policy if exists "Admins can manage agenda events" on public.agenda_events';
    elsif t = 'portal_apps' then
      execute 'drop policy if exists "portal_apps_admin_write" on public.portal_apps';
    elsif t = 'downloads' then
      execute 'drop policy if exists "Panel roles can manage downloads" on public.downloads';
    elsif t = 'faqs' then
      execute 'drop policy if exists "Admins can manage faq" on public.faqs';
      execute 'drop policy if exists "Panel roles manage faq" on public.faqs';
    elsif t = 'ekskuls' then
      execute 'drop policy if exists "Admins can manage ekskul" on public.ekskuls';
      execute 'drop policy if exists "Panel roles manage ekskul" on public.ekskuls';
    elsif t = 'achievements' then
      execute 'drop policy if exists "Admins can manage achievements" on public.achievements';
      execute 'drop policy if exists "Publishers can manage achievements" on public.achievements';
      execute 'drop policy if exists "Panel roles manage achievements" on public.achievements';
    end if;

    -- READ: baris publik tetap terbaca anon; admin melihat semua baris.
    if col is not null then
      execute format(
        'create policy %I on public.%I for select using (%s = true or public.has_permission(auth.uid(), %L))',
        t || ' read', t, col, m || ':read');
    end if;

    execute format(
      'create policy %I on public.%I for insert with check (public.has_permission(auth.uid(), %L))',
      t || ' insert', t, m || ':create');
    execute format(
      'create policy %I on public.%I for update using (public.has_permission(auth.uid(), %L)) with check (public.has_permission(auth.uid(), %L))',
      t || ' update', t, m || ':update', m || ':update');
    execute format(
      'create policy %I on public.%I for delete using (public.has_permission(auth.uid(), %L))',
      t || ' delete', t, m || ':delete');
  end loop;

  if array_length(missing, 1) > 0 then
    raise notice 'Dilewati (tabel belum ada): %', array_to_string(missing, ', ');
  end if;
end $$;

-- ── program (quran_pillars, agenda_blocks, agenda_slots) ────────────────────
-- Ketiganya memakai izin `program:update` (tidak ada create/delete terpisah:
-- halaman /admin/program hanya mengedit baris yang sudah ada).
-- Tabel lahir dari supabase/program.sql → dilewati bila belum dibuat.
do $$
declare
  t text;
  missing text[] := '{}';
begin
  foreach t in array array['quran_pillars', 'agenda_blocks', 'agenda_slots'] loop
    if to_regclass('public.' || t) is null then
      missing := missing || t;
      continue;
    end if;

    execute format('drop policy if exists %I on public.%I', 'Admins can manage program', t);
    execute format('drop policy if exists %I on public.%I', 'Panel roles manage program', t);
    execute format('drop policy if exists %I on public.%I', 'program read', t);
    execute format('drop policy if exists %I on public.%I', 'program update', t);
    execute format('drop policy if exists %I on public.%I', 'program insert', t);
    execute format('drop policy if exists %I on public.%I', 'program delete', t);
    execute format(
      'create policy %I on public.%I for select using (is_active = true or public.has_permission(auth.uid(), %L))',
      'program read', t, 'program:read');
    execute format(
      'create policy %I on public.%I for insert with check (public.has_permission(auth.uid(), %L))',
      'program insert', t, 'program:update');
    execute format(
      'create policy %I on public.%I for update using (public.has_permission(auth.uid(), %L)) with check (public.has_permission(auth.uid(), %L))',
      'program update', t, 'program:update', 'program:update');
    execute format(
      'create policy %I on public.%I for delete using (public.has_permission(auth.uid(), %L))',
      'program delete', t, 'program:update');
  end loop;

  if array_length(missing, 1) > 0 then
    raise notice 'Program dilewati (tabel belum ada): %', array_to_string(missing, ', ');
  end if;
end $$;

-- ── contact_messages ────────────────────────────────────────────────────────
-- Policy INSERT publik (`is_read = false`) TIDAK disentuh — formulir kontak
-- harus tetap bisa dipakai anon.
drop policy if exists "Admins can manage contact messages" on public.contact_messages;
drop policy if exists "contact_messages select" on public.contact_messages;
drop policy if exists "contact_messages update" on public.contact_messages;
drop policy if exists "contact_messages delete" on public.contact_messages;
create policy "contact_messages select" on public.contact_messages for select
  using (public.has_permission(auth.uid(), 'kontak:read'));
create policy "contact_messages update" on public.contact_messages for update
  using (public.has_permission(auth.uid(), 'kontak:update'))
  with check (public.has_permission(auth.uid(), 'kontak:update'));
create policy "contact_messages delete" on public.contact_messages for delete
  using (public.has_permission(auth.uid(), 'kontak:delete'));

-- ── spmb_registrations ──────────────────────────────────────────────────────
-- Policy INSERT publik (`status = 'pending'`) TIDAK disentuh — pendaftaran
-- anon harus tetap jalan. Policy "admin insert" diganti izin `spmb:create`.
drop policy if exists "Admins can manage registrations" on public.spmb_registrations;
drop policy if exists "spmb_registrations admin insert" on public.spmb_registrations;
drop policy if exists "spmb_registrations select" on public.spmb_registrations;
drop policy if exists "spmb_registrations insert" on public.spmb_registrations;
drop policy if exists "spmb_registrations update" on public.spmb_registrations;
drop policy if exists "spmb_registrations delete" on public.spmb_registrations;
create policy "spmb_registrations select" on public.spmb_registrations for select
  using (public.has_permission(auth.uid(), 'spmb:read'));
create policy "spmb_registrations insert" on public.spmb_registrations for insert
  with check (public.has_permission(auth.uid(), 'spmb:create'));
create policy "spmb_registrations update" on public.spmb_registrations for update
  using (public.has_permission(auth.uid(), 'spmb:update'))
  with check (public.has_permission(auth.uid(), 'spmb:update'));
create policy "spmb_registrations delete" on public.spmb_registrations for delete
  using (public.has_permission(auth.uid(), 'spmb:delete'));

-- ── spmb_waves ──────────────────────────────────────────────────────────────
drop policy if exists "Admins can manage SPMB waves" on public.spmb_waves;
drop policy if exists "spmb_waves insert" on public.spmb_waves;
drop policy if exists "spmb_waves update" on public.spmb_waves;
drop policy if exists "spmb_waves delete" on public.spmb_waves;
create policy "spmb_waves insert" on public.spmb_waves for insert
  with check (public.has_permission(auth.uid(), 'spmb:update'));
create policy "spmb_waves update" on public.spmb_waves for update
  using (public.has_permission(auth.uid(), 'spmb:update'))
  with check (public.has_permission(auth.uid(), 'spmb:update'));
create policy "spmb_waves delete" on public.spmb_waves for delete
  using (public.has_permission(auth.uid(), 'spmb:delete'));

-- ── school_profile ──────────────────────────────────────────────────────────
-- Profil sekolah diubah dari halaman SPMB & Pengaturan Situs.
drop policy if exists "Admins can manage school profile" on public.school_profile;
drop policy if exists "school_profile update" on public.school_profile;
create policy "school_profile update" on public.school_profile for update
  using (
    public.has_permission(auth.uid(), 'spmb:update')
    or public.has_permission(auth.uid(), 'settings:manage')
  )
  with check (
    public.has_permission(auth.uid(), 'spmb:update')
    or public.has_permission(auth.uid(), 'settings:manage')
  );

-- ── categories ──────────────────────────────────────────────────────────────
-- Policy lama: `for all to authenticated using (true) with check (true)` —
-- artinya SETIAP user login (termasuk murid) bisa mengubah kategori. Tidak ada
-- satu pun penulis di `src/` (sudah diverifikasi), jadi tulis dibatasi ke
-- pemegang izin konten. SELECT publik dipertahankan.
drop policy if exists "Authenticated can manage categories" on public.categories;
drop policy if exists "categories insert" on public.categories;
drop policy if exists "categories update" on public.categories;
drop policy if exists "categories delete" on public.categories;
create policy "categories insert" on public.categories for insert
  with check (public.has_permission(auth.uid(), 'berita:create'));
create policy "categories update" on public.categories for update
  using (public.has_permission(auth.uid(), 'berita:update'))
  with check (public.has_permission(auth.uid(), 'berita:update'));
create policy "categories delete" on public.categories for delete
  using (public.has_permission(auth.uid(), 'berita:delete'));

-- ── Sampah (soft delete) ────────────────────────────────────────────────────
-- Restore/purge dari /admin/trash menulis `deleted_at` di 8 tabel konten.
-- Update/delete-nya sudah tercakup policy per modul di atas; `sampah:*` dipakai
-- untuk gating halaman & tombol, bukan untuk melewati izin modul. Keputusan
-- sadar: operator dengan `sampah:update` tapi tanpa `berita:update` TIDAK bisa
-- memulihkan berita — pemulihan = menulis data modul tersebut.

-- ── VERIFIKASI SETELAH DITERAPKAN ───────────────────────────────────────────
--   -- daftar policy tulis yang masih memakai role legacy (harus kosong):
--   select schemaname, tablename, policyname
--     from pg_policies
--    where schemaname = 'public'
--      and (coalesce(qual,'') like '%current_user_role%'
--           or coalesce(with_check,'') like '%current_user_role%');
--
--   -- uji fungsional (login sebagai PANITIA_SPMB di panel):
--     /admin/news → tombol Tambah tidak muncul; POST langsung ke
--     /rest/v1/news dengan sesi itu harus 403.
