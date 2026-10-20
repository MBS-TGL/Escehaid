# Roadmap Perbaikan & Pengembangan — Esceha.id

> Hasil pemindaian 3 sisi (arsitektur & performa, keamanan/admin/API, UX publik & SEO).
> Tanggal: 20 Oktober 2026 · Basis: Next.js 16.4.0, Tailwind v4, Supabase, PWA aktif.
> Cara pakai: centang `[ ]` → `[x]` saat item selesai dikerjakan.

## Ringkasan kondisi

Fondasi sudah sangat matang untuk standar situs sekolah:

- ISR bertingkat + `unstable_cache` bertag (site-settings, maintenance, flags), dedup React `cache`, dynamic import selektif, `contentVisibility: auto`, konfigurasi next/image hemat.
- SEO nyaris sempurna: sitemap dinamis, robots, RSS, canonical di semua halaman, JSON-LD (School, FAQPage, NewsArticle, Article, Event, Breadcrumb), OG image statis, Google Analytics.
- PWA penuh: manifest (lengkap dengan screenshots), service worker + `offline.html` + toast "versi baru".
- Keamanan dasar kuat: auth server-side, cookie httpOnly via `@supabase/ssr`, RBAC `requirePermission` di server actions, `audit_logs` via RPC, whitelist path/MIME di kedua endpoint upload, pesan login non-enumeratif.
- PPDB lengkap: wizard multi-step + draft autosave localStorage, cek status via RPC, tombol cetak, link WhatsApp.
- Testing: Vitest 12 file / 127 test (lib + proxy + admin actions); test komponen publik belum ada.

Yang tersisa adalah penyempurnaan, tercantum di bawah.

---

## 🔴 Prioritas Tinggi — kerjakan berikutnya

- [x] **1. Patch lubang kepemilikan upload SPMB** ✅ `ebc0252`
  Token rahasia 16 karakter di path (`<nisn>-<token16>`), token disimpan di draft
  localStorage dan server menolak path tanpa polanya — folder pendaftar lain tak bisa ditebak.

- [x] **2. Perketat validasi MIME upload SPMB** ✅ `ebc0252`
  MIME final diputuskan sisi server dari ekstensi; `file.type` klien hanya dipercaya
  bila cocok dengan daftar MIME ekstensi itu. (Magic bytes: tunda ke iterasi lain.)

- [x] **3. Kunci jejak DEBUG_DATA di formulir SPMB** ✅ `ebc0252`
  Kini butuh build dev + `NEXT_PUBLIC_SPMB_DEBUG=1`; cabang ikut DEBUG_DATA ter-DCE dari bundle produksi.

- [x] **4. Tambah skip link aksesibilitas** ✅ `735cb01`
  "Lewati ke konten utama" di PublicShell → anchor `#konten-utama`; tersembunyi sampai fokus keyboard.

- [x] **5. Bersihkan rate limiter in-memory (memory leak)** ✅ `a03d8fc`
  Semua limiter kini memakai `src/lib/rate-limit.ts`: window Map di-sweep saat menyentuh
  batas `maxEntries` (ukuran terikat), IP `unknown` tetap satu bucket tapi penuh sendiri;
  + 8 unit test. Ganti ke Redis/Upstash bila nanti multi-instance.

- [x] **6. Tambah rate limit yang masih kosong** ✅ `a03d8fc`
  `/api/auth/reset` (5/10 mnt per IP + 3/10 mnt per email), `/api/admin/storage`
  POST/DELETE (60/10 mnt per IP, cek sebelum parse body), `signed-url` (60/10 mnt).
  Semua 429 kini mengirim header `Retry-After`.

---

## 🟡 Cepat & Ringan — performa

- [ ] **7. Hapus `framer-motion`** — terbukti nol penggunaan di `src/` (sudah diganti animasi CSS di `src/components/CSSAnimations.tsx`); memangkas ~30 kB gzip. `package.json:37`
- [ ] **8. Ganti `select("*")` query publik dengan seleksi kolom eksplisit** — ±28 lokasi, menghindari payload kolom besar (`history`, `mission`, jsonb registrasi) ikut terserialisasi saat ISR:
  `src/lib/queries/profile.ts:9`, `achievements.ts:26,55`, `facilities.ts:15,33`, `gallery.ts:10,98,114`, `teachers.ts:15,61`, `agenda.ts:16,30`, `downloads.ts:53,101`.
  Pola yang benar sudah ada: `NEWS_LIST_COLUMNS` di `src/lib/queries/news.ts:16-17`.
- [ ] **8b. Hapus probe kolom dari path publik** (`tableHasColumn`/`newsHas*Column`) setelah migrasi SQL kolom stabil; tersisa 1-2 round-trip Supabase per halaman yang dirender ulang. `src/lib/queries/shared.ts:12-25`, `src/lib/queries/news.ts:27-55`
- [ ] **9. Pindahkan query publik server ke `supabase-server.ts`** — sekarang semua query memakai client browser (`src/lib/supabase.ts:3`) sehingga supabase-js ikut masuk bundle client (`src/app/search/SearchView.tsx:12` dll).
- [ ] **10. turunkan `"use client"` yang tidak perlu (mengurangi hidrasi)**
  Kandidat: `PublicShell.tsx` (Navbar/Footer/RunningText), `src/app/TeacherCard.tsx`, `src/app/profile/TeacherGrid.tsx` & `FacilityGrid.tsx`, `src/components/CoverImage.tsx`, `src/components/EkskulCard.tsx`.
  Biarkan client yang benar-benar interaktif saja: SearchOverlay, MobileBottomNav.
