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
import { headers } from "next/headers";
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
import type { AdminUserRow } from "@/lib/queries/rbac";
import { buildRecoveryLink } from "@/lib/auth-recovery";
import { validateNewPassword } from "@/lib/users-password";
import { adminLoginUrl, authOrigin, originFromHeaders } from "@/lib/site-url";

/** Origin kanonik untuk tautan recovery (SITE_URL → origin request → default). */
async function recoveryBaseUrl(): Promise<string> {
  const h = await headers();
  return authOrigin(originFromHeaders((name) => h.get(name)));
}

type ActionResult = { success: boolean; error?: string };

/**
 * Hasil reset password. `recoveryLink` = tautan sekali pakai yang bisa
 * dibagikan manual bila email tidak terkirim (SMTP belum siap).
 */
type ResetPasswordResult = ActionResult & { recoveryLink?: string | null };

/** Kolom aman yang boleh dikembalikan ke UI (tanpa hash/token). */
const SAFE_PROFILE_COLUMNS =
  "id, full_name, email, role, system_role, is_active, must_change_password, last_login_at, created_at, updated_at";

// ─── BACA: tabel pengguna (server-side paginasi/filter/sort) ─────────────────

const USER_PAGE_SIZE = 10;
const SORT_FIELDS = ["full_name", "system_role", "is_active", "last_login_at", "created_at"] as const;
type UserSortField = (typeof SORT_FIELDS)[number];

export interface FetchUsersPageInput {
  page: number;
  pageSize?: number;
  search?: string;
  /** "all" | kunci role | "—" (belum diatur). */
  role?: string;
  status?: "all" | "active" | "inactive";
  sortField?: UserSortField;
  sortDir?: "asc" | "desc";
}

export interface FetchUsersPageResult {
  success: boolean;
  error?: string;
  rows?: AdminUserRow[];
  /** Total baris yang lolos filter SEMUA (dipakai paginate + label "dari N"). */
  total?: number;
  /** Statistik global + hitungan per-role untuk chip filter (tanpa filter). */
  stats?: {
    total: number;
    active: number;
    inactive: number;
    superAdmins: number;
    noRole: number;
    byRole: Record<string, number>;
  };
}

/** Karakter yang bisa mengubah makna `or(...)` PostgREST — dilucuti dari input. */
function sanitizeLike(raw: string): string {
  return raw.replace(/[,()%*]/g, " ").trim();
}

/**
 * Baca halaman pengguna di server: filter pencarian/peran/status, urutkan,
 * dan batas per halaman (range). Sebelumnya UsersTab menarik SELURUH tabel
 * user_profiles ke client lalu memfilter/mengurutkan di browser — kini
 * data yang melintas jaringan hanya 1 halaman + statistik ringan.
 */
