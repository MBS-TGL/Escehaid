# Laporan: Perbaikan UI/UX Mobile View — 9 Halaman Admin

Tanggal: 11 Okt 2026 · Branch: `main` · Breakpoint mobile: `< md` (768px)

Semua pekerjaan selesai dalam satu sesi, satu commit per halaman, tanpa push/perpindahan branch,
tanpa perubahan `.env*`, skema DB, `@/lib/queries`, RLS, atau halaman Portal.

## Ringkasan commit

| Commit | Isi |
| --- | --- |
| `a26f097` | Komponen bersama mobile (`src/components/admin/mobile/`) |
| `137557e` | Fasilitas (halaman pola / referensi) |
| `7d8ae1f` | Guru |
| `05cec03` | Agenda |
| `5874fba` | Kegiatan |
| `6fa63e0` | Pengumuman |
| `6515c49` | Artikel |
| `7fcab1d` | Berita |
| `8380e78` | Pesan |
| `18fbf6f` | SPMB |

---

## Komponen bersama baru — `src/components/admin/mobile/`

Semua halaman memakai komponen ini (tidak menyalin kode 9 kali):

| Komponen | Peran |
| --- | --- |
| `RowActionsMenu` (+ tipe `RowAction`) | Tombol ⋯ + menu aksi floating, di-portal ke `document.body` (`position: fixed`, flip atas/bawah, re-posisi saat scroll/resize). ARIA `menu`/`menuitem`, item min-h 11 (44px), Esc/klik luar menutup + fokus kembali ke tombol, panah/Home/End berpindah opsi, aksi hapus merah. |
| `MobileFilterBar` (+ `MobilePickButton`) | Toolbar mobile **dua baris**: baris 1 = pencarian selebar sisa (tombol bersihkan) + tombol "Pilih"; baris 2 = pill dropdown filter **dengan jumlah** per opsi (+ `filter2`) + dropdown Urut, **tanpa ikon & padding ringkas** agar tiga pill muat satu baris dan terlihat penuh (tanpa scroll yang memotong; `flex-wrap` cadangan). Saat mode pilih: berubah jadi baris "n dipilih + Pilih semua/Hapus centang + Selesai". |
| `MobileSelectBar` (+ `ADMIN_BOTTOM_NAV_H`) | Bar aksi massal sticky di bawah layar, `bottom: calc(54px + env(safe-area-inset-bottom))` — tepat di **atas** bottom nav admin (z-40, `md:hidden`), `role="region"` + `aria-live` pada jumlah. Slot `children` untuk aksi tambahan (Terbitkan, Terima, Tandai Dibaca, dll). |
| `MobilePagination` | Paginasi ringkas "‹ Sebelumnya · Hal x / y · Berikutnya ›" + teks "Menampilkan a–b dari n" yang membungkus. Tanpa deretan nomor halaman. |
| `MobileListRow` | Layout baris daftar serbaguna `[lead] [thumb] [judul+subteks] [status] [aksi]`, `select-none [-webkit-touch-callout:none]`, long-press 500ms (dibatalka­n­ gerak > 10px; klik lahir dari long-press dibuang). |
| `Menu.tsx`, `useMenu.ts` | Panel menu + hook (portal, focus trap sederhana, keyboard nav, flip/reposition). |

---

## Ringkasan per halaman

### 1. Fasilitas — `137557e` (halaman pola)
- `FacilityMobileRow`: handle drag penuh di tepi kiri (`touch-none`), thumbnail 48px (fallback `ImageSquare`), nama `line-clamp-2` + deskripsi 1 baris, ikon `Warning` "Tanpa gambar" bila aktif tapi kosong, pill **Aktif/Nonaktif tetap bisa diketuk** (`handleToggleActive`), menu ⋯ Lihat/Edit/Duplikat/Hapus. Tap baris = lihat.
- Toolbar mobile: pencarian + filter (Semua/Aktif/Nonaktif + jumlah) + Urut + Pilih.
- `DndContext`/`SortableContext` **terpisah** untuk tabel desktop (`hidden md:block`) dan daftar mobile (`md:hidden`); drag hanya aktif saat tanpa pencarian/filter/sort lain (handle nonaktif + petunjuk).
- Modal lihat gambar 16:9 tanpa overflow; SlideOver form: input 16px, bar Simpan/Batal sticky.

### 2. Guru — `7d8ae1f`
- `TeacherMobileRow`: avatar bulat + nama + mata pelajaran/jabatan + status.
- Halaman ini tidak punya DnD → **Naik/Turun** tersedia di menu ⋯ (otomatis hilang di batas atas/bawah). Tap baris = Edit (mengikuti klik baris desktop).

### 3. Agenda — `05cec03`
- `AgendaMobileRow`: lencana tanggal (hari + bulan singkat) sebagai lead, judul, lokasi/waktu, status; Naik/Turun di menu ⋯; tap baris = Edit.

### 4. Kegiatan — `5874fba`
- `ActivityMobileRow`: thumbnail, badge jenis kegiatan, subteks tanggal · lokasi, pill **Publish/Draft bisa diketuk**, menu ⋯ Lihat/Edit/Duplikat/Hapus; tap baris = lihat.
- Filter status + **dropdown Urut** (header tabel bisa diklik di desktop, tidak ada di mobile).
- `MobileSelectBar` dengan aksi **Terbitkan/Draft**; tombol toggle pakai area sentuh diperluas (`before:inset-x-0 before:-inset-y-2`) + `aria-label`.
- Modal lihat: footer aksi diperbaiki untuk mobile.

