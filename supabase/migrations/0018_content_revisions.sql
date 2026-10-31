-- ============================================================================
-- 0018 — Riwayat revisi konten (version history + restore)
--
-- Snapshot jsonb per simpan/terbit berita/artikel (dan modul konten lain
-- kelak). Membaca isi sona pakai `entity_type` + `entity_id`, menampilkan
-- diff, lalu "Pulihkan" menulis revisi BARU (bukan menimpa histori lama).
--
-- Snapshot selip tanpa pidato: bentuk objek = payload yang dikirim POST/PUT
-- modul itu (bukan dump seluruh baris DB) supaya bisa langsung dipakai UI
-- restore.
--
-- Idempoten.
-- ============================================================================

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (char_length(entity_type) <= 40),
  entity_id uuid not null,
  snapshot jsonb not null,
  editor_id uuid references public.user_profiles(id) on delete set null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists content_revisions_entity_idx
  on public.content_revisions (entity_type, entity_id, created_at desc);
create index if not exists content_revisions_editor_idx
  on public.content_revisions (editor_id, created_at desc);

alter table public.content_revisions enable row level security;

do $$
begin
  -- Pembacaan/penulisan dipetakan izin per modul: entity_type 'news' →
  -- `berita:read` (dan tulis butuh `berita:update` di kode aplikasi). Mapping
  -- di sini hanya GATE dasar; penegakan detail ada di server action.
  if not exists (
    select 1 from pg_policies
     where tablename = 'content_revisions'
       and policyname = 'Content revisions read by module permission'
  ) then
    create policy "Content revisions read by module permission"
      on public.content_revisions for select
      to authenticated
      using (
        case entity_type
          when 'news'    then public.has_permission(auth.uid(), 'berita:read')
          when 'articles' then public.has_permission(auth.uid(), 'artikel:read')
          else false
        end
      );
  end if;

  if not exists (
    select 1 from pg_policies
     where tablename = 'content_revisions'
       and policyname = 'Content revisions write by editor'
  ) then
    create policy "Content revisions write by editor"
      on public.content_revisions for insert
      to authenticated
      with check (
        editor_id = auth.uid()
        and case entity_type
          when 'news'    then public.has_permission(auth.uid(), 'berita:update')
          when 'articles' then public.has_permission(auth.uid(), 'artikel:update')
          else false
        end
      );
  end if;
end $$;

grant select, insert on public.content_revisions to authenticated;

-- ── VERIFIKASI ──────────────────────────────────────────────────────────────
--   select policyname, cmd from pg_policies where tablename = 'content_revisions';
