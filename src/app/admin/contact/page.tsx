import type { Metadata } from "next";
import ContactClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Pesan Masuk",
  description: "Kelola pesan masuk dari formulir kontak website.",
};

export default function ContactPage() {
  return <ContactClientPage />;
}
