# TUGAS: Perbaiki UI/UX MOBILE VIEW pada 9 halaman admin (sekali jalan, otonom)

## MODE KERJA (WAJIB)
- Kerjakan SEMUANYA dari awal sampai akhir dalam satu sesi. JANGAN bertanya, JANGAN minta konfirmasi,
  JANGAN berhenti menunggu persetujuan. Semua izin sudah diberikan (edit, bash, webfetch, install).
- Jika ada keraguan, pilih opsi paling konservatif yang tidak mengubah perilaku desktop, lalu catat
  keputusan itu di laporan akhir. Jangan berhenti karena warning lint; perbaiki error sampai build lulus.
- Pertama: `git checkout -b mobile-ui-polish` (jika sudah ada, pakai saja). Commit setelah SETIAP halaman
  selesai dengan pesan `ui(mobile): <halaman>`. Jangan `git push`, jangan `git reset --hard`, jangan
  menghapus branch/riwayat.
- DILARANG: mengubah isi `.env*`, skema/migrasi database, fungsi di `@/lib/queries` dan server action
  (logika data), RLS/Supabase policy, menghapus data, atau menyentuh halaman PORTAL (sudah selesai;
  hanya boleh DIBACA sebagai referensi, tidak boleh diubah kecuali mengekstrak komponen bersama tanpa
  mengubah tampilan/perilakunya).

## KONTEKS PROYEK
Next.js 16 (webpack: `next build --webpack`), React 19, Tailwind CSS v4, Supabase, @dnd-kit, Tiptap,
ikon Phosphor lewat `@/components/Icons`. Komponen UI bersama ada di `@/components/ui`
(StatCard, StatCardRow, Modal, ConfirmModal, SlideOver, Toast, useFloatingPanel). Warna merek: navy
`#082b59`, biru `#1767b1`, border `#dce3ed`, aksen kuning `#f4d21f`. Gunakan token/gaya yang SUDAH ada,
jangan memperkenalkan palet baru. Teks antarmuka berbahasa Indonesia.

## MASALAH (akar penyebab, sudah dikonfirmasi pada halaman Fasilitas)
Daftar data memakai elemen `<table>` di dalam `overflow-x-auto`. Sel teks memakai `truncate` yang TIDAK
bekerja di sel tabel (tanpa `table-fixed`/`max-w-0`), jadi nama yang panjang melebarkan tabel dan kolom
Status & Aksi terdorong ke luar layar (pengguna harus scroll menyamping). Sebagai tambalan, kode lama
menyembunyikan kolom dengan `hidden sm:table-cell` (checkbox, Urutan/handle drag, Deskripsi) dan tombol
Lihat/Duplikat, sehingga DI PONSEL pengguna kehilangan fitur: pilih massal, ubah urutan, duplikat, lihat.
Komentar di kode menyebut pola ini juga dipakai halaman agenda/teachers/users/announcements; periksa
semua 9 halaman, kemungkinan besar sama. Target sentuh ikon aksi hanya ±28px.

## HALAMAN YANG DIPERBAIKI (temukan file-nya lewat glob/grep pada route admin)
1. Guru  2. Fasilitas  3. Agenda  4. Kegiatan  5. Pengumuman  6. Artikel  7. Berita  8. Pesan  9. SPMB
URUTAN KERJA: kerjakan FASILITAS DULU sebagai pola dan ekstrak komponen bersama; lalu terapkan ke
Guru, Agenda, Kegiatan, Pengumuman, Artikel, Berita, Pesan, SPMB.

## SKILL DESAIN
Gunakan skill frontend anti-slop / "taste" yang sudah terpasang (cek `.opencode/skills`,
`~/.config/opencode/skills`, `AGENTS.md`, atau tool `skill`). Muat dan patuhi sebelum menulis UI.
Prinsip minimum bila skill tidak ditemukan: hierarki visual jelas, tidak ada gradient ungu generik,
tidak ada emoji sebagai ikon, radius & bayangan konsisten dan tidak berlebihan, kontras teks AA,
spasi berirama (4/8px), tidak ada dekorasi tanpa fungsi, tampil seperti produk nyata bukan template.

