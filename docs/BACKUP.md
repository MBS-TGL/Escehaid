# Runbook Backup & Restore

> Pendamping fitur "Cadangan" (`/admin/backup`) dan workflow GitHub Actions
> `Backup` (`.github/workflows/backup.yml`).

## Apa yang di-backup

| Objek | Isi | Jadwal |
|---|---|---|
| Database (public schema) | tabel, enum, fungsi, trigger, RLS, index, FK + seluruh data | harian 02:30 WIB |
| auth.users + storage.buckets | akun admin + konfigurasi bucket (via `backup-db-extras.mjs`) | ikut paket DB |
| Media (R2) | **tidak termasuk** — media sudah di Cloudflare R2 sebagai penyimpanan utama; aktifkan object versioning/lifecycle R2 untuk proteksi tambahan | — |

Hasil: `backups/db-<YYYY-MM-DD>.tar.gz` di bucket R2 **privat**
(`R2_PRIVATE_BUCKET`, default `esceha-private`), rotasi otomatis 30 hari,
ringkasan di `backups/manifest.json` (dibaca halaman admin).

## Setup sekali (GitHub Secrets)

Repo → Settings → Secrets and variables → Actions:

- `DATABASE_URL` — `postgresql://postgres.<ref>:<password>@...pooler.supabase.com:6543/postgres`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — kredensial S3 R2 (sama dengan yang dipakai aplikasi)
- `R2_PRIVATE_BUCKET` — opsional (default `esceha-private`)
- `BACKUP_GH_TOKEN` + `BACKUP_GH_REPO` (Vercel env, opsional) — untuk tombol
  "Backup sekarang" dari admin: fine-grained PAT dengan izin **Actions: write**
  pada repo ini; `BACKUP_GH_REPO` mis. `MBS-TGL/Escehaid`.

## Uji lokal

```bash
node scripts/backup-scheduled.mjs --dry-run   # dump + tar, tanpa upload
```

## Cara restore

1. **Ambil backup**: unduh `backups/db-<tanggal>.tar.gz` dari bucket R2 privat
   (dashboard Cloudflare / aws cli), ekstrak → folder `supabase_backup/`
   berisi `schema_full.sql`, `data.sql`, `table_counts.json`, `auth_users.sql`,
   `storage_restore.sql`.
2. **Baca `restore-new-project.mjs`** — script restore berpanduan untuk
   project Supabase baru/kosong. Sesuaikan `DATABASE_URL` tujuan, lalu ikuti
   urutan: schema → data → auth_users → storage_restore.
3. **Verifikasi**: bandingkan `table_counts.json` dengan hasil
   `SELECT count(*)` per tabel di target; login admin uji coba; buka beranda.
4. **SQL migrasi terbaru**: cek git log `supabase/*.sql` setelah tanggal
   backup — jalankan ulang yang belum termasuk.
5. Bila hanya butuh satu tabel/kolom, `data.sql` bisa dipotong manual
   (urutan insert sudah topologi FK).

## Kontak & catatan

- Workflow gagal = email GitHub + halaman `/admin/backup` menunjukkan umur
  backup >7 hari (badge kuning/merah).
- Jangan pernah commit `supabase_backup/` — berisi data pribadi PPDB.
