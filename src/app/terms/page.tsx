import type { Metadata } from "next";
import { FileText } from "@/components/Icons";
import LegalArticle, { type LegalSection } from "@/components/LegalArticle";
import { Callout } from "@/components/LegalParts";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";

const DESCRIPTION =
  "Ketentuan penggunaan situs resmi SMP Muhammadiyah 4 Tanggul, termasuk layanan informasi dan pendaftaran SPMB online.";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan",
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
};

export const revalidate = 86400;

const sections: LegalSection[] = [
  {
    id: "penerimaan",
    title: "Penerimaan ketentuan",
    content: (
      <p>
        Dengan mengakses situs ini, Anda menyetujui syarat dan ketentuan berikut. Jika Anda tidak
        menyetujuinya, mohon berhenti menggunakan situs ini.
      </p>
    ),
  },
  {
    id: "penggunaan-situs",
    title: "Penggunaan situs",
    content: (
      <ul>
        <li>Situs ini disediakan untuk informasi resmi dan layanan pendaftaran siswa baru.</li>
        <li>
          Anda dilarang memanipulasi atau mengganggu ketersediaan situs, mengirim data palsu melalui
          formulir, atau mengunggah berkas yang bukan dokumentasi resmi Anda.
        </li>
        <li>Pengambilan data secara otomatis dalam jumlah besar (scraping) tanpa izin tidak diizinkan.</li>
      </ul>
    ),
  },
  {
    id: "pendaftaran-spmb",
    title: "Pendaftaran SPMB online",
    content: (
      <>
        <ul>
          <li>
            Informasi jadwal, persyaratan, dan status pendaftaran yang ditampilkan di situs hanya untuk
            kemudahan proses; ketentuan resmi mengikuti pengumuman resmi sekolah/panitia.
          </li>
          <li>
            Kebenaran data dan kelengkapan berkas menjadi tanggung jawab pendaftar. Kesalahan data dapat
            berdampak pada proses verifikasi.
          </li>
        </ul>
        <Callout tone="warning">
          Pendaftaran melalui situs bukanlah jaminan diterima; seleksi mengikuti ketentuan jalur yang
          dipilih.
        </Callout>
      </>
    ),
  },
  {
    id: "kekayaan-intelektual",
    title: "Hak kekayaan intelektual",
    content: (
      <p>
        Logo, foto, artikel, dan materi lain pada situs ini adalah milik SMP Muhammadiyah 4 Tanggul
        kecuali dinyatakan lain. Kutipan untuk keperluan berita/edukasi diperbolehkan dengan
        mencantumkan atribusi dan tautan ke sumber.
      </p>
    ),
  },
  {
    id: "tautan-pihak-ketiga",
    title: "Tautan pihak ketiga",
    content: (
      <p>
        Situs ini memuat tautan ke layanan pihak ketiga (mis. Google Maps, WhatsApp, media sosial).
        Kami tidak bertanggung jawab atas isi dan kebijakan situs-situs tersebut.
      </p>
    ),
  },
  {
    id: "batasan-tanggung-jawab",
    title: "Batasan tanggung jawab",
    content: (
      <p>
        Kami berupaya menjaga keakuratan dan ketersediaan situs, namun situs disediakan
        &quot;sebagaimana adanya&quot; tanpa jaminan bahwa layanan bebas gangguan sepenuhnya.
      </p>
    ),
  },
  {
    id: "perubahan",
    title: "Perubahan ketentuan",
    content: (
      <p>
        Ketentuan ini dapat diperbarui sewaktu-waktu; versi terbaru selalu tersedia di halaman ini
        dengan tanggal pembaruan di bagian atas.
      </p>
    ),
  },
];

export default async function TermsPage() {
  const brand = toPublicBrand(await getSiteSettings());
  return (
    <LegalArticle
      title="Syarat dan Ketentuan"
      description={DESCRIPTION}
      updated="19 Oktober 2026"
      path="/terms"
      icon={FileText}
      audience="Berlaku untuk seluruh pengguna situs"
      highlights={[
        { title: "Gunakan dengan jujur", text: "Dilarang mengirim data palsu atau mengunggah berkas yang bukan milik Anda." },
        { title: "Data pendaftar harus benar", text: "Kebenaran data dan kelengkapan berkas menjadi tanggung jawab pendaftar." },
        { title: "Bukan jaminan diterima", text: "Seleksi mengikuti ketentuan jalur dan pengumuman resmi panitia." },
      ]}
      sections={sections}
      brand={brand}
      related={{ href: "/privacy", label: "Kebijakan Privasi" }}
    />
  );
}