"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminSidebar from "./Sidebar";
import AdminTopbar from "./Topbar";
import AdminMobileNav from "./MobileNav";
import { AdminChromeProvider, useAdminChrome } from "./AdminChrome";
import { PermissionsProvider } from "./PermissionsProvider";
import { useToast } from "@/components/ui/Toast";
import { readSidebarCollapsed, saveSidebarCollapsed } from "@/lib/admin-sidebar-state";
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
  /**
   * Sidebar desktop dilipat (mode rail 72px) atau tidak.
   *
   * Dibaca sebagai lazy initializer, BUKAN di `useEffect`: layout ini
   * me-render spinner selama `loading`, sehingga sidebar belum ada di HTML
   * server maupun render pertama klien — tidak ada risiko hydration mismatch,
   * dan tidak ada kedip "melebar lalu mengecil" saat preferensi tersimpan
   * langsung terpakai. Membacanya di effect juga akan memicu aturan
   * react-hooks/set-state-in-effect.
   */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

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
      <AdminChromeProvider>
        <AdminShell
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => {
            const next = !sidebarCollapsed;
            setSidebarCollapsed(next);
            saveSidebarCollapsed(next);
          }}
          profile={profile}
        >
          {children}
        </AdminShell>
      </AdminChromeProvider>
    </PermissionsProvider>
  );
}

/**
 * Rangka visual admin (dipisah dari DashboardLayout karena butuh
 * `useAdminChrome`). Selama bar bawah pengganti aktif (mode pilih massal),
 * bottom nav DILEPAS dari DOM — bukan sekadar disembunyikan — supaya tidak
 * bisa di-tap dan tidak ada dua bar di layar.
 */
function AdminShell({
  children,
  profile,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  children: React.ReactNode;
  profile: UserProfile;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const { bottomBarActive } = useAdminChrome();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={onToggleSidebar} />

      {/* Main content area — margin kiri mengikuti lebar sidebar (270px penuh /
          72px rail) agar konten tidak pernah tertutup maupun menyisakan celah. */}
      <div
        className={`min-h-screen transition-all duration-300 motion-reduce:transition-none ${
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[270px]"
        }`}
      >
        <AdminTopbar profile={profile} />
        {/* pb-24 (96px) lg:pb-0 — bottom nav / bar aksi massal setinggi ±72px
            + safe-area (ADMIN_BOTTOM_NAV_CONTENT_H 60 + 12 minimum); tanpa
            padding ini baris terakhir tabel/pagination tertutup bar bawah. */}
        <main className="pb-24 lg:pb-0">{children}</main>
      </div>

      {!bottomBarActive && <AdminMobileNav />}
    </div>
  );
}
