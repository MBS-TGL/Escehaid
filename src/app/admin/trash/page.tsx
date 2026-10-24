import type { Metadata } from "next";
import TrashClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Sampah",
};

// Daftar sampah berubah tiap ada hapus/pulihkan — dinamis.
export const dynamic = "force-dynamic";

export default function TrashPage() {
  return <TrashClientPage />;
}
