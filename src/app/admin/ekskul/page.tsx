import type { Metadata } from "next";
import EkskulClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Ekstrakurikuler",
};

export default function EkskulPage() {
  return <EkskulClientPage />;
}
