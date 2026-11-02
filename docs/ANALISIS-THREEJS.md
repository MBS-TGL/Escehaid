# Analisis Kelayakan Three.js / @react-three/fiber + drei

> Status: **ANALISIS SAJA** — tidak ada kode diubah, tidak ada package diinstal.
> Tanggal: 2026-11-02. Target: SMP Muhammadiyah 4 Tanggul (`smpmuh4tanggul.sch.id`, Next.js di Vercel + Supabase).
> Keputusan pemilik (chat): setuju "layak dengan syarat, hero terakhir" · prosedural dulu · budget RAM 2/3 GB ·
> aset via R2 Cloudflare bila perlu · lokasi pertama **/portal** (minim rombak, tidak merembet).

## 1. Ringkasan temuan (10 baris)

1. Next 16.4.2 + React 19.2.8 + TS 5.9.3 + Tailwind v4.3.3, App Router eksklusif, package manager npm (`package-lock.json`).
2. `three` / `fiber` / `drei` / `framer-motion` belum terinstal; kompatibel bila `fiber@^9 + drei@^10` (React 19). `fiber v8 / drei v9` tidak cocok.
3. Semua `page.tsx` publik Server Component; interaktivitas via child client (`HeroBackground`, carousel, `CSSFadeIn`).
4. Hero beranda (`src/app/page.tsx:269-338` + `HeroBackground.tsx:41-122`) adalah elemen LCP — poster `priority`, video desktop-only.
5. Below-fold sudah `next/dynamic` (dengan SSR + skeleton anti-CLS); `ssr:false`, `React.lazy`, `fetchPriority` tidak ditemukan.
6. Animasi murni CSS + `IntersectionObserver`; `prefers-reduced-motion` dihormati di CSS dan JS.
7. SEO lengkap: canonical, OG per-halaman (`lib/seo.ts:63`), `/api/og`, JSON-LD Sekolah + WebSite, robots/sitemap.
8. Config dinamis pola `site_settings` override → `school_profile` → default; fallback lokal masih ada by-design.
9. `next.config.ts`: tanpa `transpilePackages`, tanpa header cache `.glb`; media resmi via R2 `cdn.smpmuh4tanggul.sch.id`.
10. Contoh prosedural milik pemilik (`src/components/three/IslamicParticles.tsx`) ringan (~1.124 titik) dan polanya benar, tapi butuh 5 perbaikan sebelum pakai.

**Kesimpulan: LAYAK DENGAN SYARAT** — mulai dari ornamen prosedural ringan di /portal (di luar LCP),
dengan master switch admin, `dynamic ssr:false`, dan kill-switch HP lemah. Hero beranda disentuh terakhir atau tidak sama sekali.

## 2. Stack & versi

| Paket | `package.json` | Terinstal | Keterangan |
|---|---|---|---|
| `next` | `16.4.2` (pin exact) | `16.4.2` | App Router; `dev`/`build` pakai `--webpack` (bukan Turbopack) |
| `react` / `react-dom` | `19.2.8` (pin exact) | `19.2.8` | Menentukan pilihan major fiber/drei |
| `typescript` | `^5` | `5.9.3` | `strict true`, `ignoreBuildErrors: false` |
| `tailwindcss` / `@tailwindcss/postcss` | `^4` | `4.3.3` | Tanpa `tailwind.config.js`; `@import "tailwindcss"` di `globals.css:1-2` |
| `three` / `@react-three/fiber` / `@react-three/drei` | — | **NOT-INSTALLED** | `node_modules/three` tidak ada; penambahannya terisolasi |
| `framer-motion` / `motion` | — | **NOT-INSTALLED** | Animasi saat ini murni CSS + `@splidejs/splide` |
| `engines` | `node 24.x` | lokal node v24 / npm 11 | `packageManager` field absent → de-facto **npm** (`package-lock.json` lockfileVersion 3, 817 paket) |

### Kompatibilitas peer dependency

