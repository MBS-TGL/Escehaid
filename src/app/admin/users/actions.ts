"use server";

/**
 * Server action modul Pengguna & Peran (RBAC).
 *
 * Semua aksi tulis yang menyentuh otorisasi dieksekusi DI SINI (server),
 * divalidasi `requirePermission`, dan dicatat ke `audit_logs` lewat fungsi
 * `log_activity` (diff sebelum/sesudah, tanpa password/token).
 *
 * Catatan keamanan:
 *  - Tidak pernah mengembalikan/menyimpan hash password.
 *  - Password reset memakai `resetPasswordForEmail` (Supabase kirim email
 *    tautan) + flag `must_change_password` agar user dipaksa mengganti saat
 *    login berikutnya.
 *  - Mengundang/membuat user butuh `SUPABASE_SERVICE_ROLE_KEY`; bila tidak
 *    tersedia, aksi mengembalikan pesan ramah (degradasi anggun).
 *  - Guard bisnis (super admin terakhir, tidak ubah peran diri sendiri,
 *    tidak hapus diri sendiri) divalidasi lewat helper murni di `@/lib/rbac`
 *    dan diulang di trigger DB (`prevent_privilege_escalation`).
 */
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac/server";
import {
  ROLE_KEYS,
  defaultPermissionsForRole,
  legacyRoleShimFor,
} from "@/lib/rbac/roles";
import { ALL_PERMISSIONS, isPermission } from "@/lib/rbac/permissions";
import {
  guardLastSuperAdmin,
  guardSelfDelete,
  guardSelfRoleChange,
} from "@/lib/rbac/index";

type ActionResult = { success: boolean; error?: string };

/** Kolom aman yang boleh dikembalikan ke UI (tanpa hash/token). */
const SAFE_PROFILE_COLUMNS =
  "id, full_name, email, role, system_role, is_active, must_change_password, last_login_at, created_at, updated_at";

/** Catat aksi sistem ke audit_logs (best-effort; gagal = tidak menjatuhkan aksi). */
async function logSystem(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  action: "create" | "update" | "delete",
  entityType: string,
  entityId: string | null,
  detail: Record<string, unknown>
) {
  try {
    await supabase.rpc("log_activity", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_detail: detail,
    });
  } catch (e) {
    // Tabel audit_logs mungkin belum ada — biarkan (degradasi anggun).
    console.warn("log_activity gagal (non-fatal):", e);
  }
}

