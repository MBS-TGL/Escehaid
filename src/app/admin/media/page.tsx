import type { Metadata } from "next";
import MediaClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Media",
};

export default function MediaPage() {
  return <MediaClientPage />;
}
