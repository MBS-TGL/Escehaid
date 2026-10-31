"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Beacon analitik internal tanpa cookie (fase 1).
 *
 * Mengirim POST /api/track via `navigator.sendBeacon` setiap pindah halaman.
 * DNT: 1 di hormati (tidak ada pengiriman), sedangkan dalam dev identik
 * (prod-only) agar tidak mengisi DB saat `next dev`.
 *
 * TANPA identifier pengguna — kalau beacon ini gagal, situs tetap berjalan.
 */
export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    // Prod-only: dev memakai DB produksi, beacon hanya menimna tenang.
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;

    try {
      // Do Not Track dihormati penuh — tanpa cookie jitu pun kita penuhi ini.
      if (navigator.doNotTrack === "1" || (window as { doNotTrack?: string }).doNotTrack === "1") return;
      // Admin & route tanpa user data — server filter sempit juga, tapi hindari
      // network useless di client:
      if (pathname.startsWith("/admin")) return;

      // Debounce: hanya pertama kali path, jangan echo double route.
      if (prevPath.current === pathname) return;
      prevPath.current = pathname;

      const payload = JSON.stringify({
        path: pathname,
        referrer: document.referrer || undefined,
      });
      navigator.sendBeacon("/api/track", payload);
    } catch {
      // Diam: beacon tidak boleh mengganggu render.
    }
  }, [pathname]);

  return null;
}