## STANDAR MOBILE (berlaku untuk semua halaman, breakpoint < md = 768px)
1. **Nol scroll horizontal pada halaman** di lebar 360, 390, dan 430px. Tidak ada konten penting
   tersembunyi di kanan. Cek: `document.documentElement.scrollWidth <= clientWidth`.
2. **Tabel → daftar baris/kartu ringkas** di bawah `md`; tabel desktop tetap seperti sekarang
   (`hidden md:block` untuk tabel, `md:hidden` untuk versi mobile). Pada desktop, boleh tambah
   `table-fixed`/`max-w-0` agar `truncate` benar-benar bekerja, selama tampilan tidak berubah.
   Pola referensi: baris mobile halaman Portal (`SortableRow.tsx`): [handle+nomor] [thumbnail/ikon]
   [judul + subteks] [badge status ringkas] [menu ⋯].
3. **Jangan ada fitur desktop yang hilang di mobile.** Pilih massal, ubah urutan (bila ada), duplikat,
   lihat, urut/sort, dan semua aksi harus tersedia di mobile lewat menu ⋯, mode Pilih, atau dropdown.
4. **Aksi** (lihat, edit, duplikat, hapus) dipindah ke menu ⋯ (floating panel di-portal ke
   `document.body`, `position: fixed`, ARIA `menu`/`menuitem`, item min-h 44px, Esc/klik luar menutup,
   panah/Home/End berpindah, hapus merah + `ConfirmModal`). Tap baris = buka detail (atau edit, ikuti
   perilaku klik baris yang sudah ada di desktop).
5. **Target sentuh ≥ 40px** (ideal 44px) untuk semua tombol/ikon.
6. **Toolbar**: pencarian satu baris penuh dengan placeholder pendek (mis. "Cari fasilitas…"); filter
   status sebagai dropdown ringkas dengan jumlah (pola `FilterBar` Portal) di samping/bawahnya; kontrol
   Urut sebagai dropdown (karena header tabel yang bisa diklik tidak ada di mobile). Tab/chip yang
   perlu scroll harus scroll di dalam wadahnya sendiri, BUKAN halaman.
7. **Mode Pilih (bulk) mobile**: tombol "Pilih" di toolbar dan/atau long-press baris; checkbox
   menggantikan handle di slot yang sama; bar aksi STICKY di bawah layar (jumlah dipilih, Hapus, Batal)
   di atas bottom nav; gantikan blok bulk-actions atas yang `flex-wrap`.
8. **Header halaman**: judul + subjudul membungkus rapi; tombol utama ("Buat Baru") mudah dijangkau;
   tombol sekunder tidak memenuhi layar. `StatCardRow` tetap carousel.
9. **Pagination mobile**: ringkas, mis. "‹ Sebelumnya  Hal 2 / 7  Berikutnya ›" + teks "Menampilkan x–y
   dari z" yang membungkus. JANGAN merender semua nomor halaman di mobile (bisa meluap bila halaman
   banyak); desktop boleh tetap atau diberi elipsis.
10. **Form/SlideOver/Modal**: layar penuh atau bottom-sheet di mobile, bar aksi (Simpan/Batal) sticky
    di bawah, input `text-base` (16px) agar iOS tidak zoom, `inputMode`/`autoComplete` yang sesuai,
    label selalu terlihat, grid 2 kolom → 1 kolom, area unggah gambar besar dan mudah diketuk, pratinjau
    (jika ada) tidak memakan layar.
11. **Modal detail/lihat**: gambar rasio tetap (mis. 16:9) tanpa overflow (periksa margin negatif
    `-mx-6 -mt-5` terhadap padding Modal), tombol aksi lebar penuh di footer.
