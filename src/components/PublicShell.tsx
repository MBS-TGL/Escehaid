"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { RunningText } from "@/components/RunningText";
import type { SchoolProfile } from "@/lib/supabase";

export default function PublicShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: SchoolProfile | null;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <RunningText />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer profile={profile} />
      <MobileBottomNav />
    </>
  );
}
