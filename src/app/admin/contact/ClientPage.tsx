"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getContactMessageList,
  markContactAsRead,
  deleteContactMessage,
  deleteContactMessageBulk,
  toggleReadContactMessage,
  toggleReadContactMessageBulk,
} from "@/lib/queries";
import { SlideOver, SkeletonBlock } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import type { ContactMessage } from "@/lib/supabase";
import {
  Envelope,
  EnvelopeSimple,
  X,
  Eye,
  CheckCircle,
  Clock,
  Phone,
  User,
  WhatsappLogo,
  CaretLeft,
  CaretRight,
  Trash,
  Warning,
  ArrowUp,
  ArrowDown,
  SortAscending,
  Checks,
  PencilSimple,
  CalendarBlank,
} from "@/components/Icons";
import { useToast } from "@/components/ui/Toast";
import {
  MobileFilterBar,
  MobilePagination,
  MobilePickButton,
  MobileListRow,
  MobileSelectBar,
  RowActionsMenu,
  StatusDot,
  type RowAction,
} from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";

const PAGE_SIZE = 10;

type SortField = "created_at" | "name" | "is_read";
type SortDir = "asc" | "desc";

export default function AdminContactPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile) — baris memakai checkbox, bar aksi massal sticky
  // muncul di atas bottom nav admin.
  const [pickMode, setPickMode] = useState(false);

  // Modals
  const [viewItem, setViewItem] = useState<ContactMessage | null>(null);
  const [deleteItem, setDeleteItem] = useState<ContactMessage | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  // Edit panel (slide-over detail)
  const [detailItem, setDetailItem] = useState<ContactMessage | null>(null);

  const fetchMessages = useCallback(async () => {
    const data = await getContactMessageList();
    setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchMessages();
    })().catch(() => {});
  }, [fetchMessages]);

  const filtered = useMemo(() => {
    const result = messages.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase()) ||
        (item.subject && item.subject.toLowerCase().includes(search.toLowerCase()));
      const matchFilter =
        filter === "all" ||
        (filter === "unread" && !item.is_read) ||
        (filter === "read" && item.is_read);
      return matchSearch && matchFilter;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "is_read") cmp = (a.is_read ? 1 : 0) - (b.is_read ? 1 : 0);
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [messages, search, filter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: messages.length,
    unread: messages.filter((m) => !m.is_read).length,
    read: messages.filter((m) => m.is_read).length,
    today: messages.filter((m) => {
      const d = new Date(m.created_at);
      const now = new Date();
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  // Opsi dropdown status — dipakai toolbar desktop & mobile agar seragam.
  const statusOptions = [
    { key: "all", label: "Semua", count: stats.total },
    { key: "unread", label: "Belum Dibaca", count: stats.unread },
    { key: "read", label: "Sudah Dibaca", count: stats.read },
  ];

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

  // ── Mode pilih (mobile) ─────────────────────────────────────
  /** Masuk mode pilih; bila `id` diisi (long-press), baris itu langsung tercentang. */
  function enterPickMode(id?: string) {
    setPickMode(true);
    if (id) {
      const s = new Set(selectedIds);
      s.add(id);
      setSelectedIds(s);
    }
  }

  /** Keluar mode pilih dan hapus semua centang. */
  function exitPickMode() {
    setPickMode(false);
    setSelectedIds(new Set());
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  async function handleViewMessage(msg: ContactMessage) {
    setDetailItem(msg);
    if (!msg.is_read) {
      await markContactAsRead(msg.id);
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteContactMessage(deleteItem.id);
      toast("Pesan berhasil dihapus", "success");
      setDeleteItem(null);
      setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
      fetchMessages();
    } catch {
      toast("Gagal menghapus pesan", "error");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await deleteContactMessageBulk(ids);
      toast(`${ids.length} pesan berhasil dihapus`, "success");
      setBulkDelete(false);
      exitPickMode();
      fetchMessages();
    } catch {
      toast("Gagal menghapus pesan", "error");
    }
  }

  async function handleBulkMarkRead(isRead: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await toggleReadContactMessageBulk(ids, isRead);
      toast(isRead ? `${ids.length} pesan ditandai sudah dibaca` : `${ids.length} pesan ditandai belum dibaca`, "success");
      exitPickMode();
      fetchMessages();
    } catch {
      toast("Gagal mengubah status pesan", "error");
    }
  }

  async function handleToggleRead(item: ContactMessage) {
    try {
      await toggleReadContactMessage(item.id, !item.is_read);
      toast(!item.is_read ? "Pesan ditandai sudah dibaca" : "Pesan ditandai belum dibaca", "success");
      fetchMessages();
    } catch {
      toast("Gagal mengubah status pesan", "error");
    }
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <SortAscending className="h-3 w-3 text-slate-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-[var(--brand-accent)]" />
      : <ArrowDown className="h-3 w-3 text-[var(--brand-accent)]" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-primary)]/10">
            <Envelope className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Pesan Masuk</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">Pesan dari formulir kontak website</p>
          </div>
        </div>
      </div>

      {/* Stats — StatPillGroup: pill kompak satu baris */}
      <StatPillGroup>
        <StatPill icon={EnvelopeSimple} label="Total" value={stats.total} tone="neutral" />
        <StatPill icon={Warning} label="Belum Dibaca" value={stats.unread} tone="warning" />
        <StatPill icon={CheckCircle} label="Sudah Dibaca" value={stats.read} tone="success" />
        <StatPill icon={CalendarBlank} label="Hari Ini" value={stats.today} tone="info" />
      </StatPillGroup>

      {/* Bulk actions — desktop; mobile memakai bar sticky saat mode pilih */}
      {selectedIds.size > 0 && (
        <div className="mb-4 hidden flex-wrap items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex">
          <Checks className="h-4 w-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          <button onClick={() => handleBulkMarkRead(true)} aria-label={`Tandai ${selectedIds.size} pesan terpilih sudah dibaca`} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Tandai Dibaca</button>
          <button onClick={() => handleBulkMarkRead(false)} aria-label={`Tandai ${selectedIds.size} pesan terpilih belum dibaca`} className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600">Tandai Belum Dibaca</button>
          <button onClick={() => setBulkDelete(true)} aria-label={`Hapus ${selectedIds.size} pesan terpilih`} className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Hapus</button>
          <button onClick={() => setSelectedIds(new Set())} aria-label="Batalkan pilihan" title="Batalkan pilihan" className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter + Search (desktop md+) */}
      {/* Filter + Search (desktop md+) — gaya Portal: pencarian di kiri,
          status sebagai pill dropdown berjumlah di kanan. */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari nama, email, subjek..."
          searchLabel="Cari nama, email, atau subjek"
          query={search}
          onQueryChange={(v) => { setSearch(v); setPage(1); }}
          filters={[
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
              menuLabel: "Filter status",
            },
          ]}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian + filter (dengan jumlah) + urut + Pilih */}
      <MobileFilterBar
        placeholder="Cari nama, email, subjek…"
        searchLabel="Cari nama, email, atau subjek"
        query={search}
        onQueryChange={(v) => { setSearch(v); setPage(1); }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => { setFilter(k); setPage(1); setSelectedIds(new Set()); },
        }}
        sort={{
          value: `${sortField}:${sortDir}`,
          options: [
            { key: "created_at:desc", label: "Terbaru" },
            { key: "created_at:asc", label: "Terlama" },
            { key: "name:asc", label: "Nama A–Z" },
            { key: "name:desc", label: "Nama Z–A" },
            { key: "is_read:asc", label: "Belum Dibaca Dahulu" },
            { key: "is_read:desc", label: "Sudah Dibaca Dahulu" },
          ],
          onChange: (k) => {
            const [f, d] = k.split(":");
            setSortField(f as SortField);
            setSortDir(d as SortDir);
          },
        }}
        action={<MobilePickButton onClick={() => setPickMode(true)} />}
        selectMode={pickMode}
        selectedCount={selectedIds.size}
        allSelected={allVisibleSelected}
        onSelectAllVisible={toggleSelectAll}
        onCancelSelect={exitPickMode}
      />

      {/* Tabel desktop (md+) — tampilan & perilaku sama seperti sebelumnya */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/80 bg-slate-50/80">
              <tr>
                {/* hidden sm:table-cell — checkbox & No hanya untuk tablet/desktop; di
                bawah 640px sisa kolom biar lega, sama seperti
                agenda/teachers/users/announcements/facilities. */}
                <th className="hidden w-10 px-4 py-3 sm:table-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">No</th>
                <th className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center gap-1">Nama {sortIcon("name")}</span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Email</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">Subjek</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none" onClick={() => toggleSort("is_read")}>
                  <span className="flex items-center gap-1">Status {sortIcon("is_read")}</span>
                </th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center gap-1">Tanggal {sortIcon("created_at")}</span>
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
                    <p className="text-sm text-slate-500">Memuat data pesan...</p>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <Envelope className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pesan masuk"}</p>
                    </div>
                  </div>
                </td></tr>
              ) : (
                paginated.map((item, index) => (
                  <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[var(--brand-primary)]/[0.03]" : ""} ${!item.is_read ? "bg-[var(--brand-accent)]/[0.03]" : ""}`}>
                    <td className="hidden px-4 py-3.5 sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-400 sm:table-cell">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => handleViewMessage(item)}>
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${!item.is_read ? "bg-[var(--brand-primary)]/10" : "bg-slate-100"}`}>
                          <User className={`h-4 w-4 ${!item.is_read ? "text-[var(--brand-primary)]" : "text-slate-400"}`} />
                        </div>
                        <span className={`text-sm ${!item.is_read ? "font-semibold text-slate-800" : "font-medium text-slate-700"}`}>{item.name}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-500 md:table-cell">{item.email}</td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-600 sm:table-cell">{item.subject || "-"}</td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleToggleRead(item)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          item.is_read
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        }`}>
                        {item.is_read ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {item.is_read ? "Dibaca" : "Baru"}
                      </button>
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-500 lg:table-cell">
                      {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleViewMessage(item)} aria-label={`Lihat pesan dari ${item.name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Lihat">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteItem(item)} aria-label={`Hapus pesan dari ${item.name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
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
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} pesan
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <CaretLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[var(--brand-primary)] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
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

      {/* Daftar mobile (<md) — baris gaya inbox: belum dibaca = titik biru +
          nama bold, sudah dibaca tanpa penanda; aksi (termasuk ganti status
          baca) via menu ⋯. Semua fitur tabel desktop tetap tersedia tanpa
          scroll horizontal. */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden">
        <div role="list" aria-label="Daftar pesan masuk">
          {loading ? (
            <div className="space-y-3 px-3 py-4" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <SkeletonBlock className="h-3.5 w-2/3 rounded" />
                    <SkeletonBlock className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Envelope className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">{search ? "Coba kata kunci lain" : "Belum ada pesan masuk"}</p>
              </div>
            </div>
          ) : (
            paginated.map((item) => (
              <ContactMobileRow
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                selectMode={pickMode}
                onEnterPickMode={enterPickMode}
                onToggleSelect={toggleSelect}
                onView={handleViewMessage}
                onToggleRead={handleToggleRead}
                onDelete={setDeleteItem}
              />
            ))
          )}
        </div>
        {!loading && filtered.length > 0 && (
          <MobilePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            from={(page - 1) * PAGE_SIZE + 1}
            to={Math.min(page * PAGE_SIZE, filtered.length)}
            onPageChange={setPage}
            itemLabel="pesan"
          />
        )}
        {/* Ruang ekstra agar baris terakhir tidak tertutup bar sticky mode pilih */}
        {pickMode && <div className="h-24" aria-hidden="true" />}
      </div>

      {/* Bar aksi massal sticky (mobile, mode pilih) — di atas bottom nav admin */}
      {pickMode && (
        <MobileSelectBar
          count={selectedIds.size}
          onDelete={() => setBulkDelete(true)}
          onCancel={exitPickMode}
        >
          <button
            type="button"
            onClick={() => handleBulkMarkRead(true)}
            disabled={selectedIds.size === 0}
            aria-label="Tandai pesan terpilih sudah dibaca"
            className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Dibaca
          </button>
          <button
            type="button"
            onClick={() => handleBulkMarkRead(false)}
            disabled={selectedIds.size === 0}
            aria-label="Tandai pesan terpilih belum dibaca"
            className="min-h-10 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Belum Dibaca
          </button>
        </MobileSelectBar>
      )}

      {/* ── DETAIL SLIDE-OVER ──────────────────────── */}
      <SlideOver
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Detail Pesan"
        description={detailItem ? new Date(detailItem.created_at).toLocaleString("id-ID") : ""}

        footer={
          detailItem ? (
            <div className="flex w-full items-center justify-between">
              <a href={`mailto:${detailItem.email}?subject=Re: ${detailItem.subject || "Pesan dari Website"}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)]">
                <Envelope className="h-4 w-4" />
                Balas Email
              </a>
              {detailItem.phone && (
                <a href={`https://wa.me/${detailItem.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <WhatsappLogo className="h-4 w-4 text-emerald-600" />
                  WhatsApp
                </a>
              )}
              <button onClick={() => { setDetailItem(null); setDeleteItem(detailItem); }}
                aria-label="Hapus pesan ini"
                title="Hapus pesan"
                className="flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100">
                <Trash className="h-4 w-4" />
              </button>
            </div>
          ) : undefined
        }
      >
        {detailItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Nama</p>
                <p className="text-sm font-medium text-slate-800">{detailItem.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Email</p>
                <a href={`mailto:${detailItem.email}`} className="text-sm font-medium text-[var(--brand-accent)] hover:underline">{detailItem.email}</a>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Telepon</p>
                <p className="text-sm font-medium text-slate-800">{detailItem.phone || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Subjek</p>
                <p className="text-sm font-medium text-slate-800">{detailItem.subject || "-"}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-semibold text-slate-400 mb-1">Pesan</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-lg p-3">{detailItem.message}</p>
            </div>
          </div>
        )}
      </SlideOver>

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      {deleteItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteItem(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <Warning className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus Pesan?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Pesan dari &ldquo;{deleteItem.name}&rdquo; akan dihapus permanen.</p>
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
            <h3 className="text-center text-lg font-bold text-slate-800">Hapus {selectedIds.size} Pesan?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Semua pesan yang dipilih akan dihapus permanen.</p>
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

/**
 * Baris daftar mobile (Pesan Masuk) — gaya kotak masuk: avatar + nama
 * (bold + titik biru bila belum dibaca; tanpa penanda bila sudah dibaca),
 * baris subjek · tanggal, menu ⋯ berisi Lihat, Tandai Sudah/Belum Dibaca &
 * Hapus (status baca TIDAK lewat satu ketukan pada baris). Tap baris = buka
 * detail di SlideOver (otomatis menandai sudah dibaca); tekan lama = mode
 * pilih. Nomor urut tetap kolom desktop-saja, sama seperti tabel lamanya
 * (hidden sm:table-cell).
 */
function ContactMobileRow({
  item,
  selected,
  selectMode,
  onEnterPickMode,
  onToggleSelect,
  onView,
  onToggleRead,
  onDelete,
}: {
  item: ContactMessage;
  selected: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onView: (m: ContactMessage) => void;
  onToggleRead: (m: ContactMessage) => void;
  onDelete: (m: ContactMessage) => void;
}) {
  const actions: RowAction[] = [
    { key: "view", label: "Lihat", icon: <Eye className="h-4 w-4" />, run: () => onView(item) },
    {
      key: "read",
      label: item.is_read ? "Tandai Belum Dibaca" : "Tandai Sudah Dibaca",
      icon: item.is_read ? <Clock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
      run: () => onToggleRead(item),
    },
    { key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) },
  ];

  return (
    <div role="listitem">
      <MobileListRow
        lead={
          selectMode ? (
            <span
              data-no-longpress=""
              onClick={(e) => e.stopPropagation()}
              className="flex h-10 w-10 shrink-0 items-center justify-center"
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(item.id)}
                aria-label={`Pilih pesan dari ${item.name}`}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
              />
            </span>
          ) : (
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${!item.is_read ? "bg-[var(--brand-primary)]/10" : "bg-slate-100"}`}>
              <User className={`h-5 w-5 ${!item.is_read ? "text-[var(--brand-primary)]" : "text-slate-400"}`} />
            </span>
          )
        }
        title={
          <span className="flex items-center gap-1.5">
            {!item.is_read && (
              <StatusDot tone="info" label="Belum dibaca" className="shrink-0" />
            )}
            <span className={`min-w-0 ${!item.is_read ? "font-semibold" : "font-medium text-[#0f2a4d]"}`}>{item.name}</span>
          </span>
        }
        subtitle={
          <>
            <span className="min-w-0 truncate">{item.subject || item.email}</span>
            <span className="shrink-0 text-slate-300" aria-hidden="true">·</span>
            <span className="shrink-0">
              {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </>
        }
        actions={<RowActionsMenu label={`pesan dari ${item.name}`} actions={actions} disabled={selectMode} />}
        selected={selected}
        onClick={() => {
          if (selectMode) onToggleSelect(item.id);
          else onView(item);
        }}
        onLongPress={() => onEnterPickMode(item.id)}
      />
    </div>
  );
}
