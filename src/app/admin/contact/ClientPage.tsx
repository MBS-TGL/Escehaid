"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminBottomBar } from "@/app/admin/AdminChrome";
import { useEffect, useRef, useState } from "react";
import {
  getContactMessageList,
  getContactMessageDetail,
  getContactStats,
  getUnreadMessageCount,
  markContactAsRead,
  toggleReadContactMessage,
  toggleReadContactMessageBulk,
} from "@/lib/queries";
import { archiveContactMessages, deleteContactMessages } from "./actions";
import { SlideOver, SkeletonBlock, ConfirmModal } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import type { ContactMessage } from "@/lib/supabase";
import {
  Envelope,
  EnvelopeSimple,
  X,
  Eye,
  CheckCircle,
  Clock,
  User,
  WhatsappLogo,
  Trash,
  Warning,
  ArrowUp,
  ArrowDown,
  SortAscending,
  Checks,
  CalendarBlank,
  XCircle,
  Download,
  Archive,
  TrayArrowDown,
  Printer,
  CaretDown,
} from "@/components/Icons";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import { normalizeName } from "@/lib/format-name";
import { formatRelativeTime, guessContactCategory, CONTACT_CATEGORY_LABELS } from "@/lib/admin-display";
import {
  MobileFilterBar,
  MobilePagination,
  MobilePickButton,
  MobileListRow,
  MobileSelectBar,
  LongPressHint,
  RowActionsMenu,
  SelectionMark,
  StatusDot,
  type RowAction,
} from "@/components/admin/mobile";
import { DesktopPagination } from "@/components/admin/mobile";
import { FilterBar } from "@/components/admin/FilterBar";

// PAGE_SIZE moved to state

type SortField = "created_at" | "name" | "is_read";
type SortDir = "asc" | "desc";

/** Baris ringan daftar (tanpa isi `message` — diambil saat detail dibuka). */
export type ContactListRow = Omit<ContactMessage, "message">;

/** Warna badge per dugaan kategori (kelas utuh agar tidak dibuang Tailwind). */
const CATEGORY_BADGE_CLS: Record<string, string> = {
  spmb: "border-purple-200 bg-purple-50 text-purple-700",
  akademik: "border-blue-200 bg-blue-50 text-blue-700",
  layanan: "border-emerald-200 bg-emerald-50 text-emerald-700",
  umum: "border-slate-200 bg-slate-100 text-slate-500",
};

/**
 * Badge dugaan kategori. Di daftar hanya subjek yang tersedia (tanpa isi),
 * jadi akurasinya parsial — title menjelaskannya. Di detail, kirimkan juga
 * `message` untuk tebakan penuh.
 */
