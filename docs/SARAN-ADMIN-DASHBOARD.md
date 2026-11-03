# 🧭 Blueprint Saran Fitur Admin Dashboard — Esceha.id

> Dokumen ide, bukan komitmen scope. 570 saran fitur bernomor berurutan (1–570) agar mudah
> dikutip ("kerjakan #150", "quick win #57"), diikuti quick wins, anti-pattern, dan roadmap.
>
> Dibangun di atas yang **sudah ada** di admin: berita/artikel, media, galeri, news, activities,
> agenda, calendar, admission (waves), ekskul, achievements, teachers, program, portal, facilities,
> faq, downloads, announcements, notifications, contact, users, review, saved-views, trash, flags,
> automation, backup, diagnostics, logs, analytics, quality, security, settings, sql, change-password.
> Saran di bawah = perluasan modul itu + modul baru + improvisasi.

Prinsip yang dipakai sepanjang dokumen (karena sudah terbukti di repo ini):

1. **Saklar dulu, fitur kemudian** — pola Fase 0 ornamen 3D: flag + kill-switch sebelum fitur ke mana-mana.
2. **null ≠ 0** — angka gagal memuat tampil "—", tidak pernah berpura-pura nol.
3. **Fallback selalu** — RPC kosong/gagal ≠ hasil kosong (pelajaran outage pencarian 24 Okt).
4. **Verifikasi bertingkat sebelum "selesai"** — tsc, lint, test, CI hijau.

---

## 1. Fondasi Shell & Navigasi (1–25)

- **1. Command palette global (Ctrl+K)** — lompat ke modul, entitas ("berita spmb"), atau aksi ("buat pengumuman").
- **2. Riwayat "Terakhir Diedit"** — 5 entitas terakhir yang disentuh user ini, persist antar sesi.
- **3. Shortcut pin per user** — tiap user bisa pin modul favorit ke atas sidebar.
- **4. Sidebar group collapse dengan persist** — posisi terbuka/tutup tersimpan per user.
- **5. Badge pending per modul** — angka draft berita, SPMB pending, kontak belum dibaca langsung di sidebar.
- **6. Breadcrumb lintas modul** — Berita › Edit › "SPMB SMA 2026" dengan tautan cepat antar entitas terkait.
- **7. Pencarian global admin** — satu kotak cari lintas berita, siswa, guru, dokumen, transaksi.
- **8. Overlay peta keyboard (`?`)** — daftar semua shortcut admin dalam satu modal.
- **9. Dark mode admin** — ikut `prefers-color-scheme` + toggle manual yang tersimpan.
- **10. Toggle density tabel** — compact / comfort untuk operator yang bekerja dengan baris banyak.
- **11. Menu user informatif** — avatar, role, waktu login terakhir, tautan cepat ganti sandi & sesi aktif.
- **12. Tur onboarding admin baru** — tour interaktif sekali-jalan untuk role yang baru pertama login.
- **13. Banner pengumuman internal** — "Migrasi SQL Sabtu 21.00, mohon jangan edit konten" di atas semua halaman admin.
- **14. Status strip kecil** — ikon kesehatan DB, versi deploy berjalan, status CI terakhir (dari diagnostics yang sudah ada).
- **15. Tautan "lihat di situs" kontekstual** — dari editor berita langsung ke halaman publik entitas itu.
- **16. Halaman 403 yang bisa bertindak** — selain pesan, tombol "minta akses modul ini".
- **17. Alur minta akses** — permintaan masuk sebagai notifikasi ke role developer dengan tombol setuju.
- **18. Hitung mundur sesi + perpanjang** — warning sebelum sesi Supabase habis saat operator sedang menulis panjang.
- **19. Guard multi-tab** — peringatan saat entitas yang sama terbuka di dua tab berbeda.
- **20. Unsaved-changes guard universal** — semua form admin mencegah navigasi saat ada perubahan belum simpan.
- **21. Skeleton loading seragam + SWR** — halaman terasa instan dengan cache stale-while-revalidate.
- **22. Error boundary per widget dashboard** — satu widget gagal, widget lain tetap hidup.
- **23. Mode cetak tabel** — stylesheet print bersih untuk rekap yang dibawa rapat.
- **24. Fokus mode editor** — sembunyikan sidebar/topbar saat menulis berita panjang.
- **25. Quick action FAB di mobile admin** — tombol aksi cepat (buat berita, cek SPMB) di bawah layar HP.

## 2. Dashboard Ringkasan & Widget (26–55)

