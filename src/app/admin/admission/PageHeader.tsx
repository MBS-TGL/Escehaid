"use client";

import {
  Users,
  Plus,
  Upload,
  Download,
  CalendarBlank,
  SquaresFour,
  CalendarCheck,
  NotePencil,
  Gear,
  WhatsappLogo,
} from "@/components/Icons";
import type { MainTab } from "./types";

/** Header halaman + tab navigasi modul SPMB. */
export function PageHeader({ active, onSelect, onExport, onExportXlsx, onRecap, onAdd, onImport, onBroadcast, canCreate, canImport, canExport }: {
  active: MainTab;
  onSelect: (tab: MainTab) => void;
  onExport: () => void;
  onExportXlsx: () => void;
  onRecap: () => void;
  onAdd: () => void;
  onImport: () => void;
  onBroadcast?: () => void;
  /** Izin aksi tombol header — sembunyikan yang tidak dimiliki. */
  canCreate: boolean;
  canImport: boolean;
  canExport: boolean;
}) {
  const tabs: { key: MainTab; label: string; icon: React.ElementType }[] = [
    { key: "registrations", label: "Pendaftar", icon: Users },
    { key: "pipeline", label: "Pipeline", icon: SquaresFour },
    { key: "interviews", label: "Wawancara", icon: CalendarCheck },
    { key: "waves", label: "Gelombang", icon: CalendarBlank },
    { key: "form", label: "Formulir", icon: NotePencil },
    { key: "settings", label: "Pengaturan", icon: Gear },
  ];
  return (
    <>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-primary)]/10">
            <Users className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Kelola SPMB</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">Kelola Pendaftaran Santri Baru</p>
          </div>
        </div>
        {active === "registrations" && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {canCreate && (
              <button onClick={onAdd} className="flex min-h-11 sm:min-h-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] sm:flex-none">
                <Plus className="h-4 w-4" />
                Tambah Pendaftar
              </button>
            )}
            {canImport && (
              <button onClick={onImport} className="flex min-h-11 sm:min-h-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:flex-none">
                <Upload className="h-4 w-4" />
                Import
              </button>
            )}
            {canExport && (
              <button onClick={onExport} className="flex min-h-11 sm:min-h-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:flex-none">
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
            {canExport && (
              <button onClick={onExportXlsx} title="Unduh Excel multi-sheet (pendaftar, rekap, verifikasi)" className="flex min-h-11 sm:min-h-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:flex-none">
                <Download className="h-4 w-4" />
                Export Excel
              </button>
            )}
            {canExport && (
              <button onClick={onRecap} title="Unduh rekap total/menunggu/diterima/ditolak per bulan daftar" className="flex min-h-11 sm:min-h-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:flex-none">
                <CalendarBlank className="h-4 w-4" />
                Rekap Bulanan
              </button>
            )}
            {onBroadcast && (
              <button onClick={onBroadcast} className="flex min-h-11 sm:min-h-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 sm:flex-none">
                <WhatsappLogo className="h-4 w-4" />
                Broadcast WA
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab utama — 4 tab; ikon disembunyikan di layar sempit agar muat */}
      <div className="mb-6 flex w-full items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => onSelect(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold transition-all sm:flex-none sm:px-4 ${active === t.key ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <t.icon className="hidden h-4 w-4 shrink-0 sm:block" />
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}
