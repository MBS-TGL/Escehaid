"use client";

/**
 * Pemilih gambar untuk field bertipe `image` di Pengaturan Situs.
 * Sumber gambar memakai MODUL MEDIA yang sama dengan berita/kegiatan
 * (bucket `images`), sehingga tidak ada jalur upload baru — admin memilih
 * berkas yang sudah ada, atau menempel URL sendiri.
 */
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ImageSquare, X } from "@/components/Icons";
import { mediaPublicUrl, type MediaFile } from "@/lib/queries/media";
import { listMediaFiles } from "@/app/admin/media/actions";

interface MediaPickerProps {
  /** Sembunyikan label bila field induk sudah merendernya sendiri. */
  label?: string;
  help?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  /** Disembunyikan bila true (mis. saat sedang menyimpan). */
  disabled?: boolean;
}

export function MediaPicker({ label, help, error, value, onChange, disabled }: MediaPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}

      <div className="flex items-center gap-2">
        {value ? (
          // <img> biasa: URL bisa berasal dari Storage Supabase yang tidak
          // terdaftar di next.config remotePatterns — menghindari runtime error.
        // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
            <ImageSquare className="h-5 w-5 text-slate-400" />
          </div>
        )}

        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/Logo-Sekolah.png atau https://…"
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:ring-2 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
              : "border-[#dce3ed] focus:border-[var(--brand-accent)] focus:ring-[var(--brand-accent)]/10"
          }`}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-xl border border-[#dce3ed] bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
        >
          Pustaka
        </button>

        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            aria-label={`Hapus gambar${label ? ` ${label}` : ""}`}
            className="shrink-0 rounded-xl border border-[#dce3ed] bg-white p-2.5 text-slate-400 transition-colors hover:border-red-300 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {help && !error && <p className="mt-1.5 text-xs text-slate-500">{help}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      <MediaLibraryModal
        open={open}
        onClose={() => setOpen(false)}
        onPick={(url) => {
          onChange(url);
          setOpen(false);
        }}
      />
    </div>
  );
}

type LoadState = { status: "idle" | "loading" | "ready" | "error"; files: MediaFile[]; message?: string };

function MediaLibraryModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const [state, setState] = useState<LoadState>({ status: "idle", files: [] });

  const load = useCallback(async () => {
    setState({ status: "loading", files: [] });
    try {
      const res = await listMediaFiles("images");
      if (res.error || !res.files) {
        throw new Error(res.error || "Gagal memuat pustaka media.");
      }
      setState({ status: "ready", files: res.files.filter((f) => f.isImage) });
    } catch (e) {
      setState({
        status: "error",
        files: [],
        message: e instanceof Error ? e.message : "Gagal memuat pustaka media.",
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // `load()` menyetel state "loading" secara sinkron; dijadwalkan lewat
    // microtask agar tidak memicu render berantai dari dalam effect
    // (react-hooks/set-state-in-effect).
    queueMicrotask(() => void load());
  }, [open, load]);

  return (
    <Modal open={open} onClose={onClose} title="Pustaka Media" description="Pilih gambar dari bucket images." size="xl">
      {state.status === "loading" && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
          <button type="button" onClick={() => void load()} className="ml-2 font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      {state.status === "ready" && state.files.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Belum ada gambar di pustaka. Unggah lewat menu Media, atau tempel URL gambar secara manual.
        </div>
      )}

      {state.status === "ready" && state.files.length > 0 && (
        <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
          {state.files.map((file) => {
            const url = mediaPublicUrl(file);
            if (!url) return null;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => onPick(url)}
                title={file.name}
                className="group overflow-hidden rounded-xl border border-slate-200 transition-all hover:border-[var(--brand-accent)] hover:ring-2 hover:ring-[var(--brand-accent)]/15"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={file.name} loading="lazy" className="aspect-square w-full object-cover" />
                <span className="block truncate px-2 py-1 text-left text-[11px] text-slate-500">{file.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
