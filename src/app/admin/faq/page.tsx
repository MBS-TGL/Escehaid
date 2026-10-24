import type { Metadata } from "next";
import FaqClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "FAQ",
};

export default function FaqPage() {
  return <FaqClientPage />;
}
