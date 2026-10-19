import type { Metadata } from "next";
import LegalArticle from "@/components/LegalArticle";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan",
  description:
    "Ketentuan penggunaan situs resmi SMP Muhammadiyah 4 Tanggul, termasuk layanan informasi dan pendaftaran SPMB online.",
  alternates: { canonical: "/terms" },
};

export const revalidate = 86400;

export default function TermsPage() {
  return (
    <LegalArticle title="Syarat dan Ketentuan" updated="19 Oktober 2026">
      <h2>Penerimaan ketentuan</h2>
      <p>
        Dengan mengakses situs ini, Anda menyetujui syarat dan ketentuan berikut. Jika Anda tidak
        menyetujuinya, mohon berhenti menggunakan situs ini.
      </p>

      <h2>Penggunaan situs</h2>
      <ul>
        <li>Situs ini disediakan untuk informasi resmi dan layanan pendaftaran siswa baru.</li>
        <li>
          Anda dilarang memanipulasi atau mengganggu ketersediaan situs, mengirim data palsu melalui
          formulir, atau mengunggah berkas yang bukan dokumentasi resmi Anda.
        </li>
        <li>Pengambilan data secara otomatis dalam jumlah besar (scraping) tanpa izin tidak diizinkan.</li>
      </ul>

      <h2>Pendaftaran SPMB online</h2>
      <ul>
        <li>
          Informasi jadwal, persyaratan, dan status pendaftaran yang ditampilkan di situs hanya untuk
          kemudahan proses;           ketentuan resmi mengikuti pengumuman resmi sekolah/panitia.
        </li>
        <li>
          Kebenaran data dan kelengkapan berkas menjadi tanggung jawab pendaftar. Kesalahan data dapat
          berdampak pada proses verifikasi.
        </li>
        <li>
          Pendaftaran melalui situs bukanlah jaminan diterima; seleksi mengikuti ketentuan jalur
          yang dipilih.
        </li>
      </ul>

      <h2>Hak kekayaan intelektual</h2>
      <p>
        Logo, foto, artikel, dan materi lain pada situs ini adalah milik SMP Muhammadiyah 4 Tanggul
        kecuali dinyatakan lain. Kutipan untuk keperluan berita/edukasi diperbolehkan dengan
        mencantumkan atribusi dan tautan ke sumber.
      </p>

      <h2>Tautan pihak ketiga</h2>
      <p>
        Situs ini memuat tautan ke layanan pihak ketiga (mis. Google Maps, WhatsApp, media sosial).
        Kami tidak bertanggung jawab atas isi dan kebijakan situs-situs tersebut.
      </p>

      <h2>Batasan tanggung jawab</h2>
      <p>
        Kami berupaya menjaga keakuratan dan ketersediaan situs, namun situs disediakan
        &quot;sebagaimana adanya&quot; tanpa jaminan bahwa layanan bebas gangguan sepenuhnya.
      </p>

      <h2>Perubahan ketentuan</h2>
      <p>
        Ketentuan ini dapat diperbarui sewaktu-waktu; versi terbaru selalu tersedia di halaman ini
        dengan tanggal pembaruan di bagian atas.
      </p>
    </LegalArticle>
  );
}
