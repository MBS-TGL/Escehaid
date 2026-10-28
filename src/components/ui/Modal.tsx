"use client";

import { useEffect, useRef, useState, memo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@/components/Icons";

const _portalContainers: Record<string, HTMLElement> = {};
function getPortalContainer(id: string) {
  if (!_portalContainers[id]) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    _portalContainers[id] = el;
  }
  return _portalContainers[id];
}

/* ─── Modal (centered) ──────────────────────────────────── */
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Menggantikan kelas lebar bawaan `size` — utk menyamakan lebar modal
   *  dengan panel form (per-breakpoint, mis. "md:max-w-4xl lg:max-w-3xl"). */
  widthClassName?: string;
  className?: string;
};

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-4xl",
};

export const Modal = memo(function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  widthClassName,
  className = "",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(closeTimer.current);
    if (open) {
      // Mount & animasi masuk dijalankan di dalam callback requestAnimationFrame,
      // bukan sinkron di body effect. Dua manfaat:
      //  1) hydrasi aman — server & render pertama client sama-sama `mounted = false`,
      //  2) tidak ada setState sinkron di effect (react-hooks/set-state-in-effect).
      const frame = requestAnimationFrame(() => {
        setMounted(true);
        const second = requestAnimationFrame(() => {
          setVisible(true);
        });
        return () => cancelAnimationFrame(second);
      });
      return () => cancelAnimationFrame(frame);
    }
    // Animasi keluar: turunkan `visible` lalu lepas portal setelah transisi selesai.
    // Timer dimulai bersamaan dengan turunnya `visible` agar durasi animasi tetap
    // penuh 200ms dan portal tidak dilepas lebih awal.
    const frame = requestAnimationFrame(() => {
      setVisible(false);
      closeTimer.current = setTimeout(() => setMounted(false), 200);
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (open) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  const duration = visible ? "300ms" : "200ms";
  const ease = visible
    ? "cubic-bezier(0.2, 0.8, 0.2, 1)"
    : "cubic-bezier(0.3, 0, 1, 1)";

  const node = (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{
        visibility: visible ? "visible" : "hidden",
        transition: `opacity ${duration} ease`,
      }}
      onClick={() => onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-950/40" />

      <div
        className={`w-full z-10 ${widthClassName ?? sizeClasses[size]}`}
        style={{
          transform: visible ? "translateY(0) scale(1)" : "scale(0.96) translateY(10px)",
          opacity: visible ? 1 : 0,
          transition: `transform ${duration} ${ease}, opacity ${duration} ease`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-white shadow-2xl w-full relative overflow-hidden flex flex-col rounded-2xl max-h-[calc(100vh-6rem)] ${className}`}>
          {(title || description) && (
            <div className="shrink-0 flex items-center justify-between px-5 md:px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
              <div className="min-w-0">
                {title && <h3 className="font-bold text-base md:text-lg text-slate-800 tracking-tight">{title}</h3>}
                {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
              </div>
              <button onClick={onClose} className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto px-5 md:px-6 py-5" style={{ overscrollBehavior: "contain" }}>
            {children}
          </div>

          {footer && (
            /* flex-wrap WAJIB: panel memakai overflow-hidden, jadi footer yang
               tidak muat akan TERPOTONG (bukan meluber) — mis. footer berita
               (Duplikat + Edit | Lihat di Website ≈ 448px vs 328px di 360px). */
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 md:px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, getPortalContainer("portal-modals"));
});

/* ─── ConfirmModal ──────────────────────────────────────── */
/**
 * Konfirmasi dua tombol TANPA header `Modal` (judul & deskripsi dirender di
 * badan dialog, bukan lewat prop `title`/`description` `Modal`). Dua alasan:
 *
 *  1. Header `Modal` membawa border-b + tombol ❌. Pada dialog konfirmasi ❌
 *     hanya menduplikasi peran "Batal" dan menimbulkan ambigu (❌ = batal, atau
 *     = lanjutkan aksi?) — konvensi alert native pun hanya punya tombol aksi.
 *  2. Tombol TIDAK memakai `flex-1`. Versi lama melebarkan tombol aksi setengah
 *     lebar dialog, sehingga aksi berisiko (hapus/buang) justru menjadi target
 *     klik terbesar. Mengikuti konten membuat aksi aman (tombol kiri) lebih
 *     luas secara alami.
 *
 * Dua varian warna (hanya dua, sesuai kebutuhan UI admin):
 *  - `danger`  → merah lembut : aksi destruktif (hapus permanen, buang perubahan).
 *  - `warning` → amber lembut : aksi konsekuensial tapi tak menghilangkan apa pun
 *                (duplikat). Aksen brand (`--brand-accent`) versi padat sudah dilepas:
 *                warna terang justru menjadikan aksi berisiko elemen paling
 *                mencolok di layar. Teks memakai `red-700`/`amber-800` (bukan
 *                `red-600`) agar kontras di atas basis lembut tetap lulus AA.
 */
const variantColorMap: Record<"danger" | "warning", string> = {
  danger: "bg-red-100 hover:bg-red-200 text-red-700",
  warning: "bg-amber-100 hover:bg-amber-200 text-amber-800",
};

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Primary body text (alias: `message`) */
  description?: string;
  /** Alias for description */
  message?: string;
  /** Label tombol pembatal — sebutkan OUTCOME-nya, jangan "Batal" generik */
  cancelLabel?: string;
  confirmLabel?: string;
  /** Warna tombol penuh (mis. "bg-purple-600 text-white") — meng-override variant */
  confirmColor?: string;
  /** Shorthand: "danger" (merah) | "warning" (amber) — dipetakan ke confirmColor */
  variant?: "danger" | "warning";
  loading?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  message,
  cancelLabel = "Batal",
  confirmLabel = "Ya, Hapus",
  confirmColor,
  variant,
  loading = false,
}: ConfirmModalProps) {
  const resolvedDesc = description || message;
  const resolvedColor = confirmColor || variantColorMap[variant ?? "danger"];

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div>
        <h3 className="text-base font-bold tracking-tight text-slate-800">{title}</h3>
        {resolvedDesc && (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{resolvedDesc}</p>
        )}
        {/* justify-between: "Batal" (aksi aman) di ujung kiri, konfirmasi di
            ujung kanan — ruang di antaranya kosong, bukan tombol saling rapat.
            flex-wrap tetap dipertahankan sebagai pengaman agar label panjang
            (mis. "Hapus 12 Aplikasi") tak terpotong di layar 360px — panel
            memakai overflow-hidden. */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            data-busy={loading ? "" : undefined}
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${resolvedColor}`}
          >
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
