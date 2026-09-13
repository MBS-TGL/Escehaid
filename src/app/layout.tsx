import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#082b59",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://smpmuh4tanggul.web.id"),
  title: {
    template: "%s | SMP Muhammadiyah 4 Tanggul",
    default: "SMP Muhammadiyah 4 Tanggul",
  },
  description: "SMP Muhammadiyah 4 Tanggul - Sekolah unggulan dengan program Tahfidz, keberbakatan, dan kepesantrenan. Daftar SPMB online di sini.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "SMP Muhammadiyah 4 Tanggul",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SMP Muhammadiyah 4 Tanggul",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
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
