import type { Metadata } from "next";
import { getSqlMigrationStatuses } from "@/lib/queries/sql-status";
import SqlStatusClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Migrasi SQL",
};

// Status berubah hanya saat SQL dijalankan manual — tapi halaman ini justru
// untuk MEMERIKSA status terkini, jadi selalu dinamis.
export const dynamic = "force-dynamic";

export default async function SqlStatusPage() {
  const statuses = await getSqlMigrationStatuses();
  return <SqlStatusClientPage statuses={statuses} />;
}
