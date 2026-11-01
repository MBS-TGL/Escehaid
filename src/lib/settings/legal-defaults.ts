/**
 * Naskah bawaan dokumen legal (HTML) — SATU sumber kebenaran untuk:
 *   1. `default` registry (`legal_privacy_body` / `legal_terms_body`) → tampil
 *      terisi di editor admin sebagai titik awal suntingan;
 *   2. halaman publik (selalu render nilai efektif = default ini bila admin
 *      belum menyimpan apa pun).
 *
 * Dipetakan dari JSX hardcoded lama (`privacy/page.tsx`, `terms/page.tsx`):
 *   - `<Callout>` → `<blockquote><p><strong>…` (lolos sanitize + gaya prose).
 *   - Tabel privacy → `<table>` polos (gaya prose-table RichContent).
 *   - Kontak dinamis ("Hubungi kami melalui …") diganti kalimat statis
 *     mengarah ke /contact, karena default registry tidak mengenal brand.
 */

export const DEFAULT_PRIVACY_BODY = `<h2>Pendahuluan</h2>
<p>SMP Muhammadiyah 4 Tanggul (&quot;kami&quot;) menghormati privasi setiap pengunjung situs ini. Kebijakan ini menjelaskan data apa yang kami kumpulkan melalui situs, untuk apa data itu digunakan, dan bagaimana kami melindunginya.</p>
<h2>Data yang kami kumpulkan</h2>
<table>
<thead>
<tr><th>Sumber</th><th>Data</th><th>Tujuan</th></tr>
</thead>
<tbody>
<tr><td><strong>Formulir pesan/kontak</strong></td><td>Nama, email, nomor telepon, dan isi pesan.</td><td>Membalas dan menindaklanjuti pesan Anda.</td></tr>
<tr><td><strong>Pendaftaran SPMB (PPDB) online</strong></td><td>Data calon murid (nama, NISN, tanggal lahir, sekolah asal), data orang tua/wali, jalur pilihan, dan berkas (kartu keluarga, akta kelahiran, pas foto, dokumen persyaratan lain).</td><td>Memproses pendaftaran dan memverifikasi berkas.</td></tr>
<tr><td><strong>Data teknis</strong></td><td>Informasi perangkat/peramban dan statistik kunjungan (Google Analytics) yang tidak mengidentifikasi Anda secara pribadi.</td><td>Meningkatkan isi dan kualitas layanan situs.</td></tr>
</tbody>
</table>
<h2>Penggunaan data</h2>
<ul>
<li>Memproses pendaftaran SPMB dan memverifikasi berkas yang diunggah.</li>
<li>Menghubungi Anda terkait pesan, pendaftaran, atau informasi sekolah.</li>
<li>Meningkatkan isi dan kualitas layanan situs secara umum.</li>
</ul>
<blockquote><p>Data Anda <strong>tidak</strong> dijual atau dibagikan untuk kepentingan komersial pihak lain.</p></blockquote>
<h2>Akses dan penyimpanan data</h2>
<p>Data pesan dan pendaftaran hanya dapat diakses oleh admin/panitia yang berwenang melalui sistem dengan kontrol akses berjenjang. Situs ini menggunakan layanan pihak ketiga (mis. Supabase untuk basis data dan penyimpanan berkas, Vercel untuk hosting, Cloudflare untuk jaringan) yang menerapkan standar keamanan industri.</p>
<h2>Keamanan</h2>
<p>Kami menerapkan pengaturan keamanan bawaan penyedia layanan (kebijakan akses tingkat baris, HTTPS, pembatasan hak akses berkas).</p>
<blockquote><p>Berkas pendaftaran SPMB bersifat privat dan tidak dapat diakses publik — unduhannya memakai tautan berbatas waktu yang hanya dikirimkan kepada pihak yang berhak.</p></blockquote>
<h2>Retensi data</h2>
<p>Data pendaftar disimpan selama proses penerimaan berlangsung dan masa arsip yang diperlukan administrasi sekolah. Anda dapat meminta penghapusan data pendaftaran Anda setelah proses selesai.</p>
<h2>Hak Anda</h2>
<p>Anda berhak meminta salinan, perbaikan, atau penghapusan data pribadi yang kami simpan. Hubungi kami melalui halaman kontak.</p>
<h2>Perubahan kebijakan</h2>
<p>Kebijakan ini dapat diperbarui sewaktu-waktu; versi terbaru selalu tersedia di halaman ini dengan tanggal pembaruan di bagian atas.</p>`;

export const DEFAULT_TERMS_BODY = `<h2>Penerimaan ketentuan</h2>
<p>Dengan mengakses situs ini, Anda menyetujui syarat dan ketentuan berikut. Jika Anda tidak menyetujuinya, mohon berhenti menggunakan situs ini.</p>
<h2>Penggunaan situs</h2>
<ul>
<li>Situs ini disediakan untuk informasi resmi dan layanan pendaftaran siswa baru.</li>
<li>Anda dilarang memanipulasi atau mengganggu ketersediaan situs, mengirim data palsu melalui formulir, atau mengunggah berkas yang bukan dokumentasi resmi Anda.</li>
<li>Pengambilan data secara otomatis dalam jumlah besar (scraping) tanpa izin tidak diizinkan.</li>
</ul>
<h2>Pendaftaran SPMB online</h2>
<ul>
<li>Informasi jadwal, persyaratan, dan status pendaftaran yang ditampilkan di situs hanya untuk kemudahan proses; ketentuan resmi mengikuti pengumuman resmi sekolah/panitia.</li>
<li>Kebenaran data dan kelengkapan berkas menjadi tanggung jawab pendaftar. Kesalahan data dapat berdampak pada proses verifikasi.</li>
</ul>
<blockquote><p>Pendaftaran melalui situs bukanlah jaminan diterima; seleksi mengikuti ketentuan jalur yang dipilih.</p></blockquote>
<h2>Hak kekayaan intelektual</h2>
<p>Logo, foto, artikel, dan materi lain pada situs ini adalah milik SMP Muhammadiyah 4 Tanggul kecuali dinyatakan lain. Kutipan untuk keperluan berita/edukasi diperbolehkan dengan mencantumkan atribusi dan tautan ke sumber.</p>
<h2>Tautan pihak ketiga</h2>
<p>Situs ini memuat tautan ke layanan pihak ketiga (mis. Google Maps, WhatsApp, media sosial). Kami tidak bertanggung jawab atas isi dan kebijakan situs-situs tersebut.</p>
<h2>Batasan tanggung jawab</h2>
<p>Kami berupaya menjaga keakuratan dan ketersediaan situs, namun situs disediakan &quot;sebagaimana adanya&quot; tanpa jaminan bahwa layanan bebas gangguan sepenuhnya.</p>
<h2>Perubahan ketentuan</h2>
<p>Ketentuan ini dapat diperbarui sewaktu-waktu; versi terbaru selalu tersedia di halaman ini dengan tanggal pembaruan di bagian atas.</p>`;

export const DEFAULT_LEGAL_UPDATED = "19 Oktober 2026";