function CategoryBadge({ subject, message }: { subject: string | null; message?: string | null }) {
  const cat = guessContactCategory(subject, message ?? null);
  return (
    <span
      title={message == null ? "Dugaan kategori dari subjek" : "Dugaan kategori dari subjek & isi"}
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_BADGE_CLS[cat]}`}
    >
      {CONTACT_CATEGORY_LABELS[cat]}
    </span>
  );
}

/**
 * Template balasan cepat — tanpa skema (konstanta kode). `{nama}` diisi nama
 * pengirim. Dipakai di SlideOver detail: salin ke clipboard, buka mailto
 * dengan isi terisi, ATAU buka WA dengan teks terisi (`wa` = gaya chat,
 * tanpa sapaan formal).
 */
const REPLY_TEMPLATES = [
  {
    key: "terima-kasih",
    label: "Terima kasih & tindak lanjut",
    body: (nama: string) =>
      `Yth. Bapak/Ibu ${nama},\n\nTerima kasih atas pesan Bapak/Ibu. Pesan sudah kami terima dan akan kami tindak lanjuti. Apabila membutuhkan respons cepat, silakan hubungi TU SMP Muhammadiyah 4 Tanggul di jam kerja (Senin–Jumat, 07.00–14.00 WIB).\n\nHormat kami,\nAdmin Website SMP Muhammadiyah 4 Tanggul`,
    wa: (nama: string) =>
      `Assalamualaikum Bapak/Ibu ${nama}, terima kasih atas pesannya. Pesan sudah kami terima dan akan kami tindak lanjuti. 🙏\n\n— Admin Website SMP Muhammadiyah 4 Tanggul`,
  },
  {
    key: "info-spmb",
    label: "Info SPMB",
    body: (nama: string) =>
      `Yth. Bapak/Ibu ${nama},\n\nTerima kasih atas ketertarikan Bapak/Ibu pada SPMB SMP Muhammadiyah 4 Tanggul. Informasi gelombang, syarat, dan alur pendaftaran dapat dilihat di halaman SPMB website kami. Untuk pertanyaan khusus, silakan balas email ini atau hubungi panitia SPMB di jam kerja.\n\nHormat kami,\nPanitia SPMB SMP Muhammadiyah 4 Tanggul`,
    wa: (nama: string) =>
      `Assalamualaikum Bapak/Ibu ${nama}, terima kasih atas ketertarikan pada SPMB SMP Muhammadiyah 4 Tanggul. Info gelombang, syarat & alur pendaftaran bisa dilihat di halaman SPMB website kami. Ada pertanyaan khusus? Silakan balas chat ini. 🙏`,
  },
  {
    key: "butuh-detail",
    label: "Minta kelengkapan data",
    body: (nama: string) =>
      `Yth. Bapak/Ibu ${nama},\n\nTerima kasih atas pesannya. Agar dapat kami bantu dengan tepat, mohon melengkapi: nama lengkap siswa (bila terkait siswa), kelas, dan nomor HP/WA yang bisa dihubungi.\n\nHormat kami,\nAdmin Website SMP Muhammadiyah 4 Tanggul`,
    wa: (nama: string) =>
      `Assalamualaikum Bapak/Ibu ${nama}, agar dapat kami bantu dengan tepat, mohon melengkapi: nama lengkap siswa (bila terkait siswa), kelas, dan nomor HP/WA yang bisa dihubungi. 🙏`,
  },
] as const;

export default function AdminContactPage() {
  return (
    <Suspense fallback={null}>
      <AdminContactInner />
    </Suspense>
  );
}

function AdminContactInner() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Deep-link dari dashboard: ?filter=unread (TodoRail) & ?id=<id> (kartu pesan).
  // useSearchParams butuh Suspense (lihat wrapper di atas).
  const searchParams = useSearchParams();
  // Gate UI aksi — penegakan sesungguhnya di proxy.ts/RLS (lihat PermissionsProvider).
  const permUpdate = can("kontak:update");
  const permDelete = can("kontak:delete");
  const [searchInput, setSearchInput] = useState("");
  // Search di-debounce 300ms sebelum jadi kunci query (pola halaman Logs).
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(searchParams.get("filter") === "unread" ? "unread" : "all");
  // Dugaan kategori (heuristik kata kunci, tanpa kolom DB) — filter server.
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  // Naik tiap aksi mutasi supaya daftar + statistik di-fetch ulang.
  const [refreshKey, setRefreshKey] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Mode pilih (mobile) — baris memakai checkbox, bar aksi massal sticky
  // muncul di atas bottom nav admin.
  const [pickMode, setPickMode] = useState(false);
  useAdminBottomBar(pickMode);

  // Modals
  const [deleteItem, setDeleteItem] = useState<ContactListRow | ContactMessage | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  // Edit panel (slide-over detail)
  const [detailItem, setDetailItem] = useState<ContactMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Lipatan Template Balasan di detail — default tertutup, reset tiap buka pesan.
  const [templateOpen, setTemplateOpen] = useState(false);
  // Banner "ada pesan baru" — polling ringan tiap 60 detik.
  const [newArrivals, setNewArrivals] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Hasil dikunci oleh listKey supaya loading bisa di-derive tanpa
  // setState sinkron di effect (aman untuk react-hooks/set-state-in-effect).
  type ListState = { key: string; rows: ContactListRow[]; count: number; error: string | null; archiveAvailable: boolean };
  const [listState, setListState] = useState<ListState | null>(null);
  const archiveAvailable = listState?.archiveAvailable ?? false;

  const listKey = JSON.stringify({ search, filter, category, page, pageSize, sortField, sortDir, refreshKey });

  useEffect(() => {
    let cancelled = false;
    const key = JSON.stringify({ search, filter, category, page, pageSize, sortField, sortDir, refreshKey });
    getContactMessageList({ search, filter, category, page, pageSize, sortField, sortDir })
      .then((res) => {
        if (!cancelled) setListState({ key, rows: res.rows, count: res.count, error: null, archiveAvailable: res.archiveAvailable });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setListState({
            key,
            rows: [],
            count: 0,
            error: err instanceof Error ? err.message : "Gagal memuat pesan masuk.",
            archiveAvailable: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [search, filter, category, page, pageSize, sortField, sortDir, refreshKey]);

  const loading = !listState || listState.key !== listKey;
  const paginated = listState && listState.key === listKey ? listState.rows : [];
  const totalCount = listState && listState.key === listKey ? listState.count : 0;
  const loadError = listState && listState.key === listKey ? (listState.error ?? "") : "";

  // Statistik server-side (aktif + arsip) — ikut refresh.
  const [stats, setStats] = useState<{ total: number; unread: number; today: number; archived: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getContactStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const read = (stats?.total ?? 0) - (stats?.unread ?? 0);

  // Sedang melihat arsip → aksi arsip berubah jadi "keluarkan".
  const viewingArchive = filter === "archived";

  // Opsi dropdown status — dipakai toolbar desktop & mobile agar seragam.
  // Opsi Arsip hanya muncul bila kolom arsip tersedia di DB.
  const statusOptions = [
    { key: "all", label: "Semua Status", count: stats?.total ?? 0 },
    { key: "unread", label: "Belum Dibaca", count: stats?.unread ?? 0 },
    { key: "read", label: "Sudah Dibaca", count: read },
    ...(archiveAvailable
      ? [{ key: "archived", label: "Arsip", count: stats?.archived ?? 0 }]
      : []),
  ];

  // Opsi dugaan kategori (heuristik kata kunci — lihat admin-display.ts).
  const categoryOptions = [
    { key: "all", label: "Semua Kategori" },
    ...Object.entries(CONTACT_CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
  ];

  /** Helper ganti filter (status/kategori): reset halaman + seleksi. */
  function applyFilter(set: (k: string) => void, k: string) {
    set(k);
    setPage(1);
    setSelectedIds(new Set());
  }

  // Deep-link ?id=<id>: buka detail otomatis sekali saat halaman dimuat.
  // `pending` di-set di dalam callback async (bukan sinkron di effect) agar
  // lolos react-hooks/set-state-in-effect; guard ref mencegah fetch ganda
  // tanpa dibaca saat render (react-hooks/refs).
  const deepLinkId = searchParams.get("id");
  const deepLinkStarted = useRef(false);
  const [deepLinkPending, setDeepLinkPending] = useState(!!deepLinkId);
  useEffect(() => {
    if (!deepLinkId || deepLinkStarted.current) return;
    deepLinkStarted.current = true;
    let cancelled = false;
    (async () => {
      try {
        const msg = await getContactMessageDetail(deepLinkId);
        if (cancelled) return;
        setTemplateOpen(false);
        setDetailItem(msg);
        if (!msg.is_read) {
          await markContactAsRead(msg.id);
          if (!cancelled) setDetailItem({ ...msg, is_read: true });
          setRefreshKey((k) => k + 1);
        }
      } catch {
        if (!cancelled) toast("Pesan yang ditautkan tidak ditemukan", "error");
      } finally {
        if (!cancelled) setDeepLinkPending(false);
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId]);
  const detailBusy = detailLoading || deepLinkPending;

  // Polling ringan: hitung unread tiap 60 detik (selaras badge sidebar).
  // Berhenti saat tab disembunyikan — hemat request & baterai.
  // Prev count di ref (bukan state) supaya perbandingan tidak memicu render.
  const knownUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const count = await getUnreadMessageCount();
        if (cancelled) return;
        const prev = knownUnreadRef.current;
        knownUnreadRef.current = count;
        if (prev !== null && count > prev) {
          setNewArrivals(count - prev);
        }
      } catch {
        // Abaikan kegagalan jaringan polling.
      }
    };
    poll().catch(() => {});
    const timer = window.setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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
    setPage(1);
  }

  async function handleViewMessage(msg: ContactListRow) {
    setDetailLoading(true);
    try {
      const full = await getContactMessageDetail(msg.id);
      setTemplateOpen(false);
      setDetailItem(full);
      if (!full.is_read) {
        await markContactAsRead(full.id);
        setDetailItem({ ...full, is_read: true });
        setRefreshKey((k) => k + 1);
      }
    } catch {
      toast("Gagal membuka pesan", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  /** Toggle baca langsung dari SlideOver detail. */
  async function handleDetailToggleRead() {
    if (!detailItem || !permUpdate) return;
    try {
      await toggleReadContactMessage(detailItem.id, !detailItem.is_read);
      toast(!detailItem.is_read ? "Pesan ditandai sudah dibaca" : "Pesan ditandai belum dibaca", "success");
      setDetailItem({ ...detailItem, is_read: !detailItem.is_read });
      setRefreshKey((k) => k + 1);
    } catch {
      toast("Gagal mengubah status pesan", "error");
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      const res = await deleteContactMessages([deleteItem.id]);
      if (!res.success) {
        toast(res.error || "Gagal menghapus pesan", "error");
        return;
      }
      toast("Pesan berhasil dihapus", "success");
      setDeleteItem(null);
      setDetailItem((d) => (d && d.id === deleteItem.id ? null : d));
      setSelectedIds((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
      setRefreshKey((k) => k + 1);
    } catch {
      toast("Gagal menghapus pesan", "error");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const res = await deleteContactMessages(ids);
      if (!res.success) {
        toast(res.error || "Gagal menghapus pesan", "error");
        return;
      }
      toast(`${ids.length} pesan berhasil dihapus`, "success");
      setBulkDelete(false);
      exitPickMode();
      setRefreshKey((k) => k + 1);
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
      setRefreshKey((k) => k + 1);
    } catch {
      toast("Gagal mengubah status pesan", "error");
    }
  }

  async function handleToggleRead(item: ContactListRow) {
    try {
      await toggleReadContactMessage(item.id, !item.is_read);
      toast(!item.is_read ? "Pesan ditandai sudah dibaca" : "Pesan ditandai belum dibaca", "success");
      setRefreshKey((k) => k + 1);
    } catch {
      toast("Gagal mengubah status pesan", "error");
    }
  }

  /** Arsipkan satu pesan dari menu baris (tanpa buka detail). */
  async function handleArchiveRow(item: ContactListRow) {
    const res = await archiveContactMessages([item.id], true);
    if (!res.success) {
      toast(res.error || "Gagal mengarsipkan pesan", "error");
      return;
    }
    toast("Pesan diarsipkan", "success");
    setRefreshKey((k) => k + 1);
  }

  /** Keluarkan satu pesan dari arsip (dari SlideOver / menu baris). */
  async function handleUnarchive(item: ContactListRow) {
    const res = await archiveContactMessages([item.id], false);
    if (!res.success) {
      toast(res.error || "Gagal mengeluarkan dari arsip", "error");
      return;
    }
    toast("Pesan dikeluarkan dari arsip", "success");
    setDetailItem((d) => (d && d.id === item.id ? null : d));
    setRefreshKey((k) => k + 1);
  }

  /** Arsipkan / keluarkan banyak pesan sekaligus. */
  async function handleBulkArchive(archived: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const res = await archiveContactMessages(ids, archived);
    if (!res.success) {
      toast(res.error || (archived ? "Gagal mengarsipkan pesan" : "Gagal mengeluarkan dari arsip"), "error");
      return;
    }
    toast(archived ? `${ids.length} pesan diarsipkan` : `${ids.length} pesan dikeluarkan dari arsip`, "success");
    exitPickMode();
    setRefreshKey((k) => k + 1);
  }

  /**
   * Export ke CSV (pola SPMB): mengikuti filter + pencarian aktif; bila ada
   * yang dicentang → hanya yang terpilih. Isi pesan diambil per baris via
   * detail agar daftar ringan tetap tanpa kolom `message`.
   */
  const [exporting, setExporting] = useState(false);
  async function handleExportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      // Kumpulkan id target: seleksi ATAU seluruh hasil filter (loop halaman).
      let targetIds: string[] = Array.from(selectedIds);
      if (targetIds.length === 0) {
        const all: string[] = [];
        const size = 200;
        let pg = 1;
        for (;;) {
          const res = await getContactMessageList({ search, filter, category, page: pg, pageSize: size, sortField, sortDir });
          all.push(...res.rows.map((r) => r.id));
          if (res.rows.length < size || all.length >= res.count || all.length >= 1000) break;
          pg += 1;
        }
        targetIds = all.slice(0, 1000);
      }
      if (targetIds.length === 0) {
        toast("Tidak ada pesan untuk diekspor", "error");
        return;
      }
      const full = await Promise.all(targetIds.map((id) => getContactMessageDetail(id)));
      /**
       * Sel CSV (pola SPMB):
       * - CSV injection: sel yang diawali = + - @ diberi awalan `'` agar
       *   tidak dieksekusi sebagai formula oleh Excel/Sheets.
       * - Telepon: format formula-teks (="...") agar tampil bersih sebagai
       *   teks di Excel, Sheets, maupun LibreOffice — tanpa tanda `'` yang
       *   terlihat, dan 0 di depan tidak hilang. Isi dikunci sebagai string
       *   literal (tanpa kutip) sehingga aman dari eksekusi formula.
       */
      const cell = (v: unknown, forceText = false) => {
        let s = String(v ?? "");
        if (forceText || /^[=+\-@]/.test(s)) s = `'${s}`;
        return `"${s.replace(/"/g, '""')}"`;
      };
      const phoneCell = (v: unknown) => {
        const digits = String(v ?? "").replace(/["\r\n]/g, "");
        return `"=""${digits}"""`;
      };
      const lines = [
        ["No", "Nama", "Email", "Telepon", "Subjek", "Kategori", "Status", "Tanggal", "Isi Pesan"].map((h) => cell(h)).join(";"),
      ];
      full.forEach((r, i) => {
        // Kolom Telepon (indeks 3) memakai phoneCell langsung — JANGAN lewat
        // cell(), karena itu membungkus ulang (double-escape) sehingga Excel
        // menampilkan mentahan ="..." alih-alih mengevaluasinya.
        const row = [
          i + 1,
          normalizeName(r.name),
          r.email,
          r.phone ?? "",
          r.subject || "-",
          CONTACT_CATEGORY_LABELS[guessContactCategory(r.subject, r.message)],
          r.is_archived ? "Arsip" : r.is_read ? "Dibaca" : "Baru",
          new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
          r.message,
        ].map((v) => cell(v));
        row[3] = phoneCell(r.phone ?? "");
        lines.push(row.join(";"));
      });
      // BOM agar Excel membaca UTF-8; ";" mengikuti lokalitas Excel Indonesia.
      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pesan-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(`${full.length} pesan diekspor ke CSV${selectedIds.size > 0 ? " (terpilih)" : ""}`, "success");
    } catch {
      toast("Gagal mengekspor CSV", "error");
    } finally {
      setExporting(false);
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
        {permUpdate && (
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || loading || totalCount === 0}
            aria-label="Ekspor pesan ke CSV"
            title="Ekspor mengikuti filter & pencarian aktif (atau yang dicentang)"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Mengekspor..." : "Ekspor CSV"}
          </button>
        )}
      </div>

      {/* Banner pesan baru (polling 60 detik) — klik untuk muat ulang daftar */}
      {newArrivals > 0 && (
        <button
          type="button"
          onClick={() => { setNewArrivals(0); knownUnreadRef.current = stats?.unread ?? null; setRefreshKey((k) => k + 1); }}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/5 px-4 py-2.5 text-xs font-semibold text-[var(--brand-accent)] transition-colors hover:bg-[var(--brand-accent)]/10"
        >
          <Envelope className="h-4 w-4" />
          Ada {newArrivals} pesan baru — klik untuk memuat ulang
        </button>
      )}

      {/* Stats — StatPillGroup: pill kompak satu baris */}
      <StatPillGroup>
        <StatPill icon={EnvelopeSimple} label="Total" value={stats?.total ?? 0} tone="neutral" loading={!stats} />
        <StatPill icon={Warning} label="Belum Dibaca" value={stats?.unread ?? 0} tone="warning" loading={!stats} />
        <StatPill icon={CheckCircle} label="Sudah Dibaca" value={read} tone="success" loading={!stats} />
        <StatPill icon={CalendarBlank} label="Hari Ini" value={stats?.today ?? 0} tone="info" loading={!stats} />
        {archiveAvailable && (
          <StatPill icon={Archive} label="Arsip" value={stats?.archived ?? 0} tone="purple" loading={!stats} />
        )}
      </StatPillGroup>

      {/* Bulk actions — desktop; mobile memakai bar sticky saat mode pilih */}
      {selectedIds.size > 0 && (
        <div className="mb-4 hidden items-center gap-2 rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-4 py-2.5 md:flex md:flex-nowrap md:overflow-x-auto">
          <Checks className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
          <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-[var(--brand-primary)]">{selectedIds.size} dipilih</span>
          {permUpdate && <button onClick={() => handleBulkMarkRead(true)} aria-label={`Tandai ${selectedIds.size} pesan terpilih sudah dibaca`} className="whitespace-nowrap rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Tandai Dibaca</button>}
          {permUpdate && <button onClick={() => handleBulkMarkRead(false)} aria-label={`Tandai ${selectedIds.size} pesan terpilih belum dibaca`} className="whitespace-nowrap rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600">Tandai Belum Dibaca</button>}
          {permUpdate && archiveAvailable && !viewingArchive && <button onClick={() => handleBulkArchive(true)} aria-label={`Arsipkan ${selectedIds.size} pesan terpilih`} className="whitespace-nowrap rounded-lg bg-slate-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700">Arsipkan</button>}
          {permUpdate && archiveAvailable && viewingArchive && <button onClick={() => handleBulkArchive(false)} aria-label={`Keluarkan ${selectedIds.size} pesan terpilih dari arsip`} className="whitespace-nowrap rounded-lg bg-slate-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700">Keluarkan</button>}
          {permDelete && <button onClick={() => setBulkDelete(true)} aria-label={`Hapus ${selectedIds.size} pesan terpilih`} className="whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700">Hapus</button>}
          <button onClick={() => setSelectedIds(new Set())} aria-label="Batalkan pilihan" title="Batalkan pilihan" className="ml-auto rounded-lg p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter + Search (desktop md+) */}
      {/* Filter + Search (desktop md+) — gaya Portal: pencarian di kiri,
          status sebagai pill dropdown berjumlah di kanan. */}
      <div className="hidden md:block">
        <FilterBar
          placeholder="Cari nama, email, subjek, isi pesan..."
          searchLabel="Cari nama, email, subjek, atau isi pesan"
          query={searchInput}
          onQueryChange={(v) => { setSearchInput(v); setPage(1); }}
          filters={[
            {
              value: filter,
              options: statusOptions,
              onChange: (k) => applyFilter(setFilter, k),
              menuLabel: "Filter status",
            },
            {
              value: category,
              options: categoryOptions,
              onChange: (k) => applyFilter(setCategory, k),
              menuLabel: "Filter kategori",
            },
          ]}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian + filter (dengan jumlah) + urut + Pilih */}
      <MobileFilterBar
        placeholder="Cari nama, email, subjek, isi…"
        searchLabel="Cari nama, email, subjek, atau isi pesan"
        query={searchInput}
        onQueryChange={(v) => { setSearchInput(v); setPage(1); }}
        filter={{
          value: filter,
          options: statusOptions,
          onChange: (k) => applyFilter(setFilter, k),
        }}
        filter2={{
          value: category,
          options: categoryOptions,
          onChange: (k) => applyFilter(setCategory, k),
          menuLabel: "Filter kategori",
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
                <th className="hidden w-12 px-2 py-3 text-center sm:table-cell">
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
              ) : loadError ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                      <XCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Gagal memuat data</p>
                    <p className="mt-0.5 text-xs text-slate-500">{loadError}</p>
                    <button onClick={() => setRefreshKey((k) => k + 1)} className="mt-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-accent)]">
                      Coba lagi
                    </button>
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
                      <p className="mt-1 text-xs text-slate-400">{searchInput ? "Coba kata kunci lain" : "Belum ada pesan masuk"}</p>
                    </div>
                  </div>
                </td></tr>
              ) : (
                paginated.map((item, index) => (
                  <tr key={item.id} className={`group transition-colors hover:bg-slate-50/80 ${selectedIds.has(item.id) ? "bg-[var(--brand-primary)]/[0.03]" : ""} ${!item.is_read ? "bg-[var(--brand-accent)]/[0.03]" : ""}`}>
                    <td className="hidden w-12 px-2 py-3.5 text-center sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-accent)]" />
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-400 sm:table-cell">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => handleViewMessage(item)}>
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${!item.is_read ? "bg-[var(--brand-primary)]/10" : "bg-slate-100"}`}>
                          <User className={`h-4 w-4 ${!item.is_read ? "text-[var(--brand-primary)]" : "text-slate-400"}`} />
                        </div>
                        <span className={`text-sm ${!item.is_read ? "font-semibold text-slate-800" : "font-medium text-slate-700"}`}>{normalizeName(item.name)}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <a href={`mailto:${item.email}`} onClick={(e) => e.stopPropagation()} className="text-sm text-[var(--brand-accent)] hover:underline">{item.email}</a>
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-600 sm:table-cell">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="min-w-0 truncate">{item.subject || "-"}</span>
                        <CategoryBadge subject={item.subject} />
                      </span>
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      {item.is_archived ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          <Archive className="h-3 w-3" />
                          Arsip
                        </span>
                      ) : (
                        <button onClick={() => handleToggleRead(item)} disabled={!permUpdate}
                          title={permUpdate ? "Klik untuk ubah status baca" : "Tidak berizin menandai"}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default ${
                            item.is_read
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                          }`}>
                          {item.is_read ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {item.is_read ? "Dibaca" : "Baru"}
                        </button>
                      )}
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-slate-500 lg:table-cell whitespace-nowrap" title={new Date(item.created_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}>
                      {formatRelativeTime(item.created_at)}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleViewMessage(item)} aria-label={`Lihat pesan dari ${item.name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Lihat">
                          <Eye className="h-4 w-4" />
                        </button>
                        {permUpdate && archiveAvailable && !viewingArchive && (
                          <button onClick={() => handleArchiveRow(item)} aria-label={`Arsipkan pesan dari ${item.name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Arsipkan">
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        {permUpdate && archiveAvailable && viewingArchive && (
                          <button onClick={() => handleUnarchive(item)} aria-label={`Keluarkan pesan dari ${item.name} dari arsip`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="Keluarkan dari arsip">
                            <TrayArrowDown className="h-4 w-4" />
                          </button>
                        )}
                        {permDelete && (
                          <button onClick={() => setDeleteItem(item)} aria-label={`Hapus pesan dari ${item.name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus">
                            <Trash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalCount > 0 && (
          <DesktopPagination
            page={page}
            totalPages={totalPages}
            total={totalCount}
            from={(page - 1) * pageSize + 1}
            to={Math.min(page * pageSize, totalCount)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemLabel="pesan"
          />
        )}
      </div>

      {/* Daftar mobile (<md) — baris gaya inbox: belum dibaca = titik biru +
          nama bold, sudah dibaca tanpa penanda; aksi (termasuk ganti status
          baca) via menu ⋯. Semua fitur tabel desktop tetap tersedia tanpa
          scroll horizontal. */}
      <LongPressHint />
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
          ) : loadError ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <Warning className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Gagal memuat pesan</p>
              <p className="mt-0.5 max-w-md text-xs text-slate-500">{loadError}</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Envelope className="h-7 w-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Tidak ada data ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">{searchInput ? "Coba kata kunci lain" : "Belum ada pesan masuk"}</p>
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
                onArchive={archiveAvailable && permUpdate ? (viewingArchive ? handleUnarchive : handleArchiveRow) : undefined}
                archiveLabel={viewingArchive ? "Keluarkan dari Arsip" : "Arsipkan"}
                canToggle={permUpdate}
                canDelete={permDelete}
              />
            ))
          )}
        </div>
        {!loading && totalCount > 0 && (
          <MobilePagination
            page={page}
            totalPages={totalPages}
            total={totalCount}
            from={(page - 1) * pageSize + 1}
            to={Math.min(page * pageSize, totalCount)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemLabel="pesan"
          />
        )}
      </div>
      {pickMode && (
        <MobileSelectBar
          count={selectedIds.size}
          onDelete={permDelete ? () => setBulkDelete(true) : undefined}
          onCancel={exitPickMode}
        >
          {permUpdate && (
            <button
              type="button"
              onClick={() => handleBulkMarkRead(true)}
              disabled={selectedIds.size === 0}
              aria-label="Tandai pesan terpilih sudah dibaca"
              className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
            >
              Dibaca
            </button>
          )}
          {permUpdate && (
            <button
              type="button"
              onClick={() => handleBulkMarkRead(false)}
              disabled={selectedIds.size === 0}
              aria-label="Tandai pesan terpilih belum dibaca"
              className="min-h-10 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
            >
              Belum Dibaca
            </button>
          )}
        </MobileSelectBar>
      )}

      {/* ── DETAIL SLIDE-OVER ──────────────────────── */}
      <SlideOver
        open={!!detailItem || detailBusy}
        onClose={() => setDetailItem(null)}
        title="Detail Pesan"
        description={detailItem ? new Date(detailItem.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }) : ""}

        footer={
          detailItem ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              <a
                href={`mailto:${detailItem.email}?subject=${encodeURIComponent(`Re: ${detailItem.subject || "Pesan dari Website"}`)}`}
                aria-label="Balas via Email"
                title="Balas via Email"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-accent)] sm:flex-auto sm:px-4">
                <Envelope className="h-4 w-4 shrink-0" />
                <span className="hidden whitespace-nowrap sm:inline">Email</span>
              </a>
              {detailItem.phone && (
                <a
                  href={`https://wa.me/${detailItem.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  aria-label="Balas via WhatsApp"
                  title="Balas via WhatsApp"
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-auto sm:px-4">
                  <WhatsappLogo className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="hidden whitespace-nowrap sm:inline">WhatsApp</span>
                </a>
              )}
              {permUpdate && (
                <button
                  onClick={handleDetailToggleRead}
                  aria-label={detailItem.is_read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                  title={detailItem.is_read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                  className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold sm:flex-auto sm:px-4 ${
                    detailItem.is_read
                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}>
                  {detailItem.is_read ? <Clock className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
                  <span className="hidden whitespace-nowrap sm:inline">{detailItem.is_read ? "Belum Dibaca" : "Dibaca"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                aria-label="Cetak pesan ini"
                title="Cetak detail pesan"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-auto sm:px-4 print:hidden">
                <Printer className="h-4 w-4 shrink-0" />
                <span className="hidden whitespace-nowrap sm:inline">Cetak</span>
              </button>
              {permDelete && (
                <button
                  onClick={() => { setDetailItem(null); setDeleteItem(detailItem); }}
                  aria-label="Hapus pesan ini"
                  title="Hapus pesan ini"
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 sm:flex-auto sm:px-4 print:hidden">
                  <Trash className="h-4 w-4 shrink-0" />
                  <span className="hidden whitespace-nowrap sm:inline">Hapus</span>
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {detailBusy && !detailItem ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
            <p className="text-sm text-slate-500">Memuat pesan...</p>
          </div>
        ) : null}
        {detailItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Nama</p>
                <p className="text-sm font-medium text-slate-800">{normalizeName(detailItem.name)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Email</p>
                <a href={`mailto:${detailItem.email}`} className="text-sm font-medium text-[var(--brand-accent)] hover:underline">{detailItem.email}</a>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Telepon</p>
                {detailItem.phone
                  ? <a href={`tel:${detailItem.phone}`} className="text-sm font-medium text-[var(--brand-accent)] hover:underline">{detailItem.phone}</a>
                  : <p className="text-sm font-medium text-slate-800">-</p>
                }
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Subjek</p>
                <p className="text-sm font-medium text-slate-800">{detailItem.subject || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400">Kategori (dugaan)</p>
                <p className="mt-1">
                  <CategoryBadge subject={detailItem.subject} message={detailItem.message} />
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-semibold text-slate-400 mb-1">Pesan</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-lg p-3">{detailItem.message}</p>
            </div>
            {/* Template balasan cepat — di bawah isi pesan, dilipat default;
                salin, buka di email, atau buka di WA */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setTemplateOpen((o) => !o)}
                aria-expanded={templateOpen}
                aria-controls="contact-reply-templates"
                className="flex w-full items-center justify-between gap-2 p-3 text-left"
              >
                <span className="text-[11px] font-semibold text-slate-400">Template Balasan</span>
                <CaretDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${templateOpen ? "rotate-180" : ""}`} />
              </button>
              {templateOpen && (
                <div id="contact-reply-templates" className="flex flex-col gap-1.5 px-3 pb-3">
                  {REPLY_TEMPLATES.map((t) => {
                    const nama = normalizeName(detailItem.name) || "Bapak/Ibu";
                    const body = t.body(nama);
                    const waText = t.wa(nama);
                    const waNumber = detailItem.phone.replace(/[^0-9]/g, "");
                    return (
                      <div key={t.key} className="flex items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600" title={t.label}>
                          {t.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(body).then(
                              () => toast("Template disalin ke clipboard", "success"),
                              () => toast("Gagal menyalin template", "error")
                            );
                          }}
                          aria-label={`Salin template ${t.label}`}
                          title="Salin ke clipboard"
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Salin
                        </button>
                        <a
                          href={`mailto:${detailItem.email}?subject=Re: ${encodeURIComponent(detailItem.subject || "Pesan dari Website")}&body=${encodeURIComponent(body)}`}
                          aria-label={`Balas dengan template ${t.label}`}
                          title="Buka aplikasi email dengan isi terisi"
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-[var(--brand-accent)] hover:bg-slate-50"
                        >
                          Email
                        </a>
                        {waNumber && (
                          <a
                            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Balas via WA dengan template ${t.label}`}
                            title="Buka WhatsApp dengan teks terisi"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-slate-50"
                          >
                            WA
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SlideOver>

      {/* ── DELETE CONFIRM ──────────────────────────── */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Hapus Pesan?"
        description={`Pesan dari "${deleteItem?.name}" akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        variant="danger"
      />

      {/* ── BULK DELETE CONFIRM ─────────────────────── */}
      <ConfirmModal
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Hapus ${selectedIds.size} Pesan?`}
        description="Semua pesan yang dipilih akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        variant="danger"
      />

      {/* ── AREA CETAK (hanya tampil saat print) ─────────
          SlideOver di-render via portal fixed sehingga hasil cetak langsung
          darinya berantakan — area khusus ini yang dicetak (lihat CSS
          .contact-print-area di globals.css). */}
      {detailItem && (
        <div aria-hidden="true" className="contact-print-area">
          <h1>Pesan Masuk — SMP Muhammadiyah 4 Tanggul</h1>
          <p className="contact-print-meta">
            {new Date(detailItem.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
            {" · "}Kategori: {CONTACT_CATEGORY_LABELS[guessContactCategory(detailItem.subject, detailItem.message)]}
            {" · "}Status: {detailItem.is_archived ? "Arsip" : detailItem.is_read ? "Dibaca" : "Baru"}
          </p>
          <dl>
            <dt>Nama</dt>
            <dd>{normalizeName(detailItem.name)}</dd>
            <dt>Email</dt>
            <dd>{detailItem.email}</dd>
            <dt>Telepon</dt>
            <dd>{detailItem.phone || "-"}</dd>
            <dt>Subjek</dt>
            <dd>{detailItem.subject || "-"}</dd>
          </dl>
          <p className="contact-print-label">Isi Pesan</p>
          <p className="contact-print-body">{detailItem.message}</p>
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
  onArchive,
  archiveLabel,
  canToggle,
  canDelete,
}: {
  item: ContactListRow;
  selected: boolean;
  selectMode: boolean;
  onEnterPickMode: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onView: (m: ContactListRow) => void;
  onToggleRead: (m: ContactListRow) => void;
  onDelete: (m: ContactListRow) => void;
  onArchive?: (m: ContactListRow) => void;
  archiveLabel?: string;
  canToggle: boolean;
  canDelete: boolean;
}) {
  const actions: RowAction[] = [
    { key: "view", label: "Lihat", icon: <Eye className="h-4 w-4" />, run: () => onView(item) },
    ...(canToggle
      ? [{
          key: "read",
          label: item.is_read ? "Tandai Belum Dibaca" : "Tandai Sudah Dibaca",
          icon: item.is_read ? <Clock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
          run: () => onToggleRead(item),
        } as RowAction]
      : []),
    ...(onArchive
      ? [{
          key: "archive",
          label: archiveLabel ?? "Arsipkan",
          icon: <Archive className="h-4 w-4" />,
          run: () => onArchive(item),
        } as RowAction]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: "Hapus", icon: <Trash className="h-4 w-4" />, danger: true, run: () => onDelete(item) } as RowAction]
      : []),
  ];

  return (
    <div role="listitem">
      <MobileListRow
        lead={
          selectMode ? (
            <SelectionMark selected={selected} />
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
            <span className={`min-w-0 ${!item.is_read ? "font-semibold" : "font-medium text-[#0f2a4d]"}`}>{normalizeName(item.name)}</span>
          </span>
        }
        subtitle={
          <>
            <CategoryBadge subject={item.subject} />
            <span className="min-w-0 truncate">{item.subject || item.email}</span>
            <span className="shrink-0 text-slate-300" aria-hidden="true">·</span>
            <span className="shrink-0" title={new Date(item.created_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}>
              {formatRelativeTime(item.created_at)}
            </span>
          </>
        }
        actions={<RowActionsMenu label={`pesan dari ${item.name}`} actions={actions} disabled={selectMode} />}
        selected={selected}
        selectionMode={selectMode}
        onClick={() => {
          if (selectMode) onToggleSelect(item.id);
          else onView(item);
        }}
        onLongPress={() => onEnterPickMode(item.id)}
      />
    </div>
  );
}
