# TODO — Fitur Admin & Developer

> Rekomendasi penyempurnaan sisi admin/developer, urut prioritas.
> Format mengikuti `docs/Roadmap_Perbaikan.md`: centang `[ ]` → `[x]` saat selesai.
> Tanggal dibuat: 24 Oktober 2026.

---

## 1. Otomasi Backup + Halaman "Cadangan" — 🔴 prioritas tertinggi

Data PPDB, berita, dan profil sekolah terlalu berharga untuk backup manual.
Script sudah ada di `scripts/` (backup-db-extras.mjs, backup-full-dump.mjs,
backup-storage.mjs, gen-restore-extras.mjs, restore-new-project.mjs) — tinggal
diotomasi & dibuat terlihat.

- [x] a. GitHub Actions workflow (cron harian) menjalankan script backup →
      upload hasil ke storage terpisah (R2/Supabase Storage bucket backup).
      Simpan rotasi: harian ×7, mingguan ×4.
      ✅ `.github/workflows/backup.yml` (cron 02:30 WIB) + `scripts/backup-scheduled.mjs`
      (dump → tar.gz → R2 privat → manifest.json → rotasi 30 hari). Menunggi
      secrets GitHub: DATABASE_URL + R2_* (daftar di header workflow).
- [x] b. Halaman admin `/admin/backup` (grup Sistem, perm `backup:read`):
      daftar backup terakhir (tanggal, ukuran, jenis DB/storage), tombol
      "Backup sekarang" (jalankan via workflow_dispatch), link dokumentasi
      restore.
      ✅ + route `/api/admin/backup/trigger` (repository_dispatch; butuh env
      Vercel BACKUP_GH_TOKEN/BACKUP_GH_REPO bila tombol manual diinginkan).
- [x] c. Kartu peringatan di Dashboard admin bila backup terakhir > 7 hari
      (baca metadata bucket backup via service role, read-only).
      ✅ Tercakup kartu "Status Sistem" di Dashboard (item 2c) — umur backup
      dengan badge hijau/kuning/merah + link ke /admin/backup.
- [x] d. Dokumen runbook restore singkat (docs/BACKUP.md): urutan restore
      DB → storage → verifikasi.

## 2. Dashboard Diagnostik / Status Sistem

Satu halaman menjawab "sehat tidak sekarang?" — mencegah debugging tebakan
(kasus nyata: migrasi `faqs` kemarin tidak terlihat sampai halaman error).

- [x] a. Endpoint `GET /api/health` (public, tanpa auth, JSON ringkas):
      latensi Supabase (1 query kecil), uptime proses, versi deploy
      (GIT_SHA via env Vercel). Siap dipantau UptimeRobot.
      ✅ 200 saat DB sehat / 503 saat gagal; rate limit 30/mnt/IP.
- [x] b. Halaman admin `/admin/diagnostics` (perm khusus developer):
      - status tabel inti + deteksi tabel baru yang belum dimigrasi
        (probe `information_schema`, pola `tableHasColumn` di queries/shared.ts)
      - kuota storage terpakai
      - env vars wajib terisi/tidak (nama saja, JANGAN nilai)
      - build/deploy terakhir + status CI (GitHub API)
      - hasil cache ISR ringkas (revalidate ages)
      ✅ + probe migrasi fitur, umur backup; perm `diagnostik:read` +
      gate proxy; R2 usage cache 6 jam, GitHub 5 menit. (ISR ages: di-skip —
      tidak kritikal.)
- [x] c. Kartu ringkasan di Dashboard admin: hijau/kuning/merah per aspek.
      ✅ "Status Sistem": DB, umur backup, CI — link ke /admin/diagnostics.

## 3. Recycle Bin (soft-delete) untuk konten

Hapus saat ini permanen. Salah klik = data hilang (ConfirmModal hanya
penghalang pertama).

- [ ] a. Migrasi: kolom `deleted_at timestamptz` di tabel konten utama
      (news, articles, faqs, achievements, activities, gallery, downloads) +
      RLS publik otomatis mengecualikan `deleted_at IS NOT NULL` + index.
- [ ] b. Query layer: exclude soft-deleted di semua getter publik; admin
      getter punya param `includeDeleted`.
- [ ] c. Tab "Sampah" di tiap modul admin: daftar terhapus, tombol pulihkan
      & hapus permanen (hanya developer).
- [ ] d. Auto-purge 30 hari via GitHub Actions cron (bukan trigger DB,
      supaya terlihat di log Actions).
- [ ] e. UX hapus: teks konfirmasi menyebut "masuk Sampah, dihapus permanen
      setelah 30 hari".

## 4. 2FA (TOTP) untuk akun admin & developer

Satu-satunya penghalang mengubah seluruh situs adalah password; situs
menampung data pribadi PPDB.

- [ ] a. Setup 2FA di halaman profil admin: QR code (otpauth), verify
      pertama, simpan secret terenkripsi + recovery codes sekali tampil.
- [ ] c. Wajib untuk role developer & admin; opsional untuk operator.
- [ ] b. Alur login: password benar → minta kode 6 digit bila 2FA aktif
      (form kedua, rate-limited, anti brute force — pola rate-limit.ts).
- [ ] d. "Masukkan salah satu recovery code" bila kehilangan authenticator.

## 5. Sesi Aktif + Force Logout

Berguna saat lupa logout di komputer bersama sekolah.

- [ ] a. Daftar sesi aktif per user (device/user-agent, IP, lokasi kasar,
      waktu terakhir) — tabel `sessions` atau metadata Supabase auth.
- [ ] b. Tombol "Keluarkan sesi ini" per baris + "Keluarkan semua sesi
      lain" (sesi saat ini tetap).
- [ ] c. Email/notifikasi bila login dari device baru.

---

## Catatan urutan pengerjaan

1 → 2 → 3 → 4 → 5. Item 1 dan 2 saling melengkapi (backup tanpa monitoring
kurang lengkap). Item 3 pola "sekali buat, pakai di semua modul". Item 4-5
menyentuh auth — kerjakan setelah backup & diagnostik aman.
