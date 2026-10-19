"use client";

/**
 * Konteks izin sisi klien — menyediakan `can(perm)` untuk menyaring menu
 * sidebar, bottom-nav mobile, dan pencarian topbar berdasarkan izin.
 *
 * Bukan lagi penyedia fetch: `subject` dikirim dari DashboardLayout yang
 * menariknya sekali via /api/auth/session. Refactor Fase 2 — tidak ada
 * supabase-js di browser lagi.
 *
 * PENYARINGAN INI HANYA KENYAMANAN UI. Penegakan sesungguhnya ada di:
 *   • proxy.ts (gate per-rute → halaman 403),
 *   • server action (`requirePermission`),
 *   • trigger DB (`prevent_privilege_escalation`).
 *
 * Bila tabel RBAC belum dibuat, `system_role` null dan izin di-resolve dari
 * pemetaan legacy sehingga admin lama tetap melihat menunya (degradasi anggun).
 */
import { createContext, useContext, useMemo } from "react";
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
  subject,
}: {
  children: React.ReactNode;
  subject: PermissionSubject | null;
}) {
  const value = useMemo<PermissionsContextType>(
    () => ({
      can: (perm: string) => can(subject, perm),
      ready: subject !== null,
    }),
    [subject]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}
