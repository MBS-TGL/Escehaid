"use client";

import { useAdminBottomBar } from "@/app/admin/AdminChrome";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  MEDIA_BUCKETS,
  deleteMediaFile,
  isMediaReferenced,
  mediaPublicUrl,
  mediaSignedUrl,
} from "@/lib/queries";
import type { MediaBucket, MediaFile } from "@/lib/queries";
import { listMediaFiles, scanMediaReferences, type MediaScanResult } from "./actions";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal, Modal } from "@/components/ui";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import {
  ArrowSquareOut,
  Copy,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Trash,
  Warning,
  Users,
  Database,
  CheckCircle,
  CaretLeft,
  CaretRight,
} from "@/components/Icons";
import { FilterBar, type FilterGroup } from "@/components/admin/FilterBar";
import {
  LongPressHint,
  MobileFilterBar,
  MobileListRow,
  MobilePagination,
  MobilePickButton,
  MobileSelectBar,
  MobileThumb,
  QuietBadge,
  RowActionsMenu,
  SelectionMark,
  DesktopPagination,
  type RowAction,
} from "@/components/admin/mobile";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "–";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fileExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : "FILE";
}

/** Referensi kosong bersama — identitas stabil agar dep useMemo tidak berubah tiap render. */
const EMPTY_LIST: MediaFile[] = [];

/** File per halaman — grid desktop & daftar mobile memakai halaman yang sama. */
// PAGE_SIZE moved to state

/**
 * Window nomor halaman untuk bar paginasi: ≤9 halaman tampil penuh; lebih
 * dari itu dipadatkan jadi "1 … [sekitar current] … N" (media bisa punya
 * ratusan file — deret penuh akan membanjiri bar).
 */
function pageWindow(total: number, current: number): (number | "…")[] {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = Array.from(
    new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total))
  ).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

/**
 * Media library admin: lihat / cari / hapus file Storage per bucket.
 * Hapus hanya diizinkan untuk file TIDAK TERPAKAI (orphan — tidak direferensikan
 * tabel mana pun) DAN setelah pemindaian referensi lengkap — bila ada tabel gagal
 * dipindai, hapus dinonaktifkan sepenuhnya (aman-arah: jangan hapus file yang dipakai).
 */
