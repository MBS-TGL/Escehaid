import type { Metadata } from "next";
import NotificationsClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Notifikasi",
};

export default function NotificationsPage() {
  return <NotificationsClientPage />;
}
