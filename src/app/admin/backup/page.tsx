import type { Metadata } from "next";
import { getBackupManifest } from "@/lib/queries/backup";
import BackupClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Cadangan",
};

// Status backup berubah maksimal sekali sehari (cron 02:30 WIB) — ISR sehari
// cukup; tombol "Backup sekarang" tidak butuh refresh halaman.
export const revalidate = 3600;

export default async function BackupPage() {
  const manifest = await getBackupManifest();
  return <BackupClientPage manifest={manifest} />;
}
