"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getProfileList,
  updateProfileRole,
  updateProfileStatus,
  deleteProfile,
  deleteProfileBulk,
} from "@/lib/queries";
import type { UserProfile } from "@/lib/auth";
import {
  User,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Users,
  CaretLeft,
  CaretRight,
  X,
  Warning,
  FloppyDisk,
  ArrowUp,
  ArrowDown,
  SortAscending,
  Checks,
  Trash,
  PencilSimple,
} from "@/components/Icons";

const PAGE_SIZE = 10;

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  developer: { label: "Developer", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  admin: { label: "Administrator", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  publisher: { label: "Publisher", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  teacher: { label: "Guru", color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
  student: { label: "Siswa", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
};

type SortField = "full_name" | "role" | "is_active" | "created_at";
type SortDir = "asc" | "desc";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [deleteItem, setDeleteItem] = useState<UserProfile | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  // Edit panel
  const [editItem, setEditItem] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    const data = await getProfileList();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const roles = useMemo(() => [...new Set(users.map((u) => u.role))], [users]);

  const filtered = useMemo(() => {
    let result = users.filter((item) => {
      const matchSearch = item.full_name.toLowerCase().includes(search.toLowerCase());
      const matchRole = filter === "all" || item.role === filter;
      return matchSearch && matchRole;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "full_name") cmp = a.full_name.localeCompare(b.full_name);
      else if (sortField === "role") cmp = (a.role || "").localeCompare(b.role || "");
      else if (sortField === "is_active") cmp = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
      else if (sortField === "created_at") cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [users, search, filter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
  };

  const allVisibleSelected = paginated.length > 0 && paginated.every((item) => selectedIds.has(item.id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      const s = new Set(selectedIds);
      paginated.forEach((item) => s.delete(item.id));
      setSelectedIds(s);
    } else {
      const s = new Set(selectedIds);
      paginated.forEach((item) => s.add(item.id));
      setSelectedIds(s);
    }
  }

  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedIds(s);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  function openEdit(item: UserProfile) {
    setEditItem(item);
    setEditRole(item.role);
    setEditSaving(false);
  }

  async function handleSaveRole() {
    if (!editItem) return;
    setEditSaving(true);
    await updateProfileRole(editItem.id, editRole);
    setEditSaving(false);
    setEditItem(null);
    fetchUsers();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    await deleteProfile(deleteItem.id);
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchUsers();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteProfileBulk(ids);
    setSelectedIds(new Set());
    setBulkDelete(false);
    fetchUsers();
  }

  async function handleToggleActive(item: UserProfile) {
    await updateProfileStatus(item.id, !item.is_active);
    fetchUsers();
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <SortAscending className="h-3 w-3 text-slate-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-[#1767b1]" />
      : <ArrowDown className="h-3 w-3 text-[#1767b1]" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#082b59]/10">
            <User className="h-5 w-5 text-[#082b59]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola Pengguna</h1>
            <p className="text-sm text-slate-500">Manajemen akun dan role pengguna</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-[#082b59]", bg: "bg-[#082b59]/5 border-[#082b59]/10" },
          { label: "Aktif", value: stats.active, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Tidak Aktif", value: stats.inactive, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 sm:p-4 ${s.bg}`}>
            <p className="text-xl font-bold text-slate-800 sm:text-2xl">{s.value}</p>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#082b59]/20 bg-[#082b59]/5 px-4 py-2.5">
          <Checks className="h-4 w-4 text-[#082b59]" />
          <span className="text-xs font-semibold text-[#082b59]">{selectedIds.size} dipilih</span>
          <button onClick={() => setBulkDelete(true)} className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Hapus</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button onClick={() => { setFilter("all"); setPage(1); setSelectedIds(new Set()); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === "all" ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Semua
          </button>
          {roles.map((role) => (
            <button key={role} onClick={() => { setFilter(role); setPage(1); setSelectedIds(new Set()); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === role ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {roleConfig[role]?.label || role}
            </button>
          ))}
        </div>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari pengguna..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 sm:w-72"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[#082b59] focus:ring-[#1767b1]" />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">No</th>
                <th className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none" onClick={() => toggleSort("full_name")}>
                  <span className="flex items-center gap-1">Pengguna <SortIcon field="full_name" /></span>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none" onClick={() => toggleSort("role")}>
                  <span className="flex items-center gap-1">Role <SortIcon field="role" /></span>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none" onClick={() => toggleSort("is_active")}>
                  <span className="flex items-center gap-1">Status <SortIcon field="is_active" /></span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center gap-1">Dibuat <SortIcon field="created_at" /></span>
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data pengguna...</p>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pengguna"}</p>
                    </div>
                  </div>
                </td></tr>
              ) : (
                paginated.map((item, index) => (
                  <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[#082b59]/[0.03]" : ""}`}>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#082b59] focus:ring-[#1767b1]" />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#082b59]/10">
                          <User className="h-5 w-5 text-[#082b59]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.full_name}</p>
                          <p className="text-xs text-slate-400">{item.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${roleConfig[item.role]?.bg || "bg-slate-100 text-slate-600 border-slate-200"} ${roleConfig[item.role]?.color || ""}`}>
                        {roleConfig[item.role]?.label || item.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        }`}>
                        {item.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {item.is_active ? "Aktif" : "Tidak Aktif"}
                      </button>
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-500 sm:table-cell">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit Role">
                          <PencilSimple className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteItem(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} pengguna
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[#082b59] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── EDIT ROLE SLIDE-OVER ──────────────────── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !editSaving && setEditItem(null)} />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Edit Role</h2>
                <p className="text-xs text-slate-400">{editItem.full_name}</p>
              </div>
              <button onClick={() => setEditItem(null)} disabled={editSaving}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Role Pengguna</label>
                  <div className="space-y-2">
                    {Object.entries(roleConfig).map(([key, cfg]) => (
                      <button key={key} type="button" onClick={() => setEditRole(key)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          editRole === key
                            ? "border-[#1767b1] bg-[#1767b1]/10 ring-2 ring-[#1767b1]/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${cfg.bg}`}>
                          <User className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{cfg.label}</p>
                          <p className="text-xs text-slate-400">{key}</p>
                        </div>
                        {editRole === key && (
                          <CheckCircle className="ml-auto h-5 w-5 text-[#1767b1]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400">Info Pengguna</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500">Nama:</span> <span className="font-medium text-slate-800">{editItem.full_name}</span></div>
                    <div><span className="text-slate-500">Status:</span> <span className={`font-medium ${editItem.is_active ? "text-emerald-600" : "text-red-600"}`}>{editItem.is_active ? "Aktif" : "Tidak Aktif"}</span></div>
                    <div className="col-span-2"><span className="text-slate-500">ID:</span> <span className="font-medium text-slate-800 font-mono text-xs">{editItem.id}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={() => setEditItem(null)} disabled={editSaving}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                Batal
              </button>
              <button onClick={handleSaveRole} disabled={editSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#082b59] py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1] disabled:opacity-70">
                {editSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <FloppyDisk className="h-4 w-4" />
                    Simpan Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      {deleteItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteItem(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus Pengguna?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">&ldquo;{deleteItem.full_name}&rdquo; akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDeleteItem(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK DELETE CONFIRM ─────────────────────── */}
      {bulkDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setBulkDelete(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus {selectedIds.size} Pengguna?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Semua pengguna yang dipilih akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setBulkDelete(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={handleBulkDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
