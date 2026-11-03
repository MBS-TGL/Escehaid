"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle,
  Info,
  Warning,
  Trash,
} from "@/components/Icons";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { FilterBar } from "@/components/admin/FilterBar";
import { MobileFilterBar, DesktopPagination, MobilePagination } from "@/components/admin/mobile";
import { useToast } from "@/components/ui/Toast";
import {
  getRecentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications,
  type Notification,
} from "@/lib/queries";

type Filter = "all" | "unread" | "read";

const PAGE_SIZE = 15;

const TYPE_META: Record<string, { icon: typeof Bell; cls: string; label: string }> = {
  info: { icon: Info, cls: "bg-blue-100 text-blue-600", label: "Info" },
  success: { icon: CheckCircle, cls: "bg-emerald-100 text-emerald-600", label: "Sukses" },
  warning: { icon: Warning, cls: "bg-amber-100 text-amber-600", label: "Peringatan" },
  error: { icon: Warning, cls: "bg-red-100 text-red-600", label: "Galat" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}h lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Pusat Notifikasi — daftar lengkap + filter + hapus, melengkapi dropdown
 * lonceng di Topbar yang hanya menampilkan 8 terbaru tanpa filter.
 */
export default function NotificationsClientPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  // Muat sekali saat mount — setState hanya di callback promise (pola yang
  // sama dengan halaman Logs), bukan sinkron di badan effect.
  useEffect(() => {
    let cancelled = false;
    getRecentNotifications(100)
      .then((data) => {
        if (!cancelled) {
          setItems(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      if (filter === "unread" && n.is_read) return false;
      if (filter === "read" && !n.is_read) return false;
      if (q && !`${n.title} ${n.message}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, filter]);

  // Reset ke halaman 1 dilakukan di handler (setSearch/setFilter wrapper),
  // bukan di effect — menghindari setState sinkron di effect.
  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handleFilterChange(v: Filter) {
    setFilter(v);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const unread = items.filter((n) => !n.is_read).length;
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = (safePage - 1) * PAGE_SIZE + pageItems.length;

  async function handleMarkRead(id: string) {
    await markNotificationAsRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function handleMarkAll() {
    await markAllNotificationsAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast("Semua notifikasi ditandai dibaca.", "success");
  }

  async function handleDelete(id: string) {
    const res = await deleteNotification(id);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleClearRead() {
    if (!confirm("Hapus semua notifikasi yang sudah dibaca?")) return;
    const res = await deleteReadNotifications();
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    setItems((prev) => prev.filter((n) => !n.is_read));
    toast(`${res.count ?? 0} notifikasi dibaca dihapus.`, "success");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
            <Bell className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Pusat Notifikasi</h1>
            <p className="text-[13px] text-slate-500">
              Semua pemberitahuan akun — review konten, SPMB, pesan, dan sistem
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              className="rounded-xl bg-[var(--brand-primary)] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[var(--brand-accent)]"
            >
              Tandai semua dibaca
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleClearRead()}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Hapus yang dibaca
          </button>
        </div>
      </div>

      <StatPillGroup>
        <StatPill icon={Bell} label="Total" value={items.length} tone="neutral" />
        <StatPill icon={Warning} label="Belum dibaca" value={unread} tone={unread > 0 ? "warning" : "neutral"} />
        <StatPill icon={CheckCircle} label="Sudah dibaca" value={items.length - unread} tone="success" />
      </StatPillGroup>

      {/* Filter desktop */}
      <div className="hidden md:block">
        <FilterBar
          query={search}
          onQueryChange={handleSearchChange}
          placeholder="Cari judul atau isi notifikasi..."
          searchLabel="Cari notifikasi"
          filters={[
            {
              menuLabel: "Filter status notifikasi",
              value: filter,
              options: [
                { key: "all", label: "Semua Status", count: items.length },
                { key: "unread", label: "Belum dibaca", count: unread },
                { key: "read", label: "Dibaca", count: items.length - unread },
              ],
              onChange: (k) => handleFilterChange(k as Filter),
            },
          ]}
        />
      </div>

      {/* Filter mobile */}
      <div className="md:hidden">
        <MobileFilterBar
          query={search}
          onQueryChange={handleSearchChange}
          placeholder="Cari notifikasi..."
          searchLabel="Cari notifikasi"
          filter={{
            value: filter,
            options: [
              { key: "all", label: "Semua Status", count: items.length },
              { key: "unread", label: "Belum dibaca", count: unread },
              { key: "read", label: "Dibaca", count: items.length - unread },
            ],
            onChange: (k) => handleFilterChange(k as Filter),
          }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
        </div>
      ) : pageItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            {items.length === 0 ? "Belum ada notifikasi" : "Tidak ada yang cocok"}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            {items.length === 0
              ? "Pemberitahuan review, SPMB, dan sistem akan muncul di sini."
              : "Coba ubah kata kunci atau filter status."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {pageItems.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.info;
              const Icon = meta.icon;
              return (
                <li
                  key={n.id}
                  className={`flex gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/60 ${
                    !n.is_read ? "bg-[var(--brand-accent)]/[0.04]" : ""
                  }`}
                >
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${meta.cls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`truncate text-sm ${!n.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                        {n.title}
                      </p>
                      <span className="whitespace-nowrap text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{meta.label}</span>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(n.id)}
                          className="text-[11px] font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-primary)]"
                        >
                          Tandai dibaca
                        </button>
                      )}
                      {n.link && (
                        <Link href={n.link} className="text-[11px] font-semibold text-slate-500 hover:text-slate-700">
                          Lihat →
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(n.id)}
                        aria-label={`Hapus notifikasi ${n.title}`}
                        className="ml-auto flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-red-600"
                      >
                        <Trash className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <>
              <MobilePagination
                page={safePage}
                totalPages={totalPages}
                total={filtered.length}
                from={from}
                to={to}
                onPageChange={setPage}
                itemLabel="notifikasi"
              />
              <DesktopPagination
                page={safePage}
                totalPages={totalPages}
                total={filtered.length}
                from={from}
                to={to}
                onPageChange={setPage}
                pageSize={PAGE_SIZE}
                onPageSizeChange={() => {}}
                pageSizeOptions={[PAGE_SIZE]}
                itemLabel="notifikasi"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
