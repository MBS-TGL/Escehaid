import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import PublicShell from "@/components/PublicShell";
import { getSchoolProfile } from "@/lib/queries";

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

// Judul dinamis dari database: default = nama sekolah, halaman lain otomatis
// "Judul Halaman | Nama Sekolah" via template. getSchoolProfile sudah di-wrap
// `cache` React — query yang sama dengan RootLayout pada request yang sama.
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSchoolProfile();
  const schoolName = profile?.school_name?.trim() || null;

  return {
    metadataBase: new URL("https://www.smpmuh4tanggul.sch.id"),
    // Profil null/kosong → tanpa template; tiap halaman pakai judulnya sendiri.
    title: schoolName
      ? { default: schoolName, template: `%s | ${schoolName}` }
      : undefined,
    description: "SMP Muhammadiyah 4 Tanggul - Sekolah unggulan dengan program Tahfidz, keberbakatan, dan kepesantrenan. Daftar SPMB online di sini.",
    openGraph: {
      type: "website",
      locale: "id_ID",
      // og:title mengikuti judul halaman (fallback Next.js) → ikut schoolName.
      siteName: schoolName ?? undefined,
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "SMP Muhammadiyah 4 Tanggul",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/og-image.jpg"],
    },
    icons: {
      icon: "/images/Logo-Favicon.png",
    },
    manifest: "/manifest.json",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Satu query profil per request — `cache` dari React membaginya dengan
  // halaman yang ikut memanggil getSchoolProfile() pada render yang sama.
  // Diteruskan ke PublicShell → Footer (kontak SPMB di footer).
  const profile = await getSchoolProfile();

  const schoolJsonLd = {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "School"],
    name: "SMP Muhammadiyah 4 Tanggul",
    alternateName: "MBS Tanggul",
    url: "https://www.smpmuh4tanggul.sch.id",
    logo: "https://www.smpmuh4tanggul.sch.id/images/Logo-Sekolah.png",
    image: "https://www.smpmuh4tanggul.sch.id/images/Logo-Sekolah.png",
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
      latitude: -8.1519069,
      longitude: 113.4547709,
    },
    telephone: "+6285806738160",
    email: "smpm4tangguljember@gmail.com",
    sameAs: [
      "https://instagram.com/mbstanggul",
      "https://youtube.com/@MBSTANGGUL",
      "https://facebook.com/mbs.tanggul",
    ],
    foundingDate: "2016",
    motto: "Pusat Kaderisasi Da'i & Ulama Hafidz",
    schoolType: "Sekolah Menengah Pertama (SMP)",
    educationalLevel: "Sekolah Menengah Pertama",
    curriculum: "Kurikulum Merdeka",
    numberOfStudents: {
      "@type": "QuantitativeValue",
      value: 164,
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
    url: "https://www.smpmuh4tanggul.sch.id",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.smpmuh4tanggul.sch.id/news?search={search_term_string}",
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
          <PublicShell profile={profile}>{children}</PublicShell>
        </ToastProvider>
      </body>
    </html>
  );
}
