"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { RunningText } from "@/components/RunningText";
import type { SchoolProfile } from "@/lib/supabase";
import type { PublicBrand } from "@/lib/settings";

export default function PublicShell({
  children,
  profile,
  brand,
}: {
  children: React.ReactNode;
  profile: SchoolProfile | null;
  brand: PublicBrand;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <RunningText />
      <Navbar brand={brand} />
      <main className="flex-1">{children}</main>
      <Footer
        profile={profile}
        brand={brand}
        accreditation={brand.accreditation.trim() || undefined}
        npsn={brand.npsn.trim() || undefined}
      />
      <MobileBottomNav />
    </>
  );
}