### 5. Pengumuman — `6fa63e0`
- `AnnouncementMobileRow`: nomor urut sebagai lead, judul `line-clamp-2`, subteks tanggal + prioritas; Naik/Turun di menu ⋯.

### 6. Artikel — `6515c49`
- `ArticleMobileRow`: thumbnail, ikon sematkan (pinned), subteks kategori · tanggal · penulis, pill status 4 keadaan, menu ⋯ Lihat / "Lihat di Website" (buka tab baru, `window.open`) / Edit / Duplikat / Hapus; tap baris = lihat.
- Dropdown Urut; modal lihat kustom: panel `max-h-[calc(100vh-2rem)] overflow-y-auto`, tombol footer `flex-1 md:flex-none`.
- Form: input `text-base md:text-sm`, field `datetime-local` `text-base md:text-xs` (anti-zoom iOS).

### 7. Berita — `7fcab1d`
- `NewsMobileRow`: thumbnail, ikon sematkan + lampiran, subteks kategori · tanggal · penulis, pill status 4 keadaan, menu ⋯ Lihat/Edit/Duplikat/Hapus; tap baris = lihat.
- Dropdown Urut; `MobileSelectBar` Terbitkan/Draft; modal lihat: gambar `-mx-5 -mt-5 overflow-hidden md:-mx-6`, footer `flex-1 md:flex-none`; form 16px; toggle hit-area.

### 8. Pesan (Pesan Masuk) — `8380e78`
- Gaya kotak masuk: avatar pengirim, **titik biru + nama bold bila belum dibaca**, subteks subjek · tanggal, pill **Dibaca/Baru tetap bisa diketuk**; menu ⋯ Lihat/Hapus. Tap baris = buka detail SlideOver (otomatis menandai sudah dibaca, sama seperti desktop).
- Toolbar mobile: pencarian + filter (Semua/Belum Dibaca/Sudah Dibaca + jumlah) + **Urut** (Terbaru/Terlama/Nama A–Z & Z–A/Belum–Sudah Dibaca Dahulu) + Pilih.
- `MobileSelectBar` dengan **Dibaca / Belum Dibaca** + Hapus (konfirmasi tetap).
- SlideOver detail: footer `flex-wrap` sudah menampung Balas Email + WhatsApp + Hapus di 360px; tombol hapus kini punya `aria-label`.
- Tidak ada tombol "Buat Baru" (memang tidak ada fitur itu — konsisten dengan desktop).

### 9. SPMB (Pendaftaran) — `18fbf6f`
- `RegistrationMobileRow`: inisial + nama, badge jalur + asal sekolah/email + tanggal, pill **status bisa diketuk** (siklus Menunggu → Diterima → Ditolak, sama dengan desktop), menu ⋯ Detail / Edit Catatan / **Telepon** (hanya bila ada nomor, `tel:`) / Hapus. Tap baris = modal detail.
- Toolbar mobile: pencarian + filter status (dengan jumlah) + **Urut** (Terbaru/Terlama/Nama/Status/Jalur, asc+desc) + Pilih.
- `MobileSelectBar` dengan **Terima / Tolak** (lewat `confirmAction` yang sudah ada) + Hapus; semua bulk memakai modal konfirmasi yang sudah ada.
- Ekspor CSV tetap di header (ikon + label, penuh di mobile).
- Tab **Gelombang & Pengaturan** sudah berbasis kartu → ditinjau saja; **16 field form** di halaman ini (modal Link Google Form, kartu Pengaturan SPMB, SlideOver tambah/edit gelombang, SlideOver builder pertanyaan, SlideOver Edit Catatan) diubah ke `text-base md:text-sm` agar iOS tidak zoom — ukuran desktop tetap `text-sm`.

---

## Keputusan konservatif (dicatat sesuai instruksi)