export async function fetchUsersPage(
  input: FetchUsersPageInput
): Promise<FetchUsersPageResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  const supabase = await createSessionClient();

  const pageSize = Math.min(Math.max(input.pageSize ?? USER_PAGE_SIZE, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const sortField: UserSortField = SORT_FIELDS.includes(input.sortField as UserSortField)
    ? (input.sortField as UserSortField)
    : "full_name";
  const ascending = input.sortDir !== "desc";

  const role = input.role ?? "all";
  const status = input.status ?? "all";

  // ── Util pembungkus filter 1× (dipakai 2 query) ──
  function base() {
    return supabase.from("user_profiles");
  }
  function applyFilters(rb: ReturnType<typeof base>) {
    let q = rb.select(SAFE_PROFILE_COLUMNS, { count: "exact" });
    if (role === "—") q = q.is("system_role", null);
    else if (role !== "all") q = q.eq("system_role", role);
    if (status === "active") q = q.eq("is_active", true);
    else if (status === "inactive") q = q.eq("is_active", false);
    const term = sanitizeLike(input.search ?? "");
    if (term) {
      const like = term.replace(/[\\]/g, "");
      const esc = like.replace(/[\s]+/g, " ");
      q = q.or(`full_name.ilike.%${esc}%,email.ilike.%${esc}%`);
    }
    return q;
  }

  const [pageResult, summaryRows] = await Promise.all([
    applyFilters(base()).order(sortField, { ascending }).range(start, end),
    // Statistik global + per-role: satu query kolom ringan (id tidak perlu).
    supabase.from("user_profiles").select("system_role, is_active"),
  ]);

  if (pageResult.error) {
    console.error("fetchUsersPage:", pageResult.error);
    return { success: false, error: pageResult.error.message };
  }
  if (summaryRows.error) {
    console.error("fetchUsersPage(summary):", summaryRows.error);
    return { success: false, error: summaryRows.error.message };
  }

  const byRole: Record<string, number> = {};
  let total = 0;
  let active = 0;
  let inactive = 0;
  let noRole = 0;
  for (const row of summaryRows.data || []) {
    const r = row as { system_role: string | null; is_active: boolean | null };
    total += 1;
    if (r.is_active) active += 1;
    else inactive += 1;
    if (!r.system_role) noRole += 1;
    else byRole[r.system_role] = (byRole[r.system_role] || 0) + 1;
  }

  return {
    success: true,
    rows: (pageResult.data || []) as AdminUserRow[],
    total: pageResult.count ?? (pageResult.data || []).length,
    stats: {
      total,
      active,
      inactive,
      superAdmins: byRole["SUPER_ADMIN"] ?? 0,
      noRole,
      byRole,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const url = process.env.SUPABASE_URL;
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
    redirectTo: adminLoginUrl(),
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
 * Reset password: buat tautan recovery sekali pakai + setel
 * `must_change_password` agar user wajib mengganti password saat login.
 *
 * Panel admin TIDAK mengirim email — admin membagikan tautan secara manual
 * (WhatsApp/email sekolah). Alasannya:
 *  - SMTP default Supabase menolak alamat di luar anggota tim project, dan
 *  - tautan email terikat alur Auth (PKCE/implicit) yang rapuh untuk kasus
 *    "admin mereset akun orang lain".
 *
 * Tautan dibangun sendiri dari `properties.hashed_token` (`generateLink`)
 * dengan origin kanonik kita, sehingga tidak bergantung pada Site URL /
 * redirect allowlist Auth. `/auth/recovery` memverifikasinya lewat
 * `verifyOtp`, lalu mengarahkan user ke halaman ganti password.
 *
 * Tautan hanya dikembalikan ke pemegang `users:manage`; tidak dicatat di audit.
 */
export async function resetUserPassword(userId: string): Promise<ResetPasswordResult> {
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

  // Tautan recovery membutuhkan service role; tanpa itu reset tetap berguna
  // (flag wajib-ganti aktif) tetapi admin harus memberi tautan sendiri.
  const admin = serviceRoleClient();
  const baseUrl = await recoveryBaseUrl();
  let recoveryLink: string | null = null;

  if (admin) {
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: target.email,
    });
    const tokenHash = linkData?.properties?.hashed_token;
    if (tokenHash) recoveryLink = buildRecoveryLink(baseUrl, tokenHash);
  }

  await logSystem(supabase, "update", "user_profiles", userId, {
    before: null,
    after: {
      reset_password: true,
      must_change_password: true,
      recovery_link_created: Boolean(recoveryLink),
    },
  });

  revalidatePath("/admin/users");

  if (!recoveryLink) {
    return {
      success: true,
      recoveryLink: null,
      error:
        'Tanda "wajib ganti password" disetel, tetapi tautan reset tidak bisa dibuat ' +
        "(periksa SUPABASE_SERVICE_ROLE_KEY). Pengguna tetap dipaksa mengganti " +
        "password saat login dengan password lama.",
    };
  }

  return { success: true, recoveryLink };
}

/**
 * Set password pengguna LANGSUNG (tanpa email/tautan), khusus `users:manage`.
 *
 * Memakai service role (`auth.admin.updateUserById`) sehingga berlaku seketika
 * untuk login berikutnya. Password TIDAK pernah dikembalikan, dicatat, atau
 * ditulis ke audit — audit hanya mencatat bahwa aksi terjadi.
 *
 * `must_change_password` dikosongkan: admin yang menentukan password, jadi
 * user tidak dipaksa mengganti (berbeda dengan reset-via-tautan).
 */
export async function setUserPasswordDirect(
  userId: string,
  password: string
): Promise<ActionResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  const validation = validateNewPassword(password);
  if (!validation.ok) return { success: false, error: validation.error };

  const admin = serviceRoleClient();
  if (!admin) {
    return {
      success: false,
      error:
        "Set password langsung memerlukan SUPABASE_SERVICE_ROLE_KEY di server. " +
        "Gunakan Reset Password (tautan) sebagai gantinya.",
    };
  }

  const supabase = await createSessionClient();
  const { data: target } = await supabase
    .from("user_profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .single();
  if (!target) return { success: false, error: "Pengguna tidak ditemukan." };

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, { password });
  if (authErr) {
    return { success: false, error: `Gagal mengubah password: ${authErr.message}` };
  }

  // RLS mengizinkan pemegang users:manage mengubah flag ini.
  const { error: flagErr } = await supabase
    .from("user_profiles")
    .update({ must_change_password: false })
    .eq("id", userId);
  if (flagErr) {
    // Password sudah berubah; flag gagal dibersihkan bukan alasan menyembunyikan
    // keberhasilan, tetapi admin perlu tahu.
    await logSystem(supabase, "update", "user_profiles", userId, {
      before: null,
      after: { password_set_directly: true, must_change_password_cleared: false },
    });
    return {
      success: true,
      error:
        "Password berhasil diubah, tetapi status wajib-ganti gagal dibersihkan " +
        `(${flagErr.message}). Pengguna akan diminta mengganti saat login.`,
    };
  }

  await logSystem(supabase, "update", "user_profiles", userId, {
    before: null,
    after: { password_set_directly: true, must_change_password: false },
  });

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

// ─────────────────────────────────────────────────────────────────────────────
// PENGGUNA — pengelolaan lanjutan (rename, bulk, sesi, force logout)
// ─────────────────────────────────────────────────────────────────────────────

/** Ubah nama tampilan pengguna (oleh admin). */
export async function renameUser(userId: string, fullName: string): Promise<ActionResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  const name = fullName.trim();
  if (name.length < 2 || name.length > 100) {
    return { success: false, error: "Nama tampilan harus 2-100 karakter." };
  }

  const supabase = await createSessionClient();
  const { data: before } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("id", userId)
    .single();
  if (!before) return { success: false, error: "Pengguna tidak ditemukan." };

  const { error } = await supabase.from("user_profiles").update({ full_name: name }).eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logSystem(supabase, "update", "user_profiles", userId, {
    before: { full_name: before.full_name },
    after: { full_name: name },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

/** Aktif/nonaktifkan BANYAK pengguna sekaligus. Akun sendiri dan Super Admin
 *  terakhir otomatis dilewati (dilaporkan di hasil). */
export async function toggleUsersActiveBulk(
  ids: string[],
  active: boolean
): Promise<ActionResult & { skipped?: number }> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };
  const actorId = check.ctx.userId;
  if (ids.length === 0) return { success: false, error: "Tidak ada pengguna dipilih." };

  const supabase = await createSessionClient();

  // Ambil profil target + daftar super admin aktif lain utk guard.
  const { data: targets } = await supabase
    .from("user_profiles")
    .select("id, full_name, system_role, is_active")
    .in("id", ids);
  if (!targets || targets.length === 0) return { success: false, error: "Pengguna tidak ditemukan." };

  const { data: superAdmins } = await supabase
    .from("user_profiles")
    .select("id, is_active")
    .eq("system_role", "SUPER_ADMIN");
  const otherActiveSuperAdmins = (superAdmins ?? []).filter((s) => s.is_active).length;

  const applicable = targets.filter((t) => {
    if (t.id === actorId) return false; // akun sendiri
    // Nonaktifkan: jangan ikut menonaktifkan super admin terakhir.
    if (!active && t.system_role === "SUPER_ADMIN" && t.is_active && otherActiveSuperAdmins < 2) {
      return false;
    }
    return true;
  });
  const skipped = ids.length - applicable.length;
  if (applicable.length === 0) {
    return {
      success: false,
      error: "Semua pilihan dilewati (akun sendiri / Super Admin terakhir).",
      skipped,
    };
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ is_active: active })
    .in("id", applicable.map((t) => t.id));
  if (error) return { success: false, error: error.message, skipped };

  await logSystem(supabase, "update", "user_profiles", applicable.map((t) => t.id).join(","), {
    before: null,
    after: { bulk_active: active, count: applicable.length },
  });

  revalidatePath("/admin/users");
  return { success: true, skipped };
}

/** Hapus BANYAK pengguna sekaligus. Guard sama dengan hapus tunggal. */
export async function deleteUsersBulk(
  ids: string[]
): Promise<ActionResult & { skipped?: number }> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };
  const actorId = check.ctx.userId;
  if (ids.length === 0) return { success: false, error: "Tidak ada pengguna dipilih." };

  const supabase = await createSessionClient();
  const { data: targets } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, system_role, is_active")
    .in("id", ids);
  if (!targets || targets.length === 0) return { success: false, error: "Pengguna tidak ditemukan." };

  const { data: superAdmins } = await supabase
    .from("user_profiles")
    .select("id, is_active")
    .eq("system_role", "SUPER_ADMIN");
  const otherActiveSuperAdmins = (superAdmins ?? []).filter((s) => s.is_active).length;

  const applicable = targets.filter((t) => {
    if (t.id === actorId) return false;
    if (t.system_role === "SUPER_ADMIN" && t.is_active && otherActiveSuperAdmins < 2) return false;
    return true;
  });
  const skipped = ids.length - applicable.length;
  if (applicable.length === 0) {
    return { success: false, error: "Semua pilihan dilewati (akun sendiri / Super Admin terakhir).", skipped };
  }

  const { error } = await supabase
    .from("user_profiles")
    .delete()
    .in("id", applicable.map((t) => t.id));
  if (error) return { success: false, error: error.message, skipped };

  // Hapus auth user penuh bila service role tersedia.
  const admin = serviceRoleClient();
  if (admin) {
    await Promise.all(
      applicable.map((t) => admin.auth.admin.deleteUser(t.id).catch(() => undefined))
    );
  }

  await logSystem(supabase, "delete", "user_profiles", applicable.map((t) => t.id).join(","), {
    before: { count: applicable.length, emails: applicable.map((t) => t.email) },
    after: null,
  });

  revalidatePath("/admin/users");
  return { success: true, skipped };
}

