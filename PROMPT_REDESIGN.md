# TUGAS: Terapkan bahasa desain mockup baru ke SEMUA halaman admin (mobile) — sekali jalan, otonom

## MODE KERJA (WAJIB)
- Kerjakan SEMUANYA dari awal sampai akhir dalam satu sesi. JANGAN bertanya, JANGAN minta konfirmasi,
  JANGAN berhenti menunggu persetujuan. Semua izin sudah diberikan (edit, bash, webfetch, install).
- Jika ragu, pilih opsi paling konservatif yang tidak mengubah perilaku/tampilan desktop (>= md = 768px),
  lalu catat keputusannya di laporan. Warning lint tidak menghentikan kerja; perbaiki error sampai build lulus.
- Kerjakan di BRANCH YANG SEDANG AKTIF; jangan buat/pindah branch. Mulai dengan `git status`: bila ada
  perubahan belum ter-commit, commit dulu (`chore: snapshot sebelum redesign mobile`). Lalu commit
  SETELAH tiap halaman/komponen bersama selesai (`ui(mobile): <nama>`). Jangan `git push`, jangan
  `git reset --hard`, jangan menghapus branch/riwayat.
- DILARANG: mengubah `.env*`, skema/migrasi database, RLS, isi fungsi data di `@/lib/queries` (kecuali
  hanya menambah field opsional yang memang dibutuhkan), menghapus data. Tampilan desktop tidak boleh berubah.
- Banyak berkas memakai akhir baris CRLF (`\r\n`): pertahankan akhir baris asli tiap berkas.

## KONTEKS
Next.js 16 (webpack: `next build --webpack`), React 19, Tailwind CSS v4, Supabase, @dnd-kit, Tiptap,
ikon lewat `@/components/Icons`. Putaran sebelumnya sudah membuat komponen bersama di
`src/components/admin/mobile/` (`RowActionsMenu`, `MobileFilterBar`, `MobileSelectBar`,
`MobilePagination`, `MobileListRow`, Menu/useMenu) dan versi mobile untuk Portal, Guru, Fasilitas,
Agenda, Kegiatan, Pengumuman, Artikel, Berita, Pesan, SPMB. Baca dulu semuanya + `MOBILE_UI_REPORT.md`.
Token merek: navy `#082b59`, biru `#1767b1`, border `#dce3ed`, latar halaman `#f4f7fb`, kuning `#f4d21f`.
Font tetap yang sudah dipakai project. Teks antarmuka berbahasa Indonesia.

## SKILL DESAIN
Muat skill frontend anti-slop / "taste" yang terpasang (cek `.opencode/skills`, `~/.config/opencode/skills`,
`AGENTS.md`, tool `skill`) dan patuhi. Tanpa gradient dekoratif, tanpa emoji sebagai ikon, tanpa kartu
ber-border-kiri berwarna, radius/bayangan konsisten, hierarki jelas.

## BAHASA DESAIN BARU (spesifikasi dari mockup yang disetujui — ikuti persis)
Tujuan: daftar mobile yang "terlihat": teks lebih lebar, status tidak berisik, kontrol ringkas.

1. **Anatomi baris** (semua daftar): `[grip 30px] [thumb/tile] [teks fleksibel] [⋯ 36×44]`
   - Kontainer: `flex items-center gap-2.5 py-2 pl-1.5 pr-0.5 border-t border-slate-100`.
   - Grip (bila halaman bisa diurut): kolom 30px, titik 6-dot `#94a3b8` + nomor urut 11px/600 `#64748b`
     di bawahnya. Area sentuh handle tetap setinggi baris penuh dan >= 40px lebar (margin negatif,
     `touch-none`), hanya tampilannya yang 30px.
   - Thumb foto 56×56 r12 (Fasilitas, Guru, Galeri, Prestasi, Artikel, Berita, Kegiatan); tile ikon 40×40
     r12 (Portal). Fallback gambar: kotak tint datar + ikon gambar, bukan abu kosong.
   - Nama 15px/600 `text-[#0f2a4d]`, `line-clamp-2`, leading 1.25. Deskripsi/subteks 12px `#64748b`,
     `line-clamp-2` (boleh 1 baris bila tidak ada isi). Jangan `truncate` satu baris untuk nama.
   - Semua teks sekunder minimal `#64748b` (kontras >= 4.5:1); `#94a3b8` hanya dekoratif.
