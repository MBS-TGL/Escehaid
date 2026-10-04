import type { Metadata } from "next";
import DashboardLayout from "./DashboardLayout";

export const metadata: Metadata = {
  // Template root layout menambahkan "| Nama Sekolah" otomatis.
  title: "Admin Panel",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
