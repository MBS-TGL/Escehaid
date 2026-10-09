# Operasional — Rollback Deploy & Backup Supabase

> Berlaku untuk deploy di **Vercel** (lihat `REMINDER_DOMAIN.md`) dengan database
> **Supabase** bersama (`localhost` memakai project yang sama dengan production).

---

## 1. Rollback deploy (Vercel)

**Prinsip:** rollback hanya mengembalikan **kode**. Database tidak ikut kembali.
Karena itu pastikan setiap perubahan skema **backward-compatible** (expand–contract):
kode lama harus tetap bisa jalan terhadap skema baru — jangan pernah `DROP`/`RENAME`
kolom dalam satu rilis; tambahkan kolom baru dulu, pindahkan data, baru bersihkan di
rilis berikutnya.

### Cara A — Instant Rollback via Dashboard (detik-menit, yang biasa dipakai)

1. Buka **Vercel Dashboard → project → tab `Deployments`**.
2. Cari deployment terakhir yang **sehat** (biasanya satu sebelum commit bermasalah,
   atau yang berstatus *Ready* dengan commit yang Anda kenal baik).
3. Klik ikon **⋯** pada baris itu → **Promote to Production**
   (labelnya bisa "Instant Rollback" — keduanya fungsi yang sama).
4. Production berganti dalam hitungan detik. **Verifikasi:**
   - `https://<domain>/` → 200, tampil normal
   - `https://<domain>/portal` → tile & konten termuat
   - `https://<domain>/admin/login` → bisa login, dashboard menampilkan data
5. **Catat commit yang di-rollback.** Perbaikannya tetap dilakukan di `main` lalu
   `git push` — deployment baru otomatis menggeser production (roll-forward).

### Cara B — `git revert` (untuk commit yang sudah terlanjur di `main`)

```bash
git log --oneline -5          # cari SHA commit bermasalah
git revert <SHA>              # buat commit pengganti (aman, riwayat utuh)
git push origin main          # Vercel build & deploy otomatis
```

Untuk beberapa commit sekaligus: `git revert <awal>^..<akhir>`.

### Saat rollback TIDAK cukup

Jika masalahnya **data** (data salah tertulis/terhapus), rollback kode tidak
menyelesaikan apa pun — pulihkan database (bagian 2.3). Restore database bersifat
**destroktif**: menimpa kondisi sekarang dengan titik backup. Selalu buat dump
kondisi terkini dulu kalau masih mungkin.

---

## 2. Backup Supabase

### 2.1 Status per paket (per Agustus 2026)

| Paket | Backup harian otomatis | Retention | PITR |
|---|---|---|---|
| **Free ($0)** | **Tidak ada** | — | Tidak ada |
| Pro ($25/bln) | Ya | 7 hari | Add-on berbayar ($100/bln, jendela 7 hari) |
| Team ($599/bln) | Ya | 14 hari | Add-on |
| Enterprise | Ya | ≤30 hari | Umumnya termasuk |

Catatan penting:

- **PITR**, kalau diaktifkan, **menggantikan** backup harian (tidak keduanya), dan
  butuh setidaknya *Small compute add-on*.
- **File Storage (foto berita/galeri/dsb.) TIDAK ikut backup** — hanya *metadata*-nya.
- Backup hidup-mati bersama project: menghapus project = menghapus backupnya.

**Cek sendiri di dashboard:**

1. **Organisation → Plan** → paket yang dipakai sekolah (Free atau Pro?).
2. **Database → Backups** → daftar backup + timestamp
   (halaman ini hanya tampil di paket berbayar; kalau tidak ada, berarti Free).

### 2.2 Backup manual — WAJIB kalau paket Free

Karena Free tidak punya backup otomatis, jadwalkan export sendiri (mis. mingguan)
dengan Supabase CLI:

```bash
supabase db dump --db-url "postgresql://<user>:<password>@<host>:5432/postgres" --schema public
```

Connection string ada di **Dashboard → Settings → Database**.

Aturan simpan:

- **Simpan di luar Supabase** (disk lokal terpisah / storage terenkripsi / drive lain).
- ⚠️ **Repo ini PUBLIK** — file dump berisi data siswa & pendaftar.
  **JANGAN sekali-kali menaruh dump di repo ini atau di mana pun yang publik.**
- Simpan beberapa titik (mis. 4 minggu terakhir), jangan menimpa satu-satunya salinan.

File Storage ikut di-backup secara terpisah — kalau foto dinilai kritis, unduh isi
bucket `images` secara berkala dengan CLI (`supabase storage ...`) ke lokasi yang sama.

### 2.3 Restore (pemulihan)

**Paket berbayar:**

1. Dashboard → **Database → Backups** → pilih titik waktu.
2. **Restore** → proses *in place*, **menimpa data saat ini**.
3. Sebelum menekan tombol: buat dump kondisi sekarang dulu (bagian 2.2) agar masih
   bisa mundur kalau ternyata salah titik.

**Paket Free (dari dump manual):**

```bash
psql "<connection string>" -f backup-<tanggal>.sql
```

(atau `pg_restore` kalau format dump-nya custom). Periksa dulu isi dump —
jangan restore dump yang tidak dikenal asal-usulnya.

### 2.4 Setelah restore/rollback — checklist verifikasi

- [ ] `/` dan `/portal` → 200, konten tampil
- [ ] `/admin/login` → login berhasil
- [ ] Dashboard admin → KPI menampilkan angka yang benar
- [ ] Uji satu data contoh (mis. buka satu berita + edit simpan)
- [ ] Cocokkan jumlah baris penting (berita, pendaftar) dengan ekspektasi
