import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import PublicShell from "@/components/PublicShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getSiteSettings, toPublicBrand } from "@/lib/settings";
import { DEFAULT_THEME } from "@/lib/settings/theme";
import { getSchoolProfile } from "@/lib/queries/profile";

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

/** URL aman: bila admin mengisi nilai tidak beraba, jatuh ke default. */
function safeUrl(raw: string, fallback: string): URL {
  try {
    return new URL(raw);
  } catch {
    return new URL(fallback);
  }
}

// getSiteSettings sudah di-`cache` per request React, sehingga generateMetadata,
// generateViewport, dan RootLayout berbagi SATU pembacaan (dan satu query
// school_profile di dalamnya).
export async function generateViewport(): Promise<Viewport> {
  const settings = await getSiteSettings();
  return {
    themeColor: settings.theme.primary,
    viewportFit: "cover",
  };
}

// Judul dinamis dari Pengaturan Situs: default = nama situs, halaman lain
// otomatis "Judul Halaman | Nama Situs" via template.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const schoolName = settings.values.site_name.trim() || null;
  const siteUrl = safeUrl(settings.values.site_url, "https://www.smpmuh4tanggul.sch.id");
  const ogImage = settings.values.seo_og_image.trim() || "/og-image.jpg";
  const keywords = settings.values.seo_keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return {
    metadataBase: siteUrl,
    // Profil null/kosong → tanpa template; tiap halaman pakai judulnya sendiri.
    title: schoolName
      ? { default: schoolName, template: `%s | ${schoolName}` }
      : undefined,
    description: settings.values.seo_description,
    keywords: keywords.length > 0 ? keywords : undefined,
    openGraph: {
      type: "website",
      locale: "id_ID",
      // og:title mengikuti judul halaman (fallback Next.js) → ikut schoolName.
      siteName: schoolName ?? undefined,
      url: siteUrl,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: schoolName ?? "SMP Muhammadiyah 4 Tanggul",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: schoolName ?? "SMP Muhammadiyah 4 Tanggul",
    },
    icons: {
      icon: [{ url: "/images/Logo-Favicon.png", sizes: "192x192", type: "image/png" }],
      apple: "/images/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Dibagi dengan pembacaan di dalam getSiteSettings (React `cache`) — tetap
  // satu query profil per request. Diteruskan ke PublicShell → Footer
  // (nomor WhatsApp panitia SPMB di footer).
  const [settings, profile] = await Promise.all([getSiteSettings(), getSchoolProfile()]);
  const { values, theme } = settings;

  const schoolName = values.site_name.trim() || "SMP Muhammadiyah 4 Tanggul";
  const siteUrl = safeUrl(values.site_url, "https://www.smpmuh4tanggul.sch.id").origin;
  const logoUrl = values.site_logo_url.trim() || "/images/Logo-Sekolah.png";
  const absoluteLogo = logoUrl.startsWith("/") ? `${siteUrl}${logoUrl}` : logoUrl;

  const socialSameAs = [
    values.social_instagram,
    values.social_youtube,
    values.social_facebook,
    values.social_tiktok,
    values.social_x,
  ].filter((url) => /^https?:\/\//.test(url));

  const schoolJsonLd = {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "School"],
    name: schoolName,
    alternateName: values.site_short_name,
    url: siteUrl,
    logo: absoluteLogo,
    image: absoluteLogo,
    description: values.seo_description,
    address: {
      "@type": "PostalAddress",
      streetAddress: values.contact_address,
      addressLocality: values.contact_city,
      addressRegion: values.contact_region,
      postalCode: values.contact_postal_code,
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -8.1519069,
      longitude: 113.4547709,
    },
    telephone: values.contact_phone,
    email: values.contact_email,
    sameAs: socialSameAs,
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
      telephone: values.contact_phone,
      contactType: "admissions",
      availableLanguage: ["id"],
    },
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: schoolName,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
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
        {/* Warna merek dari Pengaturan Situs. Di-render di server (SSR) sehingga
            tidak ada kilatan warna default saat halaman dibuka. Menimpa nilai
            fallback di globals.css karena ditempatkan SETELAH stylesheet.

            Perhentian gradien (--brand-primary-mid/light) hanya ditulis bila
            admin memilih warna kustom, agar tampilan bawaan tetap persis
            seperti sebelumnya. */}
        <style
          id="brand-theme"
          dangerouslySetInnerHTML={{
            __html: `:root{--brand-primary:${theme.primary};--brand-accent:${theme.accent};--brand-highlight:${theme.highlight};${
              theme.primary === DEFAULT_THEME.primary
                ? ""
                : `--brand-primary-mid:color-mix(in oklab,${theme.primary} 82%,white);--brand-primary-light:color-mix(in oklab,${theme.primary} 62%,white);`
            }}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://*.supabase.co" />
        {/* Feed RSS (dilayani /rss.xml) — langsung di <head> root layout agar
            tetap ada di semua halaman meski halaman menimpa `alternates`
            metadata miliknya (shallow merge metadata Next.js). */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={schoolName}
          href="/rss.xml"
        />
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
          <PublicShell profile={profile} brand={toPublicBrand(settings)}>
            {children}
          </PublicShell>
        </ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
