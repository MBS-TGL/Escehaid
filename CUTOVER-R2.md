# Cutover R2 — langkah manual (SELESAI)

Cutover ke Cloudflare R2 sudah selesai dijalankan (20 Oktober 2026). Dokumen ini
dipertahankan sebagai arsip langkah manual. Ringkasan status:

| Langkah | Status |
|---|---|
| 1. Env Production di Vercel (7 variabel, 2 sensitive) | ✅ via dashboard |
| 2. Redeploy | ✅ |
| 3. Verifikasi upload → URL `cdn.smpmuh4tanggul.sch.id` + Objek muncul di R2 | ✅ (galeri `e797670f-…jpg`) |
| 4. Hapus bucket lama `school-assets` (akun salah) | ✅ dihapus |
| 5. Migrasi objek lama Supabase → R2 | ✅ 1 file (`cca4137b-…jpg`, 194 KB) via `scripts/migrate-storage-r2.mjs` — tersalin (bukan dipindah); traffic baru tidak lagi melewati Supabase Storage |
| 6. Badge akreditasi & NPSN footer (bonus, commit `84fcabd`) | ✅ editable dari `/admin/settings` |

Setelah cutover: semua traffic file publik dilayani CDN Cloudflare (zero egress),
operasi admin (upload/list/remove/sign) lewat route server `/api/admin/storage`,
Supabase tetap DB + Auth.

## 1. Set env di Vercel (Production)

Dashboard: **Vercel → project Escehaid → Settings → Environment Variables**,
tambahkan untuk scope **Production** (nilai persis dari `.env.local` lokal):

| Nama | Nilai |
|---|---|
| `STORAGE_DRIVER` | `r2` |
| `R2_ACCOUNT_ID` | (lihat `.env.local`) |
| `R2_ACCESS_KEY_ID` | `ff0e…eb51` (lihat `.env.local`) |
| `R2_SECRET_ACCESS_KEY` | (lihat `.env.local`) |
| `R2_PUBLIC_BASE_URL` | `https://cdn.smpmuh4tanggul.sch.id` |
| `R2_BUCKET` | `esceha-cdn` |
| `R2_PRIVATE_BUCKET` | `esceha-private` |

Atau via CLI (sekali `vercel login` dulu):

```bash
npx vercel link
npx vercel env add STORAGE_DRIVER production        # ketik: r2
npx vercel env add R2_ACCOUNT_ID production
npx vercel env add R2_ACCESS_KEY_ID production
npx vercel env add R2_SECRET_ACCESS_KEY production
npx vercel env add R2_PUBLIC_BASE_URL production
npx vercel env add R2_BUCKET production
npx vercel env add R2_PRIVATE_BUCKET production
```

## 2. Redeploy

Dashboard → **Deployments → Redeploy** (deploy terakhir), atau:

```bash
npx vercel --prod
```

Deploy sebelum env ini aman: tanpa `STORAGE_DRIVER` kode tetap pakai driver
supabase (default), jadi tidak ada downtime saat transisi.

## 3. Verifikasi produksi

1. Buka `/admin` → upload gambar apa saja.
2. Cek URL gambar hasil upload mengarah ke `https://cdn.smpmuh4tanggul.sch.id/...`
   dan terbuka (respons 200, header `cf-cache-status` dari Cloudflare).
3. Dashboard Cloudflare → R2 → `esceha-cdn`: objek baru muncul.

## 4. Hapus bucket lama yang salah akun

Dashboard Cloudflare → login ke akun **lama** (yang salah) → R2 → bucket
`school-assets` → **Delete bucket** (kosong, aman). Token saat ini berada di
akun yang benar dan sengaja tidak punya akses ke bucket itu.

---

## Lanjutan 27 Oktober 2026 — media repo dipindah ke R2

Cutover 20 Oktober hanya memindahkan objek yang diunggah lewat panel. Media
lama yang dulu "dibekukan" ke repo oleh `scripts/sync-static-images.mjs`
(path lokal `/images/...`) masih dilayani dari `public/` dan tidak ada di R2
(CDN 404 untuk 18 foto guru). Pembersihan tuntas:

1. `scripts/upload-local-media-r2.mjs` — unggah 26 objek (20 foto guru,
   4 fasilitas, foto kepala sekolah, 1 PDF pengumuman) dengan key
   `<bucket>/<path>`; idempoten, `--dry-run`, `--verify`. Hasil: 26/26 ada di CDN.
2. `supabase/migrations/0008_media_urls_to_r2.sql` — backfill 24 kolom DB
   (18 guru + 4 fasilitas + 1 kepala sekolah + 1 lampiran berita) ke URL absolut
   CDN. Idempoten; hanya menyentuh nilai berawalan `/`.
3. File lokal (guru, fasilitas, `Kepala-Sekolah.jpg`, `documents/…`) dihapus;
   2 foto guru yatim juga dihapus dari R2. `scripts/sync-static-images.mjs`
   dihapus (usang; merujuk migration 004 yang tidak ada).
4. Foto kepala sekolah, nama, sambutan, visi & misi kini dapat diedit dari
   `/admin/settings` (grup Identitas) — nilai efektif: override → `school_profile`
   → bawaan.
5. `remotePatterns` `*.supabase.co` dihapus; parser URL Supabase di
   `storagePathFromUrl`/`addRef` dihapus. Semua media sekarang wajib URL CDN.
