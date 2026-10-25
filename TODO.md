# TODO — Fitur Developer

> Lanjutan penguatan platform setelah fitur admin (backup, diagnostik,
> recycle bin, 2FA, sesi) selesai & terdeploy. Format checkbox seperti
> sebelumnya: centang `[ ]` → `[x]` saat selesai.
> Tanggal dibuat: 25 Oktober 2026.

---

## Tier 1 — prioritas

- [~] **1. Error tracking (Sentry)** — error produksi saat ini hanya masuk
      `console.error`; tidak ada stack trace, frekuensi, atau notifikasi.
      Setup: `@sentry/nextjs` (wizard) + env `SENTRY_DSN` di Vercel.
      Pelengkap UptimeRobot (yang hanya tahu hidup/mati). ±30 menit.
  - [x] a. Install wizard + inject DSN (server + client).
      ✅ @sentry/nextjs v11; src/instrumentation.ts (+onRequestError) &
      instrumentation-client.ts (no-op tanpa DSN); global-error.tsx baru +
      captureException di error.tsx; withSentryConfig di next.config.ts
      (org "esceha" / project "esceha-id" — GANTI sesuai akun).
  - [ ] b. Uji: trigger error sengaja di produksi → terima notifikasi.
      (Menunggi env Vercel: SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN,
      SENTRY_AUTH_TOKEN + org/project di next.config.ts diganti.)
  - [x] c. Filter noise (bot 404 dsb.) + alert email/WhatsApp.
      ✅ Filter dasar di kedua init (ignoreErrors + denyUrls sw.js/ekstensi);
      alert email via pengaturan akun Sentry saat setup.

- [ ] **2. Environment staging (preview)** — dev lokal saat ini memakai DB
      PRODUKSI; insiden "SQL belum jalan" (FAQ, soft-delete) hanya selamat
      karena urutan manual. ±1 jam setup sekali.
  - [ ] a. Project Supabase kedua (free tier) + seed data minimal.
  - [ ] b. Branch `preview`/`staging` di Vercel dengan env staging.
  - [ ] c. Runbook singkat: apa yang diuji di staging sebelum promote
        (migrasi SQL, refactor query, perubahan auth).
  - [ ] d. `scripts/restore-new-project.mjs` sebagai titik awal seed.

- [ ] **3. E2E smoke test (Playwright) di CI** — 253 test unit tidak
      menutup regresi kelas "halaman kosong / login rusak". ±2-3 jam.
  - [ ] a. Skenario inti: login admin, beranda render (ada FAQ & visi),
        /news daftar+detail, pencarian mengembalikan hasil, /api/health 200.
  - [ ] b. Skenario admin: hapus FAQ → muncul di Sampah → pulihkan.
  - [ ] c. Job CI terpisah (butuh env Supabase staging, bukan produksi).

## Tier 2 — effort kecil

- [ ] **4. Dependabot** — `.github/dependabot.yml` (npm + github-actions),
      PR otomatis tiap update dependensi (next, supabase-js, @aws-sdk).
      5 menit.
- [ ] **5. Cleanup media yatim** — deteksi file R2 yang tak dipakai konten
      mana pun (news/articles/gallery/downloads/prestasi/kegiatan) +
      halaman admin "file tak terpakai" + hapus massal. Hemat storage.
- [ ] **6. Draft preview konten** — URL preview berita/artikel belum terbit
      via token singkat (mis. `/news/<slug>?preview=<t>`), dari tombol
      "Pratinjau" di panel admin. Untuk panitia mengecek sebelum terbit.

## Tier 3 — kalau skala bertambah

- [ ] **7. Rate limit ke Upstash/Redis** — in-memory per-instance di
      serverless tidak konsisten antar instance (dicatat
      docs/Roadmap_Perbaikan.md item 5). Baru perlu bila ada tanda abuse.
- [ ] **8. Sisa roadmap teknis** (docs/Roadmap_Perbaikan.md):
      hapus probe kolom dari path publik (8b), migrasi query ke
      supabase-server (9), turunkan "use client" yang tak perlu (10).

---

## Urutan pengerjaan disarankan

1 → 2 → 3 (deteksi dulu, lalu isolasi risiko, lalu jaring pengaman otomatis).
Tier 2 kapan saja (4 paling murah — bisa langsung). Tier 3 menunggu kebutuhan.

## Tambahan (25 Okt)

- [x] **Grup "Developer" di Sidebar** ✅ — Migrasi SQL (/admin/sql: status
      per file via probe efek), Sentry ↗, Uptime Monitor ↗ (link eksternal,
      perm users:manage).
- [ ] "Pembersih Media" masuk grup Developer saat halamannya dibuat
      (relasi item TODO #5 media yatim).
- [ ] "Jobs GitHub" (status backup/purge) masuk grup Developer saat
      halamannya dibuat.