- `@react-three/fiber v8` → peer `react ^18` → **TIDAK cocok** (repo React 19) → `ERESOLVE` bila dipaksa.
- `@react-three/fiber v9` → peer `react ^19` → **COCOK**. Pasangan benar: `three` terbaru + `@react-three/fiber@^9` + `@react-three/drei@^10` (drei v10 ↔ fiber v9; drei v9 ↔ fiber v8, jangan campur).
- `three` sendiri tidak punya peer `react` → bebas versi, ikuti rentang fiber/drei v9/v10.
- Rekomendasi fase Portal: **hanya `three` + `@react-three/fiber@^9`, tanpa `drei`** (drei utuh menambah ~500KB–1MB; tidak dibutuhkan untuk partikel prosedural).
- Risiko Next 16 spesifik: `three`/`drei` hanya aman sebagai Client Component (`"use client"` + `next/dynamic ssr:false`); jangan diimpor dari Server Component/layout root.

## 3. Struktur halaman (route publik)

Hanya 2 `layout.tsx`: `src/app/layout.tsx:114` (root, Server, fetch `getSiteSettings + getSchoolProfile + getActiveAnnouncements + isFeatureEnabled` → `PublicShell.tsx:1` client) dan `src/app/admin/layout.tsx`. Semua `page.tsx` publik **tanpa `'use client'`** = Server Component.

| Route | File | Tipe | Data / child client |
|---|---|---|---|
| `/` | `src/app/page.tsx` (`async Home`, `revalidate=300`) | Server | 13 query paralel (`getNewsList`, `getFacilityList`, `getActivityList`, `getArticleList`, `getTeacherList`, `getSchoolProfile`, `getAchievementList`, `getSiteSettings`, agenda, ekskul, FAQ, waves). Child client: `HeroBackground`, `HeroVideoModal`, `TeacherCarousel`, `EkskulCarousel`, `FAQ`, `WhatsAppButton`, `CountdownEvent`, `CSSFadeIn/Stagger` |
| `/profile` | `src/app/profile/page.tsx:39` (`revalidate=3600`) | Server | `getSchoolProfile`, guru, fasilitas, prestasi, galeri, settings, ekskul. Hero `PageHero variant="compact"` |
| `/program` | `src/app/program/page.tsx:38` (`revalidate=86400`) | Server | `getQuranPillarsList`, agenda blocks/slots. Child Server: `QuranPillars.tsx:14`, `DailyAgenda.tsx:13` |
| `/admission` | `src/app/admission/page.tsx:68` | Server | `getPublishedWaves`, `getSchoolProfile`, `getActiveFaqs("spmb")` |
| `/admission/register` | `src/app/admission/register/page.tsx` | Server wrapper | Form = `SPMBForm.tsx:1` (`"use client"`) |
| `/admission/status` | `src/app/admission/status/page.tsx` | Server | Aksi cetak = `PrintButton.tsx` (client) |
| `/news`, `/news/[slug]` | `src/app/news/page.tsx:31`, `.../[slug]/page.tsx` | Server | Paginated list + `FilterBar`; detail + `AttachmentPanel`, `ImageZoom` |
| `/portal` | `src/app/portal/page.tsx:218` (`revalidate=3600`) | Server | `getPortalApps`, agenda, profile, announcements, settings. Kartu via sub-komponen server se-file |
| `/achievements` | `src/app/achievements/page.tsx:54` | Server | List via `AchievementsClient.tsx:1` (client) |
| `/activities`, `/activities/[slug]` | `src/app/activities/...` | Server | `PageHero` + `RichContent`, `CoverImage` |
| `/articles`, `/articles/[slug]` | `src/app/articles/...` | Server | `FilterBar`, kategori |
| `/ekskul/[slug]` (tanpa index) | `src/app/ekskul/[slug]/page.tsx:57` | Server | `getEkskulBySlug`, achievements |
| `/gallery` | `src/app/gallery/page.tsx:29` | Server | Lightbox = `GalleryLightbox.tsx:1` (client) |
| `/contact` | `src/app/contact/page.tsx:22` | Server | Form = `ContactForm.tsx:1` (client) |
| `/downloads`, `/search`, `/privacy`, `/terms`, `/auth/recovery` | masing-masing `page.tsx` | Server | `SearchView.tsx:1` (client); `LegalArticle.tsx`; recovery = wrapper `ClientPage` |

