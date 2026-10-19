"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminSidebar from "./Sidebar";
import AdminTopbar from "./Topbar";
import AdminMobileNav from "./MobileNav";
import { PermissionsProvider } from "./PermissionsProvider";
import { useToast } from "@/components/ui/Toast";
import type { PermissionSubject } from "@/lib/rbac";

interface UserProfile {
  full_name: string;
  role: string;
  system_role?: string | null;
  is_active: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subject, setSubject] = useState<PermissionSubject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Halaman login tidak perlu fetch profil. Tidak perlu setLoading(false) di sini:
    // render sudah early-return utk /admin/login sebelum memeriksa `loading`.
    if (isLogin) {
      return;
    }

    const fetchProfile = async () => {
      // Sesi, profil, dan izin dalam SATU panggilan server.
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        session: {
          userId: string;
          profile: UserProfile;
          subject: PermissionSubject;
        } | null;
      } | null;

      const session = json?.session;
      if (!session) {
        // Tidak ada sesi valid di browser — bersihkan cookie Supabase yang
        // mungkin masih tersisa agar proxy tidak melihat sesi lama (loop).
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/admin/login");
        return;
      }

      if (!session.profile.is_active) {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/admin/login?error=inactive");
        return;
      }

      setSubject(session.subject);
      setProfile(session.profile);
      setLoading(false);
    };

    fetchProfile();
    // Bergantung pada `isLogin`, BUKAN `pathname`: layout ini tetap terpasang saat
    // pindah antar halaman admin. Dengan [pathname], setiap klik menu mengulang
    // pemeriksaan sesi dari browser (panggilan jaringan yang sia-sia, karena
    // proxy.ts sudah memeriksa sesi di server).
  }, [isLogin, router]);

  useEffect(() => {
    if (searchParams.get("success") === "login") {
      toast("Login berhasil! Selamat datang.", "success");
      window.history.replaceState({}, "", "/admin");
    }
  }, [searchParams, toast]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          <p className="text-sm text-slate-500">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          <p className="text-sm text-slate-500">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionsProvider subject={subject}>
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar />

        {/* Main content area */}
        <div className="min-h-screen transition-all duration-300 lg:ml-[270px]">
          <AdminTopbar profile={profile} />
          {/* pb-24 lg:pb-0 — bottom nav setinggi ±54px + safe-area; tanpa padding
              ini baris terakhir tabel/pagination tertutup bar navigasi. */}
          <main className="pb-24 lg:pb-0">{children}</main>
        </div>

        <AdminMobileNav />
      </div>
    </PermissionsProvider>
  );
}
