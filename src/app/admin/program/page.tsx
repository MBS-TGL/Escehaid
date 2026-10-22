import type { Metadata } from "next";
import ProgramClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Program",
};

export default function ProgramAdminPage() {
  return <ProgramClientPage />;
}
