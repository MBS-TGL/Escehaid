"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
} from "@/components/Icons";
import type { StatusTone } from "@/components/admin/mobile";
import type { SpmbRegistration, SpmbFieldType } from "@/lib/supabase";
import { SPMB_FIELD_TYPES } from "@/lib/queries/spmb";

/** Label tipe pertanyaan custom untuk badge daftar. */
export const fieldTypeLabel = (t: SpmbFieldType): string =>
  SPMB_FIELD_TYPES.find((x) => x.value === t)?.label || t;

/* Ikon "buka di tab baru" — SVG inline gaya file ini (sama dengan tombol Buka pada preview lampiran). */
export const ExternalIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);

export const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: "Menunggu", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  accepted: { label: "Diterima", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  rejected: { label: "Ditolak", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
};

export const pathLabels: Record<string, string> = {
  reguler: "Reguler",
  prestasi: "Prestasi",
  beasiswa: "Beasiswa",
};

/** Warna titik status pada avatar baris mobile: amber = menunggu,
 *  hijau = diterima, merah = ditolak. */
export const DOT_TONE: Record<SpmbRegistration["status"], StatusTone> = {
  pending: "pending",
  accepted: "active",
  rejected: "danger",
};

export const pathColors: Record<string, string> = {
  reguler: "bg-slate-100 text-slate-700",
  prestasi: "bg-blue-50 text-blue-700",
  beasiswa: "bg-purple-50 text-purple-700",
};

/** Warna chip jenis kelamin: biru = Putra, rose = Putri. */
export const genderStyles: Record<string, string> = {
  L: "border-blue-200 bg-blue-50 text-blue-700",
  P: "border-rose-200 bg-rose-50 text-rose-700",
};

export const waveStatusConfig: Record<string, { label: string; cls: string }> = {
  upcoming: { label: "Akan Datang", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  open: { label: "Dibuka", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  closed: { label: "Ditutup", cls: "border-slate-200 bg-slate-100 text-slate-500" },
};

export function InfoRow({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string }) {
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

export function BerkasItem({ label, url, isImage, isPdf }: { label: string; url: string | null; isImage: boolean; isPdf: boolean }) {
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
              <Image src={url} alt={label} width={640} height={360} sizes="100%" unoptimized className="max-h-72 w-full rounded object-contain" />
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
              <ExternalIcon className="h-3.5 w-3.5" />
              Buka
            </a>
            <a href={url} download
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--brand-accent)]">
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
