# Esceha.id

Website resmi **SMP Muhammadiyah 4 Tanggul** — situs publik + panel admin
(Berita, Artikel, Galeri, Prestasi, Agenda, Fasilitas, SPMB, dsb.) dengan
content management di balik `/admin`.

Dibangun dengan **Next.js App Router** + **Supabase** (database, auth, storage).

---

## Stack

| Komponen | Versi (pin di `package.json`) |
|---|---|
| Next.js | **16.4.0** (`next dev --webpack`) |
| React / React DOM | **19.2.8** |
| TypeScript | 5 (`strict`) |
| Tailwind CSS | 4 (+ `@tailwindcss/typography`) |
| Supabase | `@supabase/supabase-js` 2.114.0, `@supabase/ssr` 0.12.5 |
| Editor rich text | TipTap 3 (starter-kit + ekstensi) |
| Drag & drop urutan | dnd-kit |
| Carousel / animasi | Splide 4, framer-motion 11 |
| Email (opsional) | Resend 6 |
| Lint | ESLint 9 + `eslint-config-next` 16.4.0 |

## Persyaratan

- **Node.js 20 atau lebih baru** — dikembangkan & diuji dengan Node **24.18.0**,
  npm **11.16.0**
- Project **Supabase** (URL + anon key)
- Akun **Vercel** untuk deploy produksi

## Setup

```bash
git clone https://github.com/MBS-TGL/Escehaid.git
cd Escehaid
npm ci            # install persis dari package-lock.json (jangan npm install)
```

Buat **`.env.local`** di root (sudah masuk `.gitignore`; repo ini **publik** —
jangan pernah meng-commit rahasia apa pun):

| Variabel | Wajib | Fungsi |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key Supabase (RLS yang membatasi) |
| `NEXT_PUBLIC_APP_NAME` | – | Nama situs (default: SMP Muhammadiyah 4 Tanggul) |
| `NEXT_PUBLIC_HERO_VIDEO_YT` | – | ID video YouTube untuk hero |
| `NEXT_PUBLIC_HERO_VIDEO_URL` | – | URL video hero (kalau bukan YouTube) |
| `RESEND_API_KEY` | – | Aktifkan pengiriman email (Resend) |
| `RESEND_FROM_EMAIL` | – | Alamat pengirim email |
| `ADMIN_EMAIL` | – | Tujuan notifikasi pesan/pendaftar ke admin |

## Perintah

```bash
npm run dev       # server dev → http://localhost:3000
npm run build     # build produksi (webpack)
npm run start     # jalankan hasil build
npm run lint      # ESLint — syarat: 0 error
```

## Struktur singkat

- `src/app/` — rute. Publik: `/portal`, `/news`, `/articles`, `/gallery`,
  `/achievements`, `/activities`, `/admission`, `/profile`, `/contact`
  — Admin: `/admin/*` (login di `/admin/login`)
- `src/lib/queries.ts` — **barrel**; implementasi per domain ada di
  `src/lib/queries/*.ts` (19 modul, semua <500 baris). Semua kode mengimpor
  lewat barrel agar tidak ada perubahan import saat file dipecah.
- `src/lib/` — client Supabase, auth, notifikasi email, kompresi gambar
- `database.sql` / `database.md` — skema & catatan database.
  **Semua SQL dijalankan manual oleh Anda** lewat Supabase SQL Editor;
  jangan menjalankan `database.sql` mentah tanpa memeriksa isinya.

## Dokumen lain

- `planning.md` — roadmap, status P1/P2, checklist rilis
- `operasional.md` — **rollback deploy (Vercel) & backup Supabase**
- `REMINDER_DOMAIN.md` — setup domain `smpmuh4tanggul.sch.id` di Vercel
- `AGENTS.md` — aturan untuk AI coding agent (dikelola otomatis oleh `next dev`)

## Keamanan

- Repository ini **publik**. Rahasia (API key, token, dump database) **tidak boleh
  masuk git** — `.env.local` dan `**/secrets.json` sudah di-ignore.
- Kunci service-role **tidak pernah** dikirim ke client; semua akses client memakai
  anon key + RLS.