### Beranda + hero (detail, karena menyangkut LCP)

- `src/app/page.tsx:269-338` — section HERO kustom inline (bukan `PageHero`), di dalam Server Component. Copy + CTA (`/admission`, `/profile`) adalah HTML biasa — pola ini **wajib dipertahankan** bila 3D masuk.
- `src/app/HeroBackground.tsx:1` (`"use client"`, export `:41-47`, props `{ytId?, videoUrl?}` dari `process.env.HERO_VIDEO_YT/URL` via `page.tsx:277-280`). Poster `/images/Ruang-Kelas.jpg` pakai `next/image fill + priority + sizes="100vw"` (`:65`); video hanya setelah mount & non-mobile (`:72-122`, `autoPlay/muted/loop/playsInline` atau iframe youtube-nocookie).
- `src/app/HeroVideoModal.tsx:1` (client, video hanya mount saat `open`).
- `src/app/HeroCarousel.tsx:1` — legacy, tidak diimpor `page.tsx` (komentar menyebutnya LCP di HP — jangan dihidupkan ulang tanpa audit).
- Hero generik halaman lain: `src/components/public/PageHero.tsx:55` (Server; grafis SVG murni via `HeroGraphic.tsx:189-198`, 5 varian nama).

## 4. Kandidat penempatan 3D

| # | Lokasi | File terkait | Dampak performa | Kesulitan | Putusan |
|---|---|---|---|---|---|
| 1 | **/portal** — backdrop grid `AppCard` + banner SPMB | `src/app/portal/page.tsx:271-348`, `lib/queries/portal.ts:16-29` | **Rendah** (below-fold, non-LCP) | Rendah | **Fase 1** (pilihan pemilik: minim rombak, tidak merembet) |
| 2 | Visi beranda + `/profile#visi-misi` — latar gradien/partikel | `src/app/page.tsx:1062-1109`, `src/app/profile/page.tsx:281-394` | Rendah–Sedang | Rendah–Sedang | Fase 2 |
| 3 | /program — ornamen pilar/agenda | `src/components/program/QuranPillars.tsx:14`, `DailyAgenda.tsx:13` | Rendah | Sedang | Fase 2/3 |
| 4 | Hero beranda — canvas 3D | `src/app/page.tsx:269-338`, `HeroBackground.tsx:1` | **Tinggi** (LCP, CLS, INP) | Tinggi | **Terakhir / batal bila LCP regresi** |

Catatan kandidat 1: teks kartu, judul, dan CTA tetap HTML di luar canvas; canvas hanya dekorasi (`aria-hidden`, `pointer-events:none`). Section terang → lihat §10 soal blending.

## 5. Baseline performa saat ini