1. **Dua `DndContext` terpisah** di Fasilitas (desktop + mobile). Mendaftarkan ID `useSortable` yang sama di satu context membuat drag rusak; solusi ini tidak mengubah DOM desktop sama sekali.
2. **Tabel desktop tidak disentuh** selain dibungkus `hidden … md:block` + penambahan `aria-label` pada tombol ikon. Saran `table-fixed`/`max-w-0` agar `truncate` bekerja **tidak diterapkan** karena berisiko mengubah lebar kolom di desktop.
3. **Perilaku tap baris** mengikuti klik baris desktop masing-masing: tap = lihat bila halaman punya modal detail (Fasilitas, Kegiatan, Artikel, Berita, Pesan, SPMB); tap = Edit bila tidak ada (Guru, Agenda, Pengumuman).
4. **Guru/Agenda/Pengumuman tidak diberi drag-and-drop** — halaman itu memang tidak pernah punya DnD; urutan dipakai lewat aksi **Naik/Turun** di menu ⋯ (menggunakan handler reorder yang sudah ada), disembunyikan otomatis di batas atas/bawah.
5. **Kegiatan**: ~~filter jenis kegiatan tetap baris `<select>` native terpisah (`md:hidden`)~~ — **keputusan ini diganti** saat penyamaan toolbar (lihat bagian "Toolbar admin seragam" di bawah): tipe kini ikut dropdown `filter2` di `MobileFilterBar`, baris select native dihapus.
6. **Kunci sort** mobile disimpan sebagai `${field}:${dir}` lalu dipecah kembali (`split(":")`) — tidak menambah state baru.
7. **`MobileSelectBar` diberi `flex-wrap`** pada baris isinya (perubahan komponen bersama): deretan aksi (mis. Dibaca + Belum Dibaca + Hapus + Batal) bisa melebihi 360px; dengan wrap baris kedua turun, bukan overflow. Tidak mengubah tampilan bila muat.
8. **Pesan**: dialog hapus buatan halaman (`z-[60]`) dipertahankan, tidak diganti `ConfirmModal` — sudah mobile-friendly dan menghindari perubahan perilaku.
9. **SPMB**: pill status tetap siklus langsung tanpa dialog konfirmasi (sama seperti desktop); aksi **Telepon** hanya ditambahkan di menu ⋯ mobile (fitur mobile-only, nomor tetap bisa dilihat di modal detail).
10. **`<img>` dipertahankan** untuk URL gambar Supabase (pola yang sudah dipakai seluruh codebase); tidak memperkenalkan config loader `next/image` baru. Ini sumber tambahan 3 warning lint `@next/next/no-img-element` di Berita (pola identik dengan halaman lain).
11. **Paginasi desktop tetap** deretan nomor halaman; hanya mobile yang memakai paginasi ringkas.
12. **Nomor urut (kolom No)** tetap desktop-saja di baris mobile — konsisten dengan keputusan lama yang menyembunyikan kolom No di bawah 640px.

## Aksesibilitas & sentuh (diterapkan di semua halaman)

- `aria-label` pada semua tombol ikon desktop & mobile (toggle, aksi baris, clear-selection, filter/urut).
- Target sentuh: tombol aksi baris 40×40px, item menu 44px, pill status & dropdown min-h 40px.
- Status tidak hanya lewat warna: ikon + teks selalu ada (CheckCircle/Clock/XCircle).
- Menu ⋯ ARIA lengkap; bar mode pilih punya `aria-live`.
- Long-press → mode pilih memakai Pointer Events + pembatalan saat menggeser, dan klik hasil long-press dibuang.

## Hasil verifikasi

| Cek | Hasil |
| --- | --- |
| `npx tsc --noEmit` | **Clean** (0 error) — dijalankan setiap halaman + akhir |
| `npm run lint` | **0 error**, 62 warning (baseline awal 59; +3 = `<img>` Baris Berita, pola yang sudah ada) |
| `npm run build` | **Compiled successfully** (Next 16.4 webpack, ±20s, 36 route dibuat) |
| Uji visual Playwright | **Tidak dijalankan** — area admin butuh login Supabase yang tidak tersedia di lingkungan ini |

Karena uji visual otomatis tidak memungkinkan, verifikasi mobile dilakukan lewat review kode
(struktur layout, class breakpoint, overflow path) + build. **Uji manual di ponsel tetap diperlukan.**

## Perlu dites manual di ponsel (360 / 390 / 430px)

1. **Nol scroll horizontal** di kesembilan halaman, termasuk saat:
   - mode pilih aktif dan bar bawah muncul; teks judul panjang (line-clamp) di baris.
2. **Toolbar mobile**: filter dengan jumlah benar; urut mengubah daftar; "Pilih" masuk mode pilih; "Selesai" keluar & membersihkan centang; toolbar **dua baris** — baris 1 pencarian + "Pilih", baris 2 pill; pill **terlihat penuh**, tak ada yang terpotong di tepi kanan; pill **fit-width** — baris 2 terisi penuh sampai tepi (tak ada jarak menggantung), label kiri & caret kanan.
3. **Long-press** baris (~0,5 dtk) masuk mode pilih + baris tercentang; menggeser/scroll tidak memicu long-press; tap ⋯ tidak membocorkan ke tap baris.
4. **Menu ⋯**: buka/tutup dengan Esc & klik luar, navigasi panah/Home/End, hapus merah, fokus kembali ke tombol.
5. **Bar aaksi massal** (Pesan: Dibaca/Belum Dibaca; SPMB: Terima/Tolak; Kegiatan/Berita: Terbitkan/Draft) muncul di **atas** bottom nav admin, tidak menutup baris terakhir, aman dengan safe-area iPhone.
6. **Fasilitas**: geser urutan di mobile (drag hanya saat tanpa pencarian/filter/sort lain); handle nonaktif menampilkan petunjuk.
7. **Guru/Agenda/Pengumuman**: Naik/Turun berfungsi dan hilang di batas urutan.
8. **Modal lihat** Kegiatan/Artikel/Berita/Pesan/SPMB: gambar tidak overflow, tombol footer dapat diketuk, tab modal SPMB (Siswa/Kontak/Ayah/Ibu/Tambahan/Berkas) membungkus rapi, preview berkas tampil.
9. **Form & SlideOver** (Fasilitas, Artikel, Berita, SPMB-gelombang/builder/catatan): input 16px (iOS tidak zoom), grid 2 kolom → 1 kolom, bar Simpan/Batal sticky, unggah gambar mudah diketuk.
10. **Pesan**: buka pesan belum dibaca → otomatis jadi "Dibaca"; tombol Balas Email & WhatsApp membuka aplikasi terkait; hapus per item & massal terkonfirmasi.
11. **SPMB**: siklus status via pill; menu Telepon membuka dialer; ekspor CSV mengikuti filter aktif; tab Gelombang (kartu + form) nyaman di layar kecil.
12. **iOS Safari**: fokus input tidak mem-zoom halaman; bar bawah tidak tertutup home indicator.

