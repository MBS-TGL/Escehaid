import type { Metadata } from "next";
import { collectDiagnostics } from "@/lib/queries/diagnostics";
import DiagnosticsClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Diagnostik",
};

// Data berat (R2 usage) sudah di-cache unstable_cache 6 jam; GitHub status 5
// menit. Halaman sendiri dinamis agar titik merah langsung terlihat.
export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  const data = await collectDiagnostics();
  return <DiagnosticsClientPage data={data} />;
}
