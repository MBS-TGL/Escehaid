import type { Metadata } from "next";
import ActivitiesClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Kegiatan",
};

export default function ActivitiesPage() {
  return <ActivitiesClientPage />;
}
