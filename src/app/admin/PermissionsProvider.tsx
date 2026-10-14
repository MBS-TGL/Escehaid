"use client";

/**
 * Konteks izin sisi klien — menyediakan `can(perm)` untuk menyaring menu
 * sidebar, bottom-nav mobile, dan pencarian topbar berdasarkan izin.
 *
 * PENYARINGAN INI HANYA KENYAMANAN UI. Penegakan sesungguhnya ada di:
 *   • proxy.ts (gate per-rute → halaman 403),
 *   • server action (`requirePermission`),
 *   • trigger DB (`prevent_privilege_escalation`).
 *
 * Bila tabel RBAC belum dibuat, `system_role` null dan izin di-resolve dari
 * pemetaan legacy sehingga admin lama tetap melihat menunya (degradasi anggun).
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { can, type PermissionSubject } from "@/lib/rbac";

interface PermissionsContextType {
  can: (perm: string) => boolean;
  /** true bila izin sudah dimuat (sebelumnya false → asumsikan terbatas). */
  ready: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  can: () => false,
  ready: false,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function PermissionsProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string | null;
}) {
  const [subject, setSubject] = useState<PermissionSubject | null>(null);

  useEffect(() => {
    if (!userId) {
      // Reset lewat microtask agar bukan setState sinkron langsung di effect
      // (subjek memang sudah null pada saat mount).
      queueMicrotask(() => setSubject(null));
      return;
    }
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    (async () => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("system_role, role, is_active")
        .eq("id", userId)
        .single();
      if (!profile) {
        setSubject(null);
        return;
      }
      let permissions: string[] = [];
      if (profile.system_role) {
        const { data: rows } = await supabase
          .from("role_permissions")
          .select("permission")
          .eq("role_key", profile.system_role);
        permissions = (rows ?? []).map((r) => r.permission as string);
      }
      setSubject({
        system_role: profile.system_role,
        role: profile.role,
        is_active: profile.is_active,
        permissions,
      });
    })().catch(() => setSubject(null));
  }, [userId]);

  const value = useMemo<PermissionsContextType>(
    () => ({
      can: (perm: string) => can(subject, perm),
      ready: subject !== null,
    }),
    [subject]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}
