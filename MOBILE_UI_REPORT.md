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
| `MobileFilterBar` (+ `MobilePickButton`) | Toolbar mobile: pencarian satu baris penuh (16px, tombol bersihkan), dropdown filter **dengan jumlah** per opsi, dropdown Urut, tombol "Pilih". Saat mode pilih: berubah jadi baris "n dipilih + Pilih semua/Hapus centang + Selesai". |
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
5. **Kegiatan**: filter jenis kegiatan tetap baris `<select>` native terpisah (`md:hidden`) di bawah toolbar — picker native justru UX sentuh terbaik; hanya status+urut yang masuk dropdown.
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
2. **Toolbar mobile**: filter dengan jumlah benar; urut mengubah daftar; "Pilih" masuk mode pilih; "Selesai" keluar & membersihkan centang.
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
