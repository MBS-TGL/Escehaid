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
import { StatCard, StatCardRow } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowSquareOut,
  FileText,
  FolderOpen,
  MagnifyingGlass,
  Trash,
  Warning,
  X,
} from "@/components/Icons";

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
 * Hapus hanya diizinkan untuk file YATIM (tidak direferensikan tabel mana pun)
 * DAN setelah pemindaian referensi lengkap — bila ada tabel gagal dipindai,
 * hapus dinonaktifkan sepenuhnya (aman-arah: jangan hapus file yang dipakai).
 */
export default function AdminMediaPage() {
  const { toast } = useToast();

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

  const bucketMeta = MEDIA_BUCKETS.find((b) => b.id === bucket);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1767b1]/10">
            <FolderOpen className="h-5 w-5 text-[#1767b1]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Media Library</h1>
            <p className="text-sm text-slate-500">
              Lihat, cari, dan hapus file Storage — hapus hanya untuk file yang tidak dipakai
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatCardRow>
        <StatCard label="File (bucket ini)" value={files.length} variant="brand" />
        <StatCard label="Total ukuran" value={formatBytes(totalSize)} variant="info" />
        <StatCard
          label="Terpakai"
          value={usedCount ?? "…"}
          variant="success"
        />
        <StatCard
          label="Yatim (tidak direferensikan)"
          value={orphanCount ?? "…"}
          variant={orphanCount ? "warning" : "brand"}
        />
      </StatCardRow>

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

      {/* Bucket tabs + pencarian */}
      <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {MEDIA_BUCKETS.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBucket(b.id);
                  setConfirmPath(null);
                }}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  bucket === b.id
                    ? "bg-[#082b59] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#082b59]"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          {bucketMeta && <span className="hidden text-xs text-slate-400 lg:inline">{bucketMeta.hint}</span>}
        </div>

        <div className="relative w-full sm:w-72">
          <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama file atau folder…"
            aria-label="Cari file"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#1767b1] focus:outline-none focus:ring-2 focus:ring-[#1767b1]/15"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* State: memuat / error */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ed] bg-white px-6 py-16 text-center">
          <FolderOpen className="h-10 w-10 animate-pulse text-[#082b59]/30" />
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
          <FileText className="h-10 w-10 text-[#082b59]/15" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            {search ? `Tidak ada file yang cocok dengan “${search}”` : "Bucket ini masih kosong"}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-xs font-semibold text-[#1767b1] hover:underline"
            >
              Hapus pencarian
            </button>
          )}
        </div>
      )}

      {/* Grid file */}
      {!loading && !loadError && visible.length > 0 && (
        <>
          <p className="mb-3 text-xs text-slate-400">
            {visible.length} file ditampilkan{search ? ` dari ${files.length} total` : ""}
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((file) => {
              const referenced = refs ? isMediaReferenced(file, refs) : null;
              const canDelete = scanComplete && refs !== null && referenced === false;
              const isConfirming = confirmPath === file.path;
              const previewUrl =
                file.bucket !== "spmb-documents" && file.isImage ? mediaPublicUrl(file) : null;

              return (
                <li
                  key={file.path}
                  className="group flex flex-col overflow-hidden rounded-xl border border-[#dce3ed] bg-white shadow-sm transition-all hover:border-[#1767b1]/30 hover:shadow-md"
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
                        className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          referenced
                            ? "bg-emerald-500/90 text-white"
                            : "bg-amber-500/90 text-white"
                        }`}
                      >
                        {referenced ? "Terpakai" : "Yatim"}
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
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[#1767b1]/40 hover:text-[#1767b1]"
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
                                  : "Hapus file yatim ini"
                            }
                            className={`rounded-lg p-1.5 transition-colors ${
                              canDelete
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
        </>
      )}
    </div>
  );
}
