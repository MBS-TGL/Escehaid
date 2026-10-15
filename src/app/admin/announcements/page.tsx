import type { Metadata } from "next";
import AnnouncementsClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Pengumuman",
};

export default function AnnouncementsPage() {
  return <AnnouncementsClientPage />;
}
