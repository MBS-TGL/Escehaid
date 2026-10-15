import type { Metadata } from "next";
import ChangePasswordClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Ganti Kata Sandi",
};

export default function ChangePasswordPage() {
  return <ChangePasswordClientPage />;
}
