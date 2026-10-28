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
import { useRouter } from "next/navigation";
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
  setUserPasswordDirect,
  deleteUser,
  renameUser,
  toggleUsersActiveBulk,
  deleteUsersBulk,
  getUserSessions,
  forceLogoutUser,
  type UserSessionInfo,
} from "./actions";
import { RbacSqlNotice } from "./RolesTab";
import { validateNewPasswordPair, MIN_PASSWORD_LENGTH } from "@/lib/users-password";
import { FilterBar, type FilterGroup } from "@/components/admin/FilterBar";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { RowActionsMenu, type RowAction } from "@/components/admin/mobile";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { formatRelativeTime } from "@/lib/admin-display";
import {
  User,
  UserPlus,
  CheckCircle,
  Copy,
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
  PencilSimple,
  DeviceMobile,
  Scroll,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeSlash,
  Lock,
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

/** Warna hover per jenis aksi — dipakai kolom Aksi di tabel desktop. */
const ICON_ACTION_TONE = {
  blue: "hover:bg-blue-50 hover:text-blue-600",
  emerald: "hover:bg-emerald-50 hover:text-emerald-600",
  slate: "hover:bg-slate-100 hover:text-slate-700",
  danger: "hover:bg-red-50 hover:text-red-600",
  cyan: "hover:bg-cyan-50 hover:text-cyan-600",
  amber: "hover:bg-amber-50 hover:text-amber-600",
} as const;

type IconActionTone = keyof typeof ICON_ACTION_TONE;

/**
 * Tombol ikon 28×28 di kolom Aksi (desktop). Aksi sekunder ada di menu ⋯
 * supaya kolom tidak perlu selebar 7 ikon.
 */
function IconAction({
  action,
  tone,
}: {
  action: {
    key: string;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
    run: () => void;
  };
  tone: IconActionTone;
}) {
  return (
    <button
      type="button"
      onClick={action.run}
      disabled={action.disabled}
      title={action.label}
      aria-label={action.label}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand-accent)] ${ICON_ACTION_TONE[tone]}`}
    >
      {action.icon}
    </button>
  );
}

export function UsersTab({ currentUserId }: { currentUserId: string | null }) {
  const { toast } = useToast();
  const router = useRouter();
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

  // Tautan reset password (dibuat server, dibagikan admin secara manual).
  const [recoveryLinkItem, setRecoveryLinkItem] = useState<{
    name: string;
    email: string;
    link: string;
  } | null>(null);

  // Set password langsung (tanpa email/tautan).
  const [setPasswordItem, setSetPasswordItem] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Bulk (aksi massal) — hanya baris terlihat; akun sendiri tidak bisa dipilih.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<"activate" | "deactivate" | "delete" | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Edit nama
  const [renameItem, setRenameItem] = useState<AdminUserRow | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Sesi perangkat user
  const [sessionsItem, setSessionsItem] = useState<AdminUserRow | null>(null);
  const [sessionsList, setSessionsList] = useState<UserSessionInfo[] | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [kickConfirmItem, setKickConfirmItem] = useState<AdminUserRow | null>(null);
  const [kickBusy, setKickBusy] = useState(false);

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

  // ── Bulk ────────────────────────────────────────────────────────────────
  const selectable = users.filter((u) => u.id !== currentUserId);
  const allVisibleSelected = selectable.length > 0 && selectable.every((u) => selectedIds.has(u.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) selectable.forEach((u) => next.delete(u.id));
      else selectable.forEach((u) => next.add(u.id));
      return next;
    });
  }

  async function handleBulkActive(active: boolean) {
    setBulkBusy(true);
    const res = await toggleUsersActiveBulk(Array.from(selectedIds), active);
    setBulkBusy(false);
    if (!res.success) {
      toast(res.error || "Aksi massal gagal.", "error");
      if (res.skipped && res.success === false && res.error?.includes("dilewati")) {
        setSelectedIds(new Set());
      }
      return;
    }
    toast(
      res.skipped
        ? `${selectedIds.size - res.skipped} pengguna ${active ? "diaktifkan" : "dinonaktifkan"}, ${res.skipped} dilewati.`
        : `Berhasil ${active ? "mengaktifkan" : "menonaktifkan"} pengguna terpilih.`,
      "success"
    );
    setSelectedIds(new Set());
    load().catch(() => {});
  }

  async function handleBulkDelete() {
    setBulkBusy(true);
    const res = await deleteUsersBulk(Array.from(selectedIds));
    setBulkBusy(false);
    if (!res.success) {
      toast(res.error || "Hapus massal gagal.", "error");
      return;
    }
    toast(
      res.skipped ? `${selectedIds.size - res.skipped} dihapus, ${res.skipped} dilewati.` : "Pengguna terpilih dihapus.",
      "success"
    );
    setSelectedIds(new Set());
    load().catch(() => {});
  }

  // ── Rename ──────────────────────────────────────────────────────────────
  async function handleRename() {
    if (!renameItem) return;
    setRenameSaving(true);
    const res = await renameUser(renameItem.id, renameName);
    setRenameSaving(false);
    if (!res.success) {
      toast(res.error || "Gagal mengganti nama.", "error");
      return;
    }
    toast("Nama pengguna diperbarui.", "success");
    setRenameItem(null);
    load().catch(() => {});
  }

  // ── Sesi perangkat ──────────────────────────────────────────────────────
  async function openSessions(item: AdminUserRow) {
    setSessionsItem(item);
    setSessionsList(null);
    setSessionsLoading(true);
    const res = await getUserSessions(item.id);
    setSessionsLoading(false);
    if (!res.success || !res.sessions) {
      toast(res.error || "Gagal memuat sesi pengguna.", "error");
      setSessionsList([]);
      return;
    }
    setSessionsList(res.sessions);
  }

  async function handleForceLogout() {
    if (!kickConfirmItem) return;
    setKickBusy(true);
    const res = await forceLogoutUser(kickConfirmItem.id);
    setKickBusy(false);
    if (!res.success) {
      toast(res.error || "Gagal mengeluarkan sesi.", "error");
      return;
    }
    toast(`Semua sesi ${kickConfirmItem.full_name} telah dikeluarkan.`, "success");
    setKickConfirmItem(null);
    if (sessionsItem) openSessions(sessionsItem);
  }

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

  // Ikon sort seragam dengan halaman admin lain (achievements, activities, dsb.).
  const sortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[var(--brand-accent)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--brand-accent)]" />
    );
  };

  /**
   * Render header kolom yang bisa diurutkan (fungsi, bukan komponen — lint
   * react-hooks melarang komponen yang dibuat di dalam render).
   *
   * Tombol di dalam <th> (bukan onClick pada <th>): tombol di kolom Data/Status
   * tidak lagi memicu sort tak sengaja, dan keyboard bisa menjangkau header.
   * aria-sort memberi tahu pembaca layar arah urutan aktif.
   */
  function renderSortHeader({
    field,
    children,
    className = "",
    align = "left",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
    align?: "left" | "center";
  }) {
    const active = sortField === field;
    return (
      <th
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
        className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${className}`}
      >
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className={`flex w-full items-center gap-1 rounded transition-colors hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${
            align === "center" ? "justify-center" : "justify-start text-left"
          } ${active ? "text-slate-600" : ""}`}
        >
          {children} {sortIcon(field)}
        </button>
      </th>
    );
  }

  /**
   * Daftar aksi satu baris — SATU sumber untuk tabel desktop dan kartu mobile.
   * `primary` = tampil sebagai ikon di kolom Aksi; sisanya masuk menu ⋯.
   */
  function rowActions(item: AdminUserRow) {
    const isSelf = item.id === currentUserId;
    const busy = busyId === item.id;
    return {
      rename: {
        key: "rename",
        label: "Edit Nama",
        icon: <PencilSimple className="h-4 w-4" />,
        disabled: false,
        run: () => {
          setRenameItem(item);
          setRenameName(item.full_name);
        },
      },
      sessions: {
        key: "sessions",
        label: "Sesi Perangkat",
        icon: <DeviceMobile className="h-4 w-4" />,
        disabled: isSelf,
        run: () => openSessions(item),
      },
      logs: {
        key: "logs",
        label: "Riwayat Aktivitas",
        icon: <Scroll className="h-4 w-4" />,
        disabled: false,
        run: () =>
          router.push(
            `/admin/logs?user=${encodeURIComponent(item.id)}&nama=${encodeURIComponent(item.full_name)}`
          ),
      },
      role: {
        key: "role",
        label: "Ubah Peran",
        icon: <ShieldCheck className="h-4 w-4" />,
        disabled: isSelf,
        run: () => {
          setEditRoleItem(item);
          setEditRoleKey(item.system_role ?? "");
        },
      },
      reset: {
        key: "reset",
        label: "Reset Password (tautan)",
        icon: <Key className="h-4 w-4" />,
        disabled: !item.email || busy,
        run: () => handleResetPassword(item),
      },
      setPassword: {
        key: "set-password",
        label: "Set Password Langsung",
        icon: <Lock className="h-4 w-4" />,
        disabled: busy,
        run: () => openSetPassword(item),
      },
      remove: {
        key: "remove",
        label: "Hapus Pengguna",
        icon: <Trash className="h-4 w-4" />,
        danger: true,
        disabled: isSelf || busy,
        run: () => setDeleteItem(item),
      },
    };
  }

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
    if (!res.success) {
      toast(res.error ?? "Gagal mereset password", "error");
      return;
    }

    // Selalu ada tautan (dibuat di server); email TIDAK dikirim dari panel,
    // jadi admin wajib membagikan tautan ini secara manual.
    if (res.recoveryLink) {
      setRecoveryLinkItem({
        name: item.full_name,
        email: item.email ?? "",
        link: res.recoveryLink,
      });
      toast("Tautan reset dibuat. Salin & kirim ke pengguna.", "success");
      return;
    }

    toast(res.error ?? "Gagal membuat tautan reset", "error");
  }

  async function copyRecoveryLink() {
    if (!recoveryLinkItem) return;
    try {
      await navigator.clipboard.writeText(recoveryLinkItem.link);
      toast("Tautan disalin ke clipboard.", "success");
    } catch {
      toast("Gagal menyalin otomatis. Pilih kolom tautan lalu salin manual.", "error");
    }
  }

  function openSetPassword(item: AdminUserRow) {
    setSetPasswordItem(item);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  function closeSetPassword() {
    setSetPasswordItem(null);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  async function handleSetPassword() {
    if (!setPasswordItem) return;
    const validation = validateNewPasswordPair(newPassword, confirmPassword);
    if (!validation.ok) {
      toast(validation.error, "error");
      return;
    }

    setPasswordSaving(true);
    const res = await setUserPasswordDirect(setPasswordItem.id, newPassword);
    setPasswordSaving(false);

    if (!res.success) {
      toast(res.error ?? "Gagal mengubah password.", "error");
      return;
    }

    closeSetPassword();
    await load();
    toast(
      res.error ?? `Password ${setPasswordItem.full_name} berhasil diubah.`,
      res.error ? "info" : "success"
    );
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

      {/* Bulk bar — muncul saat ada pilihan */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5">
          <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button data-busy
              type="button"
              disabled={bulkBusy}
              onClick={() => handleBulkActive(true)}
              className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Aktifkan
            </button>
            <button data-busy
              type="button"
              disabled={bulkBusy}
              onClick={() => setBulkConfirm("deactivate")}
              className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
            >
              Nonaktifkan
            </button>
            <button data-busy data-solid="danger"
              type="button"
              disabled={bulkBusy}
              onClick={() => setBulkConfirm("delete")}
              className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              aria-label="Hapus pilihan"
              title="Hapus pilihan"
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabel — desktop/tablet. Di bawah md dipakai daftar kartu (tanpa
          scroll horizontal 7 kolom yang membuat ikon aksi bertumpuk). */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    aria-label="Pilih semua yang tampil"
                    className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-primary)]"
                  />
                </th>
                {renderSortHeader({ field: "full_name", children: "Pengguna" })}
                {renderSortHeader({ field: "system_role", className: "w-44 whitespace-nowrap", children: "Peran" })}
                {renderSortHeader({ field: "is_active", className: "w-28", align: "center", children: "Status" })}
                {renderSortHeader({ field: "last_login_at", className: "hidden w-48 whitespace-nowrap lg:table-cell", children: "Login Terakhir" })}
                <th className="w-36 whitespace-nowrap px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
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
                  const badge = item.system_role ? ROLE_BADGE[item.system_role] : undefined;
                  const isSelf = currentUserId === item.id;
                  const a = rowActions(item);
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          disabled={isSelf}
                          aria-label={`Pilih ${item.full_name}${isSelf ? " (akun sendiri tidak bisa dipilih)" : ""}`}
                          title={isSelf ? "Akun sendiri tidak bisa dipilih untuk aksi massal" : undefined}
                          className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-primary)]"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
                            <User className="h-5 w-5 text-[var(--brand-primary)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                              <span className="truncate" title={item.full_name}>
                                {item.full_name}
                              </span>
                              {isSelf && (
                                <span className="shrink-0 rounded bg-[var(--brand-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]">
                                  Anda
                                </span>
                              )}
                            </p>
                            {item.email && (
                              <p
                                className="flex items-center gap-1 truncate text-xs text-slate-400"
                                title={item.email}
                              >
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
                            className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.bg} ${badge.color}`}
                            title={badge.label}
                          >
                            <badge.icon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{badge.label}</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              <Warning className="h-3 w-3 shrink-0" />
                              Belum diatur
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditRoleItem(item);
                                setEditRoleKey("");
                              }}
                              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-amber-600 transition-colors hover:bg-amber-50"
                              aria-label={`Atur peran untuk ${item.full_name}`}
                            >
                              Atur peran
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          disabled={busyId === item.id || isSelf}
                          onClick={() => handleToggleActive(item)}
                          title={isSelf ? "Tidak bisa menonaktifkan diri sendiri" : undefined}
                          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
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
                          <span className="flex items-center gap-1 whitespace-nowrap tabular-nums">
                            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
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
                        <div className="flex items-center justify-end gap-0.5">
                          <IconAction action={a.rename} tone="blue" />
                          <IconAction action={a.role} tone="blue" />
                          <IconAction action={a.setPassword} tone="emerald" />
                          <RowActionsMenu
                            label={item.full_name}
                            actions={
                              [a.reset, a.sessions, a.logs, a.remove].filter(
                                (x) => !x.disabled
                              ) as RowAction[]
                            }
                          />
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
                aria-label="Halaman sebelumnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
              >
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-current={p === page ? "page" : undefined}
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
                aria-label="Halaman berikutnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
              >
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Daftar kartu — mobile (<md). Semua aksi tetap tersedia lewat menu ⋯. */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Users className="h-7 w-7 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Tidak ada pengguna ditemukan</p>
              <p className="mt-1 text-xs text-slate-400">
                {search ? "Coba kata kunci lain" : "Belum ada pengguna"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Pilih semua — hanya untuk halaman aktif, sama seperti header tabel. */}
            <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                aria-label="Pilih semua yang tampil"
                className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-primary)]"
              />
              <span className="text-xs font-medium text-slate-500">
                Pilih semua di halaman ini
              </span>
            </div>
            <ul role="list" className="divide-y divide-slate-100">
            {paginated.map((item) => {
              const badge = item.system_role ? ROLE_BADGE[item.system_role] : undefined;
              const isSelf = currentUserId === item.id;
              const a = rowActions(item);
              return (
                <li key={item.id} className="flex items-start gap-3 px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    disabled={isSelf}
                    aria-label={`Pilih ${item.full_name}${isSelf ? " (akun sendiri tidak bisa dipilih)" : ""}`}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-[var(--brand-primary)]"
                  />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
                    <User className="h-5 w-5 text-[var(--brand-primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      <span className="truncate">{item.full_name}</span>
                      {isSelf && (
                        <span className="shrink-0 rounded bg-[var(--brand-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]">
                          Anda
                        </span>
                      )}
                    </p>
                    {item.email && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                        <Envelope className="h-3 w-3 shrink-0" />
                        {item.email}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {badge ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.bg} ${badge.color}`}
                        >
                          <badge.icon className="h-3 w-3 shrink-0" />
                          {badge.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <Warning className="h-3 w-3 shrink-0" />
                          Belum diatur
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={busyId === item.id || isSelf}
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                          item.is_active
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {item.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {item.is_active ? "Aktif" : "Tidak Aktif"}
                      </button>
                    </div>
                    {item.last_login_at && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3 shrink-0" />
                        Login terakhir:{" "}
                        {new Date(item.last_login_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                  <RowActionsMenu
                    label={item.full_name}
                    actions={
                      [a.rename, a.role, a.setPassword, a.reset, a.sessions, a.logs, a.remove].filter(
                        (x) => !x.disabled
                      ) as RowAction[]
                    }
                  />
                </li>
              );
            })}
            </ul>
          </>
        )}
        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3">
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari{" "}
              {total} pengguna
            </p>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Halaman sebelumnya"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors"
              >
                <CaretLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Halaman berikutnya"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors"
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
              <button data-solid data-busy={inviteSaving ? "" : undefined}
                onClick={handleInvite}
                disabled={inviteSaving || !inviteName || !inviteEmail}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]"
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
              <button data-solid data-busy
                onClick={handleSaveRole}
                disabled={busyId === editRoleItem.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]"
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

      {/* ── Tautan reset password (cadangan) ─────────── */}
      {recoveryLinkItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setRecoveryLinkItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Tautan Reset Password</h3>
                <p className="text-sm text-slate-500">
                  {recoveryLinkItem.name}
                  {recoveryLinkItem.email ? ` · ${recoveryLinkItem.email}` : ""}
                </p>
              </div>
              <button
                onClick={() => setRecoveryLinkItem(null)}
                aria-label="Tutup"
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
              <Warning className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Panel <strong>tidak mengirim email</strong>. Bagikan tautan di bawah
                secara manual (WhatsApp/email sekolah). Tautan berlaku{" "}
                <strong>sekali</strong> dan kedaluwarsa dalam ±1 jam.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="break-all font-mono text-[11px] leading-relaxed text-slate-600">
                {recoveryLinkItem.link}
              </p>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Pengguna akan diminta mengganti password sebelum bisa memakai panel.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setRecoveryLinkItem(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={copyRecoveryLink}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]"
              >
                <Copy className="h-4 w-4" />
                Salin Tautan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Set password langsung ───────────────────── */}
      {setPasswordItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={closeSetPassword}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Set Password Langsung</h3>
                <p className="text-sm text-slate-500">
                  {setPasswordItem.full_name}
                  {setPasswordItem.email ? ` · ${setPasswordItem.email}` : ""}
                </p>
              </div>
              <button
                onClick={closeSetPassword}
                aria-label="Tutup"
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Password berlaku seketika — tidak mengirim email. Sampaikan password baru
                ke pengguna lewat kanal aman. Status &ldquo;wajib ganti&rdquo; akan
                dimatikan.
              </p>
            </div>

            {setPasswordItem.id === currentUserId && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-700">
                <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Ini akun Anda sendiri. Untuk kenyamanan sehari-hari lebih aman lewat{" "}
                  <button
                    type="button"
                    onClick={() => {
                      closeSetPassword();
                      router.push("/admin/security");
                    }}
                    className="font-semibold underline"
                  >
                    Pengaturan Akun
                  </button>
                  , tetapi jalur ini tetap berguna bila Anda terkunci.
                </p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSetPassword();
              }}
              className="space-y-4"
            >
              <div className="relative">
                <Input
                  label="Password Baru"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-2 top-[30px] rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Input
                label="Konfirmasi Password"
                required
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
              />

              {/* Jelaskan kenapa tombol Simpan mati — jangan biarkan admin
                  menebak. Hanya tampil saat kedua field sudah terisi. */}
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <Warning className="h-3.5 w-3.5 shrink-0" />
                  Konfirmasi password belum cocok.
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeSetPassword}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button data-solid data-busy={passwordSaving ? "" : undefined}
                  type="submit"
                  disabled={
                    passwordSaving ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]"
                >
                  {passwordSaving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Simpan Password
                </button>
              </div>
            </form>
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

      {/* ── Aksi massal ─────────────────────────────── */}
      <ConfirmModal
        open={bulkConfirm === "deactivate"}
        onClose={() => setBulkConfirm(null)}
        onConfirm={() => { setBulkConfirm(null); handleBulkActive(false); }}
        title={`Nonaktifkan ${selectedIds.size} pengguna?`}
        message="Pengguna terpilih akan langsung tidak bisa login. Akun sendiri & Super Admin terakhir otomatis dilewati."
        confirmLabel="Ya, Nonaktifkan"
        variant="danger"
        loading={bulkBusy}
      />
      <ConfirmModal
        open={bulkConfirm === "delete"}
        onClose={() => setBulkConfirm(null)}
        onConfirm={() => { setBulkConfirm(null); handleBulkDelete(); }}
        title={`Hapus ${selectedIds.size} pengguna?`}
        message="Pengguna terpilih dihapus permanen beserta akun auth-nya. Akun sendiri & Super Admin terakhir otomatis dilewati."
        confirmLabel="Ya, Hapus Permanen"
        variant="danger"
        loading={bulkBusy}
      />

      {/* ── Edit nama ───────────────────────────────── */}
      {renameItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setRenameItem(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">Edit Nama Pengguna</h3>
            <p className="mt-1 text-sm text-slate-500">
              Nama tampilan <span className="font-semibold">{renameItem.email || renameItem.full_name}</span>.
            </p>
            <div className="mt-4">
              <Input
                label="Nama tampilan"
                required
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Nama lengkap"
                minLength={2}
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setRenameItem(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button data-solid data-busy={renameSaving ? "" : undefined}
                type="button"
                onClick={handleRename}
                disabled={renameSaving || renameName.trim().length < 2}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]"
              >
                {renameSaving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <PencilSimple className="h-4 w-4" />
                )}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sesi perangkat user ─────────────────────── */}
      {sessionsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setSessionsItem(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Sesi Perangkat</h3>
                <p className="mt-0.5 text-sm text-slate-500 truncate">{sessionsItem.full_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSessionsItem(null)}
                aria-label="Tutup"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
                </div>
              ) : !sessionsList || sessionsList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <DeviceMobile className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Tidak ada sesi aktif tercatat</p>
                  <p className="text-xs text-slate-400">
                    Sesi tercatat saat pengguna membuka panel admin (maks. 30 hari terakhir).
                  </p>
                </div>
              ) : (
                sessionsList.map((s) => (
                  <div key={s.sessionId} className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
                    <p className="text-sm font-semibold text-slate-700">{s.device}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {s.ip || "IP tidak tercatat"} · aktif {formatRelativeTime(s.lastSeenAt)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {sessionsList && sessionsList.length > 0 && (
              <>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setKickConfirmItem(sessionsItem)}
                    className="w-full rounded-xl border border-red-200 bg-white py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Keluarkan semua sesi user ini
                  </button>
                  <p className="mt-1.5 text-center text-[11px] text-slate-400">
                    Semua perangkat user dipaksa login ulang.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Konfirmasi force logout ─────────────────── */}
      <ConfirmModal
        open={!!kickConfirmItem}
        onClose={() => setKickConfirmItem(null)}
        onConfirm={handleForceLogout}
        title="Keluarkan semua sesi?"
        description={kickConfirmItem?.full_name}
        message="Semua perangkat yang login dengan akun ini akan langsung ter-logout."
        confirmLabel="Ya, Keluarkan"
        variant="danger"
        loading={kickBusy}
      />
    </div>
  );
}
