import Image from "next/image";

/**
 * Logo merek (header & footer).
 *
 * URL logo diatur admin di Pengaturan Situs dan boleh berasal dari mana pun,
 * sedangkan `next/image` HANYA menerima sumber yang terdaftar di
 * `images.remotePatterns` (host lokal + *.supabase.co) — URL lain akan membuat
 * halaman error 500. Karena itu sumber yang tidak dikenal ditampilkan lewat
 * `<img>` biasa, dengan dimensi tetap agar layout tidak melompat.
 */

/** true bila src aman dilewatkan ke next/image optimizer. */
export function isOptimizerSafeImage(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    return host === "picsum.photos" || host.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export default function BrandLogo({
  src,
  alt,
  className = "h-8 w-auto shrink-0 md:h-9",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (isOptimizerSafeImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={140}
        height={180}
        sizes="40px"
        priority={priority}
        className={className}
      />
    );
  }

  // Sumber tak dikenal (URL eksternal tempelan admin): tampilkan apa adanya.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className={className} />
  );
}