- **Gambar (`next/image`, ~40 file):** `priority` selektif untuk LCP (`HeroBackground.tsx:65`; kondisional `priority={idx===0}` di news/articles/search list, `CoverImage`, `ContentCard`). `sizes` disiplin (`100vw`, breakpoint HP, thumb px). `fetchPriority`: **tidak ditemukan**. `remotePatterns`: `picsum.photos` + `cdn.smpmuh4tanggul.sch.id/**`; `localPatterns`: `/images/**`, `/videos/**`, `/documents/**`. `formats avif/webp`, `minimumCacheTTL 86400`, `deviceSizes` dipangkas tanpa 4K (640–1920).
- **Video hero:** poster prioritas + `<video preload="auto">` hanya setelah mount & non-mobile; varian carousel `preload="none"` (nol byte di HP sampai play).
- **Font:** `next/font/google` (`Plus_Jakarta_Sans`, `JetBrains_Mono`, `Source_Serif_4`, `latin`, `display:swap`, via CSS var — `layout.tsx:3,17-34`). `next/font/local`: tidak ditemukan. `preconnect` fonts + `dns-prefetch *.supabase.co` (`layout.tsx:248-249`). Ikon via `@phosphor-icons/react`, bukan font-file.
- **Script pihak ketiga:** GA `next/script strategy="afterInteractive"` (`layout.tsx:270-281`); `lazyOnload` tidak ditemukan. Beacon internal `AnalyticsBeacon.tsx` (sendBeacon `/api/track`, prod-only, hormati DNT, skip `/admin`, gate `admin_analytics`). Sentry (`instrumentation.ts`, `instrumentation-client.ts`, `error.tsx`, `global-error.tsx`, `withSentryConfig org:esceha`). Embed youtube-nocookie; PWA `ServiceWorkerRegister.tsx` prod-only.
- **Bundle produksi / First Load JS per-route / skor Lighthouse / LCP aktual: TIDAK TERVERIFIKASI** — `next build` dilarang di tree bersama (merusak `.next` milik `next dev`); `.next/build-manifest.json` yang ada adalah manifest dev tanpa ukuran byte. Wajib ukur di CI/Vercel preview sebelum dan sesudah tiap fase.

## 6. Pola yang sudah ada (wajib diikuti 3D)

- **Dynamic import:** hanya `src/app/page.tsx:27-35` (`FAQ`, `WhatsAppButton`, `TeacherCarousel`, `EkskulCarousel`, `CountdownEvent` — dengan SSR + skeleton `loading` anti-CLS). `next/dynamic ssr:false` dan `React.lazy`: **tidak ditemukan** — 3D akan jadi pengguna pertama pola ini (contoh pemakaian sudah disiapkan di komentar `IslamicParticles.tsx:217-242`, tapi tanpa `loading` skeleton — wajib ditambah).
- **Animasi:** tanpa framer-motion; CSS keyframes di `globals.css` (`shimmer`, `gradient-shift`, `stepIn`, `hero-media-zoom` hanya `no-preference + min-width:768px`, dll.) + `IntersectionObserver` (`CSSAnimations.tsx:45` `rootMargin:100px`, dipakai carousel/search/LegalToc).
- **`prefers-reduced-motion`: ditangani serius** — CSS `@media (prefers-reduced-motion: reduce)` + `no-preference` (`globals.css:532,612,737`); JS `matchMedia` di `CSSAnimations.tsx` (hydration-safe via `useSyncExternalStore`), `CountdownEvent.tsx:24`, `RunningText.tsx:57-59` (statis), `HistoryCarousel.tsx:16,55`, `admin/portal/ClientPage.tsx:658-661`. Implementasi 3D wajib ikut: gerak mati saat `reduce`.

## 7. Sumber data dinamis (selaras aturan no-hardcode)

