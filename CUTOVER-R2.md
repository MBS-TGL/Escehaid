# Cutover R2 — langkah manual terakhir (±5 menit)

Semua sudah siap di sisi kode & Cloudflare. Yang tersisa butuh login dashboard
Vercel/Cloudflare yang tidak bisa diotomasi dari repo ini.

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