12. **Editor Tiptap (Artikel/Berita/Pengumuman bila ada)**: toolbar wrap atau scroll di dalam
    wadahnya, tombol cukup besar, tidak memicu scroll halaman.
13. **Keadaan kosong, memuat, galat** punya tampilan mobile yang rapi (skeleton ringan; tidak
    dekoratif berlebihan). Jangan lagi memakai `<tr><td colSpan>` di versi mobile.
14. **Aksesibilitas**: `aria-label` pada semua tombol ikon (kode lama hanya memakai `title`), fokus
    terlihat, urutan fokus logis, `role` tabel/baris tetap valid di desktop, status tidak hanya lewat
    warna (ikon/teks tetap ada).
15. **Drag-and-drop (bila ada)**: handle setinggi baris penuh dan menempel di tepi kiri
    (`-my-2.5 -ml-3 w-16 self-stretch touch-none`, `style={{ touchAction: "none" }}`), elemen lain
    TIDAK boleh membajak scroll vertikal; baris diseret diberi `relative` agar `zIndex` berlaku;
    `DndContext` dengan modifier kunci sumbu Y (`({transform}) => ({...transform, x: 0})`) dan
    `autoScroll={{ threshold: { x: 0, y: 0.08 }, acceleration: 4 }}` (atau `false` bila daftar pendek).
    Drag hanya aktif ketika tidak ada pencarian/filter/sort lain yang mengubah urutan tampilan.
    Baris dengan long-press diberi `select-none [-webkit-touch-callout:none]`.
16. Pakai `min-w-0` + `truncate`/`line-clamp-*` pada anak flex/grid agar teks tidak mendorong lebar.
    Pada baris mobile, nama boleh `line-clamp-2`.

## PETUNJUK KHUSUS FASILITAS (sudah dibaca kodenya; ini PERINTAH konkret)
File: halaman admin Fasilitas (`AdminFacilitiesPage` + `SortableFacilityRow`, `PAGE_SIZE = 10`).
Data: `Facility { name, description, image_url, sort_order, is_active }`. Fungsi data yang ADA dan
dipakai ulang apa adanya: `getFacilityListAll`, `createFacility`, `updateFacility`, `deleteFacility`,
`deleteFacilityBulk`, `uploadFacilityImage`, `reorderFacilities`, `revalidateFacilities`; handler
`openEdit`, `openDuplicate`, `handleToggleActive`, `handleDelete`, `handleBulkDelete`, `toggleSort`,
`toggleSelect`, `toggleSelectAll`, `handleDragEnd` dipakai ulang, bukan ditulis ulang.
1. Pertahankan tabel desktop (`md+`) dengan perilaku sama; tambahkan versi mobile (`md:hidden`) di
   dalam `DndContext`/`SortableContext` yang SAMA (daftar `<div role="list">` berisi baris sortable),
   bukan `<table>`. Pisahkan komponen: `FacilityMobileRow`.
2. Baris mobile: [handle + nomor urut, kolom kiri penuh, touch-none] [thumbnail 48px (fallback
   `ImageSquare`)] [nama `line-clamp-2` + subteks deskripsi 1 baris; bila `is_active && !image_url`
   tampilkan ikon `Warning` kecil beraria "Tanpa gambar" (bukan chip lebar)] [pill status
   Aktif/Nonaktif tetap bisa diketuk untuk toggle (`handleToggleActive`), kompak] [menu ⋯: Lihat,
   Edit, Duplikat, Hapus]. Tap baris = `onView`. Mode Pilih: checkbox menggantikan handle.
3. Toolbar mobile: pencarian satu baris; baris kedua: dropdown filter (Semua/Aktif/Nonaktif + jumlah),
   dropdown Urut (Urutan tampil, Nama A–Z/Z–A, Terbaru; memetakan ke `sortField`/`sortDir`), tombol
   "Pilih". Reset `page` dan `selectedIds` seperti perilaku tab lama. Handle drag hanya aktif saat
   `dragDisabled` false (Semua, tanpa pencarian, diurutkan menurut Urutan) dan tampilkan petunjuk
   singkat bila nonaktif.
