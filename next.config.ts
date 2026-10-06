import type { NextConfig } from "next";
import { setDefaultResultOrder } from "node:dns";

// Jaringan lokal memakai DNS64/NAT64 → DNS mengembalikan alamat IPv6 lebih
// dulu, tetapi jalur IPv6 dari mesin ini ke Supabase/host lain sering putus
// (ECONNRESET — teruji 0/12 percobaan gagal vs 12/12 pakai IPv4). Akibatnya
// query server-side (getSchoolProfile, proxy.ts) gagal & login dipantulkan
// loop. Paksa IPv4 lebih dulu; bila IPv4 tak tersedia, IPv6 tetap jadi cadangan.
setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["192.168.2.106"],
  devIndicators: {
    position: "bottom-right",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Hasil optimizer di-cache 1 hari (default cuma 60 dtk) → kurangi
    // re-optimasi & egress. Aman: URL upload kini selalu ber-v= unik,
    // jadi gambar yang diganti selalu punya cache key baru.
    minimumCacheTTL: 86400,
    // Batasi kandidat lebar supaya tidak pernah minta 2560/3840px
    // (default Next sampai 3840 → boros byte & egress).
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  headers: async () => [
    {
      source: "/_next/static/(.*)",
      headers: [
        {
          key: "Cache-Control",
          // Prod: file chunk sudah content-hashed → immutable aman.
          // Dev: nama chunk tidak di-hash (app/layout.js), jadi immutable
          // bikin JS lama bertahan di browser → hydration mismatch saat
          // kode berubah. Dev selalu revalidasi (ETag).
          value:
            process.env.NODE_ENV === "production"
              ? "public, max-age=31536000, immutable"
              : "no-cache",
        },
      ],
    },
    {
      source: "/images/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default nextConfig;