export interface UserSessionInfo {
  sessionId: string;
  device: string;
  ip: string;
  lastSeenAt: string;
  createdAt: string;
}

/** Daftar sesi/perangkat aktif seorang pengguna (butuh service role utk baca
 *  lintas RLS; tanpa key → error jelas). */
export async function getUserSessions(userId: string): Promise<ActionResult & { sessions?: UserSessionInfo[] }> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };

  const admin = serviceRoleClient();
  if (!admin) {
    return {
      success: false,
      error: "Melihat sesi pengguna memerlukan SUPABASE_SERVICE_ROLE_KEY yang belum di-set di server.",
    };
  }

  const { data, error } = await admin
    .from("sessions")
    .select("session_id, user_agent, ip, last_seen_at, created_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .gte("last_seen_at", new Date(Date.now() - 30 * 86400_000).toISOString())
    .order("last_seen_at", { ascending: false })
    .limit(50);

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    sessions: (data ?? []).map((s: { session_id: string; user_agent: string; ip: string; last_seen_at: string; created_at: string }) => ({
      sessionId: s.session_id,
      device: s.user_agent || "Perangkat tidak dikenal",
      ip: s.ip,
      lastSeenAt: s.last_seen_at,
      createdAt: s.created_at,
    })),
  };
}

/** Keluarkan SEMUA sesi seorang pengguna (semua perangkat dipaksa login
 *  ulang). Tidak bisa dipakai untuk akun sendiri. */
export async function forceLogoutUser(userId: string): Promise<ActionResult> {
  const guard = requirePermission("users:manage");
  const check = await guard();
  if (!check.ok) return { success: false, error: check.error };
  const actorId = check.ctx.userId;

  if (guardSelfDelete(actorId, userId)) {
    return { success: false, error: "Gunakan halaman Pengaturan Akun untuk sesi Anda sendiri." };
  }

  const admin = serviceRoleClient();
  if (!admin) {
    return {
      success: false,
      error: "Force logout memerlukan SUPABASE_SERVICE_ROLE_KEY yang belum di-set di server.",
    };
  }

  const { error } = await admin.auth.admin.signOut(userId);
  if (error) return { success: false, error: error.message };

  // Tandai baris sesi revoked (agar daftar langsung bersih).
  const rev = await admin
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (rev.error) {
    // Non-fatal — sesi sudah dicabut di level auth.
    console.warn("Ganti tanda revoked sesi gagal (non-fatal):", rev.error.message);
  }

  const supabase = await createSessionClient();
  await logSystem(supabase, "update", "user_profiles", userId, {
    before: null,
    after: { force_logout: true },
  });

  return { success: true };
}
