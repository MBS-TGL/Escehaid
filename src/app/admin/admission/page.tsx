import type { Metadata } from "next";
import AdmissionClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "SPMB",
};

export default function AdmissionPage() {
  return <AdmissionClientPage />;
}
