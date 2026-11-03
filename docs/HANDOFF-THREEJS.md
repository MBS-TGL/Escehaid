# Handoff Eksperimen Three.js — Untuk Agent AI Berikutnya

> Baca file ini dulu sebelum menyentuh kode. Konteks penuh ada di `docs/ANALISIS-THREEJS.md` (201 baris, sumber kebenaran).
> File ini = instruksi eksekusi Fase 0 → Fase 1. Fase 2+ hanya sketsa.

## 0. STATUS EKSEKUSI (diperbarui 2026-11-03) — Fase 0, 1, 2, 2.5 SELESAI

- **Fase 0** `d4759e8` — fondasi: three + fiber v9 terinstal, tipe `boolean` + grup `tampilan_3d`
  (saklar induk + per lokasi, semua default `false`), `ThreeBackdrop` (gate saklar + WebGL +
  kill-switch RAM ≤3 GB/core ≤4), perbaikan 5 item `IslamicParticles.tsx`.
- **Fase 1** `5f30177` — Portal: backdrop partikel `NormalBlending` di belakang banner SPMB +
  grid AppCard via `ThreeOrnament` (dynamic import `ssr:false` + skeleton anti-CLS).
  Fix `8f8816a`: saklar mati = `null` total (bukan fallback gradasi).
- **Fase 2** `3b45df1` — visi beranda + kartu visi `/profile#visi-misi` (`AdditiveBlending`,
  bidang gelap) + dua section `/program` (`NormalBlending`, latar terang; konten dibuat
  `relative` agar di atas ornamen). Saklar baru: `three_visi_enabled`, `three_profile_enabled`,
  `three_program_enabled`.
- **Fase 2.5** — lapisan prosedural tanpa model (`SceneExtras.tsx`): bintang Rub el Hizb 3D
  solid (`ExtrudeGeometry`) + 2 ring arabeske `LineLoop` untuk bidang gelap, dan gelombang
  shader GLSL halus untuk latar terang. Semua di dalam gate/kill-switch yang sama, nol file,
  nol settings baru, 3–4 draw call tambahan.
- **Fase 3 (.glb via R2) DIBATALKAN** — aset model belum ada; dibuka lagi hanya bila pemilik
  menyediakan `.glb` <20 MB (Draco) + izin pipeline R2.
- Semua commit di atas: CI + deploy Vercel hijau. Nol perubahan visual produksi sampai admin
  menyalakan saklar di `/admin/settings` → tab **Tampilan 3D**.
- Verifikasi yang masih milik pemilik: uji HP RAM 2–3 GB, `prefers-reduced-motion`,
  LCP sebelum/sesudah (ambang pembatal +100 ms).

## 1. Misi

Pasang ornamen 3D prosedural ringan (partikel Rub el Hizb) di halaman **/portal** website SMP Muhammadiyah 4 Tanggul,
tanpa merusak LCP/SEO, dengan saklar admin + kill-switch HP lemah. Hero beranda **JANGAN disentuh**.

## 2. Snapshot proyek (terverifikasi 2026-11-02)

- Next 16.4.2 (pin exact, `--webpack`, bukan Turbopack) + React 19.2.8 (pin exact) + TS 5.9.3 (`strict`, `ignoreBuildErrors:false`) + Tailwind v4.3.3. App Router eksklusif, npm (`package-lock.json`).
- `three` / `@react-three/fiber` / `drei` / `framer-motion`: **belum terinstal**. Instal yang benar: `npm i three @react-three/fiber@^9` (fiber v9 ↔ React 19; fiber v8/drei v9 = konflik peer). **Tanpa `drei`** (hemat ~500KB–1MB).
- Semua `page.tsx` publik = Server Component. Pola animasi: CSS + `IntersectionObserver`; `prefers-reduced-motion` dihormati di CSS (`globals.css:532,612,737`) dan JS (`CSSAnimations.tsx`, `CountdownEvent.tsx:24`).
- Config dinamis: resolver 3-lapis `site_settings` override → `school_profile` → default (`src/lib/settings/index.ts:45-76`). Registri: `src/lib/settings/registry.ts` (tipe kini: `text|textarea|richtext|url|email|image|color` — **tanpa `boolean`**).
- Media resmi via R2 `cdn.smpmuh4tanggul.sch.id` (`src/lib/storage.ts`). Fase prosedural = **nol file model, nol kebutuhan R2**.
- Lokasi target: `src/app/portal/page.tsx:271-348` (banner SPMB + grid `AppCard`). Teks/CTA tetap HTML di luar canvas.

## 3. Keputusan pemilik yang sudah dikunci (jangan tanya ulang)

1. Kesimpulan "layak dengan syarat, hero terakhir" — setuju.
2. Boolean/toggle = saklar darurat matikan-tanpa-deploy — setuju dibuat.
3. Prosedural saja untuk Fase 1 (tanpa `.glb`) — setuju.
4. Budget: RAM 2/3 GB — wajib `dpr ≤ 1.5`, `antialias:false`, `low-power`, kill-switch `deviceMemory ≤ 3` / `cores ≤ 4`.
5. R2 Cloudflare tersedia — baru dipakai bila Fase 3 (`.glb`).
6. Portal pertama (minim rombak, tidak merembet) — setuju.

## 4. Pertanyaan yang masih terbuka (tanyakan ke pemilik bila sampai Fase 2)