- **`school_profile`: tabel kolom-lebar satu-baris** (`database.sql:30-60`, didok `database.md:32-65`; query `lib/queries/profile.ts:8-21` `select("*").single()` + React `cache`). Kolom: identitas, kepsek, visi/misi/sejarah, statistik, SPMB (`registration_mode`, `google_form_url`, `spmb_*`, `spmb_form_schema jsonb` — satu-satunya jsonb). RLS: `SELECT public`, `UPDATE` perlu `spmb:update`/`settings:manage`.
- **`site_settings`: tabel override key-value** (`{key PK, value, setting_group, value_type, ...}`, upsert `onConflict:"key"` di `admin/settings/actions.ts:193-205`). **DDL-nya tidak ter-versioned** (`supabase/site_settings.sql` dirujuk error-handler tapi tidak ada di repo — hanya `backup-perm, diagnostics-perm, ekskul, faq, profile-name, program, sessions, soft-delete, trash-perm`) — risiko kode-sebelum-migrasi ditutup kode via degradasi anggun.
- **Resolver 3-lapis** (`lib/settings/index.ts:45-76`): `override (site_settings) → profile (school_profile) → default (registry)`. Registri `lib/settings/registry.ts` (6 grup: identitas, kontak, media_sosial, seo, footer, tema; tipe `text|textarea|richtext|url|email|image|color` — **tanpa `boolean`**).
- **Kepatuhan no-hardcode saat ini: belum strict** — fallback terpusat by-design (`lib/site-content.ts:13-59`: `VISION_FALLBACK`, `MISSION_FALLBACK`, foto kepsek; `page.tsx:192-203,932`, `profile/page.tsx:70`, `portal/page.tsx:242`, `layout.tsx:36-41`). Menolkan fallback berarti ubah kontrak resolver + 4 halaman — di luar scope 3D.

### Usulan config 3D (rencana, JANGAN buat tabel baru)

**Opsi 1 — disarankan: kunci baru di `site_settings` + registry, tanpa migrasi SQL** (grup baru `tampilan_3d` atau masuk `tema`):

| `key` | tipe | default | validasi |
|---|---|---|---|
| `three_enabled` | `boolean` (tipe baru; kini boolean dimodelkan string) | `"false"` | `true/false` — master switch; canvas hanya bila true |
| `three_portal_enabled` | `boolean` | `"false"` | switch per-lokasi (Portal dulu) |
| `three_color` | `color` | `"#082b59"` | `validateColor` — warna pola bintang |
| `three_accent_color` | `color` | warna aksen tema | `validateColor` — warna debu |
| (`three_poster_url`) | `image` | `"/og-image.jpg"` | cadangan bila WebGL mati / `reduce` |

Menjawab Q2 pemilik ("untuk apa boolean/toggle"): tanpa tipe ini admin tidak punya saklar darurat — sekali rilis, 3D menyala untuk semua pengunjung dan hanya bisa dimatikan via deploy. Boolean = saklar matikan-tanpa-deploy (darurat LCP/bug WebGL/komplain HP lemah) + switch per-lokasi. Implementasi: tambah `"boolean"` ke `SettingType` + renderer switch di `SettingsForm.tsx` (kini boolean = string `"true"/"false"`).

**Opsi 2 — ditolak:** kolom di `school_profile` (butuh migrasi bernomor + runner `npm run db:migrate`, duplikasi sumber kebenaran dengan `site_settings`). Hanya bila 3D dianggap identitas inti setara `logo_url/vision` — bukan kasus ini.

**Kontrol admin:** satu baris UI per kunci di `/admin/settings` (tab grup 3D), izin `settings:manage` + audit `log_activity` yang sudah ada (`actions.ts:116-222`, diff before/after, `updateTag + revalidatePath("/","layout")`). Pola Kelola Portal (`ClientPage.tsx` ~1300 baris, DnD `@dnd-kit`, `StatusControl`, validasi `^(/|#|https?://)`) **tidak perlu** ditiru untuk 3D — itu untuk koleksi berulang, bukan saklar tampilan.

## 8. SEO & aksesibilitas

- Root `generateViewport` + `generateMetadata` (`layout.tsx:48-112`): `metadataBase` dari `site_url`, title template `%s|school`, description/keywords, OG website `id_ID` + image 1200x630, twitter `summary_large_image`, ikon/manifest/RSS. Per-halaman `generateMetadata` + `alternates.canonical` di semua route publik; homepage `title.absolute`.
- OG dinamis via `lib/seo.ts:63` `pageOpenGraph({url, images})` + kartu `/api/og` (`next/og`). JSON-LD di `<head>`: `EducationalOrganization+School+MiddleSchool` (nama, alamat, geo `-8.1519069,113.4547709`, kontak, foundingDate 2016) + `WebSite` dengan `SearchAction /search?q=...`. `robots.ts` (allow `/`, disallow `/admin/,/api/`), `sitemap.ts` (`revalidate:3600`).
- **Syarat 3D:** teks penting/judul/CTA tetap HTML di luar canvas (contoh komentar `IslamicParticles` sudah benar); canvas `aria-hidden="true"` + `pointer-events:none`; `prefers-reduced-motion` → statis; tidak ada perubahan metadata/structured-data. Isi alt/OG per-slug satu-per-satu **tidak diaudit** di riset ini.