---

## Video kegiatan (embed ringan) — 12 Okt 2026

Fitur tambahan: kolom baru `video_url` untuk rekaman/reel/video kegiatan, ditampilkan sebagai
embed **click-to-load** (kartu poster + tombol putar → iframe resmi). Berbeda dari `live_url`
("Tautan Siaran Langsung" → tombol LIVE hari-H), kolom lama **tidak diubah/digabung**.

### Berkas yang diubah / ditambahkan

| Berkas | Perubahan |
| --- | --- |
| ~~`supabase/activities_upgrade.sql`~~ | Bagian **(D)**: `ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS video_url text;` — **sudah dijalankan user (12 Okt 2026); berkas dihapus dari repo** |
| `src/lib/supabase.ts` | Tipe `Activity.video_url?: string \| null` |
| `src/lib/queries/activities.ts` | `video_url` masuk `LIST_COLUMNS_ALL`, `OPTIONAL_FIELDS` (retry tanpa kolom bila belum ada di tabel), normalisasi URL, dan parameter `createActivity`/`updateActivity` |
| `src/lib/video-embed.ts` | **Baru** — `parseVideoUrl()` (YouTube watch/youtu.be/shorts, Instagram `/p/` `/reel/` `/tv/`, TikTok `/@user/video/ID` + link pendek `vm.`/`vt.tiktok.com`), `videoEmbedUrl()`, `resolveVideoUrl()` (server: redirect + oEmbed `https://www.tiktok.com/oembed?url=…`, timeout 6 dtk, error aman, cache TTL 24 jam) |
| `src/components/VideoEmbed.tsx` | **Baru** — kartu poster (gambar kegiatan / thumbnail oEmbed TikTok) + ikon putar + label penyedia, rasio tetap (tanpa layout shift); iframe baru dimuat saat diklik; fallback "Tonton di \<platform\>" (`target="_blank"` `rel="noopener noreferrer"`); `aria-label` + tombol putar bisa difokus; tanpa `CSSFadeIn`/`will-change` |
| `src/app/activities/[slug]/page.tsx` | `<VideoEmbed>` di antara `<RichContent>` dan blok Share (hanya bila `video_url` terisi); `VideoObject` JSON-LD **hanya untuk YouTube** |
| `src/app/admin/activities/page.tsx` (CRLF) | `video_url` di `FormData`/`emptyForm`/`openEdit`/`handleDuplicate`; validasi URL → galat **"Tautan video harus diawali http:// atau https://"**; field **"Link Video" (opsional)** tepat sesudah baris "Waktu + Tautan Siaran Langsung" (input `type=url`, `text-base md:text-sm`, placeholder YouTube/IG/TikTok, teks bantu, chip penyedia terdeteksi); modal lihat menampilkan chip ikon + label penyedia (tanpa memuat embed di admin) |
| `MOBILE_UI_REPORT.md` | Bagian ini |

### SQL (bagian D) — sudah dijalankan

**Sudah dijalankan user di SQL Editor Supabase (12 Okt 2026)**; setelah dijalankan berkas
`supabase/activities_upgrade.sql` dihapus dari repo (permintaan user). Sebelum kolom ada, situs
& admin tetap berjalan — kolom opsional dilepas otomatis dari query bila tidak ada di tabel.
Isi bagian (D) yang dijalankan:

```sql
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS video_url text;
```

### CSP / frame-src

Tidak ada `Content-Security-Policy` di proyek ini (`next.config.ts` hanya header keamanan dasar;
tidak ada `middleware.*` maupun `vercel.json`) → **tidak ada `frame-src` yang perlu ditambahkan**.
`X-Frame-Options: DENY` yang sudah ada hanya mencegah halaman ini diframe pihak lain (tidak
mempengaruhi iframe keluar).

### Cara tes

Pilih kegiatan → edit → isi **Link Video**, simpan, lalu buka `/activities/<slug>`:

1. **YouTube**: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (atau link `youtu.be/<id>` /
   `/shorts/<id>`) → kartu poster "YouTube" → klik → iframe `youtube-nocookie.com/embed/<id>`;
   JSON-LD `VideoObject` muncul di view-source.
2. **Reel Instagram**: `https://www.instagram.com/reel/<kode>/` → kartu rasio 4:5 berlabel
   "Instagram" → klik → iframe `instagram.com/reel/<kode>/embed/`.
3. **TikTok panjang**: `https://www.tiktok.com/@<user>/video/<id>` → rasio 9:16 → iframe
   `tiktok.com/embed/v2/<id>`; poster memakai thumbnail oEmbed bila kegiatan tanpa gambar.
