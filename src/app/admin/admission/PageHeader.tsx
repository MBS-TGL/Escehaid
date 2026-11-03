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
  DotsThreeVertical,
} from "@/components/Icons";
import { useMenu, MenuPanel, MenuItem } from "@/components/admin/mobile";
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

  // Aksi sekunder masuk menu "Lainnya" agar hero tetap 2 tombol:
  // Tambah (primer) + Import (langsung, sering dipakai) + menu.
  const { open, toggle, triggerRef, menuRef, menuId, panelStyle, onMenuKeyDown } = useMenu({
    menuMinWidth: 220,
  });
  const menuActions: { key: string; label: string; hint?: string; icon: React.ReactNode; run: () => void }[] = [
    ...(canExport
      ? [
          { key: "csv", label: "Export CSV", icon: <Download className="h-4 w-4" />, run: onExport },
          {
            key: "xlsx",
            label: "Export Excel",
            hint: "Multi-sheet: pendaftar, rekap, verifikasi",
            icon: <Download className="h-4 w-4" />,
            run: onExportXlsx,
          },
          {
            key: "recap",
            label: "Rekap Bulanan",
            hint: "Total/menunggu/diterima/ditolak per bulan",
            icon: <CalendarBlank className="h-4 w-4" />,
            run: onRecap,
          },
        ]
      : []),
    ...(onBroadcast
      ? [{ key: "wa", label: "Broadcast WA", icon: <WhatsappLogo className="h-4 w-4" />, run: onBroadcast }]
      : []),
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
              <button onClick={onAdd} className="flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-accent)] sm:min-h-0 sm:flex-none">
                <Plus className="h-4 w-4" />
                Tambah Pendaftar
              </button>
            )}
            {canImport && (
              <button onClick={onImport} className="flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:min-h-0 sm:flex-none">
                <Upload className="h-4 w-4" />
                Import
              </button>
            )}
            {menuActions.length > 0 && (
              <div className="relative min-h-11 flex-1 sm:min-h-0 sm:flex-none">
                <button
                  ref={triggerRef}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={open}
                  aria-controls={open ? menuId : undefined}
                  aria-label="Aksi lainnya"
                  title="Export & broadcast"
                  onClick={toggle}
                  className="flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:min-h-0 sm:w-auto"
                >
                  <DotsThreeVertical className="h-4 w-4" weight="bold" />
                  Lainnya
                </button>
                <MenuPanel id={menuId} label="Aksi lainnya" innerRef={menuRef} style={panelStyle} onKeyDown={onMenuKeyDown}>
                  {menuActions.map((a) => (
                    <MenuItem
                      key={a.key}
                      onClick={() => {
                        toggle();
                        a.run();
                      }}
                    >
                      <span className="shrink-0 text-slate-400">{a.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words leading-snug">{a.label}</span>
                        {a.hint && (
                          <span className="block truncate text-xs font-normal text-slate-400">{a.hint}</span>
                        )}
                      </span>
                    </MenuItem>
                  ))}
                </MenuPanel>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab utama — 4 tab; ikon disembunyikan di layar sempit agar muat */}
      <div className="mb-6 flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 sm:w-fit">
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
