# Ringkasan Proyek — Esceha.id (untuk dikonsultasikan ke AI lain)

> Salin seluruh isi file ini sebagai konteks, lalu tambahkan pertanyaanmu di bawah.

## 1. Gambaran umum

**Esceha.id** adalah website resmi **SMP Muhammadiyah 4 Tanggul** — situs publik
(berita, artikel, galeri, prestasi, agenda, fasilitas, SPMB/penerimaan santri baru)
plus **panel admin CMS** di balik `/admin`.

- Repo publik: `https://github.com/MBS-TGL/Escehaid.git`
- Deploy: **Vercel**, domain `smpmuh4tanggul.sch.id`
- Database & auth & storage: **Supabase** (semua SQL dijalankan manual via SQL Editor)

## 2. Stack (versi pin di `package.json`)

| Komponen | Versi |
|---|---|
| Next.js | **16.4.0**, App Router, dijalankan dengan `next dev --webpack` / `next build --webpack` |
| React | **19.2.8** |
| TypeScript | 5, mode `strict` |
| Tailwind CSS | **4** (via `@tailwindcss/postcss`) + `@tailwindcss/typography` |
| Supabase | `@supabase/supabase-js` 2.114.0, `@supabase/ssr` 0.12.5 |
| Editor rich text | TipTap 3 (starter-kit + highlight, image, link, task-list, char-count, dst.) |
| Drag & drop urutan | `@dnd-kit` |
| Carousel / animasi | Splide 4, framer-motion 11 |
| Email | Resend 6 (opsional, untuk notifikasi) |
| Sanitasi HTML | `isomorphic-dompurify` |
| Lint | ESLint 9 + `eslint-config-next` 16.4.0 |

Node 20+ (dikembangkan di Node 24.18.0, npm 11.16.0). Install wajib `npm ci`.

Perintah: `npm run dev` · `npm run build` · `npm run start` · `npm run lint`
(gerbang mutu: **tsc 0 error · lint 0 error · build 0 error**).

## 3. Arsitektur & struktur kode

Total ±143 file di `src/`.

```
src/
  app/                 # App Router
    page.tsx           # beranda
    portal/            # portal aplikasi (grid ikon)
    news/ articles/ gallery/ achievements/ activities/
    admission/         # halaman SPMB + form registrasi multi-step
    profile/ contact/ search/
    admin/             # CMS (login di /admin/login, layout terpisah)
    api/revalidate/    # revalidate ISR
    auth/callback/     # OAuth/SSR auth callback
  components/          # komponen bersama (Navbar, Footer, ui/*, admin/*)
  lib/
    queries.ts         # BARREL — semua import lewat sini
    queries/*.ts       # 21 modul per domain, semua <500 baris
    supabase.ts / supabase-server.ts / auth.ts / sanitize.ts
    notifications.ts / compress-image.ts / site-config.ts
  proxy.ts             # proxy middleware
```

**Konvensi penting:**
- Semua query database dipecah per domain di `src/lib/queries/*.ts`
  (achievements, activities, agenda, announcements, articles, audit, contact,
  facilities, gallery, media, news-media, news, portal, profile, registrations,
  revalidate, search, shared, spmb, teachers, users, waves) dan **di-import lewat
  barrel `src/lib/queries.ts`** — jangan import langsung ke file per domain.
- Semua SQL dijalankan **manual** oleh maintainer; `database.sql` jangan dijalankan mentah.
- Keamanan: repo publik → rahasia tidak boleh masuk git; service-role key tidak
  pernah dikirim ke client; client selalu anon key + **RLS**.

## 4. Model data (Supabase)

16 tabel: `user_profiles`, `user_audit_log`, `school_profile`, `news`, `gallery`,
`spmb_registrations`, `teachers`, `facilities`, `articles`, `achievements`,
`contact_messages`, `announcements`, `agenda_events`, `activities`,
`spmb_waves`, `notifications` (+ `portal_apps` yang sudah terisi).

Skema lengkap di `database.sql` & `database.md`.

## 5. Halaman

- **Publik:** `/`, `/portal`, `/news`, `/articles`, `/gallery`, `/achievements`,
  `/activities`, `/admission` (+ `/admission/register`), `/profile`, `/contact`,
  `/search`
- **Admin:** `/admin` (dashboard), `/admin/news`, `articles`, `gallery`, `media`,
  `teachers`, `facilities`, `agenda`, `announcements`, `achievements`,
  `activities`, `admission` (SPMB), `portal`, `users`, `logs`, `contact`,
  `login`

## 6. Status & roadmap (`planning.md`)

**P1 (fondasi) — selesai:** bug halaman publik, matikan `ignoreBuildErrors`,
pasai CI GitHub Actions, lint error 94 → 0.
**P1.5** pecah `queries.ts` (3086 baris) → sudah jadi 19–21 modul per domain.
**P2 (fitur):** SPMB end-to-end, cek status pendaftaran publik, dashboard statistik
pendaftar, notifikasi pendaftar baru, pencarian menyeluruh, penjadwalan konten,
media library, log aktivitas admin.

Pekerjaan terakhir (commit `00229ed`): panel "Tambah Pendaftar", refactor form
registrasi SPMB, perapian nav & UI admin. Fokus sebelumnya: **optimasi performa
mobile** (hero tidak autoplay di HP, blur off, query dibatasi) dan **redesain
bahasa desain seluruh halaman admin** (lihat `docs/MOBILE_UI_REPORT.md`, `docs/PROMPT_REDESIGN.md`).

Dokumen lain: `planning.md` (roadmap), `operasional.md` (rollback Vercel & backup
Supabase), `docs/SPEED.md`, `database.md`, `REMINDER_DOMAIN.md`.

## 7. Hal yang perlu diperhatikan / area risiko

- Halaman admin sangat besar (mis. `src/app/admin/admission/page.tsx` ±2170 baris,
  `src/app/news/[slug]`, `articles/page.tsx` juga besar) → sulit di-review & rawan regresi.
- Belum ada test sama sekali (tidak ada framework testing; blast-radius tool
  melaporkan "no tests found").
- Build memakai `--webpack` (bukan Turbopack) — jangan ubah tanpa alasan.
- Tailwind 4 + Next 16 + React 19 → API bisa berbeda dari dokumentasi lama.
- Base­line lint: 0 error / 57 warning (warning lama dibiarkan).

---

## Pertanyaan untuk AI lain

*(tulis pertanyaanmu di sini, contoh: "Apakah wajar halaman admin setebal 2000+
baris? Bagaimana strategi memecahnya tanpa merusak fitur?" atau "Bagaimana
menambahkan testing ke project Next.js + Supabase tanpa refactor besar?")*
