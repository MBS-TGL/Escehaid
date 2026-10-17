import type { Metadata } from "next";
import DownloadsClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Unduhan",
};

export default function DownloadsAdminPage() {
  return <DownloadsClientPage />;
}
