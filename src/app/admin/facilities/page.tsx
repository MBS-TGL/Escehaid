import type { Metadata } from "next";
import FacilitiesClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Fasilitas",
};

export default function FacilitiesPage() {
  return <FacilitiesClientPage />;
}
