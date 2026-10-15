import type { Metadata } from "next";
import ForbiddenClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Akses Ditolak",
};

export default function ForbiddenPage() {
  return <ForbiddenClientPage />;
}
