import type { NextConfig } from "next";
import { setDefaultResultOrder } from "node:dns";
// v11: withSentryConfig pindah ke subpath /config (bukan root export).
import { withSentryConfig } from "@sentry/nextjs/config";

// Jaringan lokal memakai DNS64/NAT64 → DNS mengembalikan alamat IPv6 lebih
// dulu, tetapi jalur IPv6 dari mesin ini ke Supabase/host lain sering putus
// (ECONNRESET — teruji 0/12 percobaan gagal vs 12/12 pakai IPv4). Akibatnya
// query server-side (getSchoolProfile, proxy.ts) gagal & login dipantulkan
// loop. Paksa IPv4 lebih dulu; bila IPv4 tak tersedia, IPv6 tetap jadi cadangan.
setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  // Supabase berhenti jadi env publik (pemisahan Fase 4): URL & anon key hanya
  // dibaca server. Nilai di-inject lewat `env` supaya proxy.ts (Edge, sebagai
  // bagian build) tetap bisa membacanya di dev & self-host — TIDAK memakai
  // prefix NEXT_PUBLIC lagi. Anon key ini tetap kunci publik (dilindungi RLS);
  // kunci service-role TIDAK ikut di sini dan hanya dibaca Node runtime.
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    // Driver & konfigurasi storage NON-rahasia — dibaca juga oleh bundel klien
    // (media library admin memanggil getPublicUrl di browser). Kredensial R2
    // (ACCOUNT_ID/ACCESS_KEY/SECRET) TIDAK pernah masuk sini: semua operasi
    // S3 lewat route API server (/api/admin/storage).
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_PRIVATE_BUCKET: process.env.R2_PRIVATE_BUCKET,
  },
  // Error TypeScript tidak boleh lolos ke production. `npx tsc --noEmit`
  // (dan CI) jadi gerbang wajib sebelum build/deploy.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Marker upgrade Next.js via `next upgrade --agent=security`
  // (16.4.0 -> 16.4.2, fix advisori keamanan Okt 2026).
  experimental: {
    agentUpgrade: "security",
  },
  // isomorphic-dompurify (→ jsdom) dibaca lewat require asli dari
  // node_modules, BUKAN di-bundle webpack. Alasan: jsdom versi di bawahnya
  // membaca browser/default-stylesheet.css via fs + __dirname — saat
  // di-bundle, __dirname menunjuk ke .next/server/chunks sehingga prerender
  // halaman publik (/news/[slug], /articles/[slug], ...) gagal dengan
  // ENOENT saat "Collecting page data".
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
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
      {
        // CDN Cloudflare R2 (driver r2: URL publik gambar/dokumen memakai domain ini)
        protocol: "https",
        hostname: "cdn.smpmuh4tanggul.sch.id",
        pathname: "/**",
      },
    ],
    // Gambar lokal (folder /public) boleh membawa query string (cache-buster
    // `?v=` yang ditambah panel admin / data lama tanpa R2_PUBLIC_BASE_URL).
    // Tanpa aturan ini next/image melempar error "not configured in
    // images.localPatterns" saat src memuat tambalan "?v=".
    localPatterns: [
      { pathname: "/images/**" },
      { pathname: "/videos/**" },
      { pathname: "/documents/**" },
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
      // Service worker & offline page harus selalu segar agar update PWA
      // langsung terpakai (jangan kena HTTP cache panjang).
      source: "/(sw.js|offline.html)",
      headers: [{ key: "Cache-Control", value: "no-cache" }],
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

// ── Sentry ──────────────────────────────────────────────────────────────────
// Upload source map hanya berjalan saat SENTRY_AUTH_TOKEN tersedia (Vercel).
// Tanpa token (lokal/CI) wrapper ini pass-through — build tidak terganggu.
// Slug sesuai akun: https://esceha.sentry.io/projects/escehaid/
export default withSentryConfig(nextConfig, {
  org: "esceha",
  project: "escehaid",
  silent: true,
  telemetry: false,
  // Next 16 + build --webpack: pastikan file client ikut di-bundle.
  widenClientFileUpload: true,
});
