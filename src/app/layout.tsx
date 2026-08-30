import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import PublicShell from "@/components/PublicShell";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SMP Muhammadiyah 4 Tanggul | SIS",
  description: "Sistem Informasi Sekolah SMP Muhammadiyah 4 Tanggul - SPMB Online, Berita, Gallery, dan Informasi Sekolah",
  icons: {
    icon: "/images/Logo-Favicon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <ToastProvider>
          <PublicShell>{children}</PublicShell>
        </ToastProvider>
      </body>
    </html>
  );
}
