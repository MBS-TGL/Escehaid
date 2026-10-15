import type { Metadata } from "next";
import NewsClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Berita",
};

export default function NewsPage() {
  return <NewsClientPage />;
}