- **26. Dashboard sebagai grid widget draggable** — susun ulang kartu dengan dnd-kit (sudah di deps), tersimpan per user.
- **27. Widget "Antrean Kerja Saya"** — semua item yang menunggu aksi user ini lintas modul, satu daftar.
- **28. Widget draft tertelantarkan** — draft berita yang paling lama tidak disentuh, urut usia.
- **29. Widget funnel SPMB mini** — pendaftar → verifikasi → tes → diterima per gelombang.
- **30. Widget kunjungan 7 hari** — sparkline dari analytics yang sudah ada.
- **31. Widget status backup terakhir** — umur backup termuda dari manifest yang sudah dibaca di `page.tsx`.
- **32. Widget sisa kuota storage** — pemakaian S3/Supabase storage + proyeksi kapan penuh.
- **33. Widget error rate Sentry 24 jam** — jumlah issue baru vs minggu lalu, tautan langsung.
- **34. Widget agenda 14 hari** — kegiatan terdekat dengan status persiapan.
- **35. Widget pelanggar SLA** — kontak/berita review yang lewat `PENDING_SLA_DAYS`/`CONTACT_SLA_DAYS`, merah.
- **36. Widget ulang tahun** — guru & siswa yang berulang tahun minggu ini (memupuk kekeluargaan).
- **37. Widget konten kedaluwarsa** — pengumuman lewat tanggal, agenda lampau yang masih tayang.
- **38. Widget link mati** — hasil crawler internal mingguan, jumlah + contoh.
- **39. Widget "dicari tapi tak ketemu"** — query pencarian publik tanpa hasil → ide konten baru.
- **40. Widget aktivitas tim** — siapa mengubah apa dalam 24 jam terakhir (ringkas dari audit log).
- **41. Widget kesehatan pencarian** — probe berkala `search_news_ids` dengan query kanonik; alarm saat ekspektasi v3 menyimpang.
- **42. Widget status runner migrasi** — jumlah pending/applied dari `schema_migrations`, tautan ke `/admin/sql`.
- **43. Widget menunggu tanda tangan** — surat/sertifikat/SK yang menunggu persetujuan berjenjang.
- **44. Personalisasi layout per user + tombol reset** — kembali ke layout default kapan pun.
- **45. Preset layout per role** — publisher melihat antrean konten, admin keuangan melihat tunggakan.
- **46. Time range switcher global** — hari / 7 hari / 30 hari / semester, berlaku untuk semua widget.
- **47. Export snapshot dashboard** — PNG/PDF satu halaman untuk lampiran rapat yayasan.
- **48. Mode TV dashboard** — layout auto-refresh untuk layar ruang guru (baca juga #548).
- **49. Notifikasi inline di widget** — aksi cepat tanpa pindah halaman (terima/tolak dari kartu).
- **50. Widget kontekstual sekolah** — kalender Hijriah + jadwal sholat ringkas (lihat juga #550–551).
- **51. Widget hitung mundur** — MPLS, Wisuda, Akhirussanah, pengumuman SPMB.
- **52. Widget donut komposisi konten** — berita per kategori, aset per album, siswa per tingkat.
- **53. Widget perbandingan periode** — semua angka utama vs bulan lalu, hijau/merah.
- **54. Widget target vs realisasi** — target konten per bulan, target pendaftar per gelombang.
- **55. Widget konten zombie** — halaman publik dengan 0 tayangan dalam 90 hari → kandidat perbaikan/arsip.

## 3. Berita & Artikel (56–95)

- **56. Penjadwalan publikasi** — `publish_at` + worker automation yang mengubah status draft → published.
- **57. Arsip otomatis opsional** — berita jenis "pengumuman" otomatis arsip setelah tanggal lewat.
- **58. Preview full-page sebelum publish** — render halaman publik dengan data draft, hanya bisa dilihat role berwenang.
- **59. Riwayat revisi + diff visual** — versi lama disimpan, bandingkan berdampingan, restore satu klik.
- **60. Content lock** — deteksi dua editor pada satu berita dengan heartbeat; kedua diberi tahu.
- **61. Template berita** — kerangka lead/isi/kutipan untuk jenis berita rutin (kegiatan, prestasi, pengumuman).
- **62. Blok reusable** — snippet tersimpan (profil kepala sekolah, peta lokasi,CTA SPMB) sisip ke berita mana pun.
- **63. Kategori + tag dengan bulk re-tag** — pindahkan banyak berita antar kategori sekaligus, aman untuk SEO.
- **64. Slug safety** — cek duplikat slug, rewrite slug lama otomatis jadi redirect 301 saat slug diubah.
- **65. Meta description otomatis** — generate dari paragraf pertama, tetap bisa diedit manual.
- **66. OG image generator** — template branding + judul dinamis → gambar share WA/IG otomatis untuk tiap berita.
- **67. Estimasi read-time** — tampil di editor + saran titik potong untuk versi ringkas.
- **68. Blok kutipan khusus** — gaya portal (pernah dipakai di ornamen) untuk pull-quote Arabic/Indonesia.
- **69. Related articles** — berbasis `word_similarity` trgm yang sudah ada (needle dulu, haystack kemudian!).
- **70. Berita pinned dengan masa berlaku** — tempel di beranda otomatis lepas setelah tanggal.
- **71. Embargo konten** — teks lengkap baru tayang setelah tanggal X (untuk pengumuman hasil).
- **72. Multi-penulis** — kolom penulis utama + kontributor, tampil di halaman berita.
- **73. Workflow review berjenjang** — draft → review → approved → publish dengan SLA per tahap (perluasan modul review).
- **74. Komentar moderasi opsional** — per berita bisa on/off, masuk antrean moderasi.
- **75. Counter tayangan + widget terpopuler** — berita paling dibaca minggu/bulan ini.
- **76. Konten dwibahasa** — field id/en (opsional ar) per berita; yang kosong fallback ke id.
- **77. Transliterasi Arab otomatis** — bantu konsistensi penulisan kalimat thoriyyah/judul Arab.
- **78. Sisip galeri inline** — pilih aset dari media library tanpa keluar editor (terhubung modul media).
- **79. Kompres on-upload** — resize + WebP otomatis, aset asli tetap disimpan.
- **80. Alt-text sebagai quality gate** — berita tanpa alt-text gambar ditandai sebelum bisa approve.
- **81. Cek kemiripan internal** — peringatkan saat judul/isi mirip berita lama (hindari dobel konten).
- **82. Pemeriksa ejaan dasar** — kamus istilah sekolah + typopatrol ringan pada judul.
- **83. Probe link eksternal saat publish** — cek tautan mati async, laporkan di quality panel.
- **84. Versi teks ringan untuk WA share** — ringkasan + tautan yang tampil bagus saat di-forward.
- **85. Share kit otomatis** — caption WA/IG siap pakai + QR code (qrcode sudah di deps) per berita.
- **86. Newsletter digest builder** — pilih berita mingguan → kirim email/WA ringkasan.
- **87. Bulk action lengkap** — ubah kategori/status/penulis, hapus massal dengan konfirmasi dua tahap.
- **88. Filter supersimpan** — multi-kategori, rentang tanggal, status, penulis, tag, kombinasi AND/OR.
- **89. Preset saved-view bawaan** — "Draft > 7 hari", "Menunggu review", "Terjadwal bulan ini" (menumpang modul saved-views).
- **90. Trash berita dengan auto-expiry report** — laporan bulanan item trash mendekati hapus permanen.
- **91. Statistik editorial per penulis** — jumlah berita, kecepatan review, keterlambatan SLA.
- **92. Autosave draft + resolve konflik** — simpan tiap 30 detik, bandingkan saat dua versi bertabrakan.
- **93. Word count + target panjang** — panduan panjang per jenis berita.
- **94. Duplikat sebagai draft** — clone berita lama jadi template kegiatan tahunan.
- **95. Export arsip DOCX/PDF** — kiriman bulanan untuk arsip yayasan cetak.

## 4. Media & Galeri (96–123)

- **96. Album/folder hierarki di media library** — mis. `2026/SPMB-Gel-1`, `2026/Ekskul/Tapak-Suci`.
- **97. Upload multi drag-drop** — progress per file, retry per file yang gagal.
- **98. Paste dari clipboard** — Ctrl+V screenshot langsung jadi aset.
- **99. Variasi ukuran otomatis** — thumb/card/hero + WebP/AVIF, dipilih lewat `<picture>`.
- **100. Placeholder LQIP/blurhash** — halaman publik tidak "loncat" saat gambar termuat.
- **101. Tag orang pada foto** — album per kegiatan lebih praktis dari face-detection; klik wajah → tag nama.
- **102. Deteksi duplikat upload** — hash konten, peringatkan "aset ini sudah ada di album X".
- **103. Bulk rotate/crop/resize** — rapikan hasil kamera panitia sekaligus.
- **104. Metadata wajib per aset** — alt-text, caption, credit fotografer.
- **105. Field hak pakai** — internal / siap publish / butuh izin.
- **106. Reuse tracker** — aset ini dipakai di halaman mana saja; pelindung saat hendak menghapus.
- **107. Safe-delete aset** — tolak hapus selama masih direferensikan; tawarkan lihat daftar pemakai.
- **108. Manajer album publik** — urutan dnd, cover, deskripsi, tampil/sembunyi.
- **109. Video YouTube terstruktur** — embed + capture thumbnail lokal untuk kecepatan.
- **110. Preview PDF di admin** — lihat dokumen tanpa unduh.
- **111. Watermark opsional otomatis** — logo sekolah untuk foto publik resolusi besar.
- **112. EXIF strip saat upload** — hapus GPS/kamera dari foto (privasi murid).
- **113. Consent flag per foto** — tanda "ada izin publikasi dari wali" sebelum boleh tampil publik.
- **114. Pemakaian storage per album** — album terberat + saran arsip.
- **115. Arsip dingin** — album > 2 tahun dipindah path murah, tetap bisa presigned-download.
- **116. Pencarian media kaya** — nama, tag, tanggal, album; opsional warna dominan.
- **117. Crop preset sosial** — generate 1:1, 9:16, 16:9 sekali klik untuk kit promosi.
- **118. QR unduh album** — panitia scan QR → semua foto kegiatan (fflate untuk zip sudah ada).
- **119. Lightbox review cepat** — navigasi keyboard, tandai pilih/tolak saat kurasi.
- **120. Import album dari ZIP** — ekstrak otomatis + masuk antrean optimasi.
- **121. Antrean foto hero beranda** — kurasi rotasi HeroCarousel langsung dari admin.
- **122. Penanda foto buruk** — deteksi buram/gelap sederhana (histogram) → "kualitas rendah, pertimbangkan buang".
- **123. Bulk move + merge album** — reorganisasi besar tanpa pecah referensi.

## 5. Halaman Statis & Konten Terstruktur (124–149)

- **124. Page builder ringan berbasis section** — hero, grid fitur, kutipan, CTA; komposisi tanpa ngoding.
- **125. Preview & publish per section** — draft section-level, publish bersamaan agar halaman konsisten.
- **126. Versi halaman + rollback** — standar yang sama dengan berita (#59).
- **127. Kontrol ornamen 3D per halaman dari admin** — lanjutan Fase 0–2: saklar on/off, intensitas, varian per halaman, tanpa deploy.
- **128. Perf preset ornamen** — mode hemat untuk perangkat lemah, admin bisa override default global.
- **129. Manajer FAQ** — bulk reorder dnd, kategori, JSON-LD schema.org otomatis.
- **130. Manajer fasilitas** — kartu + foto + status (aktif/perbaikan) + jadwal pemakaian.
- **131. Manajer downloads** — kategori, versi dokumen, tanggal berlaku, counter unduhan, notifikasi dokumen lama.
- **132. Manajer program** — struktur per jenjang dengan mapel/ekskul terkait terhubung antar modul.
- **133. Kartu guru/ustadz dinamis** — urutan tampil TeacherCarousel dari admin, bio, bidang, foto wajib rapi.
- **134. Manajer slider beranda** — HeroCarousel + HeroVideoModal: urutan, jadwal tayang, A/B judul (#478).
- **135. Banner musiman** — banner Isra' Mi'raj, penerimaan murid baru, dengan start/end otomatis.
- **136. Struktur portal per role** — tautan cepat siswa/guru/wali di halaman Portal dikelola admin.
- **137. Versioning privacy/terms** — versi + changelog + tanggal efektif + arsip versi lama.
- **138. Schema.org builder** — Organization, School, Event otomatis dari data yang sudah ada.
- **139. Dashboard SLA kontak** — semua submission kontak dengan umur + lampu SLA (konstanta sudah ada).
- **140. Auto-reply kontak per kategori** — template jawaban awal per jenis pertanyaan.
- **141. Kanal PPID** — form permohonan informasi + status tracking + batas waktu jawab (jika dibutuhkan yayasan).
- **142. Galeri video terstruktur** — playlist YouTube per tema dikelola admin.
- **143. Auto-unpublish konten kedaluwarsa** — banner/pengumuman lewat tanggal hilang sendiri.
- **144. Draft page = 404 publik** — halaman belum publish tak bisa dibuka, tapi bisa di-preview admin.
- **145. CTA manager global** — tombol "Hubungi WA", "Daftar SPMB" diubah dari admin tanpa deploy.
- **146. Identitas visual terpusat** — logo versi terang/gelap, kop surat, warna brand dikelola satu tempat.
- **147. Bagan struktur organisasi** — drag node kepemimpinan/jabatan, render bagan di halaman profil.
- **148. Testimoni wali murid** — koleksi testimoni + persetujuan publikasi per item.
- **149. Manajer tautan materi** — link GDrive/Doc internal dengan metadata (kelas, mapel, tahun).

## 6. SPMB / PPDB (150–187)

- **150. Formulir multi-step dengan autosave** — kandidat bisa lanjut besok dari langkah terakhir.
- **151. Upload dokumen dengan cek kelengkapan** — akta, KK, rapor; checklist otomatis sebelum submit.
- **152. Checklist verifikasi per pendaftar** — role verifier menandai dokumen sah/kurang dengan catatan.
- **153. Pipeline status lengkap** — daftar → verifikasi → tes → wawancara → hasil → daftar ulang → siswa.
- **154. Kuota per gelombang** — auto-close saat penuh + waiting list otomatis.
- **155. Kartu ujian PDF + QR check-in** — generate massal per jadwal tes (qrcode sudah ada).
- **156. Penjadwalan wawancara dengan slot** — panitia buka slot, pendaftar/panitia konfirmasi via WA.
- **157. Skoring rubrik online** — multi-assessor per calon murid, rata-rata & simpangan otomatis.
- **158. Portal cek hasil** — nomor registrasi + tanggal lahir → status (dengan embargo tanggal #71).
- **159. SK (surat keputusan) PDF otomatis** — nomor surat berurutan + kop + tanda tangan digital placeholder.
- **160. Alur daftar ulang** — konfirmasi + upload bukti bayar + generate NIS otomatis.
- **161. Validasi NIS/NISN + dedup** — cegah dobel dengan siswa existing (fuzzy match nama+TTL).
- **162. Handover satu klik ke kesiswaan** — pendaftar diterima → jadi record siswa dengan data lengkap.
- **163. WhatsApp otomatis per tahap** — konfirmasi pendaftaran, reminder tes, pengumuman hasil (via #355).
- **164. Template email per tahap** — variabel `{{nama}}`, `{{jadwal}}`, `{{link}}` dengan preview.
- **165. Dashboard funnel per gelombang** — angka tiap tahap + drop-off terbesar.
- **166. Analisis sumber informasi** — "tahu dari mana" → chart efektivitas promosi per kanal.
- **167. Kode referral** — siswa/alumni punya kode, statistik siapa pembawa pendaftar terbanyak.
- **168. Jalur & biaya per gelombang** — jalur prestasi/afirmasi/umum dengan nominal berbeda.
- **169. Alur beasiswa** — form khusus + penilaian + keputusan tercatat.
- **170. Foto diri via kamera HP** — capture + crop standar pas foto, konsisten untuk kartu ujian.
- **171. Deteksi pendaftar dobel** — fuzzy match lintas gelombang dan lintas tahun.
- **172. Export & label undangan** — Excel per gelombang + PDF label alamat/kartu.
- **173. Kuota per rombel paralel** — warning saat kuota kelas mendekati batas.
- **174. Arsip kohort tahunan** — statistik antar tahun: pendaftar, lolos, konversi.
- **175. Audit trail per pendaftar** — siapa mengubah status, kapan, alasan.
- **176. Bulk reject dengan template alasan** — surat penolakan otomatis yang santun.
- **177. Waiting list management** — promosi otomatis urut nomor saat kuota dibuka.
- **178. Kapasitas slot tes + overbooking guard** — cegah slot melebihi ruang/pengawas.
- **179. Reminder dokumen kurang** — WA otomatis H-3 sebelum batas unggah ulang.
- **180. Absensi hari tes via QR** — scan masuk ruang, rekap kehadiran tes otomatis.
- **181. Input hasil tes massal** — grid mirip spreadsheet untuk panitia yang cepat.
- **182. Pengumuman bertahap** — gelombang 1 dulu; saklar per gelombang.
- **183. Pindah gelombang dengan jejak** — migrasi pendaftar antar gelombang tercatat di audit.
- **184. API status pendaftaran** — endpoint read-only untuk bot WA/portal alternatif.
- **185. Kuesioner pasca-penerimaan** — NPS orang tua baru + umpan balik proses SPMB.
- **186. Demografi & peta sebaran** — asal sekolah, wilayah; chart + peta sederhana.
- **187. Checklist handover ke kesiswaan** — pastikan data lengkap sebelum status berubah jadi siswa.

## 7. Kesiswaan — modul baru (188–213)

- **188. Master data siswa** — biodata, ortu/wali, dokumen, status; satu sumber kebenaran lintas modul.
- **189. Mutasi murid** — masuk/pindah/keluar dengan surat, tanggal efektif, dan jejak audit.
- **190. Lifecycle status siswa** — aktif, cuti, lulus, keluar, alumni; otomatis mengubah akses portal.
- **191. Pembagian rombel drag-drop** — dnd-kit, cek kapasitas, komposisi (gender, usia) real-time.
- **192. Sibling link** — adik-kakak terhubung → diskon otomatis (#296) + broadcast gabungan.
- **193. Data kesehatan dasar** — golongan darah, alergi, catatan khusus; akses terbatas RBAC (#377).
- **194. Pembinaan & poin pelanggaran** — kategori, poin, log pembinaan, wali kelas & wali murid terinformasi.
- **195. Prestasi non-akademik siswa** — koleksi + upload sertifikat + feed ke halaman achievements.
- **196. Generator sertifikat PDF** — template + nomor urut + QR verifikasi keaslian.
- **197. Database alumni** — profil + tracer study + kanal komunikasi alumni.
- **198. Export format Dapodik-ready** — CSV standar untuk laporan dinas.
- **199. Kartu pelajar PDF + QR** — foto + NIS, terbit massal per rombel.
- **200. Portal wali murid** — role baru: lihat nilai, tagihan, absensi, pengumuman anaknya saja (RLS row-level).
- **201. Broadcast per segment** — per rombel/tingkat/kategori, dari data kesiswaan.
- **202. Tautan antar modul** — dari siswa langsung ke tagihannya, absensinya, pembinaannya.
- **203. Rapat orang tua** — jadwal, kehadiran, notulen per kelas.
- **204. Penjemput sah + QR** — daftar orang yang boleh menjemput; scan saat pulang (opsional).
- **205. Data asrama (jika ada)** — kamar, pembina, izin pulang/log keluar-masuk.
- **206. Rute transportasi** — antar-jemput: rute, titik jemput, penumpang per rute.
- **207. Log UKS** — kunjungan sakit, penanganan, stok obat sederhana.
- **208. Izin/sakit online dari wali** — form portal wali → approval wali kelas → tercatat di presensi (#284).
- **209. Manajemen beasiswa aktif** — penerima, periode, review tahunan.
- **210. Tracking kedaluwarsa dokumen siswa** — KK/akta/sertifikat dengan reminder ke wali murid.
- **211. Penomoran surat kesiswaan otomatis** — format custom per jenis surat, anti-dobel.
- **212. Tier privasi per field** — publik / internal / rahasia; field rahasia hanya role tertentu + akses tercatat (#391).
- **213. Profil ganda detector** — peringatkan kemungkinan siswa terdaftar dobel lintas tahun.

## 8. Kepegawaian (214–235)

- **214. Master guru & staf** — perluasan modul teachers: data kepegawaian penuh terpisah dari tampilan publik.
- **215. View jadwal mengajar per guru** — jadwal pribadi mingguan (#239).
- **216. Beban kerja & jam mengajar** — rekap per pekan + warning bentrok/overload.
- **217. Cuti & izin online** — pengajuan → approval berjenjang → kalender staf ter-update.
- **218. Absensi staf** — rekap bulanan terhubung modul presensi pegawai (#285).
- **219. Tracking dokumen kepegawaian** — SK, kontrak, sertifikat pelatihan + reminder kedaluwarsa.
- **220. Penilaian kinerja periodik** — form rubrik + riwayat antar periode.
- **221. Riwayat pengembangan** — pelatihan/workshop yang diikuti + biaya (link keuangan).
- **222. Slip gaji PDF** — generate massal per bulan (link modul keuangan).
- **223. Struktur jabatan & periode** — siapa memegang apa sejak kapan; riwayat jabatan.
- **224. Guru pengganti matcher** — saat guru berhalangan, saran guru kosong di jam itu (#252–253).
- **225. Roster piket** — piket upacara, jaga sekolah, kesiswaan; broadcast otomatis.
- **226. Vault dokumen kepegawaian** — file sensitif dengan permission ketat + akses tercatat.
- **227. Onboarding checklist staf baru** — langkah baku: akun, dokumen, orientasi.
- **228. Offboarding checklist** — penyerahan aset, disable akses, arsip data.
- **229. Aset per guru** — laptop, kunci ruang; peminjaman & pengembalian tercatat (#313).
- **230. Umpan kinerja dari survey siswa** — anonim, opsional, hanya untuk guru yang mengaktifkan.
- **231. Multi-role person** — orang yang sama bisa guru + pembina ekskul + staf humas.
- **232. Toggle publikasi profil** — kontrol field mana yang tampil di situs publik per guru.
- **233. Kalender tugas guru** — supervisi, undangan rapat, tugas tambahan di satu kalender.
- **234. Broadcast internal dengan ack** — pengumuman wajib-baca: tercatat siapa sudah baca.
- **235. Rekap kehadiran rapat staf** — dari kehadiran rapat (#203) dalam perspektif kepegawaian.

## 9. Akademik — modul baru (236–261)

- **236. Manajer tahun ajaran & semester** — aktif/persiapan; modul lain membaca setting ini.
- **237. Master mapel + KKM per tingkat** — konfigurasi kurikulum per jenjang.
- **238. Rombel & wali kelas** — penunjukan resmi per tahun ajaran.
- **239. Jadwal pelajaran grid + deteksi bentrok** — guru/ruang/kelas tidak boleh dobel; validator live saat menyusun.
- **240. Master ruang** — kelas, lab, lapangan, aula; kapasitas + fasilitas.
- **241. Kalender akademik resmi** — awal masuk, libur, ujian → feed kalender publik (#331).
- **242. Repository RPP/modul ajar** — upload per guru dengan tag mapel/kelas/semester.
- **243. Materi & tugas per kelas** — guru kirim, siswa unduh via portal; arsip per semester.
- **244. Pengumpulan tugas online** — unggah file, status pengumpulan, late flag.
- **245. Manajer ulangan** — jadwal harian/PTS/PAS + jadwal susulan.
- **246. Pemetaan kurikulum** — capaian → mapel → bentuk penilaian, untuk laporan ke dinas.
- **247. Hitung jam efektif** — jam nyata per mapel per semester (dari presensi & jadwal).
- **248. Jadwal ujian + pengawas** — assignment pengawas + kartu ujian (#155).
- **249. Tracking remedial & pengayaan** — siswa yang mengikuti + hasil.
- **250. Kelas tambahan/bimbingan** — scheduling khusus di luar jadwal reguler.
- **251. View jadwal multi-sudut** — per kelas / per guru / per ruang, export PDF (#254).
- **252. Perubahan jadwal harian** — guru berhalangan → pengganti + broadcast ke kelas terkait.
- **253. Log penggantian mengajar** — terhubung kepegawaian untuk beban kerja riil.
- **254. Cetak jadwal dinding** — PDF A3 per kelas siap tempel.
- **255. Export ICS** — kalender per guru/kelas bisa di-subscribe Google Calendar.
- **256. Jadwal pembina ekskul** — sinkron dengan modul ekskul agar tak bentrok jadwal utama.
- **257. Catatan wali kelas per siswa** — kronologis, privat, hanya wali kelas & kesiswaan.
- **258. Kelompok ad-hoc** — kelompok praktik/proyek sementara tanpa rombel resmi.
- **259. Laporan bentrok mingguan** — cron mengecek jadwal vs kenyataan (penggantian, kegiatan).
- **260. Lembar keputusan kenaikan tingkat** — tabel rapat dewan guru dengan keputusan per siswa tercatat.
- **261. Arsip akademik readonly** — tahun ajaran ditutup → data jadi baca-saja + ringkasan.

## 10. Penilaian & Rapor — modul baru (262–279)

- **262. Komponen nilai fleksibel per mapel** — tugas/UH/PTS/PAS/praktik dengan bobot configurable.
- **263. Input nilai grid cepat** — mirip spreadsheet, keyboard-first, tahan putus koneksi (queue lokal).
- **264. Validasi nilai live** — di luar rentang, kosong, dobel → merah sebelum simpan.
- **265. Deskripsi kompetensi otomatis** — template per predikat + edit manual.
- **266. Rapor PDF generator** — kop sekolah, foto, tanda tangan; terbit massal per rombel.
- **267. Rapor tengah + akhir semester** — dua siklus terpisah dengan tanggal pengantar berbeda.
- **268. Ledger nilai immutable** — setiap perubahan nilai tercatat siapa-kapan-nilai lama (audit penuh).
- **269. Rapor P5** — proyek profil pelajar Pancasila (jika dipakai): penilaian kelas proyek.
- **270. Analitik nilai** — distribusi per kelas, mapel terkuat/terlemah, tren antar semester.
- **271. Peringkat kelas/tingkat** — hitung otomatis dengan opsi sembunyikan dari portal siswa.
- **272. Portal nilai siswa & wali** — rilis per tanggal + "berita acara" diterima tercatat.
- **273. Cetak ledger per kelas** — buku nilai klasik dari data yang sama.
- **274. Konversi predikat & bobot configurable** — KKM, interval predikat diatur admin kurikulum.
- **275. Copy baseline semester lalu** — template komponen tinggal salin ke semester baru.
- **276. Import nilai dari Excel** — mapping kolom + validasi sebelum masuk ledger.
- **277. Rekap ketuntasan per kompetensi** — berapa persen siswa tuntas per KD.
- **278. Approval rapor berjenjang** — guru → wali kelas → kurikulum; terbit setelah semua setuju.
- **279. Distribusi rapor digital** — portal wali + tombol "konfirmasi terima" per siswa.

## 11. Presensi — modul baru (280–293)

- **280. Presensi harian satu klik** — tandai semua hadir, kecualikan yang absen; input < 30 detik per kelas.
- **281. Presensi per jam (opsional)** — untuk jenjang lanjut; rekap jam efektif riil (#247).
- **282. Rekap bulanan otomatis** — persentase per siswa + warning di bawah ambang.
- **283. Notifikasi wali saat alpha** — WA otomatis hari itu juga (jika diaktifkan).
- **284. Alur izin/sakit terhubung** — dari #208: keterangan disetujui wali kelas mengubah status absen.
- **285. Presensi pegawai** — sama mesinnya untuk staf/guru (#218).
- **286. Presensi ekskul** — sesi latihan per pembina (#341).
- **287. QR check-in event massal** — upacara/haflah: satu scan gerbang, rekap otomatis.
- **288. Export rekap + tren** — Excel + grafik tren kedisiplinan per kelas.
- **289. Alarm pola alpha berulang** — kesiswaan diberi tahu siswa dengan pola bermasalah.
- **290. Import dari mesin fingerprint** — CSV reguler dari mesin absensi fisik.
- **291. Input dari HP (PWA)** — guru absen kelas dari ponsel, offline-tolerant (#527).
- **292. Statistik presensi per mapel** — jam efektif riil per pelajaran.
- **293. Approval keterangan sebelum sah** — izin tanpa approval tidak mengubah rekap resmi.

## 12. Keuangan & SPP — modul baru (294–319)

- **294. Master biaya** — SPP, daftar ulang, seragam, ekskul, kegiatan per jenjang/tahun.
- **295. Tagihan generator** — per bulan/semester dengan due date + komponen biaya.
- **296. Bulk tagihan + diskon** — saudara, hafizh, beasiswa, bebas select per rombel.
- **297. Verifikasi bukti transfer** — wali unggah bukti via portal → antrean verifikasi keuangan.
- **298. Payment gateway opsional** — payment link (Midtrans/Xendit) untuk yang mau digital penuh; saklar per default.
- **299. Kas manual** — pemasukan/pengeluaran dengan bukti foto + kategori.
- **300. Buku kas + rekap per pos** — PDF bulanan siap laporan.
- **301. Dashboard tunggakan dengan aging** — 30/60/90 hari, per rombel & per siswa.
- **302. Reminder tunggakan bertingkat** — template ramah → teguran → surat resmi, otomatis per umur tunggakan.
- **303. Kwitansi PDF otomatis** — nomor urut + QR verifikasi keaslian (#196).
- **304. Laporan untuk yayasan** — rekap periode per pos, siap cetak.
- **305. Anggaran vs realisasi** — per pos per tahun, grafik selisih.
- **306. Multi-unit** — jika ada SD/SMP/SMA: nominal & laporan per unit.
- **307. Refund & koreksi** — alur approval dua orang sebelum dana kembali.
- **308. Campaign pembangunan/donasi** — target vs terkumpul, publik opsional.
- **309. Kas kecil panitia** — pertanggungjawaban kegiatan (#327).
- **310. Gaji & tunjangan** — komponen gaji + slip massal (#222).
- **311. Daftar kebutuhan pembelian (PR)** — pengajuan → approval → status beli.
- **312. Inventaris & aset** — lokasi, kondisi, tahun; QR label aset.
- **313. Peminjaman aset log** — proyektor/tenda dipinjam siapa, kapan kembali.
- **314. Umur aset & rekomendasi penggantian** — ringan, tanpa akuntansi penuh.
- **315. Audit log keuangan immutable** — perubahan nominal/tagihan tidak bisa dihapus diam-diam.
- **316. Dashboard arus kas 6 bulan** — grafik masuk/keluar + proyeksi.
- **317. Rekonsiliasi rekening** — import CSV ekstrak bank, match manual/semi-otomatis dengan tagihan.
- **318. Modul infaq/ZIS opsional** — penerimaan infaq terpisah dengan laporan.
- **319. Tier privasi nominal** — hanya role keuangan & developer melihat angka (#377).

## 13. Agenda & Kalender (320–337)

- **320. Kalender master dengan tipe event** — akademik, kegiatan, libur; warna & aturan per tipe.
- **321. Recurring event** — upacara Minggu, apel Senin, dengan pengecualian tanggal merah.
- **322. Alur usulan agenda** — guru mengusulkan → admin menyetujui → masuk kalender.
- **323. Agenda → pengumuman otomatis** — event besar jadi berita pengumuman dengan satu klik (opsional).
- **324. Agenda di situs publik + filter** — perluasan modul activities: filter kategori/jenjang.
- **325. Reminder berlapis** — H-7 panitia, H-1 panitia, H-1 publik.
- **326. Checklist panitia & kehadiran** — siapa mengerjakan apa, status persiapan per event.
- **327. Anggaran & realisasi per event** — link kas kecil (#309), selisih tercatat.
- **328. Album galeri otomatis per event** — buat album kosong saat event dibuat; dokumentasi langsung rapi.
- **329. LPJ (laporan pertanggungjawaban) upload** — wajib untuk event beranggaran; status review.
- **330. Notulen rapat terstruktur** — poin keputusan + action items dengan PIC & tenggat.
- **331. ICS feed publik** — kalender bisa di-subscribe orang umum/wali.
- **332. Timeline view (gantt ringan)** — proyek sekolah multi-minggu: renovasi, akreditasi.
- **333. Detektor tabrakan** — event besar vs jadwal ujian/libur; peringatkan saat membuat.
- **334. QR check-in peserta** — statistik kehadiran per event (#287).
- **335. Sertifikat panitia otomatis** — selesai event → generate massal (#196).
- **336. Template event tahunan** — clone MPLS/Akhirussanah tahun lalu lengkap checklist.
- **337. Field rencana cadangan** — catatan indoor/penundaan hujan per event luar ruang.

## 14. Ekskul & Prestasi (338–352)

- **338. Katalog ekskul + kuota + periode** — perluasan modul ekskul dengan window pendaftaran.
- **339. Pendaftaran ekskul online** — siswa pilih 1–2 prioritas dari portal.
- **340. Penempatan otomatis + waiting list** — urut prioritas/kuota, sisanya waiting list.
- **341. Absensi sesi latihan** — pembina centang per pertemuan (#286).
- **342. Portofolio ekskul siswa** — riwayat ekskul tahunan dalam satu kartu siswa.
- **343. Pembina + honor record** — siapa membina apa, rekam honor ke keuangan.
- **344. Jadwal latihan mingguan + tempat** — tampil publik per ekskul.
- **345. Prestasi kejuaraan berlevel** — sekolah/kab/prov/nasional + publikasi achievements + banner beranda.
- **346. Izin lomba workflow** — surat izin + pendamping + pengajuan ke admin.
- **347. Proposal dana lomba** — pengajuan + approval + realisasi (link keuangan).
- **348. Dokumentasi per ekskul** — album galeri terhubung (#328).
- **349. Evaluasi tahunan ekskul** — rekap partisipasi + rekomendasi lanjut/berhenti.
- **350. Progress kyu Tapak Suci** — data khusus pencak silat: tingkatan anggota, tanggal kenaikan.
- **351. Sertifikat ekskul massal tahunan** — generate per anggota aktif (#196).
- **352. Warning siswa tanpa ekskul** — kesiswaan melihat siapa yang belum mengikuti apa pun.

## 15. Komunikasi & Notifikasi (353–374)

- **353. Pusat notifikasi dengan channel preference** — per user: in-app, email, WA (modul notifications sudah ada).
- **354. Template pesan terkelola** — variabel + preview + versi; dipakai semua modul (SPMB, keuangan, presensi).
- **355. Gateway WA (Fonnte/Wablas dkk.)** — kirim broadcast & otomatis; saklar on/off + fallback ke email.
- **356. Broadcast email** — Resend/SES dengan tracking terkirim terbuka.
- **357. Queue + retry + log per penerima** — status tiap pesan: antri, terkirim, gagal + alasan.
- **358. Audience builder** — filter siswa/ortu/staf by tag, kelas, status bayar, wilayah; simpan segmen.
- **359. Pesan terjadwal** — reminder SPP tanggal 5 tiap bulan, diatur sekali.
- **360. Template multi-bahasa** — id default, en/ar opsional per audiens.
- **361. Jendela tenang (DND)** — tidak kirim 21.00–05.00 kecuali broadcast darurat.
- **362. Approval dua lapis broadcast massal** — > 200 penerima butuh setujuan role lain.
- **363. Inbox balasan 1-1** — balasan WA masuk ke inbox humas dengan status dibaca.
- **364. In-app notification center** — read state, grouping, tautan ke sumber.
- **365. Push web (PWA)** — notifikasi browser untuk admin & portal wali.
- **366. Digest harian developer** — email ringkas: error baru, backup, pending migrasi, job gagal.
- **367. Emergency broadcast satu tombol** — libur mendadak/bencana: multi-kanal sekaligus + konfirmasi ketik "KIRIM".
- **368. Surat pemberitahuan PDF massal** — untuk yang tanpa WA terdaftar; arsip cetak.
- **369. Log semua pesan keluar** — wajib: siapa kirim apa ke siapa, kapan (audit).
- **370. Anti-spam form publik** — honeypot + Turnstile + throttle per IP.
- **371. Bounce handling email** — alamat mati ditandai, daftar dibersihkan otomatis.
- **372. Statistik broadcast per campaign** — delivered/read/failed + link klik.
- **373. Polling via WA sederhana** — "balas 1 kalau hadir rapat Jumat" → rekap otomatis.
- **374. Invite kalender Google** — event penting kirim .ics per penerima.

## 16. RBAC & Keamanan (375–402)

- **375. Role editor visual** — matrix modul × aksi (lihat/buat/edit/hapus/approve) drag & centang.
- **376. Custom role** — selain developer/admin/publisher/teacher/student: humas, keuangan, verifikator SPMB.
- **377. Permission field-level** — siapa boleh lihat nominal keuangan, NIK ortu, catatan konseling.
- **378. Scope per-record (row-level)** — wali kelas hanya melihat siswa kelasnya; lewat RLS, bukan cuma UI.
- **379. Approval chain configurable** — alur siapa menyetujui apa per jenis aksi.
- **380. 2FA TOTP wajib untuk admin** — recovery codes + enforcement per role.
- **381. Passkey/WebAuthn** — login admin tanpa sandi untuk perangkat tepercaya.
- **382. Manajer sesi aktif** — daftar sesi login per user + force logout jarak jauh.
- **383. IP allowlist opsional** — untuk role developer saat bekerja dari jaringan tetap.
- **384. Lockout + CAPTCHA** — kunci sementara setelah N gagal login, Turnstile setelah itu.
- **385. Alert login baru** — device/browser baru → WA/email ke pemilik akun.
- **386. Impersonation ber-audit** — developer "login as" user untuk debug, dengan banner + jejak penuh.
- **387. Password policy configurable** — panjang minimal, rotasi reminder (bukan force-bully).
- **388. Offboarding otomatis** — disable user + panduan transfer kepemilikan kontennya.
- **389. Audit trail lengkap per tabel** — insert/update/delete + diff nilai lama→baru (#404).
- **390. Retensi & export log** — kebijakan simpan X hari lalu ekspor ke S3.
- **391. Report akses data sensitif** — siapa membuka field rahasia kapan (#212).
- **392. RLS test suite otomatis** — matrix role × tabel dijalankan CI: bug kebocoran tertangkap sebelum deploy.
- **393. Secret scan cadangan via cron** — jalankan scanner di tree + riwayat commit (melengkapi pre-commit hook).
- **394. CSP violation viewer** — laporan pelanggaran Content-Security-Policy dari browser pengunjung.
- **395. Rate limit dashboard** — konsumsi rate limit per endpoint + sumber teratas.
- **396. Firewall/bot report** — ringkasan traffic diblok Vercel.
- **397. Handler permintaan privasi** — "minta hapus data saya" jadi workflow berstatus.
- **398. Anonimisasi data alumni** — otomatis setelah X tahun: PII dibersihkan, statistik tetap.
- **399. Review akses backup bulanan** — checklist siapa yang punya akses file backup.
- **400. Checklist self-penetration ringkas** — OWASP top 10 versi praktis untuk dijalankan berkala.
- **401. Runbook insiden** — halaman "kalau kena deface/kebocoran": langkah, kontak, tombol darurat.
- **402. Kill-switch master** — satu klik mematikan semua endpoint write publik (form, SPMB) tanpa deploy.

## 17. Audit, Log & Diagnostik (403–424)

- **403. Activity stream per entitas** — timeline semua kejadian pada satu berita/siswa/tagihan.
- **404. Diff viewer** — nilai lama vs baru berdampingan untuk setiap perubahan.
- **405. Filter log kaya** — by user, tabel, aksi, rentang waktu, hasil.
- **406. Export log CSV/S3** — untuk kepatuhan & investigasi offline.
- **407. Panel Sentry** — issue terbaru dengan status assign/resolve dari dalam admin.
- **408. Health check dashboard** — DB, storage, gateway WA, email: hijau/merah per layanan.
- **409. Pemantau kesehatan pencarian** — probe `search_news_ids` dengan query kanonik (`spmb`, `tapak suci`) + alarm saat ekspektasi v3 menyimpang — supaya outage 24 Okt tak terulang tanpa disadari.
- **410. Canary content** — baris sentinel yang harus selalu terbaca di query rutin; hilang = alarm.
- **411. Status page publik opsional** — halaman status layanan untuk wali/staf saat ada gangguan.
- **412. Error budget & tren** — error per minggu vs ambang, grafik kecil.
- **413. Slow query top 10** — dari `pg_stat_statements`, dengan waktu eksekusi.
- **414. Saran indeks** — heuristik dari slow query: "tabel X filter Y tanpa indeks".
- **415. Inventaris API key** — key apa aktif, terakhir dipakai, pemilik.
- **416. Webhook log + replay** — lihat payload masuk, kirim ulang untuk debug.
- **417. Cron monitor** — status run terakhir tiap job automation + alert saat gagal/lewat jadwal.
- **418. Crawler link mati** — internal + eksternal mingguan (#38).
- **419. Scanner gambar 404** — aset yang hilang dari halaman publik.
- **420. Sitemap health** — bandingkan sitemap vs DB: halaman hantu/ketinggalan.
- **421. Error beacon publik ringan** — console error pengunjung dikirim minimal (opsional, privacy-safe).
- **422. Log sesi admin** — siapa login kapan dari mana (#385).
- **423. Deploy tracker** — commit → deploy Vercel → smoke test status, satu garis waktu.
- **424. Post-deploy checklist otomatis** — smoke route list (beranda, /news, /admission, RPC pencarian) dijalankan tiap rilis.

## 18. Form, Survei & Kontak (425–442)

- **425. Form builder drag-drop** — field lengkap + validasi + wajib/opsional, tanpa ngoding.
- **426. Form multi-halaman + logic** — tampilkan field tergantung jawaban sebelumnya.
- **427. Store submission + triage** — status (baru/diproses/selesai), assign ke staf.
- **428. Anti-spam per form** — honeypot, Turnstile, throttle (#370), konfigurasi per form.
- **429. Notifikasi submission baru** — WA/email ke PIC form.
- **430. Autoresponder per form** — template jawaban otomatis dengan variabel.
- **431. Export submissions** — CSV/Excel dengan filter sama seperti layar.
- **432. Survei periodik** — kepuasan ortu per semester, opsi anonim.
- **433. Poll/vote publik** — voting pilihan ekskul, guard 1-suara per user.
- **434. Laporan survei** — chart per pertanyaan + cross-tab sederhana.
- **435. NPS tracker** — tren NPS bulanan dari semua survei.
- **436. Template form siap pakai** — izin pulang, peminjaman fasilitas, pendaftaran kunjungan.
- **437. Retensi submission otomatis** — hapus setelah X bulan kecuali diarsip manual.
- **438. Field upload file** — batas ukuran + pemeriksaan tipe + heuristik berbahaya.
- **439. Guard duplikat submission** — fingerprint isi/IP → tandai kemungkinan dobel.
- **440. Reminder pengisi** — kirim ulang ke yang belum mengisi survei.
- **441. Triage inbox bersama** — beberapa staf satu antrean, lock item saat dikerjakan.
- **442. SLA per jenis form** — lampu merah dashboard untuk yang lewat batas (#35).

## 19. Analitik & Laporan (443–464)

- **443. Funnel builder** — susun funnel custom: kunjungan → klik SPMB → mulai daftar → submit.
- **444. Laporan mingguan otomatis** — email ringkas semua KPI ke admin setiap Senin.
- **445. Report scheduler** — kirim PDF/Excel terjadwal ke kepala sekolah/yayasan.
- **446. Pusat definisi KPI** — metric = query tersimpan + grafik; satu definisi dipakai banyak laporan.
- **447. Cohort per angkatan** — telusuri angkatan 2024: berapa masih aktif, prestasi, tunggakan.
- **448. Chart retensi siswa** — lanjut vs keluar per tahun.
- **449. Peta sebaran demografis** — asal murid per wilayah (chart statik/peta ringan).
- **450. Konten terbaik per kuartal** — top view/share dari data analytics.
- **451. Conversion tracking SPMB** — pengunjung → pendaftar per kanal.
- **452. Attribution sumber** — organik, share WA, direct, referrer.
- **453. Analitik privacy-first** — ringkasan server-side tanpa cookie pihak ketiga.
- **454. Custom range + compare** — semua laporan bisa banding dua periode.
- **455. View kepala sekolah (read-only)** — ringkasan eksklusif pimpinan, tanpa tools teknis.
- **456. Materialized view untuk laporan berat** — pre-agregasi supaya dashboard tetap cepat.
- **457. Query builder visual sederhana** — admin non-teknis menyusun laporan tabel sendiri.
- **458. Bookmark + share laporan read-only** — link bertoken tanpa login, bisa dicabut.
- **459. Anomaly alert** — lonjakan/peluruhan traffic, lonjakan error → WA ke developer.
- **460. Template export konsisten** — semua laporan berkop + tanggal + penyusun.
- **461. Laporan kepatuhan tahunan** — data murid, presensi, keuangan: satu klik gabungan.
- **462. Buku tahunan digital** — auto-compile highlight: berita terbaik + prestasi + album tahun itu.
- **463. Statistik unduhan/pustaka** — dokumen downloads paling diminati.
- **464. Rating kegunaan laporan** — siapa memakai laporan mana; matikan yang tak pernah dibuka.

## 20. SEO, Performa & Situs Publik (465–484)

- **465. SEO panel per halaman** — title, description, canonical, og image: edit dari admin, tanpa deploy.
- **466. Integrasi Search Console** — status indexing, query top, halaman menurun (digest mingguan).
- **467. Ping sitemap otomatis** — setiap publish konten baru.
- **468. Redirection manager** — tabel 301 + deteksi loop/berantai.
- **469. Validator structured data** — JobPosting untuk lowongan guru, Event untuk agenda, FAQPage.
- **470. OG image otomatis semua entitas** — template branding (#66) diterapkan lintas modul.
- **471. Core Web Vitals tracker** — field data + alarm saat regresi (terutama karena ornamen 3D baru).
- **472. Budget bobot halaman** — laporan berat gambar/script per halaman publik.
- **473. Audit script pihak ketiga** — apa saja yang dimuat publik, siapa yang menaruhnya.
- **474. Tombol purge cache** — Vercel API untuk flush saat konten besar berubah.
- **475. Link preview environment** — review konten di branch deploy sebelum rilis.
- **476. Maintenance mode** — halaman libur + saklar (kill-switch pattern).
- **477. Dark launch fitur publik** — flag memperlihatkan fitur baru ke 10% pengunjung dulu.
- **478. A/B sederhana judul hero** — dua varian, ukur klik, putuskan dari data.
- **479. Scan aksesibilitas publik** — rule axe ringan mingguan, hasil di quality panel.
- **480. Cek stylesheet cetak** — halaman profil/berita layak dicetak rapi.
- **481. hreflang + sitemap multibahasa** — jika dwibahasa (#76) jalan.
- **482. RSS per kategori/tag** — perluasan `rss.xml` yang sudah ada.
- **483. Laporan redirect rusak** — saran perbaikan otomatis.
- **484. Badge Lighthouse per release** — skor CI terlihat di admin.

## 21. AI & Otomasi (485–504)

- **485. AI draft assistant berita** — dari poin-poin panitia → judul + lead draf; manusia merapikan.
- **486. Rewrite tone** — formal/santai/singkat dengan review wajib.
- **487. Auto-translate berflag** — draf id→en/ar selalu ditandai "belum diverifikasi".
- **488. Alt-text generator** — model vision mengusulkan deskripsi gambar; admin mengedit.
- **489. Auto-tagging berita** — klasifikasi kategori/tag dari isi.
- **490. Summarize inbox** — benang kontak panjang → ringkasan + usulan tindakan.
- **491. Sentiment triage** — keluhan vs pertanyaan vs pujian untuk prioritas jawaban.
- **492. Deteksi duplikat lintas modul** — siswa baru vs alumni lama, pendaftar dobel (#171, #213).
- **493. Chat Q&A admin ber-RLS** — "berapa tunggakan kelas 7B?" dijawab dari data yang boleh dilihat kamu.
- **494. Notulen dari rekaman** — speech-to-text rapat → draf notulen (#330).
- **495. OCR dokumen lama** — scan akta/rapor jadi teks terindeks.
- **496. AI QA pra-publish** — cek konsistensi tanggal, nama, angka dengan data lain.
- **497. Smart send-time** — prediksi jam kirim terbaik per segmen audiens.
- **498. Ide konten dari search log** — query tanpa hasil → usulan topik berita (#39).
- **499. Deskripsi otomatis fasilitas** — draf teks dari metadata foto.
- **500. Newsletter composer** — pilih 5 berita terbaik minggu ini + tulis blurb draf (#86).
- **501. Chatbot FAQ publik** — jawab dari FAQ DB, eskalasi ke humas bila tidak yakin.
- **502. Guardrail AI** — output AI selalu berflag + tidak pernah auto-publish; manusia satu-satunya tombol rilis.
- **503. Cost tracker AI** — pemakaian & biaya per fitur.
- **504. Prompt library** — prompt tersimpan per use-case dengan versi & hasil terbaik.

## 22. Infrastruktur, DB & DevOps (505–526)

- **505. Panel status runner migrasi di `/admin/sql`** — daftar berkas + applied/pending dari ledger, langsung dari admin.
- **506. Diff viewer dry-run** — lihat SQL yang akan jalan sebelum `db:migrate`.
- **507. Migration lint** — tolak DROP tanpa catatan backup, wajib idempoten (aturan repo yang sudah ada, kini otomatis).
- **508. Restore drill terjadwal** — latihan pulihkan backup bulanan, hasilnya tercatat (bukan cuma backup exists).
- **509. Cek PITR** — status point-in-time recovery + reminder konfigurasi.
- **510. Unduh backup presigned** — link unduhan + checksum integritas.
- **511. Audit environment variable** — daftar env yang dipakai app vs yang ada di Vercel, checklist rotasi.
- **512. RLS coverage report** — tabel tanpa RLS = merah besar di security panel.
- **513. Schema drift detector** — bandingkan DB live dengan definisi di `sql/` & migrasi.
- **514. Flag registry dengan expiry** — tiap feature flag punya owner + tanggal review; cron mengingatkan flag zombie.
- **515. Kill-switch drill** — latihan bulanan mematikan fitur di staging agar darurat nyata terbiasa.
- **516. Deploy log + panduan rollback** — per rilis: apa berubah, cara mundur (pola CUTOVER-R2.md).
- **517. Preview gate konten besar** — perubahan konten massal wajib lewat review preview.
- **518. CI status board** — semua workflow GitHub Actions + retry dari admin.
- **519. Trend bundle & Lighthouse** — per release, grafik kecil.
- **520. Automation update dependensi** — PR otomatis update minor + catatan breaking untuk major.
- **521. Storage lifecycle** — media > 2 tahun otomatis pindah path arsip murah (#115).
- **522. Kebijakan retensi log UI** — berapa hari simpan log aplikasi/audit/pesan.
- **523. Monitor connection pool** — dari metrik Supabase, alarm saat mendekati batas.
- **524. Inventaris secrets** — apa di Vercel, apa di Supabase, kapan terakhir dirotasi.
- **525. Runbook DR interaktif** — langkah pulih bencana step-by-step di dalam admin (#401).
- **526. Clone sandbox DB** — salinan untuk uji migrasi berat sebelum produksi.

## 23. UX, Aksesibilitas & Mobile (527–544)

- **527. Admin PWA installable** — manifest + shell offline untuk operator lapangan.
- **528. Aksi tabel ramah sentuh** — menu konteks long-press di mobile.
- **529. A11y admin dasar** — fokus visible, kontras AA, skip-link, ARIA live untuk notifikasi.
- **530. Keyboard-only flow penuh** — semua modal/tabel bisa dioper tanpa mouse.
- **531. Audit label screen reader** — error form terasosiasi benar ke inputnya.
- **532. i18n admin** — id default, en opsional via dictionary.
- **533. Format lokal konsisten** — tanggal `Asia/Jakarta`, angka `id-ID`, satu utilitas untuk semua.
- **534. Empty state bermakna** — ilustrasi + penjelasan + CTA di setiap tabel kosong.
- **535. Komponen skeleton seragam** — `<Skeleton/>` dipakai semua loading.
- **536. Toast dengan undo** — hapus = toast "Batalkan 5 detik" sebelum benar-benar kemasuk trash.
- **537. Konfirmasi dua tahap aksi berbahaya** — ketik "HAPUS" untuk bulk delete.
- **538. Focus trap + scroll lock benar** — modal tidak bocor fokus/scroll.
- **539. Respek `prefers-reduced-motion`** — termasuk ornamen 3D.
- **540. High contrast toggle** — untuk lingkungan kerja terang.
- **541. Skala ukuran font admin** — untuk operator senior yang kurang nyaman ukuran default.
- **542. Help inline per field** — ikon `?` dengan tooltip + tautan docs.
- **543. Pesan error manusiawi** — bukan "fetch failed": apa yang terjadi + tombol coba lagi + kode untuk support.
- **544. Widget lapor bug dari admin** — screenshot + konteks otomatis saat operator melapor.

## 24. Improvisasi — Ide Liar & Diferensiasi (545–570)

- **545. "Waktu sekolah" dashboard** — widget berubah sesuai jam pelajaran berjalan: jam 07.30 tampilkan presensi, jam 12.00 tampilkan kantin.
- **546. Koran sekolah harian** — PDF 1 halaman tiap sore: agenda besok, berita hari ini, angka penting — auto-compose.
- **547. Etalase piala 3D** — three.js yang sudah ada dipakai vitrina virtual prestasi di situs publik; kurasi dari admin.
- **548. Digital signage koridor** — mode TV (#48) untuk layar sekolah: agenda, pengumuman, hitung mundur, foto kegiatan.
- **549. QR "scan to know" fasilitas** — tiap ruang punya QR ke halaman cerita + jadwal pemakaiannya.
- **550. Widget waktu sholat** — jadwal sholat area setempat + penyesuaian agenda kegiatan di sekitarnya.
- **551. Kalender ganda Masehi–Hijriah** — kalender akademik tampil keduanya, otomatis.
- **552. Peta kampus interaktif** — poin fasilitas yang diklik → info; dikelola dari admin fasilitas (#130).
- **553. Time capsule alumni** — pesan tahun lulusan terkunci, terbuka otomatis 5 tahun kemudian.
- **554. Wall of fame hafalan** — progres juz Al-Qur'an per siswa, opt-in, tampil publik dengan izin.
- **555. Arsip warisan sejarah sekolah** — foto & dokumen lama per era, kurasi khusus, tampil sebagai halaman sejarah.
- **556. Generator kartu ucapan** — Idul Fitri, wisuda, hari guru: template dari admin → PDF/PNG siap kirim.
- **557. Papan skor lomba live** — mode lomba antar kelas: skor realtime di layar & web.
- **558. Helpdesk internal staf** — tiket masalah IT/sarana dengan SLA + PIC.
- **559. Log pulang pergi antar-jemput** — catatan bus/penjemputan + notif wali saat anak tiba (#204, #206).
- **560. Pre-order kantin** — menu mingguan dikelola admin, pesan + saldo via portal wali (opsional penuh).
- **561. Lost & found digital** — foto barang temuan + form klaim.
- **562. Tracer alumni dengan grafik publik** — studi lanjut/kerja, anggaran ringkas tampil di halaman profil.
- **563. API publik terbatas** — berita & agenda terbuka untuk proyek developer siswa, rate-limited.
- **564. Playground SQL read-only** — ruang aman role developer/teacher untuk belajar SQL di data dummy.
- **565. Bot WA admin** — tanya jadwal/tagihan via chat dengan guardrail query read-only.
- **566. Ghost writer LPJ→berita** — draf berita otomatis dari LPJ kegiatan + album foto (#485, #329).
- **567. Voucher & kupon SPMB** — kode diskon biaya pendaftaran, dikelola admin, statistik pemakaian.
- **568. Poin loyalitas wali** — kehadiran rapat ortu → poin → tukar merchandise sekolah.
- **569. Frame filter resmi sekolah** — aset unduhan filter IG/TikTok untuk acara, didorong dari admin.
- **570. Modul Wali Asuh** — jurnal pendampingan harian per guru pembimbing + ringkasan otomatis per semester.

---

## 🏆 Top 20 Quick Wins (dampak besar, usaha kecil)

Urutan usulan kalau mau mulai minggu ini:

1. **#41 + #409 — Pemantau kesehatan pencarian** — pelajaran outage 24 Okt; probe kanonik + alarm. Ini yang paling "kena luka sendiri".
2. **#5 — Badge pending di sidebar** — kecil tapi mengubah kecepatan kerja harian.
3. **#20 — Unsaved-changes guard** — satu kali kerugian data draft panjang sudah membayar implementasinya.
4. **#56 — Penjadwalan publikasi** — kebutuhan klasik pengumuman SPMB/libur.
5. **#355 — Gateway WA** — kanal komunikasi nomor satu sekolah Indonesia; buka pintu #163, #283, #302.
6. **#26 — Dashboard draggable** — dnd-kit sudah di deps, tinggal dipakai.
7. **#58 — Preview sebelum publish** — mengurangi salah publish konten resmi.
8. **#474 — Tombol purge cache** — saat pengumuman besar, kecepatan itu segalanya.
9. **#100 — LQIP/blurhash** — halaman galeri terasa dua kali lebih cepat.
10. **#537 — Konfirmasi ketik "HAPUS"** — murah, mencegah bencana massal.
11. **#36 — Widget ulang tahun** — murah, efek kemanusiaan besar.
12. **#486/#502 — AI draf berita dengan guardrail** — mulai dari satu use-case yang paling sering.
13. **#424 — Post-deploy smoke checklist** — CI hijau ≠ situs hidup; otomatiskan rute kanonik.
14. **#514 — Flag registry + expiry** — mencegah menumpuk flag zombie seperti kebiasaan semua repo.
15. **#90 — Auto-expiry trash report** — melengkapi modul trash yang sudah ada.
16. **#199 — Kartu pelajar QR** — terlihat "wow" untuk orang tua, teknisnya ringan (qrcode sudah ada).
17. **#158 — Portal cek hasil SPMB** — menghemat ratusan telepon pada hari pengumuman.
18. **#444 — Digest mingguan otomatis** — pimpinan terlayani tanpa laporan manual.
19. **#38 — Crawler link mati** — cron + fetch + report; kualitas situs terjaga pasif.
20. **#546 — Koran sekolah harian** — komposisi widget yang sudah ada → PDF satu halaman.

## 🚫 Jangan Dibangun (anti-pattern, berdasarkan luka repo ini)

- **Auto-migrasi SQL saat deploy** — repo sengaja memisahkan rilis SQL dari rilis kode; jangan bangun "apply saat build".
- **`next build` / `next start` lokal** — akan saling banting `.next` milik dev server pemilik; verifikasi lewat CI.
- **`similarity(kolom, token)` full-string** — sudah terbukti menghasilkan 0 hasil untuk judul panjang; pakai `word_similarity` dengan argumen dibalik dan ambang 0,50.
- **Early-return "0 hasil" saat RPC kosong/gagal** — klien wajib punya fallback `.or()` ilike; jangan bangun pencarian baru tanpa fallback.
- **`git add -A` / stash / reset --hard** — tree bersama dengan dev server berjalan; hanya staging eksplisit.
- **Auto-publish AI** — semua jalur AI (#485–504) wajib ber-flag dan butuh persetujuan manusia.
- **Hapus hard tanpa ref-check** — aset/hapus massal tanpa cek referensi (#107) akan mematahkan halaman publik diam-diam.
- **Widget dashboard tanpa error boundary** — satu query gagal tidak boleh mematikan seluruh dashboard (pola `countValue` yang sudah ada: null ≠ 0).

## 🗺️ Usulan Pemetaan Fase

Mengikuti pola kerja repo (Fase 0 fondasi → saklar → fitur → polish):

- **Fase A — Sentuhan harian:** #41/#409, #5, #20, #26, #35, #58, #537, #536, #90, #424.
- **Fase B — Kanal komunikasi:** #355, #354, #357, #358, #359, #361, #362, #369, #163.
- **Fase C — SPMB end-to-end:** #150–187 pilih inti (multi-step form, verifikasi, kartu ujian, cek hasil, handover).
- **Fase D — Modul baru bergilir:** kesiswaan → presensi → keuangan → akademik → penilaian (satu modul per fase, masing-masing dengan flag + kill-switch sendiri).
- **Fase E — Lapisan cerdas:** #485–504 bertahap, dimulai dari draft berita + guardrail.

> Catatan disiplin repo: tiap fase selesai → commit + push → tunggu CI hijau. Berkas SQL baru
> (jika fase menyentuh skema) masuk `supabase/migrations/` bernomor lanjut dan **idempoten**;
> jangan pernah mengubah berkas migrasi yang sudah diterapkan.
