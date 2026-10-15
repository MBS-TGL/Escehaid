import type { Metadata } from "next";
import ContactClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Pesan",
};

export default function ContactPage() {
  return <ContactClientPage />;
}
