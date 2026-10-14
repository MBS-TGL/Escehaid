/**
 * Helper RBAC sisi server — dipakai server action, route handler, dan server
 * component. Semua query di sini memakai klien Supabase berbasis cookie
 * (sesi pengguna), sehingga RLS tetap berlaku.
 *
 * Ada dua tingkat penegakan:
 *  1. Aplikasi: `requirePermission()` di atas setiap server action / route
 *     handler admin (termasuk modul baru & endpoint yang sebelumnya telanjang).
 *  2. Database: trigger guard (lihat migrasi) untuk jalur tulis legacy yang
 *     masih langsung dari browser ke PostgREST.
 *
 * Degradasi anggun: bila tabel `roles`/`role_permissions` belum dibuat (user
 * belum menjalankan migrasi), resolve jatuh ke pemetaan peran legacy sehingga
 * admin lama tidak terkunci.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase-server";
import { can, canAccessPanel, type PermissionSubject } from "./index";
import { MODULE_REGISTRY } from "./permissions";

export interface AuthContext {
  userId: string;
  /** Profil dasar dari user_profiles. */
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    system_role: string | null;
    is_active: boolean;
  };
  /** Daftar izin eksplisit hasil resolve dari role_permissions. */
  permissions: string[];
}

/**
 * Ambil konteks autentikasi + izin untuk permintaan berjalan.
 *
 * Di-memo per-request dengan `cache()` React agar beberapa `requirePermission`
 * dalam satu request tidak query berulang. Mengembalikan null bila tidak
 * login / profil tidak ada / akun nonaktif.
 */
export const getAuthContext = cache(async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, role, system_role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_active !== true) return null;

  // Resolve izin dari role_permissions. Bila tabel belum ada (migrasi belum
  // dijalankan) `data` null → biarkan kosong; can() akan fallback legacy.
  let permissions: string[] = [];
  if (profile.system_role) {
    const { data: rows } = await supabase
      .from("role_permissions")
      .select("permission")
      .eq("role_key", profile.system_role);
    if (rows) permissions = rows.map((r) => r.permission as string);
  }

  return {
    userId: user.id,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      system_role: profile.system_role,
      is_active: profile.is_active,
    },
    permissions,
  };
});

/** Bangun subjek izin dari konteks (untuk dipakai `can`). */
export function subjectFromContext(ctx: AuthContext | null): PermissionSubject | null {
  if (!ctx) return null;
  return {
    system_role: ctx.profile.system_role,
    role: ctx.profile.role,
    is_active: ctx.profile.is_active,
    permissions: ctx.permissions,
  };
}

/** Hasil pengecekan izin untuk server action (serializable, tanpa melempar). */
export type PermissionResult<T> =
  | { ok: true; ctx: AuthContext; data: T }
  | { ok: false; error: string; code: "unauthenticated" | "forbidden" };

/**
 * Pabrik guard izin untuk server action.
 *
 * Contoh:
 *   const guard = requirePermission("users:manage");
 *   export async function inviteUser(...) {
 *     const check = await guard();
 *     if (!check.ok) return { success: false, error: check.error };
 *     // ... pakai check.ctx
 *   }
 *
 * Mengembalikan objek result (bukan throw) agar server action bisa membalas
 * pesan ramah ke UI tanpa memicu boundary error.
 */
export function requirePermission<T = void>(
  perm: string,
  validate?: (ctx: AuthContext) => string | null
) {
  return async function run(): Promise<PermissionResult<T>> {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { ok: false, error: "Anda harus login terlebih dahulu.", code: "unauthenticated" };
    }
    if (!can(subjectFromContext(ctx), perm)) {
      return {
        ok: false,
        error: "Anda tidak memiliki izin untuk melakukan aksi ini.",
        code: "forbidden",
      };
    }
    if (validate) {
      const msg = validate(ctx);
      if (msg) return { ok: false, error: msg, code: "forbidden" };
    }
    return { ok: true, ctx, data: undefined as T };
  };
}

/**
 * Guard untuk route handler API: cek izin dan kembalikan Response 403 bila
 * ditolak. Mengembalikan null bila lolos (pemanggil lanjut).
 */
export async function forbiddenResponseIfLacks(
  perm: string
): Promise<{ status: number; body: { error: string } } | null> {
  const ctx = await getAuthContext();
  if (!ctx) return { status: 401, body: { error: "Tidak terautentikasi." } };
  if (!can(subjectFromContext(ctx), perm)) {
    return { status: 403, body: { error: "Anda tidak memiliki izin untuk melakukan aksi ini." } };
  }
  return null;
}

/** Daftar semua izin valid (dipakai validasi input matriks izin). */
export const ALL_PERMISSION_LIST: readonly string[] = MODULE_REGISTRY.flatMap((m) =>
  m.actions.map((a) => `${m.key}:${a.key}`)
);

/** Benar bila konteks masih berhak masuk panel admin (guard ringan). */
export function contextCanAccessPanel(ctx: AuthContext | null): boolean {
  if (!ctx) return false;
  return canAccessPanel(subjectFromContext(ctx));
}