- [ ] **11. Pagination server-side untuk `/admin/media` & `/admin/users`** — sekarang semua baris ditarik ke memori (`src/lib/queries/media.ts:209`, `users.ts:7,117`, `registrations.ts:130`). Tambah `limit` di server + fetch bertahap di client, terutama `/admin/media` yang merender banyak thumbnail.

---

## 🟡 Profesional & Advanced — fitur/robustness

- [ ] **12. OG image dinamis per konten** — `ImageResponse` untuk `news/[slug]`, `articles/[slug]`, `activities/[slug]` (sekarang hanya satu gambar statis `/og-image.jpg`, `src/app/layout.tsx:57`).
- [ ] **13. Dark mode** — bangun di atas variabel CSS `--brand-*` + `prefers-color-scheme`/toggle; belum ada satu pun `dark:` di repo. Periksa juga panel admin.
- [ ] **14. Web Push notifikasi hasil SPMB** — `public/sw.js` sudah ada tapi tanpa handler `push`; tambahkan handler + subscribe di `ServiceWorkerRegister.tsx`. Use case paling bernilai: pengumuman hasil seleksi ke pendaftar.
- [ ] **15. Validasi input API dengan zod** — seluruh validasi sekarang manual/regex (konsisten tapi rapuh terhadap regresi); target: semua route di `src/app/api/**`.
- [ ] **16a. Halaman publik guru `/teachers`** — data sudah tersedia untuk TeacherCarousel; tambahkan ke sitemap.
- [ ] **16b. Feed iCal jadwal kegiatan `/activities.ics`** — query kegiatan sudah tersedia; memudahkan orang tua menambahkalender.

---

## 🟢 Nice-to-have

- [ ] **17a. Anti-spoof rate limit** — kunci `x-forwarded-for` bisa dipalsukan; tambahkan trusted-proxy list / fallback ke header alternatif.
- [ ] **17b. Schema tambahan** — `Course`, `ImageGallery` (`/gallery`), `ContactPage` (`/contact`). Juga sinkronkan JSON-LD di layout yang mengklaim `availableLanguage ["id","ar","en"]` padahal i18n tidak ada.
- [ ] **17c. ARIA `RunningText`** — `role="marquee"` non-standar dan tidak bisa di-pause; jadikan banner + tombol pause. `src/components/RunningText.tsx:132`
- [ ] **17d. Pipeline i18n ringan** — siapkan `hreflang`/alternates bila EN ditambahkan di masa depan.
- [ ] **17e. Print stylesheet global** — `print:hidden` tersebar di komponen; tambahkan blok `@media print` di `globals.css`.
- [ ] **17f. Dokumentasi env** — `R2_PRIVATE_BUCKET` dipakai `src/lib/storage.ts:149` tapi absen dari `.env.local.example`.
- [ ] **17g. Fail-fast env** — `src/lib/supabase-server.ts:8-9` dan `src/proxy.ts:106-107` memakai `!` non-null tanpa validasi; raise error eksplisit di startup bila env hilang.
- [ ] **17h. Timeout Gemini** — `ai/refine` tanpa `abort()`; bila Gemini hang, admin menunggu penuh (maxDuration 30 s). `src/app/api/ai/refine/route.ts:140`
- [ ] **17i. Generalisasi pesan error storage** — pesan error Supabase mentah dikirim ke client; cukup log ke console saja. `src/app/api/admin/storage/route.ts:200-202,232-234`
- [ ] **17j. Pindahkan otorisasi sebelum parse body** — `formData()` (hingga 10 MB) di-parse sebelum cek izin di `_POST`. `src/app/api/admin/storage/route.ts:139-149`
- [ ] **17k. Perkuat sanitasi `next` auth-callback** — sekarang hanya guard `startsWith("/")` + tanpa `//`; pakai whitelist regex ketat untuk path relatif. `src/app/auth/callback/route.ts:8`
- [ ] **17l. Verifikasi error update flag `must_change_password`** — bila RLS menolak update, user terjebak loop redirect setelah ganti password. `src/app/api/auth/change-password/route.ts:34-41`
- [ ] **17m. Default-deny RBAC halaman admin** — sekarang hanya 4 prefix (`users|logs|settings|flags`) yang di-gate di proxy; modul lain sepenuhnya bergantung RLS DB. `src/proxy.ts:47-52`
- [ ] **17n. Vite config** — ESM di `vitest.config.ts` memunculkan peringatan `configLoader: 'native'`; ganti ekstensi `.mjs` atau set `"type": "module"` di package.json.
- [ ] **17o. Test komponen publik** — tambah test dasar untuk Navbar/SearchOverlay + guard ukuran bundle client di CI.

---

## Catatan teknis dari scan

- Model data-modul admin konten masih tulis langsung dari browser ke PostgREST (disengaja via anon key + RLS). Pertimbangkan migrasi ke server actions per modul hanya bila pola audit menjadi kebutuhan yang dinaikkan levelnya.
- `next.config.ts` tidak bermasalah; tercatat ada warning build tentang header `Cache-Control` custom untuk `/_next/static` — tinjau ulang saat upgrade Next mayor.
- Modul tulis `settings`/`flags`/`users` sudah server-action + `requirePermission`; modul ini bisa jadi pola contoh bila modul konten lain dimigrasi.
