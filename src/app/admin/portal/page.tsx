import type { Metadata } from "next";
import PortalClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Portal",
};

export default function PortalPage() {
  return <PortalClientPage />;
}
