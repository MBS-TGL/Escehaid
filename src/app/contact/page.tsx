import type { Metadata } from "next";
import ContactForm from "./ContactForm";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";
import { ogImageOverride, pageOpenGraph } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kontak",
    description: "Hubungi SMP Muhammadiyah 4 Tanggul - Alamat, telepon, email, dan media sosial sekolah.",
    alternates: { canonical: "/contact" },
    openGraph: pageOpenGraph({
      title: "Kontak",
      description: "Hubungi SMP Muhammadiyah 4 Tanggul - Alamat, telepon, email, dan media sosial sekolah.",
      url: "/contact",
      image: await ogImageOverride(),
    }),
  };
}

export const revalidate = 3600;

export default async function KontakPage() {
  // Nilai kontak & media sosial diambil dari Pengaturan Situs; `revalidatePath`
  // dipanggil admin saat menyimpan sehingga ISR di halaman ini ikut disegarkan.
  const brand = toPublicBrand(await getSiteSettings());
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Beranda", item: "https://www.smpmuh4tanggul.sch.id" },
            { "@type": "ListItem", position: 2, name: "Kontak", item: "https://www.smpmuh4tanggul.sch.id/contact" },
          ],
        })
      }} />
      <ContactForm brand={brand} />
    </>
  );
}
