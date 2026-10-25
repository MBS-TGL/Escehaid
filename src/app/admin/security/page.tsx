import type { Metadata } from "next";
import SecurityClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Pengaturan Akun",
};

// Status faktor & AAL dibaca client-side (butuh sesi browser).
export default function SecurityPage() {
  return <SecurityClientPage />;
}
