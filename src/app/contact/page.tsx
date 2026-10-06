import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Hubungi SMP Muhammadiyah 4 Tanggul - Alamat, telepon, email, dan media sosial sekolah.",
  alternates: { canonical: "/contact" },
};

export const revalidate = 3600;

export default function KontakPage() {
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
      <ContactForm />
    </>
  );
}