2. **Status — jangan berisik.** Tampilkan secara jelas hanya yang TIDAK biasa:
   - Halaman berfoto/avatar (Fasilitas, Guru, Galeri, Prestasi, Artikel, Berita, Kegiatan, Agenda,
     Pengumuman): indikator **titik 14px di pojok kanan-bawah thumb** dengan cincin putih 2.5px
     (hijau `#16a34a` = aktif/terbit; abu `#94a3b8` = nonaktif/draft; amber `#f59e0b` = terjadwal/menunggu).
     Badge teks kecil (20px tinggi, 11px/600, `bg-slate-200/70 text-slate-600`) di bawah nama HANYA untuk
     keadaan tidak biasa (Nonaktif, Draft, Terjadwal). Tidak ada pill "Aktif/Terbit" besar di tiap baris.
   - Halaman ikon-tile (Portal): "Tayang" = pill hijau pekat (`#e6f6ee`/`#0b6b3a`); "Segera hadir" =
     pill TENANG tanpa border (`#f7f2e6`/`#7a5200`, titik `#f59e0b`, label "Segera"); "Disembunyikan" =
     abu. Pill 28px tinggi dengan area sentuh 44px.
   - Pesan: belum dibaca = titik biru + nama bold; sudah dibaca = tanpa penanda.
   - SPMB: pill berwarna tenang (Menunggu amber, Diterima hijau, Ditolak merah) + ikon kecil.
3. **Keamanan sentuh untuk perubahan status.** Mengubah status JANGAN lewat satu ketukan yang langsung
   menyimpan/menggilir: gunakan menu kecil (pola `StatusPill` Portal / `RowActionsMenu`) atau opsi di
   menu ⋯ ("Nonaktifkan", "Terbitkan", "Jadikan Draft"). Terbitkan ke publik, Tolak (SPMB), dan hapus
   memakai konfirmasi singkat (`ConfirmModal`/`confirmAction` yang sudah ada). Kontrol baru tetap
   memanggil handler lama (mis. `handleToggleActive`) — logika data tidak berubah.
4. **Toolbar mobile**: baris 1 = pencarian penuh (44px, r12, placeholder pendek "Cari <objek>…");
   baris 2 = `Filter (dropdown + jumlah)` · `Urut` · `Pilih`, semuanya 44px, SATU baris tanpa wrap.
5. **Ringkasan satu baris** menggantikan carousel statistik di mobile bila kartu statistik hanya
   menduplikasi jumlah filter: teks 12px `#64748b`/500, mis. "5 fasilitas · 4 aktif · 1 nonaktif".
   Kartu `StatCardRow` TETAP di desktop (`hidden md:block`). Bila kartu berisi metrik unik, ganti
   carousel dengan grid 2 kolom (tanpa pager titik).
6. **Paginasi**: `MobilePagination` hanya menampilkan tombol Sebelumnya/Berikutnya bila `totalPages > 1`;
   bila 1 halaman tampilkan HANYA teks "Menampilkan a–b dari n …" (12px, di footer kartu daftar, dengan
   garis atas `border-slate-100`). Perubahan di komponen bersama berlaku untuk semua halaman.
7. **Kartu daftar**: `bg-white border border-slate-200/70 rounded-2xl` (bukan bayangan tebal), margin
   horizontal 16px, daftar menempati sisa tinggi layar; bar aksi massal (`MobileSelectBar`) tetap
   di atas bottom nav. Safe-area iPhone dipertahankan.
8. **Header halaman**: ikon 40px r12 `#e4ecf6`/`#1767b1`, judul 20px/700, subjudul 13px `#64748b`;
   tombol sekunder + utama berdampingan, tinggi 44px, r12 (utama navy `#082b59`).

## CAKUPAN
### A. Terapkan bahasa desain di halaman yang SUDAH punya versi mobile (urutan ini)
Portal, Fasilitas, Guru, Agenda, Kegiatan, Pengumuman, Artikel, Berita, Pesan, SPMB.
- MULAI dari komponen bersama (`MobileListRow`, `MobileFilterBar`, `MobilePagination`,
  `MobileSelectBar`, `RowActionsMenu`) agar poin 1–8 berlaku serentak; baru sesuaikan tiap halaman.
- **Portal** (`SortableRow.tsx`): kolom grip 30px (area sentuh tetap penuh), nama 15px `line-clamp-2`,
  pill "Segera" tenang sesuai poin 2, pill status tetap membuka menu; ringkasan satu baris menggantikan
  carousel statistik di mobile; ukuran tile 40px.
