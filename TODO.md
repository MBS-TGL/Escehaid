# TODO — Kerjakan saat konfirmasi (mulai: besok)

> Urutan eksekusi: A → B1 → B2 → B3 → B4 → B5 → C. Satu commit + push per fase.

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

## Catatan keputusan

- Urutan mobile `/contact`: **form dulu, info sekolah kemudian** (keputusan final, tanpa `order-*`)
- Fitur advanced dipilih user: multi-token + highlight + riwayat + toleransi typo DB-level
- Cakupan search: **keduanya** (publik deep-upgrade + admin palette polish)
