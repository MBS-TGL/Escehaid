import type { Metadata } from "next";
import UsersClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Pengguna",
};

export default function UsersPage() {
  return <UsersClientPage />;
}
