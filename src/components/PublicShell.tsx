"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { RunningText } from "@/components/RunningText";
import type { PublicBrand } from "@/lib/settings";

export default function PublicShell({
  children,
  brand,
  announcements,
  footer,
}: {
  children: React.ReactNode;
  brand: PublicBrand;
  announcements: string[];
  /** Footer di-render di server (layout) dan diteruskan sebagai slot —
   *  supaya komponen ini tetap client tanpa membundling Footer. */
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      {/* Skip link WCAG: tersembunyi sampai kena fokus keyboard, lalu muncul
          di pojok kiri atas dengan kontras tinggi. */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-[var(--brand-primary)] focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--brand-accent)]"
      >
        Lewati ke konten utama
      </a>
      <RunningText items={announcements} />
      <Navbar brand={brand} />
      <main id="konten-utama" className="flex-1">{children}</main>
      {footer}
      <MobileBottomNav />
    </>
  );
}
