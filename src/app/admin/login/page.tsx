import type { Metadata } from "next";
import LoginClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return <LoginClientPage />;
}
