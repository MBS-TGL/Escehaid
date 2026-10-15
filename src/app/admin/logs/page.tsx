import type { Metadata } from "next";
import LogsClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Log",
};

export default function LogsPage() {
  return <LogsClientPage />;
}
