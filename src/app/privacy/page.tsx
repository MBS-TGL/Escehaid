import type { Metadata } from "next";
import LegalArticle from "@/components/LegalArticle";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Bagaimana SMP Muhammadiyah 4 Tanggul mengumpulkan, menggunakan, dan melindungi data pengunjung serta pendaftar SPMB.",
  alternates: { canonical: "/privacy" },
};

export const revalidate = 86400;

export default async function PrivacyPage() {
  const brand = toPublicBrand(await getSiteSettings());
  const contact = brand.email
    ? brand.email
    : brand.whatsapp
      ? `WhatsApp ${brand.whatsapp}`
      : "kanal kontak di halaman /contact";
  return (
    <LegalArticle title="Kebijakan Privasi" updated="19 Oktober 2026">
      <h2>Pendahuluan</h2>
      <p>
        SMP Muhammadiyah 4 Tanggul (&quot;kami&quot;) menghormati privasi setiap pengunjung situs ini.
        Kebijakan ini menjelaskan data apa yang kami kumpulkan melalui situs, untuk apa data itu
        digunakan, dan bagaimana kami melindunginya.
      </p>

      <h2>Data yang kami kumpulkan</h2>
      <ul>
        <li>
          <strong>Formulir pesan/kontak:</strong> nama, email, nomor telepon, dan isi pesan yang Anda kirim.
        </li>
        <li>
          <strong>Pendaftaran SPMB (PPDB) online:</strong> data diri calon murid (nama, NISN, tanggal
          lahir, sekolah asal), data orang tua/wali, jalur pilihan, serta berkas pendukung yang diunggah
          (kartu keluarga, akta kelahiran, pas foto, dan dokumen persyaratan lainnya).
        </li>
        <li>
          <strong>Data teknis:</strong> informasi perangkat/peramban serta statistik kunjungan
          (melalui Google Analytics) yang tidak mengidentifikasi Anda secara pribadi.
        </li>
      </ul>

      <h2>Penggunaan data</h2>
      <ul>
        <li>Memproses pendaftaran SPMB dan memverifikasi berkas yang diunggah.</li>
        <li>Menghubungi Anda terkait pesan, pendaftaran, atau informasi sekolah.</li>
        <li>Meningkatkan isi dan kualitas layanan situs secara umum.</li>
      </ul>
      <p>Data Anda <strong>tidak</strong> dijual atau dibagikan untuk kepentingan komersial pihak lain.</p>

      <h2>Akses dan penyimpanan data</h2>
      <p>
        Data pesan dan pendaftaran hanya dapat diakses oleh admin/panitia yang berwenang melalui sistem
        dengan kontrol akses berjenjang. Situs ini menggunakan layanan pihak ketiga (mis. Supabase untuk
        basis data dan penyimpanan berkas, Vercel untuk hosting, Cloudflare untuk jaringan) yang
        menerapkan standar keamanan industri.
      </p>

      <h2>Keamanan</h2>
      <p>
        Kami menerapkan pengaturan keamanan bawaan penyedia layanan (kebijakan akses tingkat baris,
        HTTPS, pembatasan hak akses berkas). Berkas pendaftaran SPMB bersifat privat dan tidak dapat
        diakses publik — unduhannya memakai tautan berbatas waktu yang hanya dikirimkan kepada pihak
        yang berhak.
      </p>

      <h2>Retensi data</h2>
      <p>
        Data pendaftar disimpan selama proses penerimaan berlangsung dan masa arsip yang diperlukan
        administrasi sekolah. Anda dapat meminta penghapusan data pendaftaran Anda setelah proses selesai.
      </p>

      <h2>Hak Anda</h2>
      <p>
        Anda berhak meminta salinan, perbaikan, atau penghapusan data pribadi yang kami simpan.
        Hubungi kami melalui {contact}.
      </p>

      <h2>Perubahan kebijakan</h2>
      <p>
        Kebijakan ini dapat diperbarui sewaktu-waktu; versi terbaru selalu tersedia di halaman ini
        dengan tanggal pembaruan di bagian atas.
      </p>
    </LegalArticle>
  );
}
