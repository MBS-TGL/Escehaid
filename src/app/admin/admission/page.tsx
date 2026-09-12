"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getRegistrationList,
  updateRegistrationStatus,
  updateRegistrationNotes,
  updateRegistrationBulkStatus,
  deleteRegistration,
  deleteRegistrationBulk,
} from "@/lib/queries";
import { StatCard, StatCardRow, SlideOver } from "@/components/ui";
import type { SpmbRegistration } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import {
  MagnifyingGlass,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  X,
  FileText,
  Clock as CalendarIcon,
  Phone,
  Envelope,
  MapPin,
  GraduationCap,
  CaretLeft,
  CaretRight,
  Plus,
  PencilSimple,
  Trash,
  Warning,
  FloppyDisk,
  ArrowUp,
  ArrowDown,
  SortAscending,
  Checks,
} from "@/components/Icons";

const PAGE_SIZE = 10;

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: "Menunggu", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  accepted: { label: "Diterima", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  rejected: { label: "Ditolak", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
};

const pathLabels: Record<string, string> = {
  reguler: "Reguler",
  prestasi: "Prestasi",
  beasiswa: "Beasiswa",
};

const pathColors: Record<string, string> = {
  reguler: "bg-slate-100 text-slate-700",
  prestasi: "bg-blue-50 text-blue-700",
  beasiswa: "bg-purple-50 text-purple-700",
};

type SortField = "created_at" | "full_name" | "status" | "registration_path";
type SortDir = "asc" | "desc";

export default function AdminPPDBPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [data, setData] = useState<SpmbRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [viewItem, setViewItem] = useState<SpmbRegistration | null>(null);
  const [viewTab, setViewTab] = useState<"siswa" | "kontak" | "ayah" | "ibu" | "berkas">("siswa");
  const [deleteItem, setDeleteItem] = useState<SpmbRegistration | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: "accepted" | "rejected" } | null>(null);

  // Edit panel
  const [editItem, setEditItem] = useState<SpmbRegistration | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const registrations = await getRegistrationList();
    setData(registrations);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered + Sorted
  const filtered = useMemo(() => {
    let result = data.filter((item) => {
      const matchSearch =
        item.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.previous_school && item.previous_school.toLowerCase().includes(search.toLowerCase())) ||
        (item.email && item.email.toLowerCase().includes(search.toLowerCase()));
      const matchFilter = filter === "all" || item.status === filter;
      return matchSearch && matchFilter;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "full_name") cmp = a.full_name.localeCompare(b.full_name);
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      else if (sortField === "registration_path") cmp = (a.registration_path || "").localeCompare(b.registration_path || "");
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [data, search, filter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: data.length,
    pending: data.filter((d) => d.status === "pending").length,
    accepted: data.filter((d) => d.status === "accepted").length,
    rejected: data.filter((d) => d.status === "rejected").length,
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

  async function handleUpdateStatus(id: string, status: "accepted" | "rejected") {
    try {
      await updateRegistrationStatus(id, status);
      toast("Status berhasil diubah", "success");
    } catch (e: any) {
      toast(e?.message || "Gagal mengubah status", "error");
    }
    setConfirmAction(null);
    setViewItem(null);
    setSelectedIds(new Set());
    fetchData();
  }

  async function handleBulkStatus(status: "accepted" | "rejected") {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await updateRegistrationBulkStatus(ids, status);
      toast(`${ids.length} pendaftaran berhasil diubah statusnya`, "success");
    } catch (e: any) {
      toast(e?.message || "Gagal mengubah status", "error");
    }
    setSelectedIds(new Set());
    setConfirmAction(null);
    fetchData();
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteRegistration(deleteItem.id);
      toast("Pendaftaran berhasil dihapus", "success");
    } catch (e: any) {
      toast(e?.message || "Gagal menghapus pendaftaran", "error");
    }
    setDeleteItem(null);
    setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    fetchData();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await deleteRegistrationBulk(ids);
      toast(`${ids.length} pendaftaran berhasil dihapus`, "success");
    } catch (e: any) {
      toast(e?.message || "Gagal menghapus pendaftaran", "error");
    }
    setSelectedIds(new Set());
    setBulkDelete(false);
    fetchData();
  }

  async function handleSaveNotes() {
    if (!editItem) return;
    setEditSaving(true);
    try {
      await updateRegistrationNotes(editItem.id, editNotes);
      toast("Catatan berhasil disimpan", "success");
    } catch (e: any) {
      toast(e?.message || "Gagal menyimpan catatan", "error");
    }
    setEditSaving(false);
    setEditItem(null);
    fetchData();
  }

  async function handleToggleStatus(item: SpmbRegistration) {
    const nextStatus = item.status === "pending" ? "accepted" : item.status === "accepted" ? "rejected" : "pending";
    try {
      await updateRegistrationStatus(item.id, nextStatus as "accepted" | "rejected");
      toast("Status berhasil diubah", "success");
    } catch (e: any) {
      toast(e?.message || "Gagal mengubah status", "error");
    }
    fetchData();
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
            <Users className="h-5 w-5 text-[#082b59]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola SPMB</h1>
            <p className="text-sm text-slate-500">Pendaftaran Santri Baru 2025/2026</p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          <Download className="h-4 w-4" />
          Export Excel
        </button>
      </div>

      {/* Stats */}
      <StatCardRow>
        <StatCard label="Total" value={stats.total} variant="brand" />
        <StatCard label="Menunggu" value={stats.pending} variant="warning" />
        <StatCard label="Diterima" value={stats.accepted} variant="success" />
        <StatCard label="Ditolak" value={stats.rejected} variant="danger" />
      </StatCardRow>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#082b59]/20 bg-[#082b59]/5 px-4 py-2.5">
          <Checks className="h-4 w-4 text-[#082b59]" />
          <span className="text-xs font-semibold text-[#082b59]">{selectedIds.size} dipilih</span>
          <button onClick={() => setConfirmAction({ id: "bulk", status: "accepted" })} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Terima</button>
          <button onClick={() => setConfirmAction({ id: "bulk", status: "rejected" })} className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Tolak</button>
          <button onClick={() => setBulkDelete(true)} className="rounded-lg bg-slate-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700">Hapus</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter + Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {[
              { key: "all", label: "Semua" },
              { key: "pending", label: "Menunggu" },
              { key: "accepted", label: "Diterima" },
              { key: "rejected", label: "Ditolak" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => { setFilter(tab.key); setPage(1); setSelectedIds(new Set()); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === tab.key ? "bg-[#082b59] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari nama, sekolah, email..."
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
                  <span className="flex items-center gap-1">Nama <SortIcon field="full_name" /></span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Asal Sekolah</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("registration_path")}>
                  <span className="flex items-center gap-1">Jalur <SortIcon field="registration_path" /></span>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center gap-1">Tanggal <SortIcon field="created_at" /></span>
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#082b59] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data pendaftar...</p>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pendaftar SPMB"}</p>
                    </div>
                  </div>
                </td></tr>
              ) : (
                paginated.map((item, index) => {
                  const st = statusConfig[item.status] || statusConfig.pending;
                  const StatusIcon = st.icon;
                  return (
                    <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[#082b59]/[0.03]" : ""}`}>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#082b59] focus:ring-[#1767b1]" />
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="px-4 py-3.5 cursor-pointer" onClick={() => setViewItem(item)}>
                        <p className="text-sm font-medium text-slate-800">{item.full_name}</p>
                        {item.email && <p className="mt-0.5 text-xs text-slate-400">{item.email}</p>}
                      </td>
                      <td className="hidden px-4 py-3.5 text-sm text-slate-600 md:table-cell">{item.previous_school || "-"}</td>
                      <td className="hidden px-4 py-3.5 sm:table-cell">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${pathColors[item.registration_path] || "bg-slate-100 text-slate-600"}`}>
                          {pathLabels[item.registration_path] || item.registration_path}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${st.bg} ${st.color} hover:opacity-80`}>
                          <StatusIcon className="h-3 w-3" />
                          {st.label}
                        </button>
                      </td>
                      <td className="hidden px-4 py-3.5 text-sm text-slate-500 lg:table-cell">
                        {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewItem(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Detail">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setEditItem(item); setEditNotes(item.admin_notes || ""); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit Catatan">
                            <PencilSimple className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteItem(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
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
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} pendaftar
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

      {/* ── VIEW MODAL ──────────────────────────────── */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewItem(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-[#082b59] via-[#0d4a8a] to-[#1767b1] px-6 py-5 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
                  {viewItem.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate">{viewItem.full_name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
                    {viewItem.documents?.nisn && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{viewItem.documents.nisn}</span>}
                    {viewItem.documents?.nisn && viewItem.phone && <span>&middot;</span>}
                    {viewItem.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{viewItem.phone}</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig[viewItem.status]?.bg} ${statusConfig[viewItem.status]?.color}`}>
                      {(() => { const SI = statusConfig[viewItem.status]?.icon; return SI ? <SI className="h-2.5 w-2.5" /> : null; })()}
                      {statusConfig[viewItem.status]?.label}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {pathLabels[viewItem.registration_path] || viewItem.registration_path}
                    </span>
                  </div>
                </div>
                <button onClick={() => setViewItem(null)} className="ml-auto shrink-0 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
            </div>

            {/* Tabs */}
            {(() => {
              const tabs = [
                { key: "siswa" as const, label: "Siswa" },
                { key: "kontak" as const, label: "Kontak" },
                { key: "ayah" as const, label: "Ayah" },
                { key: "ibu" as const, label: "Ibu" },
                { key: "berkas" as const, label: "Berkas" },
              ];
              const docCount = viewItem.documents ? [viewItem.documents.kk, viewItem.documents.akta, viewItem.documents.surat_sekolah, viewItem.documents.ktp_ortu, viewItem.documents.bukti_transfer].filter((u) => u && typeof u === "string" && u.startsWith("http")).length : 0;
              return (
                <div className="flex border-b border-slate-100 px-6">
                  {tabs.map((t) => (
                    <button key={t.key} onClick={() => setViewTab(t.key)}
                      className={`relative px-4 py-2.5 text-xs font-semibold transition-colors ${viewTab === t.key ? "text-[#082b59]" : "text-slate-400 hover:text-slate-600"}`}>
                      {t.label}
                      {t.key === "berkas" && docCount > 0 && <span className="ml-1 rounded-full bg-[#082b59]/10 px-1.5 text-[10px] text-[#082b59]">{docCount}</span>}
                      {viewTab === t.key && <div className="absolute inset-x-2 -bottom-px h-0.5 bg-[#082b59]" />}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Tab Content */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {viewTab === "siswa" && (
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <InfoRow icon={MapPin} label="Tempat Lahir" value={viewItem.birth_place || "-"} />
                    <InfoRow icon={CalendarIcon} label="Tanggal Lahir" value={viewItem.birth_date ? new Date(viewItem.birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
                    <InfoRow icon={Users} label="Jenis Kelamin" value={viewItem.gender === "L" ? "Laki-laki" : "Perempuan"} />
                    <InfoRow icon={GraduationCap} label="Jalur" value={pathLabels[viewItem.registration_path] || viewItem.registration_path} />
                  </div>
                  <div className="my-3 h-px bg-slate-100" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <InfoRow icon={Users} label="Nama Panggilan" value={viewItem.documents?.nickname || "-"} />
                    <InfoRow icon={CheckCircle} label="Golongan Darah" value={viewItem.documents?.blood_type || "-"} />
                    <InfoRow icon={FileText} label="NISN" value={viewItem.documents?.nisn || "-"} />
                    <InfoRow icon={FileText} label="NIK" value={viewItem.documents?.nik || "-"} />
                    <InfoRow icon={ArrowUp} label="Tinggi Badan" value={viewItem.documents?.height ? `${viewItem.documents.height} cm` : "-"} />
                    <InfoRow icon={ArrowDown} label="Berat Badan" value={viewItem.documents?.weight ? `${viewItem.documents.weight} kg` : "-"} />
                    <InfoRow icon={MagnifyingGlass} label="Bahasa Sehari-hari" value={viewItem.documents?.language || "-"} />
                    <InfoRow icon={Eye} label="Hobi" value={viewItem.documents?.hobby || "-"} />
                    <InfoRow icon={GraduationCap} label="Cita-cita" value={viewItem.documents?.ambition || "-"} />
                    <InfoRow icon={Users} label="Anak Ke-" value={viewItem.documents?.child_order ? `${viewItem.documents.child_order} dari ${viewItem.documents.siblings || "?"} bersaudara` : "-"} />
                    <InfoRow icon={Warning} label="Yatim/Piatu" value={viewItem.documents?.orphan_status === "tidak" ? "Tidak" : viewItem.documents?.orphan_status === "yatim" ? "Yatim" : viewItem.documents?.orphan_status === "piatu" ? "Piatu" : viewItem.documents?.orphan_status === "yatim_piatu" ? "Yatim Piatu" : "-"} />
                  </div>
                </div>
              )}

              {viewTab === "kontak" && (
                <div className="space-y-1">
                  <InfoRow icon={MapPin} label="Alamat" value={viewItem.address || "-"} />
                  <InfoRow icon={Phone} label="Telepon" value={viewItem.phone || "-"} />
                  <InfoRow icon={Envelope} label="Email" value={viewItem.email || "-"} />
                  <div className="my-3 h-px bg-slate-100" />
                  <InfoRow icon={GraduationCap} label="Asal Sekolah" value={viewItem.previous_school || "-"} />
                </div>
              )}

              {viewTab === "ayah" && (
                <div className="space-y-1">
                  <InfoRow icon={Users} label="Nama" value={viewItem.parent_name?.split(" / ")[0] || "-"} />
                  <InfoRow icon={MapPin} label="Tempat Lahir" value={viewItem.documents?.father_birth_place || "-"} />
                  <InfoRow icon={CalendarIcon} label="Tanggal Lahir" value={viewItem.documents?.father_birth_date ? new Date(viewItem.documents.father_birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
                  <InfoRow icon={GraduationCap} label="Pendidikan Terakhir" value={viewItem.documents?.father_education || "-"} />
                  <InfoRow icon={FileText} label="Pekerjaan" value={viewItem.parent_occupation || "-"} />
                  <InfoRow icon={FloppyDisk} label="Penghasilan/bulan" value={viewItem.documents?.father_income ? `Rp ${Number(viewItem.documents.father_income).toLocaleString("id-ID")}` : "-"} />
                </div>
              )}

              {viewTab === "ibu" && (
                <div className="space-y-1">
                  <InfoRow icon={Users} label="Nama" value={viewItem.parent_name?.split(" / ")[1] || "-"} />
                  <InfoRow icon={MapPin} label="Tempat Lahir" value={viewItem.documents?.mother_birth_place || "-"} />
                  <InfoRow icon={CalendarIcon} label="Tanggal Lahir" value={viewItem.documents?.mother_birth_date ? new Date(viewItem.documents.mother_birth_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
                  <InfoRow icon={GraduationCap} label="Pendidikan Terakhir" value={viewItem.documents?.mother_education || "-"} />
                  <InfoRow icon={FileText} label="Pekerjaan" value={viewItem.documents?.mother_job || "-"} />
                  <InfoRow icon={FloppyDisk} label="Penghasilan/bulan" value={viewItem.documents?.mother_income ? `Rp ${Number(viewItem.documents.mother_income).toLocaleString("id-ID")}` : "-"} />
                </div>
              )}

              {viewTab === "berkas" && (
                <div className="space-y-2">
                  {([
                    ["kk", "Kartu Keluarga"],
                    ["akta", "Akta Kelahiran"],
                    ["surat_sekolah", "Surat Keterangan Sekolah"],
                    ["ktp_ortu", "KTP Orang Tua"],
                    ["bukti_transfer", "Bukti Transfer"],
                  ] as [string, string][]).map(([key, label]) => {
                    const url = viewItem.documents?.[key];
                    const hasFile = url && typeof url === "string" && url.startsWith("http");
                    const ext = hasFile ? url.split(".").pop()?.split("?")[0]?.toLowerCase() || "" : "";
                    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
                    const isPdf = ext === "pdf";
                    return <BerkasItem key={key} label={label} url={hasFile ? url : null} isImage={isImage} isPdf={isPdf} />;
                  })}
                </div>
              )}

              {/* Catatan Admin */}
              {viewItem.admin_notes && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-1 text-xs font-semibold text-slate-400">Catatan Admin</p>
                  <p className="text-sm text-slate-600">{viewItem.admin_notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => { setViewItem(null); setEditItem(viewItem); setEditNotes(viewItem.admin_notes || ""); }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <PencilSimple className="h-4 w-4" /> Edit Catatan
              </button>
              {viewItem.status === "pending" && (
                <>
                  <button onClick={() => { setViewItem(null); setConfirmAction({ id: viewItem.id, status: "rejected" }); }}
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100">
                    Tolak
                  </button>
                  <button onClick={() => { setViewItem(null); setConfirmAction({ id: viewItem.id, status: "accepted" }); }}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                    Terima
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT NOTES SLIDE-OVER ──────────────────── */}
      {editItem && (
        <SlideOver
          open={true}
          onClose={() => !editSaving && setEditItem(null)}
          title="Edit Catatan"
          description={editItem.full_name}

          footer={
            <div className="flex w-full items-center justify-between">
              <button onClick={() => setEditItem(null)} disabled={editSaving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                Batal
              </button>
              <button onClick={handleSaveNotes} disabled={editSaving}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#082b59] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1] disabled:opacity-70">
                {editSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <FloppyDisk className="h-4 w-4" />
                    Simpan Catatan
                  </>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Catatan Admin</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/20 resize-y"
                placeholder="Tambahkan catatan untuk pendaftar ini..." />
            </div>
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400">Info Pendaftar</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Jalur:</span> <span className="font-medium text-slate-800">{pathLabels[editItem.registration_path] || editItem.registration_path}</span></div>
                <div><span className="text-slate-500">Status:</span> <span className={`font-medium ${statusConfig[editItem.status]?.color}`}>{statusConfig[editItem.status]?.label}</span></div>
                <div><span className="text-slate-500">Sekolah:</span> <span className="font-medium text-slate-800">{editItem.previous_school || "-"}</span></div>
                <div><span className="text-slate-500">Telepon:</span> <span className="font-medium text-slate-800">{editItem.phone || "-"}</span></div>
              </div>
            </div>
          </div>
        </SlideOver>
      )}

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      {deleteItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteItem(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus Pendaftar?</h3>
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
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus {selectedIds.size} Pendaftar?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Semua pendaftar yang dipilih akan dihapus permanen.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setBulkDelete(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button onClick={handleBulkDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS CONFIRM MODAL ────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setConfirmAction(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mx-auto">
              {confirmAction.status === "accepted" ? (
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">
              {confirmAction.id === "bulk"
                ? `${confirmAction.status === "accepted" ? "Terima" : "Tolak"} ${selectedIds.size} Pendaftar?`
                : confirmAction.status === "accepted" ? "Terima Pendaftar?" : "Tolak Pendaftar?"}
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              {confirmAction.status === "accepted"
                ? "Pendaftar akan diterima sebagai calon siswa baru."
                : "Pendaftar akan ditolak."}
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
              <button
                onClick={() => {
                  if (confirmAction.id === "bulk") {
                    handleBulkStatus(confirmAction.status);
                  } else {
                    handleUpdateStatus(confirmAction.id, confirmAction.status);
                  }
                }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white ${confirmAction.status === "accepted" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                Ya, {confirmAction.status === "accepted" ? "Terima" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        <p className="text-sm text-slate-700">{value}</p>
      </div>
    </div>
  );
}

const BERKAS_ICONS: Record<string, React.ElementType> = {
  kk: FileText,
  akta: FileText,
  surat_sekolah: FileText,
  ktp_ortu: FileText,
  bukti_transfer: Download,
};

const BERKAS_COLORS: Record<string, string> = {
  kk: "text-blue-600 bg-blue-100",
  akta: "text-amber-600 bg-amber-100",
  surat_sekolah: "text-emerald-600 bg-emerald-100",
  ktp_ortu: "text-purple-600 bg-purple-100",
  bukti_transfer: "text-rose-600 bg-rose-100",
};

function BerkasItem({ label, url, isImage, isPdf }: { label: string; url: string | null; isImage: boolean; isPdf: boolean }) {
  const [open, setOpen] = useState(false);
  const berkasKey = label.toLowerCase().includes("kartu") ? "kk"
    : label.toLowerCase().includes("akta") ? "akta"
    : label.toLowerCase().includes("surat") ? "surat_sekolah"
    : label.toLowerCase().includes("ktp") ? "ktp_ortu"
    : "bukti_transfer";
  const Icon = BERKAS_ICONS[berkasKey] || FileText;
  const colorCls = BERKAS_COLORS[berkasKey] || "text-slate-600 bg-slate-100";

  if (!url) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
        <div className={`flex h-8 min-w-8 items-center justify-center rounded-lg ${colorCls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-red-600">{label}</span>
        <span className="ml-auto text-[11px] text-red-400">Belum diupload</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50">
        <div className={`flex h-8 min-w-8 items-center justify-center rounded-lg ${colorCls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="flex-1 text-sm text-slate-700">{label}</span>
        {isImage && <span className="text-[10px] text-slate-400">Gambar</span>}
        {isPdf && <span className="text-[10px] text-slate-400">PDF</span>}
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-3">
          {isImage && (
            <div className="rounded-lg border border-slate-200 bg-white p-1">
              <img src={url} alt={label} className="max-h-72 w-full rounded object-contain" loading="lazy" />
            </div>
          )}
          {isPdf && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <iframe src={url} className="h-72 w-full" title={label} loading="lazy" />
            </div>
          )}
          {!isImage && !isPdf && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
              Preview tidak tersedia untuk file ini
            </div>
          )}
          <div className="flex gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              Buka
            </a>
            <a href={url} download
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#082b59] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1767b1]">
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
