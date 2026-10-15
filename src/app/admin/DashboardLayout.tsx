"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import AdminSidebar from "./Sidebar";
import AdminTopbar from "./Topbar";
import AdminMobileNav from "./MobileNav";
import { PermissionsProvider } from "./PermissionsProvider";
import { useToast } from "@/components/ui/Toast";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Halaman login tidak perlu fetch profil. Tidak perlu setLoading(false) di sini:
    // render sudah early-return utk /admin/login sebelum memeriksa `loading`.
    if (isLogin) {
      return;
    }

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Tidak ada sesi valid di browser — bersihkan cookie Supabase yang
        // mungkin masih tersisa agar proxy tidak melihat sesi lama (loop).
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      const { data } = await supabase
        .from("user_profiles")
        .select("full_name, role, system_role, is_active")
        .eq("id", user.id)
        .single();

      if (!data || !data.is_active) {
        await supabase.auth.signOut();
        router.replace("/admin/login?error=inactive");
        return;
      }

      setUserId(user.id);
      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
    // Bergantung pada `isLogin`, BUKAN `pathname`: layout ini tetap terpasang saat
    // pindah antar halaman admin. Dengan [pathname], setiap klik menu mengulang
    // getUser() + query user_profiles dari browser (dua panggilan jaringan yang
    // sia-sia, karena proxy.ts sudah memeriksa sesi di server).
  }, [isLogin]);

  useEffect(() => {
    if (searchParams.get("success") === "login") {
      toast("Login berhasil! Selamat datang.", "success");
      window.history.replaceState({}, "", "/admin");
    }
  }, [searchParams]);

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
    <PermissionsProvider userId={userId}>
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