export default function AdminMediaPage() {
  const { toast } = useToast();
  const { can } = usePermissions();
  // Gate UI aksi — penegakan sesungguhnya di proxy.ts/RLS (lihat PermissionsProvider).
  const permDelete = can("media:delete");

  const [bucket, setBucket] = useState<MediaBucket>("images");
  // `listing` null = belum termuat; loading di-derive dari ini (bukan setState
  // sinkron di effect, agar aman untuk react-hooks/set-state-in-effect).
  const [listing, setListing] = useState<{
    bucket: MediaBucket;
    files: MediaFile[];
    error: string | null;
  } | null>(null);
  const [scan, setScan] = useState<MediaScanResult | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mode pilih (mobile) untuk hapus massal + konfirmasi hapus baris mobile.
  const [pickMode, setPickMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  useAdminBottomBar(pickMode);
  const [confirmDelete, setConfirmDelete] = useState<MediaFile | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Muat file bucket aktif via server action (setState hanya di callback async
  // → aman untuk lint effect). Walk folder berjalan di server.
  useEffect(() => {
    let cancelled = false;
    listMediaFiles(bucket)
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.files) {
          setListing({ bucket, files: [], error: res.error || "Gagal memuat file" });
        } else {
          setListing({ bucket, files: res.files, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setListing({
            bucket,
            files: [],
            error: err instanceof Error ? err.message : "Gagal memuat file",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bucket]);

  // Pemindaian referensi sekali per halaman — dijalankan di server via action.
  useEffect(() => {
    let cancelled = false;
    scanMediaReferences()
      .then((result) => {
        if (!cancelled) setScan(result);
      })
      .catch(() => {
        if (!cancelled)
          setScan({ complete: false, failedTables: ["SEMUA"], refs: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = !listing || listing.bucket !== bucket;
  const files = listing?.bucket === bucket ? listing.files : EMPTY_LIST;
  const loadError = listing?.bucket === bucket ? listing.error : null;

  const refs = useMemo(() => (scan ? new Set(scan.refs) : null), [scan]);
  const scanComplete = scan?.complete ?? false;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? files.filter(
        (f) => f.name.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q)
      )
      : files;
    return [...filtered].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [files, search]);

  // Paginasi client-side (fase 1 item #11): safePage di-clamp derived, aman
  // saat filter memperkecil hasil tanpa reset state page secara sinkron.
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const paged = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalSize = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const orphanCount = refs ? files.filter((f) => !isMediaReferenced(f, refs)).length : null;
  const usedCount = orphanCount === null ? null : files.length - orphanCount;

  async function handleOpen(file: MediaFile) {
    const url = file.bucket === "spmb-documents" ? await mediaSignedUrl(file) : mediaPublicUrl(file);
    if (!url) {
      toast("Tidak bisa membuka file", "error");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /** Unduh file langsung ke komputer dengan nama asli (blob download + fallback). */
  async function handleDownload(file: MediaFile) {
    setDownloading(true);
    const url =
      file.bucket === "spmb-documents" ? await mediaSignedUrl(file) : mediaPublicUrl(file);
    if (!url) {
      setDownloading(false);
      toast("Tidak bisa mengunduh file", "error");
      return;
    }
    try {
      toast(`Mengunduh ${file.name}…`, "info");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil file");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast(`${file.name} berhasil diunduh`, "success");
    } catch {
      // Fallback tautan langsung
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete(file: MediaFile) {
    setDeleting(true);
    const res = await deleteMediaFile(file);
    setDeleting(false);
    setConfirmPath(null);
    if (!res.ok) {
      toast(`Gagal menghapus: ${res.error}`, "error");
      return;
    }
    toast(`${file.name} dihapus`, "success");
    setListing((prev) =>
      prev && prev.bucket === file.bucket
        ? { ...prev, files: prev.files.filter((f) => f.path !== file.path) }
        : prev
    );
  }

  /** File boleh dihapus hanya setelah pemindaian lengkap dan file tidak terpakai (orphan). */
  function canDeleteFile(file: MediaFile): boolean {
    if (!permDelete) return false;
    return scanComplete && refs !== null && !isMediaReferenced(file, refs);
  }

  /** Salin URL file (publik, atau URL bertanda tangan untuk bucket privat). */
  async function handleCopyLink(file: MediaFile) {
    const url =
      file.bucket === "spmb-documents" ? await mediaSignedUrl(file) : mediaPublicUrl(file);
    if (!url) {
      toast("Tidak bisa menyalin tautan file ini", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Tautan disalin", "success");
    } catch {
      toast("Gagal menyalin tautan", "error");
    }
  }

  function toggleSelectPath(path: string) {
    setSelectedPaths((s) => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });
  }

  function exitPickMode() {
    setPickMode(false);
    setSelectedPaths(new Set());
  }

  /** Hapus massal (mobile, mode pilih) — hanya file yang boleh dihapus. */
  async function handleBulkDelete() {
    const targets = visible.filter((f) => selectedPaths.has(f.path) && canDeleteFile(f));
    const skipped = selectedPaths.size - targets.length;
    setDeleting(true);
    let ok = 0;
    for (const file of targets) {
      const res = await deleteMediaFile(file);
      if (res.ok) ok += 1;
      else toast(`Gagal menghapus ${file.name}: ${res.error}`, "error");
    }
    setDeleting(false);
    setBulkDeleteOpen(false);
    if (ok > 0) {
      setListing((prev) =>
        prev
          ? { ...prev, files: prev.files.filter((f) => !targets.some((t) => t.path === f.path)) }
          : prev
      );
      toast(`${ok} file dihapus`, "success");
    }
    if (skipped > 0) {
      toast(`${skipped} file dilewati (dipakai konten/pemindaian belum lengkap)`, "error");
    }
    exitPickMode();
  }

  // Grup dropdown bucket — hint tiap bucket tampil sebagai teks kecil di menu.
  const bucketFilterGroup: FilterGroup = {
    value: bucket,
    options: MEDIA_BUCKETS.map((b) => ({ key: b.id, label: b.label, hint: b.hint })),
    onChange: (k) => {
      setBucket(k as MediaBucket);
      setConfirmPath(null);
      setPage(1);
    },
    menuLabel: "Pilih bucket media",
  };

  const allVisibleSelected =
    paged.length > 0 && paged.every((f) => selectedPaths.has(f.path));

  function toggleSelectAllVisible() {
    setSelectedPaths(
      allVisibleSelected
        ? new Set()
        : new Set(paged.map((f) => f.path))
    );
  }

  /** Warna tint thumb per tipe berkas (gbr = biru, dokumen = violet, lain = slate). */
  function thumbTint(file: MediaFile): "sky" | "violet" | "slate" {
    if (file.isImage) return "sky";
    if (file.bucket === "spmb-documents") return "violet";
    return "slate";
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-accent)]/10">
            <FolderOpen className="h-5 w-5 text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Media Library</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Kelola file yang ada di Storage
            </p>
          </div>
        </div>
      </div>

      {/* Stats — StatPillGroup: pill kompak satu baris */}
      <StatPillGroup>
        <StatPill icon={Users} label="File" value={files.length} tone="neutral" />
        <StatPill icon={Database} label="Total Ukuran" value={formatBytes(totalSize)} tone="info" />
        <StatPill icon={CheckCircle} label="Terpakai" value={usedCount ?? "…"} tone="success" />
        <StatPill icon={Warning} label="Tidak Terpakai" value={orphanCount ?? "…"} tone={orphanCount ? "warning" : "neutral"} />
      </StatPillGroup>

      {/* Pemindaian referensi belum lengkap → hapus dinonaktifkan */}
      {scan && !scanComplete && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Pemindaian referensi tidak lengkap</p>
            <p className="text-xs">
              Tabel gagal dipindai: {scan.failedTables.join(", ")}. Penghapusan dinonaktifkan
              sementara agar file yang masih dipakai konten tidak ikut terhapus.
            </p>
          </div>
        </div>
      )}

      {/* Bucket + pencarian (desktop md+) — gaya Portal: pencarian di kiri,
          bucket sebagai pill dropdown (hint pindah ke dalam menu) di kanan. */}
      <div className="mt-6 hidden md:block">
        <FilterBar
          placeholder="Cari nama file atau folder…"
          searchLabel="Cari file"
          query={search}
          onQueryChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          filters={[bucketFilterGroup]}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian + filter bucket + Pilih */}
      <div className="mt-6">
        <MobileFilterBar
          placeholder="Cari file…"
          searchLabel="Cari file"
          query={search}
          onQueryChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          filter={{
            value: bucket,
            options: MEDIA_BUCKETS.map((b) => ({ key: b.id, label: b.label })),
            onChange: (k) => {
              setBucket(k as MediaBucket);
              setConfirmPath(null);
              setSelectedPaths(new Set());
              setPage(1);
            },
          }}
          action={<MobilePickButton onClick={() => setPickMode(true)} />}
          selectMode={pickMode}
          selectedCount={selectedPaths.size}
          allSelected={allVisibleSelected}
          onSelectAllVisible={toggleSelectAllVisible}
        />
      </div>

      {/* State: memuat / error */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-16 text-center">
          <FolderOpen className="h-10 w-10 animate-pulse text-[var(--brand-primary)]/30" />
          <p className="mt-3 text-sm text-slate-500">Memuat file…</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center">
          <Warning className="h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm font-medium text-red-700">Gagal memuat file</p>
          <p className="mt-1 text-xs text-red-500">{loadError}</p>
        </div>
      )}

      {!loading && !loadError && visible.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-16 text-center">
          <FileText className="h-10 w-10 text-[var(--brand-primary)]/15" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            {search ? `Tidak ada file yang cocok dengan “${search}”` : "Bucket ini masih kosong"}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-xs font-semibold text-[var(--brand-accent)] hover:underline"
            >
              Hapus pencarian
            </button>
          )}
        </div>
      )}

      {/* Grid file (desktop md+) */}
      {!loading && !loadError && visible.length > 0 && (
        <>
          <ul className="hidden md:grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {paged.map((file) => {
              const referenced = refs ? isMediaReferenced(file, refs) : null;
              const canDelete = scanComplete && refs !== null && referenced === false;
              const isConfirming = confirmPath === file.path;
              const previewUrl =
                file.bucket !== "spmb-documents" && file.isImage ? mediaPublicUrl(file) : null;

              return (
                <li
                  key={file.path}
                  className="group flex flex-col overflow-hidden rounded-xl border border-[#dce3ed] bg-white shadow-sm transition-all hover:border-[var(--brand-accent)]/30 hover:shadow-md"
                >
                  {/* Preview click to open preview modal */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreviewFile(file)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPreviewFile(file);
                      }
                    }}
                    className="relative aspect-square w-full cursor-pointer bg-slate-50 transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-[var(--brand-accent)]"
                    title="Klik untuk melihat preview & detail file"
                  >
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt={file.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-300">
                        <FileText className="h-9 w-9" />
                        <span className="text-[10px] font-bold tracking-wider text-slate-400">
                          {fileExt(file.name)}
                        </span>
                      </div>
                    )}

                    {/* Hover overlay hint */}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur-sm">
                        <Eye className="h-3.5 w-3.5 text-[var(--brand-accent)]" /> Preview
                      </span>
                    </div>

                    {/* Badge status referensi */}
                    {referenced !== null && (
                      <span
                        className={`absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${referenced
                          ? "bg-emerald-500/95 text-white"
                          : "bg-amber-500/95 text-white"
                          }`}
                      >
                        {referenced ? "Terpakai" : "Tidak terpakai"}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewFile(file)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPreviewFile(file);
                        }
                      }}
                      className="cursor-pointer truncate text-[13px] font-semibold text-slate-700 hover:text-[var(--brand-accent)] focus-visible:outline-2 focus-visible:outline-[var(--brand-accent)]"
                      title={file.path}
                    >
                      {file.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-400" title={file.folder}>
                      {file.folder ? `folder: ${file.folder}` : "folder: (root)"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatBytes(file.size)} · {formatDate(file.createdAt)}
                    </p>

                    {/* Aksi */}
                    <div className="mt-2">
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => void handleDelete(file)}
                            disabled={deleting}
                            className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-red-700"
                          >
                            {deleting ? "Menghapus…" : "Ya, hapus"}
                          </button>
                          <button
                            onClick={() => setConfirmPath(null)}
                            disabled={deleting}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-[var(--brand-accent)]/40 hover:bg-white hover:text-[var(--brand-accent)]"
                            title="Preview file tanpa buka link baru"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" /> Preview
                          </button>
                          <button
                            onClick={() => void handleDownload(file)}
                            className="flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-accent)]"
                            title="Unduh file langsung"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => void handleOpen(file)}
                            className="flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-accent)]"
                            title="Buka di tab baru"
                          >
                            <ArrowSquareOut className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmPath(file.path)}
                            disabled={!canDelete || deleting}
                            title={
                              !scanComplete
                                ? "Pemindaian referensi belum lengkap — hapus dinonaktifkan"
                                : referenced
                                  ? "File masih dipakai konten — tidak boleh dihapus"
                                  : "Hapus file yang tidak terpakai ini"
                            }
                            className={`rounded-lg p-1.5 transition-colors ${canDelete
                              ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
                              : "cursor-not-allowed text-slate-300"
                              }`}
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Paginasi desktop (gaya ekskul) */}
          <DesktopPagination
            page={safePage}
            totalPages={totalPages}
            total={visible.length}
            from={(safePage - 1) * pageSize + 1}
            to={Math.min(safePage * pageSize, visible.length)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemLabel="file"
            className="mt-4 rounded-xl border border-[#dce3ed]"
          />
          {/*
            <p className="text-xs text-slate-400">
              Menampilkan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visible.length)} dari {visible.length} file{search ? ` (dari ${files.length} total)` : ""}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Halaman sebelumnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
              >
                <CaretLeft className="h-4 w-4" />
              </button>
              {pageWindow(totalPages, safePage).map((p, i) =>
                p === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-current={p === safePage ? "page" : undefined}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === safePage ? "bg-[var(--brand-primary)] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Halaman berikutnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
              >
                <CaretRight className="h-4 w-4" />
              </button>
            </div>
          </div>*/}

          {/* Daftar mobile (<md) — baris 56px tipe berkas + nama + ukuran/tanggal,
              aksi di menu ⋯ (Buka, Salin tautan, Hapus), mode Pilih + bar sticky. */}
          <LongPressHint />
          <div
            role="list"
            aria-label="Daftar file media"
            className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden"
          >
            {paged.map((file) => {
              const referenced = refs ? isMediaReferenced(file, refs) : null;
              const canDelete = canDeleteFile(file);
              const isSelected = selectedPaths.has(file.path);
              const actions: RowAction[] = [
                { key: "preview", label: "Preview File", icon: <Eye className="h-4 w-4" />, run: () => setPreviewFile(file) },
                { key: "download", label: "Unduh File", icon: <Download className="h-4 w-4" />, run: () => void handleDownload(file) },
                { key: "open", label: "Buka di Tab Baru", icon: <ArrowSquareOut className="h-4 w-4" />, run: () => void handleOpen(file) },
                { key: "copy", label: "Salin tautan", icon: <Copy className="h-4 w-4" />, run: () => void handleCopyLink(file) },
                // Tanpa izin media:delete → aksi hapus tidak ditampilkan sama sekali;
                // dengan izin tapi tak bisa hapus (masih dipakai/scan belum selesai)
                // tampil sebagai aksi yang menolak dengan penjelasan.
                ...(permDelete
                  ? [{
                      key: "delete",
                      label: canDelete ? "Hapus" : "Tidak bisa dihapus",
                      icon: <Trash className="h-4 w-4" />,
                      danger: canDelete,
                      run: () => {
                        if (!canDelete) {
                          toast(
                            !scanComplete
                              ? "Pemindaian referensi belum lengkap — hapus dinonaktifkan"
                              : "File masih dipakai konten — tidak boleh dihapus",
                            "error"
                          );
                          return;
                        }
                        setConfirmDelete(file);
                      },
                    } as RowAction]
                  : []),
              ];

              return (
                <div key={file.path} role="listitem">
                  <MobileListRow
                    lead={
                      pickMode ? (
                        <SelectionMark selected={isSelected} />
                      ) : null
                    }
                    thumb={
                      <MobileThumb
                        src={file.bucket !== "spmb-documents" && file.isImage ? mediaPublicUrl(file) : null}
                        alt=""
                        tint={thumbTint(file)}
                        icon={
                          <span className="flex flex-col items-center gap-0.5">
                            <FileText className="h-5 w-5" />
                            <span className="text-[9px] font-bold tracking-wide">
                              {fileExt(file.name)}
                            </span>
                          </span>
                        }
                        status={
                          referenced === null
                            ? undefined
                            : referenced
                              ? { tone: "active", label: "Terpakai" }
                              : { tone: "pending", label: "Tidak terpakai" }
                        }
                      />
                    }
                    title={file.name}
                    badge={!referenced && referenced !== null ? <QuietBadge>Tidak terpakai</QuietBadge> : undefined}
                    subtitle={
                      <>
                        <span className="min-w-0 truncate">
                          {file.folder ? `folder: ${file.folder}` : "folder: (root)"}
                        </span>
                        <span className="shrink-0">
                          {formatBytes(file.size)} · {formatDate(file.createdAt)}
                        </span>
                      </>
                    }
                    actions={
                      <RowActionsMenu
                        label={file.name}
                        actions={actions}
                        disabled={pickMode && !isSelected}
                      />
                    }
                    selected={isSelected}
                    selectionMode={pickMode}
                    onClick={() => {
                      if (pickMode) toggleSelectPath(file.path);
                      else setPreviewFile(file);
                    }}
                    onLongPress={() => {
                      if (pickMode) toggleSelectPath(file.path);
                      else {
                        setPickMode(true);
                        setSelectedPaths((s) => {
                          const n = new Set(s);
                          n.add(file.path);
                          return n;
                        });
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Paginasi mobile */}
          <MobilePagination
            page={safePage}
            totalPages={totalPages}
            total={visible.length}
            from={(safePage - 1) * pageSize + 1}
            to={Math.min(safePage * pageSize, visible.length)}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemLabel="file"
          />
        </>
      )}

      {pickMode && permDelete && (
        <MobileSelectBar
          count={selectedPaths.size}
          onDelete={() => setBulkDeleteOpen(true)}
          onCancel={exitPickMode}
        />
      )}

      {/* ── KONFIRMASI HAPUS (baris mobile) ─────────── */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => { if (!deleting) setConfirmDelete(null); }}
        onConfirm={() => {
          const f = confirmDelete;
          setConfirmDelete(null);
          if (f) void handleDelete(f);
        }}
        title="Hapus File?"
        description={`"${confirmDelete?.name}" akan dihapus permanen dari Storage.`}
        confirmLabel="Ya, Hapus"
        variant="danger"
        loading={deleting}
      />

      {/* ── KONFIRMASI HAPUS MASSAL (mobile) ────────── */}
      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => { if (!deleting) setBulkDeleteOpen(false); }}
        onConfirm={() => void handleBulkDelete()}
        title={`Hapus ${selectedPaths.size} File?`}
        description="File yang dipakai konten akan dilewati."
        confirmLabel="Ya, Hapus"
        variant="danger"
        loading={deleting}
      />
      {/* ── MODAL PREVIEW & DETAIL FILE ─────────────── */}
      <Modal
        open={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        title="Detail & Preview File"
        description={previewFile ? `${previewFile.bucket} • ${previewFile.path}` : ""}
        size="xl"
        footer={
          previewFile ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyLink(previewFile)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-[var(--brand-accent)]"
                >
                  <Copy className="h-4 w-4" />
                  Salin Tautan
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpen(previewFile)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-[var(--brand-accent)]"
                >
                  <ArrowSquareOut className="h-4 w-4" />
                  Buka di Tab Baru
                </button>
              </div>

              <div className="flex items-center gap-2">
                {canDeleteFile(previewFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      const toDel = previewFile;
                      setPreviewFile(null);
                      setConfirmDelete(toDel);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <Trash className="h-4 w-4" />
                    Hapus
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDownload(previewFile)}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Mengunduh…" : "Unduh File"}
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {previewFile && (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Visual Preview */}
            <div className="relative flex min-h-[260px] max-h-[460px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900/[0.03] p-3">
              {previewFile.bucket !== "spmb-documents" && previewFile.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaPublicUrl(previewFile) || ""}
                  alt={previewFile.name}
                  className="max-h-[420px] w-auto max-w-full rounded-xl object-contain shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-slate-400">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-[var(--brand-primary)] shadow-sm">
                    <FileText className="h-10 w-10" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">{fileExt(previewFile.name)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {previewFile.mimetype || "Dokumen berkas"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Detail */}
            <div className="flex w-full flex-col gap-3.5 lg:w-80 shrink-0">
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Status Penggunaan
                </span>
                <div className="mt-1.5">
                  {refs ? (
                    isMediaReferenced(previewFile, refs) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/70">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Terpakai di konten
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200/70">
                        <Warning className="h-3.5 w-3.5 text-amber-600" />
                        Tidak terpakai (orphan)
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">Memeriksa…</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-white p-3.5 text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">
                    Nama File
                  </span>
                  <span className="font-medium text-slate-800 break-all select-all mt-0.5 block">
                    {previewFile.name}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">
                    Folder
                  </span>
                  <span className="font-medium text-slate-700 mt-0.5 block">
                    {previewFile.folder ? `folder: ${previewFile.folder}` : "(root)"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">
                    Bucket Storage
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-slate-700 mt-0.5 block">
                    {previewFile.bucket}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-2.5">
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">
                      Ukuran
                    </span>
                    <span className="font-medium text-slate-700 mt-0.5 block">
                      {formatBytes(previewFile.size)}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">
                      Ekstensi
                    </span>
                    <span className="font-medium text-slate-700 mt-0.5 block">
                      {fileExt(previewFile.name)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-2.5">
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">
                    Tanggal Unggah
                  </span>
                  <span className="font-medium text-slate-700 mt-0.5 block">
                    {formatDate(previewFile.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
