/**
 * Daftar FAQ — SATU sumber kebenaran untuk:
 * - JSON-LD FAQPage di beranda (page.tsx)
 * - komponen FAQ terlihat (FAQ.tsx)
 *
 * Google mewajibkan isi JSON-LLD FAQ identik dengan teks yang terlihat di
 * halaman, jadi keduanya wajib impor dari sini — jangan duplikasi lagi.
 */
export const faqs: { q: string; a: string }[] = [
  {
    q: "Bagaimana cara mendaftarkan anak ke SMP Muhammadiyah 4 Tanggul?",
    a: "Pendaftaran dapat dilakukan secara online melalui halaman SPMB kami. Isi data calon peserta didik, lengkapi dokumen yang diperlukan, dan ikuti tahapan seleksi yang akan diinformasikan oleh panitia.",
  },
  {
    q: "Apa saja program unggulan yang tersedia?",
    a: "Kami memiliki 6 program unggulan: Program Tahfidz, Program Keberbakatan, Program Bahasa, Program Kepesantrenan, Program Akademik, dan 7 Golden Habits.",
  },
  {
    q: "Berapa biaya masuk dan SPP per bulan?",
    a: "Rincian biaya pendidikan, boarding, dan kegiatan tersedia pada brosur resmi sekolah di halaman SPMB. Untuk rincian terbaru, silakan hubungi panitia SPMB. Kami juga menyediakan beasiswa bagi siswa berprestasi.",
  },
  {
    q: "Apakah tersedia fasilitas asrama?",
    a: "Ya, kami menyediakan fasilitas asrama yang nyaman dan aman bagi siswa program Boarding School. Asrama dilengkapi dengan fasilitas penunjang pembelajaran dan pembiasaan ibadah.",
  },
  {
    q: "Bagaimana dengan kurikulum yang diterapkan?",
    a: "Kami menggunakan Kurikulum Merdeka yang dipadukan dengan ISMUBA (Al-Islam, Kemuhammadiyahan, dan Bahasa Arab) sebagai kurikulum khas Muhammadiyah. Pembelajaran terintegrasi antara sains, teknologi, dan nilai-nilai keislaman.",
  },
  {
    q: "Apakah ada kegiatan ekstrakurikuler?",
    a: "Tentu! Kami menyediakan berbagai kegiatan ekstrakurikuler seperti Sepak Bola, Futsal, Bulu Tangkis, Hizbul Wathan, Qiroah, dan masih banyak lagi untuk mengembangkan bakat siswa.",
  },
];

/**
 * FAQ khusus halaman SPMB (/admission). Sumber tunggal agar tidak ada jawaban
 * ganda antara beranda dan halaman SPMB. Semua jawaban wajib dari fakta yang
 * sudah ada (alur, jalur, program, kontak) — jangan mengarang.
 */
export const spmbFaqs: { q: string; a: string }[] = [
  {
    q: "Bagaimana cara mendaftar SPMB secara online?",
    a: "Pilih gelombang yang sedang dibuka pada jadwal, lalu isi formulir pendaftaran online. Hasil penerimaan diumumkan melalui website sekolah, dan calon murid yang diterima melakukan daftar ulang sesuai jadwal pada pengumuman.",
  },
  {
    q: "Apa saja jalur pendaftaran yang tersedia?",
    a: "Tersedia tiga jalur: Jalur Reguler yang terbuka untuk semua calon murid, Jalur Prestasi untuk calon murid berprestasi akademik maupun non-akademik, dan Jalur Beasiswa untuk calon murid dari keluarga dengan keterbatasan ekonomi.",
  },
  {
    q: "Program pendidikan apa saja yang ditawarkan?",
    a: "SMP Boarding (asrama penuh sejak 2018/2019), SMP Reguler (pembelajaran penuh hari Senin-Sabtu pukul 07.00-15.00), dan SMA Boarding (asrama penuh jenjang SMA dengan kurikulum Tahfidz dan keunggulan akademik).",
  },
  {
    q: "Bagaimana cara mengecek status dan hasil seleksi?",
    a: 'Buka tautan "Cek status pendaftaran & hasil seleksi" pada bagian jadwal untuk memeriksa status pendaftaran dan hasil seleksi secara online.',
  },
  // TODO: isi dari panitia — nominal total biaya belum tersedia di repo
  {
    q: "Berapa total biaya pendidikan yang harus dibayarkan?",
    a: "Rincian biaya pendidikan, boarding, dan kegiatan tersedia pada brosur resmi sekolah (tautan pada bagian Jadwal Pendaftaran). Untuk rincian terbaru, silakan hubungi panitia SPMB.",
  },
  // TODO: isi dari panitia
  {
    q: "Dokumen apa saja yang perlu disiapkan?",
    a: "Daftar berkas persyaratan akan diinformasikan oleh panitia SPMB. Silakan hubungi panitia untuk informasi lengkapnya.",
  },
  {
    q: "Bagaimana cara menghubungi panitia SPMB?",
    a: "Hubungi panitia SPMB melalui WhatsApp atau halaman Kontak. Formulir offline dapat dikumpulkan di Kantor MBS Tanggul.",
  },
];
