# TODO — Kerjakan saat konfirmasi (mulai: besok)

> Urutan eksekusi: D1 → D2 → A → B1 → B2 → B3 → B4 → B5 → C. Satu commit + push per fase.

## A. Perbaikan mobile `/contact` — 5 poin

- [ ] `src/app/contact/ContactForm.tsx`
  - [ ] Alamat: `truncate` → `break-words` (line ~155). Email tetap `truncate`
  - [ ] Semua `input`/`textarea`: `text-sm` → `text-base` (16px, anti zoom-jump iOS) — line 68, 80, 90, 101, 112
  - [ ] Grid Email/Telepon: `sm:grid-cols-3` → `sm:grid-cols-2` (line ~72, kolom ketiga kosong)
  - [ ] Baris Contact Person: nama `min-w-0 truncate`, nomor `shrink-0 whitespace-nowrap`, tambah `gap-3` (line ~187)
  - [ ] Tombol kirim: `w-full sm:w-auto text-center`
- [ ] **Commit + push** (satu commit: `fix(contact): ...`)

## B1. Multi-token + ranking — bukti kecerdasan DB

- [ ] `src/lib/queries/shared.ts`: tambah `tokenizeSearch(raw)` — pecah spasi, maks 4 token, tiap token ≤ 40 char, dinormalisasi `sanitizeSearchTerm`
- [ ] Filter DB di 5 modul (`news/articles/activities/achievements/ekskuls.ts`): ganti `.or()` substring tunggal → `.or()` gabungan token × kolom (item cocok bila SALAH SATU token kena; ranking menyusul di client)
- [ ] `src/lib/queries/search.ts`: skor untuk tiap `SearchItem` — persentase token cocok + bonus title-hit; `groupSearchResults` sort per grup: skor desc, lalu tanggal desc
- [ ] Halaman daftar (`getNewsList` dsb) + `/search?q=` tetap jalan (netral mode no-JS)
- [ ] **Commit + push**

## B2. Highlight `<mark>`

- [ ] Helper murni `splitHighlight(text, tokens)` → segmen `{ text, matched }[]`, render via React elements (TANPA `dangerouslySetInnerHTML`)
- [ ] Terapkan di: `SearchOverlay.tsx` (judul + excerpt) dan `src/app/search/SearchView.tsx`
- [ ] Style `mark` di `globals.css` bila belum ada (bg brand-accent/20, warna inherit)
- [ ] **Commit + push**

## B3. Riwayat pencarian (publik)

- [ ] localStorage `search-recent` maks 5 — simpan saat: Enter pilih hasil, Enter redirect `/search?q=`, klik "Lihat semua hasil"
- [ ] State idle (input kosong): list "Pencarian Terakhir" + tombol hapus per item + clear all
- [ ] **Commit + push**

## B4. Toleransi typo DB-level (`pg_trgm`)

- [ ] SQL file `sql/pg-trgm.sql`: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` + GIN index trgm untuk kolom pencarian — **DOKUMEN: dijalankan manual via Supabase SQL Editor** (repo tanpa sistem migration)
- [ ] Probe runtime (`pg_extension`, pola `tableHasColumn`): trigram ADA → filter `similarity(col, token) > 0.25`; TIDAK ADA → fallback `.or() ilike` B1 (nol crash)
- [ ] **Commit + push**

## B5. Command palette admin — `src/app/admin/Topbar.tsx`

- [ ] Navigasi ↑/↓ (saat ini cuma Esc), Enter = buka item aktif, `aria-activedescendant` + `role="combobox"`
- [ ] Highlight kecocokan substring pada label hasil
- [ ] "Baru dibuka" (localStorage maks 4) tampil saat query kosong
- [ ] **Commit + push**

## C. Verifikasi & rilis akhir

- [ ] Tambah test: `search.test.ts` — `tokenizeSearch`, scoring/grouping, `splitHighlight`, simpan-hapus riwayat
- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Smoke manual: overlay publik (multi-token + highlight + riwayat), halaman `/search`, palet admin, mobile `/contact`

## D. CI hijau + guardrails kerja paralel (temuan 24 Okt)

> D1 paling mendesak: CI gagal di 10 push terakhir (tsc tak kenal `LayoutProps`
> karena `next-env.d.ts`/`.next` di-gitignore), padahal Vercel deploy tiap push.
> Eksekusi D1 dulu (sebelum A), baru sisanya.

### D1. Perbaiki CI (`.github/workflows/ci.yml`)

- [x] Bump `actions/checkout@v4 → v5`, `setup-node@v4 → v5` (Node 20 deprecated)
- [x] Tambah step `npx next typegen` sebelum `npx tsc --noEmit` (dokumentasi Next 16)
- [x] Tambah step `npm test` ke quality job
- [x] Build job: ganti gate/env basi `NEXT_PUBLIC_SUPABASE_*` → `SUPABASE_URL` + `SUPABASE_ANON_KEY` (+ `SITE_URL`), perbarui komentar
- [x] Tambah `NEXT_TELEMETRY_DISABLED: 1`
- [x] Commit + push → poll Actions API sampai quality green; catat skip/run build job — **BERHASIL: run `c3f6bb3` hijau penuh, build job jalan (secrets sudah diset), bukan skip**

### D2. Guardrails lokal

- [x] `AGENTS.md`: section "Guardrail kerja paralel" — stage path eksplisit saja (larang `add -A/-u`, `stash`, `clean`, `checkout -- .`), lint scoped saat tree kotor, dilarang `build`/`start` saat `next dev` aktif, `fetch`+`log @{u}..HEAD` sebelum push, CI = sumber kebenaran
- [x] `.githooks/pre-commit`: tambah lint ESLint untuk file staged `*.ts`/`*.tsx` (fail-closed, escape hatch `SKIP_LINT_GUARD=1`), uji via file temp staged tanpa commit — teruji: error→tolak, bersih→lolos, rahasia→tolak, skip→lolos; panggil eslint via `node` langsung (exit code asli — xargs/shim merusak rc)
- [ ] Commit + push
- [ ] Laporan akhir: status CI + langkah manual (set GitHub Secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` agar build job aktif)

## Catatan keputusan

- Urutan mobile `/contact`: **form dulu, info sekolah kemudian** (keputusan final, tanpa `order-*`)
- Fitur advanced dipilih user: multi-token + highlight + riwayat + toleransi typo DB-level
- Cakupan search: **keduanya** (publik deep-upgrade + admin palette polish)
