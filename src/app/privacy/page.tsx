import type { Metadata } from "next";
import { ShieldCheck } from "@/components/Icons";
import LegalArticle from "@/components/LegalArticle";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";
import { DEFAULT_LEGAL_UPDATED, DEFAULT_PRIVACY_BODY } from "@/lib/settings/legal-defaults";
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

export default async function PrivacyPage() {
  // Naskah selalu terisi: override admin → default registry (naskah bawaan di
  // legal-defaults.ts). Admin menyimpan → revalidatePath("/privacy") sehingga
  // ISR ikut disegarkan. Tidak ada halaman kosong.
  const settings = await getSiteSettings();
  const brand = toPublicBrand(settings);
  const body = (settings.values.legal_privacy_body || "").trim() || DEFAULT_PRIVACY_BODY;
  const updated = (settings.values.legal_privacy_updated || "").trim() || DEFAULT_LEGAL_UPDATED;

  return (
    <LegalArticle
      title="Kebijakan Privasi"
      description={DESCRIPTION}
      updated={updated}
      path="/privacy"
      icon={ShieldCheck}
      audience="Berlaku untuk pengunjung & pendaftar SPMB"
      highlights={[
        { title: "Data tidak dijual", text: "Tidak dibagikan untuk kepentingan komersial pihak lain." },
        { title: "Berkas SPMB bersifat privat", text: "Hanya dapat diunduh lewat tautan berbatas waktu oleh pihak berwenang." },
        { title: "Anda berhak meminta hapus", text: "Salinan, perbaikan, atau penghapusan data dapat diajukan kapan saja." },
      ]}
      sections={[]}
      brand={brand}
      related={{ href: "/terms", label: "Syarat dan Ketentuan" }}
      customBody={body}
    />
  );
}
