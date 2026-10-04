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
    a: "Informasi lengkap mengenai biaya pendidikan dapat dilihat di halaman SPMB atau menghubungi bagian administrasi sekolah. Kami juga menyediakan beasiswa bagi siswa berprestasi.",
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
    a: "Tentu! Kami menyediakan berbagai kegiatan ekstrakurikuler seperti Sepak Bola, Futsal, Bulu Tangkis, Hizbul Wathan, Catur, Qiroah, dan masih banyak lagi untuk mengembangkan bakat siswa.",
  },
];
