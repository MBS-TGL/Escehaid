import type { Metadata } from "next";
import ArticlesClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Artikel",
};

export default function ArticlesPage() {
  return <ArticlesClientPage />;
}