4. Pagination ringkas sesuai standar #9 (ganti deretan `Array.from({ length: totalPages })`).
5. Modal lihat: gambar 16:9, footer berisi tombol Edit (dan Duplikat/Hapus lewat ⋯ atau tombol
   sekunder). SlideOver form: bar Simpan/Batal sticky, input 16px, bagian "Lanjutan" (Urutan) tetap
   bisa dilipat, unggah gambar mudah diketuk, `imagePreview` tidak melebihi tinggi layar.
6. Setelah Fasilitas selesai, EKSTRAK komponen generik ke `src/components/admin/mobile/` (tanpa
   mengubah perilaku): `RowActionsMenu`, `MobileFilterBar` (pencarian + dropdown filter + dropdown urut
   + tombol Pilih), `MobileSelectBar` (bar sticky bawah), `MobilePagination`, `MobileListRow`
   (layout slot: lead/thumb/title/subtitle/status/actions). Halaman lain memakai komponen itu.

## PETUNJUK HALAMAN LAIN (sesuaikan dengan kolom/field NYATA di kode masing-masing)
- **Guru**: avatar bulat kecil, nama, mata pelajaran/jabatan, status; menu ⋯.
- **Agenda & Kegiatan**: lencana tanggal kompak (hari/bulan), judul, lokasi/waktu, status.
- **Pengumuman**: judul, tanggal, status/prioritas, cuplikan 1 baris.
- **Artikel & Berita**: thumbnail, judul (2 baris), kategori + tanggal + penulis dalam satu subteks,
  status; toolbar filter/urut ringkas.
- **Pesan**: gaya kotak masuk: pengirim, subjek, cuplikan, waktu, penanda belum dibaca; tampilan
  detail pesan satu kolom dengan tombol kembali dan aksi di bar bawah.
- **SPMB**: nama pendaftar, nomor/tanggal daftar, status (pill berwarna + dropdown ubah status bila
  sudah ada), kontak cepat (telepon/WA) bila tersedia; filter status ringkas.
Jika halaman punya fitur lain (statistik, ekspor, bulk action), buat versi mobile yang setara.

## STRATEGI IMPLEMENTASI
- Pelajari dulu pola mobile Portal (`SortableRow.tsx`, `FilterBar.tsx`, `StatusControl.tsx`, bagian
  mobile di `page.tsx`) dan `@/components/ui`. Boleh refactor Portal HANYA agar mengimpor komponen
  bersama tanpa perubahan visual/perilaku.
- Jangan menyalin kode 9 kali; gunakan komponen bersama.
- Tailwind v4 (`bg-linear-to-*`, `line-clamp-*`, `size-*`). Tanpa dependensi baru kecuali perlu.

## VERIFIKASI (tiap halaman, lalu keseluruhan)
1. `npx tsc --noEmit`, `npm run lint`, `npm run build` harus lulus tanpa error.
2. Jika memungkinkan, ukur overflow horizontal dan ambil screenshot di 360/390/430px dengan
   Playwright (install sementara tanpa menyimpan: `npm i --no-save playwright`). Bila area admin butuh
   login Supabase yang tidak tersedia, JANGAN berhenti: lanjutkan dengan review kode + build, dan catat
   bahwa uji visual manual diperlukan.
3. Pastikan desktop (≥768px) tidak berubah tampilannya.

## OUTPUT AKHIR
Tulis `MOBILE_UI_REPORT.md`: ringkasan perubahan per halaman, daftar komponen bersama baru,
keputusan konservatif yang diambil, hal yang perlu dites manual di ponsel, dan hasil tsc/lint/build.
Cetak ringkasan singkat di terminal. Selesai = semua 9 halaman sudah dikerjakan dan di-commit di
branch `mobile-ui-polish`.