1. Motif Portal: (a) dots halus, (b) Rub el Hizb (disarankan), (c) wave gradient?
2. Section Portal gelap khusus (additive glow terlihat) vs pertahankan terang + varian `NormalBlending`?
3. Ambang kill-switch: `deviceMemory ≤ 3` + `cores ≤ 4` (disarankan) atau lebih longgar?
4. Batas regresi LCP pembatal fase (disarankan +100ms)?
5. Switch global + per-lokasi, atau per-lokasi saja?

## 5. Keadaan `src/components/three/IslamicParticles.tsx` (242 baris, WIP pemilik, untracked)

File sudah ada tapi **belum bisa render** (package belum diinstal) dan butuh 5 perbaikan sebelum pakai:

1. `:82` `React.MutableRefObject` deprecated di React 19 types → ganti `RefObject`.
2. `:234` contoh memakai `profile.hero_particle_color` — kunci tidak ada di registry → ganti ke `three_color` / `three_accent_color` (§6).
3. `:223-226` contoh `dynamic({ssr:false})` tanpa `loading` skeleton → tambah skeleton ukuran tetap (anti-CLS, ikuti `src/app/page.tsx:27-35`).
4. Belum ada kill-switch RAM lemah → tambah cek `navigator.deviceMemory` / `hardwareConcurrency`, bila lemah render fallback CSS saja.
5. Import `three`/`fiber` gagal `tsc` sampai `npm i` dijalankan (Fase 0).
6. **Catatan besar:** `:130` `AdditiveBlending` nyaris tak terlihat di /portal yang terang (`bg-white`) → siapkan varian `NormalBlending` atau section gelap.

Yang sudah benar (jangan rusak): `frameloop demand/never` + `IntersectionObserver` (`:163-164,188`), `dpr [1,1.5]`, `powerPreference low-power`, cek WebGL (`:155-160`), `aria-hidden` + `pointer-events:none`, dispose tekstur, geometri `useMemo`, hormati `reduce` (`:152`).

## 6. Skema settings yang diusulkan (tanpa migrasi SQL)

Tambah ke `src/lib/settings/registry.ts` (grup baru `tampilan_3d`):

| key | tipe | default |
|---|---|---|
| `three_enabled` | `boolean` (baru) | `"false"` |
| `three_portal_enabled` | `boolean` (baru) | `"false"` |
| `three_color` | `color` | `"#082b59"` |
| `three_accent_color` | `color` | warna aksen tema |
| `three_poster_url` | `image` (opsional) | `"/og-image.jpg"` |

Perlu tambah `"boolean"` ke `SettingType` (`registry.ts:28`) + renderer switch di `admin/settings/SettingsForm.tsx`. Izin `settings:manage` + audit sudah mencakup.

## 7. Tugas Fase 0 — saklar + fondasi (tanpa perubahan visual)

1. `npm i three @react-three/fiber@^9` (tepat: fiber major 9; jangan v8; jangan drei).
2. Perbaiki 5 item §5 di `IslamicParticles.tsx` (kecuali instalasi).
3. Tambah tipe `boolean` + 4–5 key §6 di `registry.ts`; renderer switch + tab di `SettingsForm.tsx`.
4. Buat `src/components/three/ThreeBackdrop.tsx`: pembungkus (cek `three_enabled` + WebGL + `deviceMemory` + `reduce` + `IntersectionObserver` + fallback `<div>` gradient ukuran sama).
5. Verifikasi: `npx tsc --noEmit` hijau, `npx eslint` pada file yang diubah, `npm test`. Deploy preview: **nol perubahan visual** (semua switch `false`).
6. Commit + push (satu fase = satu commit).

## 8. Tugas Fase 1 — Portal prosedural

1. Bungkus `ThreeBackdrop` via `next/dynamic({ ssr:false, loading: skeleton ukuran tetap })` di komponen client section Portal (jangan impor langsung dari `page.tsx` Server).
2. Pasang di belakang grid `AppCard` (`portal/page.tsx:298-348`) + banner SPMB (`:271-295`). Atasi blending terang (§5 poin 6).
3. Warna dari settings (`three_color`, `three_accent_color`); kosong/nonaktif = sembunyi total.
4. Verifikasi: Lighthouse preview vs baseline, uji HP RAM 2–3 GB + `reduce` + WebGL-mati + kill-switch. Batal bila LCP regresi > ambang (§4 poin 4).
5. Commit + push.

## 9. Guardrail wajib (dari AGENTS.md — pelanggaran = kerjaan ditolak)

- **Staging eksplisit:** `git add <path jelas>`, TIDAK PERNAH `git add -A/-u`. Sebelum commit: `git status --porcelain` + `git diff --cached --name-only` — hanya file sendiri.
- **Larangan:** `git stash/clean/checkout -- ./reset --hard`, `next start/build` di tree ini (merusak `.next` milik `next dev` pemilik). Verifikasi build lewat CI/Vercel preview.
- **Lint tercemar WIP:** `npx eslint <file-sendiri>` saja; error di file pemilik hanya dilaporkan.
- **Sebelum push:** `git fetch` + `git log --oneline @{u}..HEAD`; laporkan commit pemilik yang ikut terpush.
- **CI = kebenaran:** cek GitHub Actions sampai hijau; jangan klaim selesai bila merah.
- Teks/CTA/judul tetap HTML di luar canvas. Jangan ubah metadata/JSON-LD/robots. Hormati `prefers-reduced-motion`.

## 10. Tidak terverifikasi (jangan jadikan asumsi)

Angka First Load JS, skor Lighthouse/LCP aktual, isi alt/OG per-slug, DDL `site_settings` (file tidak ada di repo), hasil visual partikel (butuh dev + instal), kuota R2 untuk `.glb` besar.
