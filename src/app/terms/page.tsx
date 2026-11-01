import type { Metadata } from "next";
import { FileText } from "@/components/Icons";
import LegalArticle from "@/components/LegalArticle";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";
import { DEFAULT_LEGAL_UPDATED, DEFAULT_TERMS_BODY } from "@/lib/settings/legal-defaults";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";

const DESCRIPTION =
  "Ketentuan penggunaan situs resmi SMP Muhammadiyah 4 Tanggul, termasuk layanan informasi dan pendaftaran SPMB online.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Syarat dan Ketentuan",
    description: DESCRIPTION,
    alternates: { canonical: "/terms" },
    openGraph: pageOpenGraph({
      title: "Syarat dan Ketentuan",
      description: DESCRIPTION,
      url: "/terms",
      image: await ogImageOverride(),
    }),
  };
}

export const revalidate = 86400;

export default async function TermsPage() {
  // Naskah selalu terisi: override admin → default registry (naskah bawaan di
  // legal-defaults.ts). Admin menyimpan → revalidatePath("/terms") sehingga
  // ISR ikut disegarkan. Tidak ada halaman kosong.
  const settings = await getSiteSettings();
  const brand = toPublicBrand(settings);
  const body = (settings.values.legal_terms_body || "").trim() || DEFAULT_TERMS_BODY;
  const updated = (settings.values.legal_terms_updated || "").trim() || DEFAULT_LEGAL_UPDATED;

  return (
    <LegalArticle
      title="Syarat dan Ketentuan"
      description={DESCRIPTION}
      updated={updated}
      path="/terms"
      icon={FileText}
      audience="Berlaku untuk seluruh pengguna situs"
      highlights={[
        { title: "Gunakan dengan jujur", text: "Dilarang mengirim data palsu atau mengunggah berkas yang bukan milik Anda." },
        { title: "Data pendaftar harus benar", text: "Kebenaran data dan kelengkapan berkas menjadi tanggung jawab pendaftar." },
        { title: "Bukan jaminan diterima", text: "Seleksi mengikuti ketentuan jalur dan pengumuman resmi panitia." },
      ]}
      sections={[]}
      brand={brand}
      related={{ href: "/privacy", label: "Kebijakan Privasi" }}
      customBody={body}
    />
  );
}
