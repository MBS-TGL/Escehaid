import type { Metadata } from "next";
import GalleryClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Galeri",
};

export default function GalleryPage() {
  return <GalleryClientPage />;
}
