"use client";

/**
 * Tab "Pengguna" — daftar akun + aksi (undang, ubah peran, aktif/nonaktif,
 * reset password, hapus).
 *
 * Semua tulis lewat server action (divalidasi `users:manage` di server). Guard
 * bisnis (super admin terakhir, tidak ubah peran/hapus diri sendiri) juga
 * ditegakkan server-side; di sini hanya penyaringan kenyamanan.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getRoleList,
  rbacTablesReady,
  type AdminUserRow,
  type RoleRow,
} from "@/lib/queries/rbac";
import {
  fetchUsersPage,
  inviteUser,
  changeUserRole,
  toggleUserActive,
  resetUserPassword,
  deleteUser,
} from "./actions";
import { RbacSqlNotice } from "./RolesTab";
import { FilterBar, type FilterGroup } from "@/components/admin/FilterBar";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import {
  User,
  UserPlus,
  CheckCircle,
  XCircle,
  Users,
  UsersThree,
  CaretLeft,
  CaretRight,
  X,
  Warning,
  Trash,
  Key,
  Crown,
  ShieldCheck,
  Envelope,
  Clock,
} from "@/components/Icons";

const PAGE_SIZE = 10;

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Crown },
  ADMIN_SEKOLAH: { label: "Admin Sekolah", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: ShieldCheck },
  OPERATOR_KONTEN: { label: "Operator Konten", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: ShieldCheck },
  PANITIA_SPMB: { label: "Panitia SPMB", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: ShieldCheck },
};

type SortField = "full_name" | "system_role" | "is_active" | "last_login_at" | "created_at";
type SortDir = "asc" | "desc";

export function UsersTab({ currentUserId }: { currentUserId: string | null }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    superAdmins: 0,
    noRole: 0,
    byRole: {} as Record<string, number>,
  });
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Modal & panel
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("OPERATOR_KONTEN");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [editRoleItem, setEditRoleItem] = useState<AdminUserRow | null>(null);
  const [editRoleKey, setEditRoleKey] = useState("");
  const [deleteItem, setDeleteItem] = useState<AdminUserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Pencarian di-debounce 300ms sebelum diteruskan ke server.
  useEffect(() => {
    if (search === debouncedSearch) return;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, debouncedSearch]);

  /** Muat halaman dari server action (filter/sort/paginasi di server). */
  const load = useCallback(async () => {
    // Tidak memanggil setLoading(true) di sini: `loading` sudah true pada
    // mount (state awal), dan saat muat ulang (setelah simpan) tombol sudah
    // menampilkan spinner sendiri — tanpa kedip layar penuh.
    const ok = await rbacTablesReady();
    setReady(ok);
    const [u, r] = await Promise.all([
      fetchUsersPage({
        page,
        role: roleFilter,
        status: statusFilter as "all" | "active" | "inactive",
        search: debouncedSearch,
        sortField,
        sortDir,
      }),
      ok ? getRoleList() : Promise.resolve([]),
    ]);
    if (r) setRoles(r);
    if (u.success && u.rows && u.stats) {
      setUsers(u.rows);
      setTotal(u.total ?? u.rows.length);
      setStats(u.stats);
    } else if (u.error) {
      toast(u.error, "error");
    }
    setLoading(false);
  }, [page, roleFilter, statusFilter, debouncedSearch, sortField, sortDir, toast]);

  // Faktor-faktor "permintaan" — setiap perubahan memicu muat ulang dari server.
  useEffect(() => {
    // Panggil lewat microtask agar bukan "setState sinkron dalam effect".
    queueMicrotask(() => {
      load().catch(() => {});
    });
  }, [load]);

  const roleKeys = useMemo(() => {
    if (roles.length > 0) return roles.map((r) => r.key);
    return ["SUPER_ADMIN", "ADMIN_SEKOLAH", "OPERATOR_KONTEN", "PANITIA_SPMB"];
  }, [roles]);

  const roleFilterGroup: FilterGroup = {
    value: roleFilter,
    options: [
      { key: "all", label: "Semua Peran", count: stats.total },
      ...roleKeys.map((key) => ({
        key,
        label: ROLE_BADGE[key]?.label ?? key,
        count: stats.byRole[key] ?? 0,
      })),
      {
        key: "—",
        label: "Belum diatur",
        count: stats.noRole,
      },
    ],
    onChange: (k) => {
      setRoleFilter(k);
      setPage(1);
    },
    menuLabel: "Filter peran",
  };

  const statusFilterGroup: FilterGroup = {
    value: statusFilter,
    options: [
      { key: "all", label: "Semua Status", count: stats.total },
      { key: "active", label: "Aktif", count: stats.active },
      { key: "inactive", label: "Tidak Aktif", count: stats.inactive },
    ],
    onChange: (k) => {
      setStatusFilter(k);
      setPage(1);
    },
    menuLabel: "Filter status",
  };

  // Filter + sort + paginasi telah dijalankan di server (fetchUsersPage);
  // rows di sini adalah isi halaman aktif.
  const paginated = users;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <span aria-hidden>▲</span>
    ) : (
      <span aria-hidden>▼</span>
    );
  };

  async function handleInvite() {
    setInviteSaving(true);
    const res = await inviteUser({
      email: inviteEmail,
      fullName: inviteName,
      roleKey: inviteRole,
    });
    setInviteSaving(false);
    if (res.success) {
      toast("Undangan pengguna terkirim", "success");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      await load();
    } else {
      toast(res.error ?? "Gagal mengundang pengguna", "error");
    }
  }

  async function handleSaveRole() {
    if (!editRoleItem) return;
    setBusyId(editRoleItem.id);
    const res = await changeUserRole(editRoleItem.id, editRoleKey);
    setBusyId(null);
    if (res.success) {
      toast("Peran berhasil diubah", "success");
      setEditRoleItem(null);
      await load();
    } else {
      toast(res.error ?? "Gagal mengubah peran", "error");
    }
  }

  async function handleToggleActive(item: AdminUserRow) {
    setBusyId(item.id);
    const res = await toggleUserActive(item.id, !item.is_active);
    setBusyId(null);
    if (res.success) {
      toast("Status berhasil diubah", "success");
      await load();
    } else {
      toast(res.error ?? "Gagal mengubah status", "error");
    }
  }

  async function handleResetPassword(item: AdminUserRow) {
    setBusyId(item.id);
    const res = await resetUserPassword(item.id);
    setBusyId(null);
    if (res.success) {
      // `res.error` dipakai untuk pesan peringatan lunak (email gagal tapi flag
      // sudah disetel) — tampilkan sebagai info, bukan error.
      if (res.error) toast(res.error, "info");
      else toast("Tautan reset password dikirim & wajib ganti saat login", "success");
    } else {
      toast(res.error ?? "Gagal mereset password", "error");
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setBusyId(deleteItem.id);
    const res = await deleteUser(deleteItem.id);
    setBusyId(null);
    if (res.success) {
      toast("Pengguna berhasil dihapus", "success");
      setDeleteItem(null);
      await load();
    } else {
      toast(res.error ?? "Gagal menghapus pengguna", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200/80 bg-white py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
        <p className="text-sm text-slate-500">Memuat data pengguna...</p>
      </div>
    );
  }

  if (!ready) return <RbacSqlNotice />;

  return (
    <div className="space-y-5">
      {/* Header + statistik */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatPillGroup>
          <StatPill icon={UsersThree} label="Total" value={stats.total} tone="neutral" />
          <StatPill icon={CheckCircle} label="Aktif" value={stats.active} tone="success" />
          <StatPill icon={XCircle} label="Tidak Aktif" value={stats.inactive} tone="danger" />
          <StatPill icon={Crown} label="Super Admin" value={stats.superAdmins} tone="purple" />
        </StatPillGroup>
      </div>

      {/* Peringatan akun tanpa peran */}
      {stats.noRole > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Warning className="h-4 w-4 shrink-0" />
          <span>{stats.noRole} akun belum memiliki peran</span>
        </div>
      )}

      {/* Filter + tombol undang */}
      <FilterBar
        placeholder="Cari nama atau email..."
        searchLabel="Cari pengguna"
        query={search}
        onQueryChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        filters={[roleFilterGroup, statusFilterGroup]}
        action={
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            aria-label="Undang Pengguna"
            title="Undang Pengguna"
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)] sm:px-4"
          >
            <UserPlus className="h-4 w-4" />
            {/* Teks disembunyikan <sm — baris filter mobile sempit; ikon + title cukup. */}
            <span className="hidden sm:inline">Undang Pengguna</span>
          </button>
        }
      />

      {/* Tabel */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none"
                  onClick={() => toggleSort("full_name")}
                >
                  <span className="flex items-center gap-1">Pengguna {sortIcon("full_name")}</span>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none"
                  onClick={() => toggleSort("system_role")}
                >
                  <span className="flex items-center gap-1">Peran {sortIcon("system_role")}</span>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none"
                  onClick={() => toggleSort("is_active")}
                >
                  <span className="flex items-center gap-1">Status {sortIcon("is_active")}</span>
                </th>
                <th
                  className="hidden cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none lg:table-cell"
                  onClick={() => toggleSort("last_login_at")}
                >
                  <span className="flex items-center gap-1">Login Terakhir {sortIcon("last_login_at")}</span>
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <Users className="h-8 w-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Tidak ada pengguna ditemukan</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {search ? "Coba kata kunci lain" : "Belum ada pengguna"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const badge = item.system_role
                    ? ROLE_BADGE[item.system_role]
                    : undefined;
                  const isSelf = currentUserId === item.id;
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
                            <User className="h-5 w-5 text-[var(--brand-primary)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                              <span className="truncate">{item.full_name}</span>
                              {isSelf && (
                                <span className="shrink-0 rounded bg-[var(--brand-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]">
                                  Anda
                                </span>
                              )}
                            </p>
                            {item.email && (
                              <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                                <Envelope className="h-3 w-3 shrink-0" />
                                {item.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {badge ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.bg} ${badge.color}`}
                          >
                            <badge.icon className="h-3 w-3" />
                            {badge.label}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              <Warning className="h-3 w-3" />
                              Belum diatur
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditRoleItem(item);
                                setEditRoleKey("");
                              }}
                              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                              aria-label={`Atur peran untuk ${item.full_name}`}
                            >
                              Atur peran
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          disabled={busyId === item.id || isSelf}
                          onClick={() => handleToggleActive(item)}
                          title={isSelf ? "Tidak bisa menonaktifkan diri sendiri" : undefined}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                            item.is_active
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          {item.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {item.is_active ? "Aktif" : "Tidak Aktif"}
                        </button>
                      </td>
                      <td className="hidden px-4 py-3.5 text-xs text-slate-500 lg:table-cell">
                        {item.last_login_at ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {new Date(item.last_login_at).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">Belum pernah</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => {
                              setEditRoleItem(item);
                              setEditRoleKey(item.system_role ?? "");
                            }}
                            title={isSelf ? "Tidak bisa mengubah peran diri sendiri" : "Ubah Peran"}
                            aria-label={isSelf ? "Tidak bisa mengubah peran diri sendiri" : "Ubah Peran"}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={!item.email || busyId === item.id}
                            onClick={() => handleResetPassword(item)}
                            title={item.email ? "Reset Password" : "Pengguna belum punya email"}
                            aria-label={item.email ? "Reset Password" : "Pengguna belum punya email"}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf || busyId === item.id}
                            onClick={() => setDeleteItem(item)}
                            title={isSelf ? "Tidak bisa menghapus diri sendiri" : "Hapus Pengguna"}
                            aria-label={isSelf ? "Tidak bisa menghapus diri sendiri" : "Hapus Pengguna"}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent ml-1"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari{" "}
              {total} pengguna
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    p === page
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── UNDANG PENGGUNA ─────────────────────────── */}
      {inviteOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setInviteOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Undang Pengguna</h3>
                <p className="text-sm text-slate-500">
                  Undangan dikirim ke email; pengguna akan diminta mengganti password saat login.
                </p>
              </div>
              <button
                onClick={() => setInviteOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label="Nama Lengkap"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nama lengkap"
              />
              <Input
                label="Email"
                required
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nama@sekolah.sch.id"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--brand-primary)]">
                  Peran <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {roleKeys.map((key) => {
                    const badge = ROLE_BADGE[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setInviteRole(key)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          inviteRole === key
                            ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 ring-2 ring-[var(--brand-accent)]/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge?.bg ?? "bg-slate-100 border-slate-200 text-slate-600"} ${badge?.color ?? ""}`}
                        >
                          {badge?.label ?? key}
                        </span>
                        {inviteRole === key && <CheckCircle className="ml-auto h-5 w-5 text-[var(--brand-accent)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setInviteOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteSaving || !inviteName || !inviteEmail}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-60"
              >
                {inviteSaving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Kirim Undangan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UBAH PERAN ──────────────────────────────── */}
      {editRoleItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setEditRoleItem(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ubah Peran</h3>
                <p className="text-sm text-slate-500">{editRoleItem.full_name}</p>
              </div>
              <button
                onClick={() => setEditRoleItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {roleKeys.map((key) => {
                const badge = ROLE_BADGE[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEditRoleKey(key)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      editRoleKey === key
                        ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 ring-2 ring-[var(--brand-accent)]/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge?.bg ?? "bg-slate-100 border-slate-200 text-slate-600"} ${badge?.color ?? ""}`}
                    >
                      {badge?.label ?? key}
                    </span>
                    {editRoleKey === key && <CheckCircle className="ml-auto h-5 w-5 text-[var(--brand-accent)]" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEditRoleItem(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRole}
                disabled={busyId === editRoleItem.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-60"
              >
                {busyId === editRoleItem.id ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Simpan Peran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HAPUS PENGGUNA ──────────────────────────── */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Pengguna?"
        description={`"${deleteItem?.full_name}" akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        variant="danger"
        loading={busyId === deleteItem?.id}
      />
    </div>
  );
}
