import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Hubungi SMP Muhammadiyah 4 Tanggul - Alamat, telepon, email, dan media sosial sekolah.",
};

export default function KontakPage() {
  return <ContactForm />;
}
