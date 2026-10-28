import type { Metadata } from "next";
import RecoveryClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Pemulihan Kata Sandi",
  robots: { index: false, follow: false },
};

// Halaman ini hanya memproses token di browser — jangan di-prerender/cache.
export const dynamic = "force-dynamic";

export default function RecoveryPage() {
  return <RecoveryClientPage />;
}
