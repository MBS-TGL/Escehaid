"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  MEDIA_BUCKETS,
  collectMediaReferences,
  deleteMediaFile,
  getMediaFiles,
  isMediaReferenced,
  mediaPublicUrl,
  mediaSignedUrl,
} from "@/lib/queries";
import type { MediaBucket, MediaFile, MediaReferenceScan } from "@/lib/queries";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui";
import { usePermissions } from "@/app/admin/PermissionsProvider";
import {
  ArrowSquareOut,
  Copy,
  FileText,
  FolderOpen,
  Trash,
  Warning,
  Users,
  Database,
  CheckCircle,
} from "@/components/Icons";
import { FilterBar, type FilterGroup } from "@/components/admin/FilterBar";
import {
  MobileFilterBar,
  MobileListRow,
  MobilePickButton,
  MobileSelectBar,
  MobileThumb,
  QuietBadge,
  RowActionsMenu,
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
  const [scan, setScan] = useState<MediaReferenceScan | null>(null);
  const [search, setSearch] = useState("");
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mode pilih (mobile) untuk hapus massal + konfirmasi hapus baris mobile.
  const [pickMode, setPickMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<MediaFile | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Muat file bucket aktif (setState hanya di callback async → aman untuk lint effect).
  useEffect(() => {
    let cancelled = false;
    getMediaFiles(bucket)
      .then((files) => {
        if (!cancelled) setListing({ bucket, files, error: null });
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

  // Pemindaian referensi sekali per halaman.
  useEffect(() => {
    let cancelled = false;
    collectMediaReferences().then((result) => {
      if (!cancelled) setScan(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = !listing || listing.bucket !== bucket;
  const files = listing?.bucket === bucket ? listing.files : EMPTY_LIST;
  const loadError = listing?.bucket === bucket ? listing.error : null;

  const refs = scan?.refs ?? null;
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
    },
    menuLabel: "Pilih bucket media",
  };

  const allVisibleSelected =
    visible.length > 0 && visible.every((f) => selectedPaths.has(f.path));

  function toggleSelectAllVisible() {
    setSelectedPaths(
      allVisibleSelected
        ? new Set()
        : new Set(visible.map((f) => f.path))
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
          onQueryChange={setSearch}
          filters={[bucketFilterGroup]}
        />
      </div>

      {/* Toolbar mobile (<md): pencarian + filter bucket + Pilih */}
      <div className="mt-6">
        <MobileFilterBar
          placeholder="Cari file…"
          searchLabel="Cari file"
          query={search}
          onQueryChange={setSearch}
          filter={{
            value: bucket,
            options: MEDIA_BUCKETS.map((b) => ({ key: b.id, label: b.label })),
            onChange: (k) => {
              setBucket(k as MediaBucket);
              setConfirmPath(null);
              setSelectedPaths(new Set());
            },
          }}
          action={<MobilePickButton onClick={() => setPickMode(true)} />}
          selectMode={pickMode}
          selectedCount={selectedPaths.size}
          allSelected={allVisibleSelected}
          onSelectAllVisible={toggleSelectAllVisible}
          onCancelSelect={exitPickMode}
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
          <p className="mb-3 text-xs text-[#64748b] md:text-slate-400">
            {visible.length} file ditampilkan{search ? ` dari ${files.length} total` : ""}
          </p>
          <ul className="hidden md:grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((file) => {
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
                  {/* Preview */}
                  <div className="relative aspect-square w-full bg-slate-50">
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
                    {/* Badge status referensi */}
                    {referenced !== null && (
                      <span
                        className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${referenced
                          ? "bg-emerald-500/90 text-white"
                          : "bg-amber-500/90 text-white"
                          }`}
                      >
                        {referenced ? "Terpakai" : "Tidak terpakai"}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p
                      className="truncate text-[13px] font-semibold text-slate-700"
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
                            className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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
                            onClick={() => void handleOpen(file)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-accent)]"
                          >
                            <ArrowSquareOut className="h-3.5 w-3.5" /> Buka
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

          {/* Daftar mobile (<md) — baris 56px tipe berkas + nama + ukuran/tanggal,
              aksi di menu ⋯ (Buka, Salin tautan, Hapus), mode Pilih + bar sticky. */}
          <div
            role="list"
            aria-label="Daftar file media"
            className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:hidden"
          >
            {visible.map((file) => {
              const referenced = refs ? isMediaReferenced(file, refs) : null;
              const canDelete = canDeleteFile(file);
              const isSelected = selectedPaths.has(file.path);
              const actions: RowAction[] = [
                { key: "open", label: "Buka", icon: <ArrowSquareOut className="h-4 w-4" />, run: () => void handleOpen(file) },
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
                        <span
                          data-no-longpress=""
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-10 w-10 shrink-0 items-center justify-center"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectPath(file.path)}
                            aria-label={`Pilih ${file.name}`}
                            className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-[var(--brand-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
                          />
                        </span>
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
                    onClick={() => {
                      if (pickMode) toggleSelectPath(file.path);
                      else void handleOpen(file);
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Ruang ekstra agar baris terakhir tidak tertutup bar sticky mode pilih */}
          {pickMode && <div className="h-24" aria-hidden="true" />}
        </>
      )}

      {/* Bar aksi massal sticky (mobile, mode pilih) — di atas bottom nav admin */}
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
    </div>
  );
}
