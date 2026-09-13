import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const schoolJsonLd = {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "School"],
    name: "SMP Muhammadiyah 4 Tanggul",
    alternateName: "MBS Tanggul",
    url: "https://smpmuh4tanggul.web.id",
    logo: "https://smpmuh4tanggul.web.id/images/Logo-Sekolah.png",
    image: "https://smpmuh4tanggul.web.id/images/Logo-Sekolah.png",
    description: "SMP Muhammadiyah 4 Tanggul - Sekolah unggulan dengan program Tahfidz, keberbakatan, dan kepesantrenan di Tanggul, Jember.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jl. Pemandian No. 88, Patemon",
      addressLocality: "Tanggul",
      addressRegion: "Jember",
      postalCode: "68155",
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -8.1515,
      longitude: 113.455,
    },
    telephone: "+6285806738160",
    email: "smpm4tangguljember@gmail.com",
    sameAs: [
      "https://instagram.com/mbstanggul",
      "https://youtube.com/@MBSTANGGUL",
      "https://facebook.com/mbs.tanggul",
    ],
    foundingDate: "2003",
    motto: "Pusat Kaderisasi Da'i & Ulama Hafidz",
    schoolType: "Sekolah Menengah Pertama (SMP)",
    educationalLevel: "Sekolah Menengah Pertama",
    curriculum: "Kurikulum Merdeka",
    numberOfStudents: {
      "@type": "QuantitativeValue",
      value: 300,
    },
    availableLanguage: ["id", "ar", "en"],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+6285806738160",
      contactType: "admissions",
      availableLanguage: ["id"],
    },
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SMP Muhammadiyah 4 Tanggul",
    url: "https://smpmuh4tanggul.web.id",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://smpmuh4tanggul.web.id/news?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang="id"
      className={`${jakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://*.supabase.co" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NGT480ZNWL"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-NGT480ZNWL');
          `}
        </Script>
        <ToastProvider>
          <PublicShell>{children}</PublicShell>
        </ToastProvider>
      </body>
    </html>
  );
}
