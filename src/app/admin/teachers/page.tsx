import type { Metadata } from "next";
import TeachersClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Guru",
};

export default function TeachersPage() {
  return <TeachersClientPage />;
}
