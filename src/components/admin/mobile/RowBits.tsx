"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { DotsSixVertical, ImageSquare } from "@/components/Icons";

/**
 * Potongan-potongan baris daftar mobile (bahasa desain putaran 2):
 *  - StatusDot   — titik status 14px dengan cincin putih 2.5px;
 *  - MobileThumb — thumb foto 56×56 r12 (atau bulat untuk avatar) dengan
 *                  fallback tint datar + ikon gambar (bukan abu kosong) dan
 *                  titik status di pojok kanan-bawah;
 *  - QuietBadge  — badge kecil tenang (20px, 11px/600) hanya untuk keadaan
 *                  tidak biasa (Nonaktif / Draft / Terjadwal);
 *  - RowGrip     — kolom grip urutan 30px (titik 6-dot + nomor urut 11px)
 *                  dengan area sentuh tetap lebar (>= 44px, margin negatif)
 *                  dan `touch-action: none` hanya di handle.
 */

/** Warna titik status. Hijau = aktif/terbit, abu = nonaktif/draft,
 *  amber = terjadwal/menunggu, biru = info (mis. belum dibaca),
 *  merah = ditolak. */
export type StatusTone = "active" | "off" | "pending" | "info" | "danger";

const TONE_DOT: Record<StatusTone, string> = {
  active: "bg-[#16a34a]",
  off: "bg-[#94a3b8]",
  pending: "bg-[#f59e0b]",
  info: "bg-[#1767b1]",
  danger: "bg-[#dc2626]",
};

/** Titik status 14px + cincin putih 2.5px. Posisi (pojok kanan-bawah thumb)
 *  ditentukan caller lewat `className` — default sudah menempel bottom-0 right-0. */
export function StatusDot({
  tone,
  label,
  className = "",
}: {
  tone: StatusTone;
  /** Teks alternatif — bila diisi, dot dibuat `role="img"` (status tidak
   *  hanya lewat warna bagi pembaca layar; badge teks di bawah nama tetap
   *  menjadi penanda utama untuk keadaan tidak biasa). */
  label?: string;
  className?: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label ? `Status: ${label}` : undefined}
      aria-hidden={label ? undefined : true}
      className={`block size-3.5 rounded-full ring-[2.5px] ring-white ${TONE_DOT[tone]} ${className}`}
    />
  );
}

/** Tint fallback thumb (kotak datar berwarna + ikon, bukan abu kosong). */
const THUMB_TINT: Record<string, string> = {
  slate: "bg-slate-100 text-slate-500",
  sky: "bg-sky-100 text-sky-600",
  amber: "bg-amber-100 text-amber-600",
  violet: "bg-violet-100 text-violet-600",
  emerald: "bg-emerald-100 text-emerald-600",
  rose: "bg-rose-100 text-rose-600",
};

/**
 * Thumb foto 56×56 r12 (default) atau bulat (avatar). Bila `src` kosong/gagal
 * memuat → kotak tint datar + ikon gambar. `status` menempelkan titik 14px di
 * pojok kanan-bawah dengan cincin putih (role="img" + aria-label).
 */
export function MobileThumb({
  src,
  alt,
  tint = "slate",
  icon,
  status,
  shape = "square",
  className = "",
}: {
  src?: string | null;
  /** Alt text (kosong bila gambar murni dekoratif — nama item sudah di teks). */
  alt?: string;
  /** Warna tint fallback. */
  tint?: keyof typeof THUMB_TINT | string;
  /** Ikon kustom untuk fallback (default ImageSquare). */
  icon?: ReactNode;
  status?: { tone: StatusTone; label: string };
  shape?: "square" | "circle";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const round = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`flex size-14 items-center justify-center overflow-hidden ${round} ${
          THUMB_TINT[tint] ?? THUMB_TINT.slate
        }`}
      >
        {showImage ? (
          <img
            src={src as string}
            alt={alt ?? ""}
            loading="lazy"
            onError={() => setFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          (icon ?? <ImageSquare className="h-5 w-5" />)
        )}
      </div>
      {status && (
        <StatusDot
          tone={status.tone}
          label={status.label}
          className="absolute bottom-0 right-0"
        />
      )}
    </div>
  );
}

/** Badge teks kecil tenang — HANYA untuk keadaan tidak biasa
 *  (Nonaktif, Draft, Terjadwal). 20px tinggi, 11px/600. */
export function QuietBadge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-md bg-slate-200/70 px-1.5 text-[11px] font-semibold leading-none text-slate-600 ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Grip urutan baris mobile: kolom tampilan 30px (titik 6-dot #94a3b8 +
 * nomor urut 11px/600 #64748b), area sentuh tetap setinggi baris penuh dan
 * >= 40px lebar (w-11 + margin negatif), `touch-action: none` hanya di sini.
 *
 * Caller menyebarkan `attributes` & `listeners` dari `useSortable` dan
 * memberi `innerRef` (setNodeRef); handle nonaktif saat drag dinonaktifkan.
 */
export function RowGrip({
  index,
  number,
  label,
  disabled = false,
  innerRef,
  attributes,
  listeners,
}: {
  /** Posisi tampil 0-based — dipakai aria-label; nomor tampil memakai `number`. */
  index: number;
  /** Angka yang ditampilkan di bawah grip (default index + 1). */
  number?: number;
  /** Nama item — untuk aria-label/title. */
  label: string;
  disabled?: boolean;
  innerRef?: (node: HTMLButtonElement | null) => void;
  attributes?: ButtonHTMLAttributes<HTMLButtonElement>;
  listeners?: Record<string, unknown>;
}) {
  return (
    <button
      ref={innerRef}
      type="button"
      {...attributes}
      {...(disabled ? {} : listeners)}
      disabled={disabled}
      data-no-longpress=""
      aria-label={`Ubah urutan ${label} — posisi ${index + 1}`}
      title={
        disabled
          ? "Hapus filter untuk mengubah urutan"
          : "Tarik untuk mengubah urutan (tekan Space, lalu panah)"
      }
      onClick={(e) => e.stopPropagation()}
      style={{ touchAction: "none" }}
      className={`-my-3 -ml-2.5 flex w-11 shrink-0 touch-none select-none flex-col items-center justify-center self-stretch rounded-lg transition-colors [-webkit-touch-callout:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1767b1] ${
        disabled
          ? "cursor-not-allowed text-slate-300"
          : "cursor-grab text-[#94a3b8] hover:bg-[#1767b1]/10 hover:text-[#082b59] active:cursor-grabbing"
      }`}
    >
      <span className="flex w-[30px] flex-col items-center gap-0.5">
        <DotsSixVertical className="h-4 w-4" />
        <span
          className={`text-[11px] font-semibold leading-none tabular-nums ${
            disabled ? "text-slate-300" : "text-[#64748b]"
          }`}
        >
          {number ?? index + 1}
        </span>
      </span>
    </button>
  );
}