## 9. Kompatibilitas deploy (Vercel)

- `next.config.ts` (228 baris): tanpa `output:standalone/export`, tanpa `transpilePackages`, `typescript.ignoreBuildErrors:false`, `serverExternalPackages:[]`, `outputFileTracingExcludes` untuk `@aws-sdk/@smithy` (±40 route), `allowedDevOrigins`, env non-rahasia Supabase/R2, `withSentryConfig (org:esceha, widenClientFileUpload:true)`.
- **Header cache `.glb/.gltf`: tidak ada** — hanya `/_next/static/*` (immutable prod), `/images/*` (86400 + SWR), `sw.js/offline.html` (no-cache), security (`nosniff`, `DENY`, XSS, Referrer-Policy).
- **Keputusan aset (menjawab Q5):** fase prosedural = **nol file model, nol kebutuhan R2**. Bila fase 3 kelak memakai `.glb`: **R2 `esceha-cdn/models/*.glb`** via pipeline `storage.ts` (`StorageBucket images|documents`, upload via `/api/admin/storage`, URL absolut CDN tersimpan di settings) — selaras arsitektur "media keluar dari repo" (`README.md:51-56`, `CUTOVER-R2.md:73-93`, backfill `0008`, `remotePatterns cdn/**` sudah lolos). Syarat: `Content-Type: model/gltf-binary`, CORS bila fetch cross-origin, kompresi Draco/meshopt + LOD untuk file >20MB. `public/models/*.glb` hanya untuk placeholder dev <1MB (perlu tambah `localPatterns /models/**` + header cache); tiap ganti model = redeploy + membengkakkan build Vercel.

## 10. Review `src/components/three/IslamicParticles.tsx` (milik pemilik, WIP untracked)

> File ada (242 baris, `"use client"`), belum dipakai halaman mana pun. **Hasil visual tidak terverifikasi** — `three` + `@react-three/fiber` belum terinstal (`node_modules/three` tidak ada) sehingga tidak bisa dirender; penilaian di bawah murni dari pembacaan kode.

**Yang akan terlihat (dari kode):** pola bintang 8 sudut (Rub el Hizb) 3 lapis konsentris (`RINGS:26`), titik sepanjang sisi persegi (`buildStarPositions:31-55`), + 260 debu acak (`:58-66`). Total ~1.124 titik — sangat ringan, cocok untuk budget RAM 2/3 GB. Rotasi lambat berlawanan arah (`spin 0.04 / -0.015`), parallax pointer (`:105-112`), tekstur dot dari canvas 2D tanpa file gambar (`:69-80`).

**Verdict: BAGUS untuk Portal, dengan 1 catatan besar + 5 perbaikan kecil.**

**Catatan besar — blending vs background terang:** material memakai `THREE.AdditiveBlending` (`:130`). Di background gelap (hero biru) ini memberi glow yang bagus, tetapi /portal saat ini terang (`bg-white`, `portal/page.tsx:302-306`) — additive di atas putih nyaris tak terlihat. Solusi: (a) pasang di section gelap khusus (banner), atau (b) ganti ke `NormalBlending` + opacity untuk area terang Portal.