/** Klien admin (service role) bila env tersedia; null bila tidak. */
function serviceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Validasi kunci peran terhadap daftar yang dikenal. */
function isValidRoleKey(key: string): boolean {
  return (ROLE_KEYS as readonly string[]).includes(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// PENGGUNA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Undang/buat pengguna baru (email + peran). Butuh service role.
 * Peran legacy enum disetel "shim" agar kebijakan RLS lama tetap lolos;
 * otorisasi halus dibaca dari `system_role`.
 */
export async function inviteUser(input: {
  email: string;
  fullName: string;
  roleKey: string;
}): Promise<ActionResult & { userId?: string }> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const roleKey = input.roleKey;

  if (!email || !email.includes("@")) return { success: false, error: "Email tidak valid." };
  if (!fullName) return { success: false, error: "Nama lengkap wajib diisi." };
  if (!isValidRoleKey(roleKey)) return { success: false, error: "Peran tidak dikenal." };

  const admin = serviceRoleClient();
  if (!admin) {
    return {
      success: false,
      error:
        "Fitur undang pengguna memerlukan SUPABASE_SERVICE_ROLE_KEY yang belum di-set di server. Hubungi administrator.",
    };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/login`,
  });

  if (error || !data?.user) {
    return { success: false, error: error?.message ?? "Gagal mengundang pengguna." };
  }

  const userId = data.user.id;
  const { error: profErr } = await admin
    .from("user_profiles")
    .update({
      full_name: fullName,
      email,
      system_role: roleKey,
      role: legacyRoleShimFor(roleKey),
      is_active: true,
      must_change_password: true,
    })
    .eq("id", userId);

  if (profErr) {
    return { success: false, error: `Pengguna dibuat tetapi profil gagal disetel: ${profErr.message}` };
  }

  const supabase = await createSessionClient();
  await logSystem(supabase, "create", "user_profiles", userId, {
    before: null,
    after: { email, full_name: fullName, system_role: roleKey, is_active: true },
  });

  revalidatePath("/admin/users");
  return { success: true, userId };
}

/** Ubah peran halus seorang pengguna. */
export async function changeUserRole(userId: string, roleKey: string): Promise<ActionResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };
  const actorId = check.ctx.userId;

  if (!isValidRoleKey(roleKey)) return { success: false, error: "Peran tidak dikenal." };
  if (guardSelfRoleChange(actorId, userId)) {
    return { success: false, error: "Anda tidak bisa mengubah peran akun Anda sendiri." };
  }

  const supabase = await createSessionClient();
  const { data: before } = await supabase
    .from("user_profiles")
    .select(SAFE_PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (!before) return { success: false, error: "Pengguna tidak ditemukan." };

  // Guard super admin terakhir: jangan turunkan peran bila tinggal satu.
  if (before.system_role === "SUPER_ADMIN" && roleKey !== "SUPER_ADMIN") {
    const { data: others } = await supabase
      .from("user_profiles")
      .select("id, system_role, is_active")
      .eq("system_role", "SUPER_ADMIN")
      .neq("id", userId);
    const denial = guardLastSuperAdmin(
      { id: userId, system_role: before.system_role, is_active: before.is_active },
      (others ?? []).filter((o) => o.is_active)
    );
    if (denial) return { success: false, error: "Tidak bisa menurunkan Super Admin terakhir." };
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ system_role: roleKey, role: legacyRoleShimFor(roleKey) })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  await logSystem(supabase, "update", "user_profiles", userId, {
    before: { system_role: before.system_role, role: before.role },
    after: { system_role: roleKey, role: legacyRoleShimFor(roleKey) },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

/** Aktif/nonaktifkan pengguna. Guard: super admin terakhir tidak boleh nonaktif. */
export async function toggleUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };
  const actorId = check.ctx.userId;

  if (guardSelfDelete(actorId, userId) && !active) {
    return { success: false, error: "Anda tidak bisa menonaktifkan akun Anda sendiri." };
  }

  const supabase = await createSessionClient();
  const { data: before } = await supabase
    .from("user_profiles")
    .select(SAFE_PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (!before) return { success: false, error: "Pengguna tidak ditemukan." };

  if (!active && before.system_role === "SUPER_ADMIN" && before.is_active) {
    const { data: others } = await supabase
      .from("user_profiles")
      .select("id, system_role, is_active")
      .eq("system_role", "SUPER_ADMIN")
      .neq("id", userId);
    const denial = guardLastSuperAdmin(
      { id: userId, system_role: before.system_role, is_active: before.is_active },
      (others ?? []).filter((o) => o.is_active)
    );
    if (denial) return { success: false, error: "Tidak bisa menonaktifkan Super Admin terakhir." };
  }

  const { error } = await supabase.from("user_profiles").update({ is_active: active }).eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logSystem(supabase, "update", "user_profiles", userId, {
    before: { is_active: before.is_active },
    after: { is_active: active },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

/** Hapus pengguna. Guard: tidak hapus diri sendiri / super admin terakhir. */
export async function deleteUser(userId: string): Promise<ActionResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };
  const actorId = check.ctx.userId;

  if (guardSelfDelete(actorId, userId)) {
    return { success: false, error: "Anda tidak bisa menghapus akun Anda sendiri." };
  }

  const supabase = await createSessionClient();
  const { data: before } = await supabase
    .from("user_profiles")
    .select(SAFE_PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (!before) return { success: false, error: "Pengguna tidak ditemukan." };

  if (before.system_role === "SUPER_ADMIN" && before.is_active) {
    const { data: others } = await supabase
      .from("user_profiles")
      .select("id, system_role, is_active")
      .eq("system_role", "SUPER_ADMIN")
      .neq("id", userId);
    const denial = guardLastSuperAdmin(
      { id: userId, system_role: before.system_role, is_active: before.is_active },
      (others ?? []).filter((o) => o.is_active)
    );
    if (denial) return { success: false, error: "Tidak bisa menghapus Super Admin terakhir." };
  }

  // Hapus baris profil (auth user dibiarkan; hapus penuh butuh service role).
  const { error } = await supabase.from("user_profiles").delete().eq("id", userId);
  if (error) return { success: false, error: error.message };

  const admin = serviceRoleClient();
  if (admin) await admin.auth.admin.deleteUser(userId).catch(() => undefined);

  await logSystem(supabase, "delete", "user_profiles", userId, {
    before: { email: before.email, full_name: before.full_name, system_role: before.system_role },
    after: null,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Reset password: kirim tautan reset + setel `must_change_password` agar user
 * dipaksa mengganti password pada login berikutnya.
 */
export async function resetUserPassword(userId: string): Promise<ActionResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  const supabase = await createSessionClient();
  const { data: target } = await supabase
    .from("user_profiles")
    .select("id, email, full_name")
    .eq("id", userId)
    .single();

  if (!target) return { success: false, error: "Pengguna tidak ditemukan." };
  if (!target.email) return { success: false, error: "Pengguna belum memiliki email." };

  // Tandai wajib ganti password.
  const { error: flagErr } = await supabase
    .from("user_profiles")
    .update({ must_change_password: true })
    .eq("id", userId);
  if (flagErr) return { success: false, error: flagErr.message };

  // Kirim tautan reset (memakai klien sesi; Supabase mengirim email sendiri).
  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/login`,
  });

  // Walaupun email reset gagal (SMTP belum dikonfigurasi), flag sudah disetel
  // sehingga user tetap dipaksa mengganti password saat login.
  await logSystem(supabase, "update", "user_profiles", userId, {
    before: null,
    after: { reset_password: true, must_change_password: true },
  });

  if (resetErr) {
    return {
      success: true,
      error: `Tanda "wajib ganti password" disetel, tetapi pengiriman email reset gagal: ${resetErr.message}`,
    };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERAN & IZIN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simpan matriks izin sebuah peran (ganti penuh). SUPER_ADMIN tidak bisa
 * dikurangi izinnya — permintaan apa pun untuk SUPER_ADMIN dipaksa penuh.
 */
export async function saveRolePermissions(
  roleKey: string,
  permissions: string[]
): Promise<ActionResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  if (!isValidRoleKey(roleKey)) return { success: false, error: "Peran tidak dikenal." };

  // Validasi setiap izin terhadap registry.
  const invalid = permissions.filter((p) => !isPermission(p));
  if (invalid.length > 0) return { success: false, error: `Izin tidak dikenal: ${invalid.join(", ")}` };

  // SUPER_ADMIN selalu dapat seluruh izin (tak bisa dikurangi).
  const finalPerms = roleKey === "SUPER_ADMIN" ? Array.from(ALL_PERMISSIONS) : permissions;

  const supabase = await createSessionClient();

  const { data: beforeRows } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role_key", roleKey);
  const before = (beforeRows ?? []).map((r) => r.permission as string).sort();

  // Ganti penuh: hapus semua baris peran ini, sisipkan yang baru.
  const { error: delErr } = await supabase.from("role_permissions").delete().eq("role_key", roleKey);
  if (delErr) return { success: false, error: delErr.message };

  if (finalPerms.length > 0) {
    const { error: insErr } = await supabase
      .from("role_permissions")
      .insert(finalPerms.map((p) => ({ role_key: roleKey, permission: p })));
    if (insErr) return { success: false, error: insErr.message };
  }

  await logSystem(supabase, "update", "role_permissions", roleKey, {
    before: { permissions: before },
    after: { permissions: [...finalPerms].sort() },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

/** Kembalikan matriks izin sebuah peran ke default bawaan. */
export async function resetRoleToDefault(roleKey: string): Promise<ActionResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  if (!isValidRoleKey(roleKey)) return { success: false, error: "Peran tidak dikenal." };

  const defaults = Array.from(defaultPermissionsForRole(roleKey));
  return saveRolePermissions(roleKey, defaults);
}
