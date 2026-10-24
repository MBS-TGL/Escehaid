import type { Metadata } from "next";
import { ShieldCheck } from "@/components/Icons";
import LegalArticle, { type LegalSection } from "@/components/LegalArticle";
import { Callout } from "@/components/LegalParts";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";

const DESCRIPTION =
  "Bagaimana SMP Muhammadiyah 4 Tanggul mengumpulkan, menggunakan, dan melindungi data pengunjung serta pendaftar SPMB.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kebijakan Privasi",
    description: DESCRIPTION,
    alternates: { canonical: "/privacy" },
    openGraph: pageOpenGraph({
      title: "Kebijakan Privasi",
      description: DESCRIPTION,
      url: "/privacy",
      image: await ogImageOverride(),
    }),
  };
}

export const revalidate = 86400;

const TH = "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
const TD = "px-4 py-3 align-top text-sm leading-relaxed text-slate-600";

export default async function PrivacyPage() {
  // Kontak diambil dari Pengaturan Situs; `revalidatePath` dipanggil admin saat
  // menyimpan sehingga ISR di halaman ini ikut disegarkan.
  const brand = toPublicBrand(await getSiteSettings());
  const contact = brand.email
    ? brand.email
    : brand.whatsapp
      ? `WhatsApp ${brand.whatsapp}`
      : "kanal kontak di halaman /contact";

  const sections: LegalSection[] = [
    {
      id: "pendahuluan",
      title: "Pendahuluan",
      content: (
        <p>
          SMP Muhammadiyah 4 Tanggul (&quot;kami&quot;) menghormati privasi setiap pengunjung situs ini.
          Kebijakan ini menjelaskan data apa yang kami kumpulkan melalui situs, untuk apa data itu
          digunakan, dan bagaimana kami melindunginya.
        </p>
      ),
    },
    {
      id: "data-dikumpulkan",
      title: "Data yang kami kumpulkan",
      content: (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[560px] border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className={TH}>Sumber</th>
                <th className={TH}>Data</th>
                <th className={TH}>Tujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className={`${TD} font-semibold text-slate-800`}>Formulir pesan/kontak</td>
                <td className={TD}>Nama, email, nomor telepon, dan isi pesan.</td>
                <td className={TD}>Membalas dan menindaklanjuti pesan Anda.</td>
              </tr>
              <tr>
                <td className={`${TD} font-semibold text-slate-800`}>Pendaftaran SPMB (PPDB) online</td>
                <td className={TD}>
                  Data calon murid (nama, NISN, tanggal lahir, sekolah asal), data orang tua/wali, jalur
                  pilihan, dan berkas (kartu keluarga, akta kelahiran, pas foto, dokumen persyaratan lain).
                </td>
                <td className={TD}>Memproses pendaftaran dan memverifikasi berkas.</td>
              </tr>
              <tr>
                <td className={`${TD} font-semibold text-slate-800`}>Data teknis</td>
                <td className={TD}>
                  Informasi perangkat/peramban dan statistik kunjungan (Google Analytics) yang tidak
                  mengidentifikasi Anda secara pribadi.
                </td>
                <td className={TD}>Meningkatkan isi dan kualitas layanan situs.</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: "penggunaan-data",
      title: "Penggunaan data",
      content: (
        <>
          <ul>
            <li>Memproses pendaftaran SPMB dan memverifikasi berkas yang diunggah.</li>
            <li>Menghubungi Anda terkait pesan, pendaftaran, atau informasi sekolah.</li>
            <li>Meningkatkan isi dan kualitas layanan situs secara umum.</li>
          </ul>
          <Callout tone="success">
            Data Anda <strong>tidak</strong> dijual atau dibagikan untuk kepentingan komersial pihak lain.
          </Callout>
        </>
      ),
    },
    {
      id: "akses-penyimpanan",
      title: "Akses dan penyimpanan data",
      content: (
        <p>
          Data pesan dan pendaftaran hanya dapat diakses oleh admin/panitia yang berwenang melalui sistem
          dengan kontrol akses berjenjang. Situs ini menggunakan layanan pihak ketiga (mis. Supabase untuk
          basis data dan penyimpanan berkas, Vercel untuk hosting, Cloudflare untuk jaringan) yang
          menerapkan standar keamanan industri.
        </p>
      ),
    },
    {
      id: "keamanan",
      title: "Keamanan",
      content: (
        <>
          <p>
            Kami menerapkan pengaturan keamanan bawaan penyedia layanan (kebijakan akses tingkat baris,
            HTTPS, pembatasan hak akses berkas).
          </p>
          <Callout>
            Berkas pendaftaran SPMB bersifat privat dan tidak dapat diakses publik — unduhannya memakai
            tautan berbatas waktu yang hanya dikirimkan kepada pihak yang berhak.
          </Callout>
        </>
      ),
    },
    {
      id: "retensi",
      title: "Retensi data",
      content: (
        <p>
          Data pendaftar disimpan selama proses penerimaan berlangsung dan masa arsip yang diperlukan
          administrasi sekolah. Anda dapat meminta penghapusan data pendaftaran Anda setelah proses selesai.
        </p>
      ),
    },
    {
      id: "hak-anda",
      title: "Hak Anda",
      content: (
        <p>
          Anda berhak meminta salinan, perbaikan, atau penghapusan data pribadi yang kami simpan.
          Hubungi kami melalui {contact}.
        </p>
      ),
    },
    {
      id: "perubahan",
      title: "Perubahan kebijakan",
      content: (
        <p>
          Kebijakan ini dapat diperbarui sewaktu-waktu; versi terbaru selalu tersedia di halaman ini
          dengan tanggal pembaruan di bagian atas.
        </p>
      ),
    },
  ];

  return (
    <LegalArticle
      title="Kebijakan Privasi"
      description={DESCRIPTION}
      updated="19 Oktober 2026"
      path="/privacy"
      icon={ShieldCheck}
      audience="Berlaku untuk pengunjung & pendaftar SPMB"
      highlights={[
        { title: "Data tidak dijual", text: "Tidak dibagikan untuk kepentingan komersial pihak lain." },
        { title: "Berkas SPMB bersifat privat", text: "Hanya dapat diunduh lewat tautan berbatas waktu oleh pihak berwenang." },
        { title: "Anda berhak meminta hapus", text: "Salinan, perbaikan, atau penghapusan data dapat diajukan kapan saja." },
      ]}
      sections={sections}
      brand={brand}
      related={{ href: "/terms", label: "Syarat dan Ketentuan" }}
    />
  );
}