**Yang sudah benar:** `frameloop "demand"/"never"` + `IntersectionObserver` (`:163-164,188`); `dpr={[1,1.5]}`, `antialias:false`, `powerPreference:"low-power"` (`:189,191`); hormati `prefers-reduced-motion` (`:152`); fallback kosong bila WebGL mati (`:155-160,186`); `aria-hidden` + `pointer-events:none` (`:183-184`); tekstur di-`dispose` (`:103`), geometri `useMemo`.

**5 perbaikan sebelum pakai:**

1. `PointerRef = React.MutableRefObject` (`:82`) — deprecated di React 19 types; ganti `RefObject`.
2. Contoh memakai `profile.hero_particle_color` (`:234`) — kunci itu **tidak ada** di `registry.ts:28-31`; ganti ke key usulan §7 (`three_color`, `three_accent_color`).
3. Contoh `dynamic(..., {ssr:false})` (`:223-226`) tanpa `loading` skeleton — tambah skeleton ukuran tetap agar tidak CLS (ikuti pola `page.tsx:27-35`).
4. Belum ada kill-switch RAM lemah (`deviceMemory ≤ 3` / `hardwareConcurrency ≤ 4`) sesuai budget pemilik — bila lemah, render fallback CSS saja.
5. Import `three`/`fiber` gagal `tsc` sampai package diinstal (`npm i three @react-three/fiber@^9`) — instalasi ini bagian Fase 0.

## 11. Risiko → mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| WebGL tidak tersedia / gagal init | Canvas hitam/kosong | Deteksi `webgl2 \|\| webgl` sebelum render (`IslamicParticles:155-160` sudah ada); fallback poster/CSS statis; `aria-hidden` |
| HP RAM 2/3 GB, GPU lemah | Jank, INP jebol, baterai | `dpr ≤ 1.5`, `antialias:false`, `low-power`, poly <10k, tanpa shadow/postprocessing; kill-switch `deviceMemory/hardwareConcurrency`; hormati `reduce` |
| LCP / CLS regresi | SEO + SPMB turun | Jangan sentuh hero dulu; canvas `dynamic ssr:false` + skeleton ukuran tetap; teks/CTA HTML di luar canvas; ukur LCP di preview tiap fase |
| Bundle +500KB–1MB | TTFB/parse lama di 3G | Hanya `three` + `fiber`, tanpa `drei` penuh; import sempit; chunk terpisah via `dynamic` (tidak membebani First Load route lain) |
| SSR crash (`window`/`document`) | 500 di server | Semua 3D `"use client"` + `dynamic {ssr:false}`; tidak diimpor dari Server Component; `matchMedia`/`document` hanya di `useEffect` |
| Aturan no-hardcode | Warna/URL tertanam di kode | Semua dari `site_settings` (§7); kosong = sembunyi; badge sumber `override|profile|default` di form |
| Additive tak terlihat di tema terang | Kerja sia-sia | Uji di background Portal terang; siapkan varian `NormalBlending` / section gelap |
| Vercel build membengkak | Deploy lambat/gagal | Prosedural = nol aset; `.glb` (bila ada) di R2, bukan repo |

## 12. Rekomendasi arsitektur

- **Struktur:** `src/components/three/ThreeBackdrop.tsx` (pembungkus: deteksi WebGL + `deviceMemory` + `reduce` + `IntersectionObserver` + fallback) + `IslamicParticles.tsx` (scene; perbaiki 5 item §10) + `usePauseOnHidden.ts` (opsional, kini logika IO masih inline `:163-164`). Satu wrapper dipakai ulang Portal → Visi → Program.
- **Loading:** `next/dynamic(() => import("@/components/three/ThreeBackdrop"), { ssr: false, loading: () => <div className="h-[...]" aria-hidden /> })` di komponen client per-section (jangan di `page.tsx` Server secara langsung — bungkus section client kecil atau selipkan di child client yang sudah ada).
- **Runtime hemat (sesuai RAM 2/3 GB):** `frameloop="demand"` saat `reduce` / `"never"` saat offscreen (`:188` sudah benar); `dpr={[1, 1.5]}` (turunkan ke `[1, 1]` bila keluhan); `gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}`; `sizeAttenuation`, `depthWrite:false`; geometri `useMemo`, tekstur `dispose`.
- **Fallback statis:** bila `!webgl || !enabled || reduce-diinginkan-statis` → render `<div>` gradient/dot CSS (tanpa JS 3D) dengan ukuran sama persis (nol CLS).