4. **TikTok link pendek**: `https://vm.tiktok.com/<kode>/` (atau `vt.tiktok.com/…`) → diselesaikan
   **di server** (redirect, cadangan oEmbed, timeout 6 dtk) → tampil sebagai kartu TikTok yang
   bisa diputar; bila jaringan gagal → tombol "Tonton di TikTok".
5. **Kontrol negatif**: URL tak dikenali (mis. `https://example.com/video`) → tombol
   "Tonton Video"; URL tanpa `http(s)://` → galat form **"Tautan video harus diawali http:// atau
   https://"**; `video_url` kosong → blok video & JSON-LD tidak tampil sama sekali.
6. SQL bagian (D) sudah dijalankan (12 Okt 2026) → kolom `video_url` sudah ada: simpan kegiatan
   dengan **Link Video** → nilai tersimpan & tampil lagi saat diedit. (Degradasi "kolom dilepas
   dari payload bila belum ada" hanya berlaku di lingkungan yang belum menjalankan migrasi.)

---

## Toolbar admin seragam (pola Portal) — 12 Okt 2026

Konteks: tinjauan UI menemukan bahwa **Portal** punya toolbar terbaik — pencarian di kiri
(melebar), filter sebagai pill dropdown berikon `Funnel` + label + badge jumlah — sedangkan
14 halaman admin lain masih memakai **segmented tabs** (`bg-white p-1`) + **`<select>` native**
+ pencarian di kanan. Dua bahasa UI berbeda dalam satu panel admin.

### Yang dikerjakan

- **Komponen bersama baru `src/components/admin/FilterBar.tsx`** — toolbar generik pola Portal:
  pencarian kiri (`type="search"` + tombol bersihkan), satu grup filter per pill (opsi berjumlah,
  ikon per grup, `hint` opsional di bawah label), aksi opsional di kanan. Dibangun di atas primitif
  `useMenu` + `MenuPanel`/`MenuItem` (portal ke body, flip atas/bawah + horizontal, klamp viewport,
  fokus ke opsi aktif) — primitif yang sama dengan menu ⋯ & `MobileFilterBar`, jadi ARIA/keyboard/
  gaya seragam. Responsif: `< sm` dua baris, `≥ sm` satu baris.
- **`src/app/admin/portal/FilterBar.tsx`** dirombak jadi adapter tipis (API & tipe `PortalFilter`
  tak berubah → `portal/page.tsx` tidak disentuh); logika dropdown duplikat ±250 baris terbuang.
- **Segmented tabs + `<select>` native di toolbar diganti `FilterBar`** di 15 halaman:
  Kegiatan (status + tipe), Agenda, Pengumuman, Guru, Fasilitas, Pesan, Berita, Artikel, SPMB
  (dibungkus `hidden md:block` — mobile tetap punya `MobileFilterBar` + mode pilih + urut),
  serta Pencapaian (kategori + tahun), Galeri (tipe + kategori), Pengguna (role), Log (aksi +
  objek), Media (bucket) yang ber-toolbar tunggal → memakai `FilterBar` langsung di semua lebar.
- **`MobileFilterBar` diberi prop opsional `filter2`** (non-breaking; hanya Kegiatan yang
  memakai): pill dropdown ketiga untuk tipe kegiatan (desktop berikon `Tag`, mobile tanpa ikon
  agar tiga pill muat satu baris) — **baris `<select>` native
  mobile Kegiatan dihapus** (butir 5 di atas), keputusan "picker native" diganti agar seluruh
  filter tampil sebagai pill seperti Portal.
- Pencarian **pindah ke kiri** di semua toolbar (dulu di kanan `justify-between`), mengikuti Portal.
- **`MobileFilterBar` dirapikan jadi dua baris + pill terlihat penuh** (12 Okt 2026): tombol
  "Pilih" pindah ke baris pencarian (baris 1, `flex-1` + aksi `shrink-0`); baris 2 tanpa ikon +
  padding ringkas (`pl-2 pr-1.5`) agar tiga pill Kegiatan (status + tipe + urut) muat satu baris
  di 360–430px, dengan `flex-wrap` sebagai cadangan. Dulu "Pilih" ikut baris pill dan wrap ke
  **baris ketiga** di 360–390px (terlihat di Fasilitas); solusi sempat berupa `overflow-x-auto`
  → pill "Terbaru" malah **terpotong di tepi kanan** (di luar kotak) → scroll mendatang dibuang,
  kini tak ada pill terpotong. Label urut panjang dipendekkan (mobile): "Tanggal
  terdekat/terjauh" → "Terdekat/Terjauh". Ikon tetap ada di pill desktop; `filter2.icon` masih
  didukung (opsional).
- **Pill toolbar mobile jadi fit-width** (12 Okt 2026, instruksi user): setiap pill filter/urut
  diberi `grow` + isi di `justify-between` (label kiri, caret kanan) sehingga **melebar mengisi
  baris sampai tepi** — tak ada jarak menggantung antara pill terakhir dan tepi/aksi (user sempat
  mengeluhkan baris terasa "bolong" di tengah). Diterapkan **konsisten di semua toolbar** —
  `MobileFilterBar` (baris 2) maupun `FilterBar` di `< sm` — bukan cuma Portal, agar tetap satu
  bahasa UI. Overflow tetap ditangani `flex-wrap` (tak pernah memaksa pill menyusut → label tak
  terpotong); pada `≥ sm` baris kedua berlebar konten sehingga `grow` tak punya ruang → desktop
  tak berubah.
- Opsi filter kini didefinisikan sekali (`statusOptions` / `filterGroups`) lalu dipakai bersama
  toolbar desktop & `MobileFilterBar` — label & jumlah tak lagi bisa beda antar versi.
- Tidak disentuh (memang bukan filter daftar): tab utama SPMB, tab preview device di modal
  Berita/Artikel, dan kontrol segmented di dalam modal lainnya. Bucket Media memang sengaja
  diganti menjadi dropdown (itu filter file), dengan hint pindah ke dalam menu.

### Berkas

Baru: `src/components/admin/FilterBar.tsx`.
Diubah: `portal/FilterBar.tsx`, `mobile/MobileFilterBar.tsx`, dan 14 halaman admin
(activities, agenda, news, articles, announcements, teachers, facilities, contact, admission,
achievements, gallery, users, logs, media) + laporan ini.

### Verifikasi

`npx tsc --noEmit` bersih; `npm run lint` 0 error, 62 warning (baseline identik — tak ada
warning baru); `npm run build` sukses (36 route). EOL semua file tetap CRLF.

### Perlu dites manual

1. Desktop tiap halaman: pencarian di kiri, pill status di kanan menampilkan jumlah; buka
   dropdown → opsi aktif tercentang + fokus keyboard (panah, Esc, klik luar).
2. Kegiatan desktop: dua pill (status + tipe, ikon `Funnel`/`Tag`); mobile: tiga pill
   (status + tipe + urut, tanpa ikon) di **satu baris & terlihat penuh** — `flex-wrap` hanya
   cadangan, tak ada pill terpotong; "Pilih" di baris pencarian, tak ada lagi baris select
   native penuh lebar.
3. Media: pill bucket menampilkan hint tiap bucket di dalam menu.
4. Portal: tak ada perubahan perilaku (adapter) — mode pilih mobile & "Pilih" tetap jalan.

---

## Putaran 2 — bahasa desain baru — 12 Okt 2026

Putaran ini menjalankan seluruh isi `PROMPT_REDESIGN.md`: menerapkan bahasa desain hasil
mockup yang disetujui ke **semua** halaman admin (Coverage A yang sudah ada + Coverage B yang
belum tersentuh), tanpa mengubah tampilan desktop (≥768px) dan tanpa menyentuh data/query.

### Ringkasan commit putaran 2

| Commit | Halaman / komponen |
| --- | --- |
| `d8a364a` | Snapshot kebersihan sebelum redesign |
| `d56eb97` | Komponen bersama (`src/components/admin/mobile/`) |
| `8bbc154` | Portal |
| `5639b90` | Fasilitas |
| `d2bc37f` | Guru |
| `f848a8c` | Agenda |
| `759458c` | Kegiatan |
| `2cfb5cf` | Pengumuman |
| `11c9d9e` | Artikel |
| `a64620f` | Berita |
| `c163e7e` | Pesan |
| `164412f` | SPMB |
| `0219a22` | Dashboard (Coverage B) |
| `a5ca55b` | Galeri (Coverage B) |
| `18c66b7` | Media (Coverage B) |
| `2777562` | Prestasi (Coverage B) |
| `7aa5d2d` | Log Aktivitas (Coverage B) |

### Komponen bersama yang diubah

- `mobile/RowBits.tsx` — `StatusDot` kini mendukung tone `danger` (`#dc2626`, cincin putih
  2.5px) untuk status Ditolak (SPMB); `MobileThumb` 56×56 r12/bulat dengan fallback tint;
  `QuietBadge` 20px hanya untuk keadaan tidak biasa; `RowGrip` 30px.
- `mobile/MobileListRow.tsx` — anatomi baris `[grip/lead 30px] [thumb] [judul 15px/600
  `#0f2a4d` line-clamp-2 + badge + subteks 12px `#64748b`] [⋯ 36×44]`, kontainer `flex
  items-center gap-2.5 py-2 pl-1.5 pr-0.5 border-t border-slate-100` (daftar pembungkus tidak
  lagi memakai `divide-y` agar garis tidak dobel), dukungan `lead`/`status`/`onLongPress`.
- `mobile/MobileFilterBar.tsx` — toolbar dua baris: baris 1 pencarian penuh 44px r12, baris 2
  Filter + Urut + aksi dalam SATU baris 44px tanpa wrap (pill `flex-1` terpotong, aksi
  `shrink-0`).
- `mobile/MobilePagination.tsx` — footer kartu: "Menampilkan a–b dari n" + tombol
  Sebelumnya/Berikutnya hanya bila `totalPages > 1`.
- `mobile/MobileSelectBar.tsx` — bar sticky mode pilih (jumlah + Pilih semua + Selesai).
- `mobile/RowActionsMenu.tsx` — menu ⋯ untuk semua aksi baris; perubahan status/tombol
  sekali-tekan dihapus dari tampilan baris.

### Anatomi & aturan yang dipakai di semua halaman

- **Baris**: `[grip 30px][thumb/tile][teks fleksibel][⋯ 36×44]`; nama 15px/600 `#0f2a4d`
  line-clamp-2; subteks 12px `#64748b`; titik status 14px di sudut thumb dengan cincin putih
  2.5px (hijau `#16a34a`, abu `#94a3b8`, amber `#f59e0b`, biru `#1767b1`, merah `#dc2626`).
- **Tidak ada perubahan status satu-klik**: Terima/Tolak/Publish/Hapus selalu lewat menu ⋯ →
  `ConfirmModal`/`confirmAction`.
- **Header halaman**: ikon 40px r12 `bg-[#e4ecf6] md:bg-[<tint lama>]`, judul 20px/700,
  subjudul `text-[13px] text-[#64748b] md:text-sm md:text-slate-500`.
- **Statistik**: carousel/blok stat disembunyikan di mobile (`hidden md:block`) bila angkanya
  hanya menduplikasi hitungan filter → diganti ringkasan satu baris; bila kartu memuat metrik
  unik → grid 2 kolom (tanpa dot pager).
- **Kartu daftar**: `bg-white border border-slate-200/70 rounded-2xl` (baris membawa `border-t`
  sendiri).
- **Tombol utama**: `min-h-11 py-3 md:py-2.5`.
- **Input**: `text-base md:text-sm` (mencegah iOS zoom 16px).

### Ringkasan per halaman

**Coverage A (dikerjakan berurutan, komponen bersama dulu):**

1. **Portal** — grip 30px + nama 15px line-clamp-2, pill status 28px, ringkasan satu baris
   menggantikan carousel statistik, toolbar dua baris.
2. **Fasilitas** — thumb 56px + titik status di sudutnya, badge "Nonaktif" (QuietBadge),
   aktif/nonaktif hanya lewat menu ⋯, ringkasan satu baris, kartu `rounded-2xl`.
3. **Guru** — daftar guru jadi `MobileListRow` + thumb foto/bulat-inisial, ringkasan satu
   baris, mode pilih + bar sticky, paginasi hanya bila >1 halaman.
4. **Agenda** — kartu agenda mobile (tanggal + judul + waktu), filter/urut dua baris.
5. **Kegiatan** — grid metrik unik 2 kolom, daftar kartu, baris status lewat menu.
6. **Pengumuman** — ringkasan satu baris, kartu + badge status (Draft/Terjadwal) quiet.
7. **Artikel** — grid metrik 2 kolom, kartu dengan thumb + badge status, mode pilih.
8. **Berita** — sama seperti Artikel; status publish lewat menu ⋯ + konfirmasi.
9. **Pesan** — kartu pesan (pengirim, waktu, pratinjau), aksi Balas/Hapus di menu ⋯ + modal.
10. **SPMB** — statistik → ringkasan satu baris, kartu `rounded-2xl` tanpa divide-y,
    `RegistrationMobileRow` baru (StatusDot `danger` di sudut avatar untuk Ditolak, QuietBadge
    "Ditolak", opsi status "Jadikan Menunggu/Terima/Tolak" di menu ⋯ → `handleSetPending`
    langsung / `confirmAction` untuk terima–tolak), tombol Export CSV/Tambah Gelombang
    `min-h-11 py-3 md:py-2.5`.

**Coverage B:**

11. **Dashboard** — cepat-aksi jadi tautan sentuh `min-h-11 … md:min-h-0 md:py-2`, grid ringkas
    tanpa horizontal scroll.
12. **Galeri** — header/stat/toolbar dipisah (`hidden md:*`), `MobileFilterBar` + mode pilih +
    `MobileSelectBar`, kartu gambar rasio `4:3` mobile (`md:aspect-square` desktop), judul
    `line-clamp-2 md:line-clamp-1`, menu ⋯ di sudut gambar (`md:hidden`, latar `bg-black/45`),
    tombol hover desktop `hidden md:flex`, checkbox selalu tampil di desktop & hanya di mode
    pilih pada mobile, `MobilePagination`.
13. **Media** — header/stat dipisah, `MobileFilterBar`, grid desktop `hidden md:grid`, daftar
    mobile `MobileListRow` dengan thumb 56px + Salin tautan di menu ⋯ + mode pilih, konfirmasi
    massal, input `text-base md:text-sm`.
14. **Prestasi** — impor komponen mobile, `pickMode` + `enterPickMode`/`exitPickMode`, header/
    statistik/toolbar/tabel desktop `hidden md:*` + `MobileFilterBar`, daftar mobile
    (`MobileThumb` medali/trofi, QuietBadge Unggulan/peringkat, long-press → mode pilih),
    `MobilePagination`, `MobileSelectBar`.
15. **Log Aktivitas** — timeline kartu (bukan tabel): avatar inisial pelaku, kalimat
    "<pelaku> <aksi> <objek>", badge tipe aksi (quiet, warna aman/biru/merah), waktu +
    entity_id, tap baris untuk membuka/menutup detail JSON (panah berputar), filter aksi +
    objek via `MobileFilterBar`, ringkasan metrik 2 kolom, `MobilePagination` sebagai footer
    kartu; tanpa mode pilih (halaman hanya-baca).

### Keputusan konservatif (putaran 2)

- **Tampilan desktop tidak diubah**: setiap elemen yang disamarkan di mobile memakai
  `hidden md:*` dengan gaya desktop persis seperti semula (tabel, StatCardRow, FilterBar,
  tombol hover, rasio gambar).
- **Upload Media dihilangkan di mobile** — tidak ada fungsi query upload yang ada (dan query
  data tidak boleh diubah), jadi tombol Upload hanya ditampilkan di desktop.
- Tidak ada perubahan `.env*`, skema DB, migrasi, RLS, maupun `@/lib/queries`.
- Grid tanpa scroll horizontal pada 360/390/430px (`min-w-[680px]` tabel hanya untuk desktop).
- EOL per file dipertahankan (file bersama mobile LF; file lain sesuai keadaan awal).

### Verifikasi (putaran 2)

- `npx tsc --noEmit` — bersih, 0 error.
- `npm run lint` — **0 error**, 57 warning (baseline identik: warning pra-adanya + `<img>` di
  `RowBits.tsx`); tak ada error baru.
- `npm run build` — sukses (Next 16, 36 route).

### Perlu dites manual di ponsel (360 / 390 / 430px)

1. Semua halaman: tak ada scroll horizontal; toolbar dua baris (cari 44px + Filter/Urut/Pilih
   satu baris) tidak terpotong.
2. Baris daftar: tap membuka detail/edit, tekan lama 500ms masuk mode pilih (halaman yang
   mendukung), menu ⋯ terbuka tanpa membajak tap baris.
3. Publish/Terima/Tolak/Hapus selalu tetap memunculkan `ConfirmModal` (tidak ada aksi satu-ketuk
   langsung).
4. Log Aktivitas: tap baris membuka/tutup JSON detail; panah berputar; paginasi hanya muncul
   bila >1 halaman.
5. Galeri: menu ⋯ di sudut gambar terlihat kontras (latar `bg-black/45`), checkbox hanya di
   mode pilih; kartu rasio 4:3.
6. SPMB: status Ditolak menampilkan titik merah + badge "Ditolak"; ubah status lewat menu ⋯.
7. Input 16px di iOS (tidak zoom otomatis saat fokus).

## Optimasi navigasi — 13 Okt 2026

Mempercepat pindah halaman admin tanpa mengubah tampilan/desain apa pun
(detail di `SPEED.md`, commit `perf(admin): percepat navigasi (getClaims, matcher, layout, loading)`):

- **`src/proxy.ts`** — `supabase.auth.getUser()` (1 round-trip jaringan ke Auth per
  navigasi) diganti `supabase.auth.getClaims()`, yang memverifikasi JWT secara lokal
  bila project memakai JWT signing keys asimetris (fallback otomatis ke pemeriksaan
  jaringan). Semua logika dipertahankan: query `user_profiles` (`is_active, role`),
  redirect `no_profile`/`inactive` + `signOut()`, `adminOnlyRoutes`,
  `setDefaultResultOrder("ipv4first")`. Matcher kini hanya `["/admin/:path*"]` —
  proxy tidak lagi dijalankan di halaman publik (berita, kegiatan, dll.) yang tidak
  memakai logikanya.
- **`src/app/admin/DashboardLayout.tsx`** — efek `fetchProfile` berdependensi
  `[isLogin]` (bukan `[pathname]`), sehingga `getUser()` + query `user_profiles` dari
  browser hanya berjalan sekali (saat masuk/keluar halaman login), bukan di setiap
  klik menu; layout tetap terpasang saat pindah antar halaman admin.
- **`src/app/admin/page.tsx`** — dashboard: `getClaims()` menggantikan `getUser()`,
  dan query profil digabung ke dalam `Promise.all` bersama 9 query data lain
  (3 langkah jaringan berurutan → 1); JSX/tampilan tidak berubah.
- **`src/app/admin/loading.tsx`** (baru) — skeleton halaman admin (header, 6 kartu
  statistik, 5 baris daftar) tampil seketika saat berpindah halaman sehingga klik menu
  tidak terasa "diam" dan Next bisa memprefetch kerangka halaman.

### Verifikasi

- `grep "getUser" src/proxy.ts` — hanya muncul di dalam komentar penjelasan
  `getClaims()` yang wajib menurut spesifikasi; tidak ada pemanggilan kode.
- `grep "getClaims"` ada di `src/proxy.ts` dan `src/app/admin/page.tsx`;
  matcher persis `["/admin/:path*"]`; efek `fetchProfile` memakai `[isLogin]`.
- `@supabase/supabase-js` di lockfile: **2.114.0** (tidak diubah), `getClaims` dikenali TypeScript.
- `npx tsc --noEmit` — bersih, 0 error.
- `npm run lint` — 0 error, 57 warning; tak ada warning baru dari perubahan ini
  (semua berasal dari pola lama: unused import, `<img>`, `exhaustive-deps` —
  3 warning `DashboardLayout.tsx` sudah ada sejak sebelumnya, hanya barisnya bergeser).
- `npm run build` — sukses (Next 16, 37 route + `ƒ Proxy (Middleware)`).
- EOL tiap berkas dipertahankan (`proxy.ts`/`page.tsx` LF, `DashboardLayout.tsx` CRLF);
  tidak ada `.env*`/skema DB yang disentuh.