- **Fasilitas** (`FacilityMobileRow`): thumb 56px + titik status di pojok, tanpa pill "Aktif", badge
  "Nonaktif" hanya bila nonaktif, deskripsi 2 baris; aktif/nonaktif lewat menu ⋯; pagination poin 6.
- **Kegiatan/Berita/Artikel/Agenda/Pengumuman**: titik status di thumb/lead; badge hanya "Draft" /
  "Terjadwal"; publish/draft lewat menu (poin 3), BUKAN pill sekali ketuk.
- **Guru**: avatar 56px bulat dengan titik status.
- **Pesan & SPMB**: sesuai poin 2; status SPMB berubah lewat menu pilihan (bukan siklus satu ketukan).

### B. Halaman admin yang BELUM disentuh (temukan lewat glob route admin; cek juga rute lain di sidebar)
Dashboard, Galeri, Media, Prestasi, Log Aktivitas. Terapkan standar mobile yang sama (nol scroll
horizontal pada 360/390/430px, tabel → daftar/kartu, target sentuh >= 40–44px, input 16px, aksi di ⋯,
mode Pilih + bar aksi sticky, form/SlideOver layar penuh dengan bar Simpan sticky).
- **Dashboard**: pastikan kartu statistik/grafik/tabel tidak meluap (grid 2 kolom atau 1 kolom, grafik
  `max-w-full`, tabel kecil → daftar ringkas); jangan mendesain ulang konten.
- **Galeri**: grid 2 kolom kartu gambar-pertama (rasio 4:3, sudut r12), judul 2 baris di bawah gambar,
  titik/badge status, ⋯ di pojok gambar (area sentuh 44px), mode Pilih dengan centang di pojok.
- **Media** (pustaka berkas): daftar baris dengan thumbnail/ikon tipe berkas 56px, nama, ukuran · tanggal,
  tombol salin tautan di menu ⋯, unggah via tombol utama; mode Pilih untuk hapus massal.
- **Prestasi**: baris berfoto/ikon piala, judul 2 baris, subteks tingkat · tahun, titik status.
- **Log Aktivitas**: daftar linimasa ringkas (bukan tabel): avatar/inisial pelaku, kalimat aksi
  ("<pelaku> <aksi> <objek>"), badge jenis aksi (berwarna tenang), waktu relatif; filter jenis aksi +
  rentang waktu sebagai dropdown ringkas; baris bisa dibuka (detail) bila ada data tambahan; tanpa
  mode Pilih/hapus.

## KOMPONEN & IMPLEMENTASI
- Utamakan ekstrak/perluas komponen bersama; jangan menyalin kode berulang per halaman.
- Tailwind v4 (`line-clamp-*`, `size-*`, `bg-linear-to-*`). Tanpa dependensi baru kecuali perlu.
- Drag (halaman yang punya): `touch-action: none` hanya di handle, modifier kunci sumbu Y,
  `autoScroll` ambang sempit, baris diseret diberi `relative`; `select-none [-webkit-touch-callout:none]`
  pada baris dengan long-press.
- Aksesibilitas: `aria-label` pada semua tombol ikon, fokus terlihat, status tidak hanya lewat warna
  (titik + badge/teks untuk keadaan tidak biasa; `role="img" aria-label` pada thumb yang membawa status).
- Jangan membungkus teks panjang dengan animasi `transform`/`will-change` permanen (membuat teks blur).

## VERIFIKASI
1. `npx tsc --noEmit`, `npm run lint`, `npm run build` harus lulus tanpa error (setelah tiap halaman
   dan di akhir).
2. Uji visual hanya bila bisa tanpa login admin; bila tidak, JANGAN berhenti — lanjut dengan review kode +
   build dan catat kebutuhan uji manual. Jangan menginstal alat berat hanya untuk verifikasi.
3. Pastikan desktop (>= 768px) tidak berubah.

## LAPORAN AKHIR
Tambahkan bagian "Putaran 2 — bahasa desain baru" ke `MOBILE_UI_REPORT.md`: ringkasan per halaman,
komponen bersama yang diubah/ditambah, keputusan konservatif, hal yang perlu dites manual di ponsel,
dan hasil tsc/lint/build. Cetak ringkasan singkat di terminal. Selesai = SEMUA halaman di cakupan A dan B
sudah dikerjakan dan di-commit di branch aktif.