## 13. Rencana implementasi bertahap

- **Fase 0 — saklar + fondasi (tanpa visual):** tambah `"boolean"` ke `SettingType` + 4–5 key grup `tampilan_3d` di `lib/settings/registry.ts`; renderer switch + tab di `admin/settings/SettingsForm.tsx`; `npm i three @react-three/fiber@^9`; perbaiki 5 item `IslamicParticles.tsx`. File: `registry.ts`, `SettingsForm.tsx`, `package.json` (+lock), `IslamicParticles.tsx`. Verifikasi: `tsc`, `lint`, test, deploy preview tanpa perubahan visual (semua switch `false`).
- **Fase 1 — Portal prosedural (ringan):** backdrop di belakang grid `AppCard` (`portal/page.tsx:298-348`) + banner SPMB (`:271-295`) via `ThreeBackdrop` (`dynamic ssr:false` + skeleton). Atasi blending terang (§10). File baru: `ThreeBackdrop.tsx` (+ `usePauseOnHidden.ts` opsional); ubah: `portal/page.tsx` (satu section saja), `registry.ts` (switch `three_portal_enabled`). Verifikasi: Lighthouse preview vs baseline, uji HP RAM 2–3 GB + `reduce` + WebGL-mati.
- **Fase 2 — Visi/profile + program:** pakai ulang wrapper di `app/page.tsx:1062-1109` dan `profile/page.tsx:281-394` (banner + pilar), lalu `QuranPillars`/`DailyAgenda`. File: kedua page + `registry.ts` (switch per-lokasi). Tetap prosedural, tetap di luar LCP.
- **Fase 3 — opsional `.glb` via R2:** hanya bila Fase 1–2 mulus dan ada model siap (<20MB, Draco). Upload `esceha-cdn/models/`, URL di `three_model_url`, pastikan `Content-Type`/CORS. **Hero beranda terakhir atau batal** bila LCP regresi >100ms.

## 14. Pertanyaan / keputusan sebelum implementasi

Terjawab: syarat "hero terakhir" ✓ · toggle untuk saklar darurat ✓ · prosedural tepat untuk Fase 1 ✓ · budget RAM 2/3 GB ✓ · R2 tersedia (baru dipakai Fase 3) ✓ · Portal pertama ✓.

Tersisa untuk pemilik:

1. Motif prosedural Portal: (a) partikel dots halus, (b) geometri Islami (Rub el Hizb seperti contoh — disarankan), atau (c) wave gradient?
2. Section Portal gelap khusus (agar additive glow terlihat) atau pertahankan terang + varian `NormalBlending`?
3. Ambang kill-switch: `deviceMemory ≤ 3` + `cores ≤ 4` (disarankan) atau lebih longgar?
4. Batas regresi LCP yang membatalkan fase (mis. +100ms, disarankan)?
5. `three_enabled` global + per-lokasi, atau per-lokasi saja?

## Lampiran — tidak terverifikasi (jangan dijadikan dasar keputusan)

- Angka First Load JS per-route, skor Lighthouse/LCP/INP aktual (butuh `next build` + audit; dilarang di tree bersama — ukur di CI/preview).
- Isi alt/OG per-slug satu-per-satu (pola terverifikasi, isi tidak diaudit).
- DDL `site_settings` (file `supabase/site_settings.sql` tidak ada di repo).
- Hasil visual `IslamicParticles` (butuh instal package + `next dev`; belum dijalankan).
- Harga/kuota R2 dan batas upload route `/api/admin/storage` untuk `.glb` besar.
