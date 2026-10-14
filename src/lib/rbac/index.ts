/**
 * Helper RBAC murni (tanpa I/O, tanpa Supabase) — aman di-import dari mana
 * saja (server action, route handler, proxy, UI, dan test unit).
 *
 * Prinsip:
 *  - `can()` adalah satu-satunya gerbang pengecekan izin di kode aplikasi.
 *  - SUPER_ADMIN bersifat wildcard: selalu diizinkan, izinnya tak bisa
 *    dikurangi.
 *  - Selain itu izin harus ada eksplisit (daftar string `modul:aksi`);
 *    tidak ada izin implisit.
 */
import type { Permission } from "./permissions";
import { isPermission } from "./permissions";
import {
  ADMIN_PANEL_LEGACY_ROLES,
  LEGACY_ROLE_TO_SYSTEM_ROLE,
  defaultPermissionsForRole,
} from "./roles";

/**
 * Bentuk minimal "pemilik izin" yang dibutuhkan `can()`. Sengaja lemah agar
 * cocok dengan hasil query profil (baik yang sudah di-join role_permissions
 * maupun yang belum).
 */
export interface PermissionSubject {
  /** Peran halus (kolom `system_role`). Null → fallback ke legacyRole. */
  system_role?: string | null;
  /** Peran legacy (kolom `role` enum). Hanya dipakai fallback. */
  role?: string | null;
  /** true bila profil masih aktif (`is_active`). */
  is_active?: boolean | null;
  /**
   * Daftar izin eksplisit hasil resolve dari DB (di-isi pemanggil lewat
   * `getUserPermissions`/`requirePermission`). Bila kosong dan `system_role`
   * null, `can()` memakai izin default peran legacy.
   */
  permissions?: readonly string[] | null;
}

/**
 * Hitung daftar izin efektif untuk sebuah subjek.
 *
 * Aturan:
 *  1. `is_active !== true` → [] (akun nonaktif kehilangan semua akses).
 *  2. `system_role = SUPER_ADMIN` → seluruh izin (wildcard).
 *  3. `system_role` lain → `subject.permissions` bila sudah diisi; jika belum,
 *     default izin peran tersebut (dipakai fallback/seed).
 *  4. `system_role` null → petakan peran legacy → peran halus → default izin.
 */
export function resolvePermissions(subject: PermissionSubject | null | undefined): string[] {
  if (!subject || subject.is_active !== true) return [];

  const systemRole = subject.system_role ?? null;

  if (systemRole === "SUPER_ADMIN") return [...defaultPermissionsForRole("SUPER_ADMIN")];

  if (systemRole) {
    // Peran halus non-super: pakai izin eksplisit bila tersedia, else default.
    if (subject.permissions && subject.permissions.length > 0) {
      return Array.from(subject.permissions);
    }
    return [...defaultPermissionsForRole(systemRole)];
  }

  // Fallback legacy (sebelum backfill / system_role belum di-set).
  const legacy = (subject.role ?? "") as keyof typeof LEGACY_ROLE_TO_SYSTEM_ROLE;
  const mapped = LEGACY_ROLE_TO_SYSTEM_ROLE[legacy];
  if (!mapped) return [];
  if (subject.permissions && subject.permissions.length > 0) {
    return Array.from(subject.permissions);
  }
  return [...defaultPermissionsForRole(mapped)];
}

/**
 * Benar bila subjek memiliki izin `perm`.
 *
 * SUPER_ADMIN → selalu true. Selain itu izin harus ada eksplisit dan akun
 * harus aktif.
 */
export function can(
  subject: PermissionSubject | null | undefined,
  perm: Permission | string
): boolean {
  if (!subject || subject.is_active !== true) return false;
  if (subject.system_role === "SUPER_ADMIN") return true;
  if (!isPermission(perm)) return false;

  const effective = resolvePermissions(subject);
  return effective.includes(perm);
}

/** Benar bila subjek memiliki SEMUA izin dalam daftar. */
export function canAll(
  subject: PermissionSubject | null | undefined,
  perms: readonly string[]
): boolean {
  return perms.every((p) => can(subject, p));
}

/** Benar bila subjek memiliki minimal SATU izin dalam daftar. */
export function canAny(
  subject: PermissionSubject | null | undefined,
  perms: readonly string[]
): boolean {
  return perms.some((p) => can(subject, p));
}

/**
 * Benar bila subjek masih berhak masuk panel admin (guard kompatibel mundur).
 *
 * Selain izin halus, dipertahankan cek legacy: role enum dalam daftar panel
 * admin tetap lolos (untuk akun yang belum di-backfill `system_role`).
 */
export function canAccessPanel(subject: PermissionSubject | null | undefined): boolean {
  if (!subject || subject.is_active !== true) return false;
  if (subject.system_role) return true; // sudah memakai sistem halus
  const legacy = (subject.role ?? "") as string;
  return ADMIN_PANEL_LEGACY_ROLES.includes(legacy as never);
}

// ─────────────────────────────────────────────────────────────────────────────
// Guard bisnis (unit-testable) — dipakai server action modul Pengguna & Peran.
// ─────────────────────────────────────────────────────────────────────────────

/** Alasan sebuah guard menolak; null berarti diizinkan. */
export type GuardDenial = "last_super_admin" | "self_role_change" | "self_delete" | null;

export interface UserSnapshot {
  id: string;
  system_role?: string | null;
  is_active?: boolean;
}

/**
 * Guard: jangan pernah menghapus / menonaktifkan SUPER_ADMIN terakhir yang
 * aktif (mencegah panel terkunci permanen).
 *
 * `otherActiveSuperAdmins` = profil SUPER_ADMIN lain yang masih aktif (tidak
 * termasuk target). Bila target SUPER_ADMIN aktif dan daftar itu kosong →
 * tolak.
 */
export function guardLastSuperAdmin(
  target: UserSnapshot,
  otherActiveSuperAdmins: readonly UserSnapshot[]
): GuardDenial {
  if (target.system_role !== "SUPER_ADMIN") return null;
  if (target.is_active === false) return null; // sudah nonaktif, tak dihitung
  if (otherActiveSuperAdmins.length > 0) return null;
  return "last_super_admin";
}

/**
 * Guard: pengguna tidak boleh mengubah perannya sendiri (naik ATAU turun) —
 * mencegah eskalasi/diskalasi diri yang tidak disengaja.
 */
export function guardSelfRoleChange(actorId: string, targetId: string): GuardDenial {
  return actorId === targetId ? "self_role_change" : null;
}

/** Guard: pengguna tidak boleh menghapus akunnya sendiri. */
export function guardSelfDelete(actorId: string, targetId: string): GuardDenial {
  return actorId === targetId ? "self_delete" : null;
}
