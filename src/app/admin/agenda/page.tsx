import type { Metadata } from "next";
import AgendaClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Agenda",
};

export default function AgendaPage() {
  return <AgendaClientPage />;
}
