"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  House,
  UserPlus,
  Envelope,
  Newspaper,
  List,
  X,
  ArrowSquareOut,
} from "@/components/Icons";
import { navGroups, isNavActive, filterNavGroups } from "./Sidebar";
import { usePermissions } from "./PermissionsProvider";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; weight?: "regular" | "fill" }>;
  /** Izin yang dibutuhkan agar item tampil (penyaringan UI saja). */
  perm?: string;
};

/**
 * Empat menu paling sering dipakai admin saat mobile, ditutup tombol
 * "Lainnya" yang membuka master sheet berisi SELURUH navGroups.
 *
 * Dipilih karena tugas mobile yang paling mendesak adalah: cek dashboard,
 * cek pendaftar SPMB, balas pesan, dan unggah berita. Sisanya (Artikel,
 * Pengumuman, Kegiatan, Agenda, Galeri, Prestasi, Guru, Fasilitas, Portal)
 * tetap tersedia lewat sheet — daftarnya diambil dari navGroups di Sidebar.tsx
 * sehingga struktur menu tidak pernah bisa berbeda antara desktop & mobile.
 */
const primaryItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: House },
  { label: "SPMB", href: "/admin/admission", icon: UserPlus, perm: "spmb:read" },
  { label: "Pesan", href: "/admin/contact", icon: Envelope, perm: "kontak:read" },
  { label: "Berita", href: "/admin/news", icon: Newspaper, perm: "berita:read" },
];

/**
 * `badges`: jumlah yang perlu perhatian per href, mis.
 * { "/admin/admission": 3, "/admin/contact": 1 }. Dihitung di layout (server).
 */
export default function AdminMobileNav({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname() ?? "";
  const [sheetOpen, setSheetOpen] = useState(false);
  const { can: canFn } = usePermissions();
  const visiblePrimary = primaryItems.filter((it) => !it.perm || canFn(it.perm));
  const groups = filterNavGroups(navGroups, canFn);

  // Esc menutup + kunci scroll body selama sheet terbuka. `visibility` pada
  // transisi panel (lihat di bawah) membuat anaknya keluar dari tab order
  // saat tertutup, jadi tidak ada focus trap yang perlu disetel manual.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  return (
    <>
      {/* Bar bawah — hanya di bawah lg. Di atas lg sidebar tampil (Sidebar.tsx). */}
      <nav
        aria-label="Navigasi admin"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden"
      >
        {/* grid dinamis: jumlah item terlihat + tombol "Lainnya". */}
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${visiblePrimary.length + 1}, minmax(0, 1fr))` }}
        >
          {visiblePrimary.map((item) => {
            const isActive = isNavActive(item.href, pathname);
            const badge = badges[item.href] ?? 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 text-[11px] leading-none transition-colors active:bg-[#082b59]/5 ${isActive ? "font-semibold text-[#082b59]" : "font-medium text-slate-500"
                    }`}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-[#082b59]"
                    />
                  )}
                  <span className="relative">
                    <span className="flex h-7 w-12 items-center justify-center">
                      <item.icon
                        className={`h-5 w-5 ${isActive ? "text-[#082b59]" : "text-slate-500"}`}
                        weight={isActive ? "fill" : "regular"}
                      />
                    </span>
                    {badge > 0 && (
                      <span
                        aria-hidden
                        className="absolute right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </span>
                  <span>
                    {item.label}
                    {badge > 0 && <span className="sr-only">, {badge} perlu perhatian</span>}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Lainnya → master sheet */}
          <li>
            <button
              type="button"
              onClick={() => setSheetOpen((v) => !v)}
              aria-expanded={sheetOpen}
              aria-controls="admin-nav-sheet"
              className="flex w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium leading-none text-slate-500 transition-colors active:bg-[#082b59]/5"
            >
              <span className="flex h-7 w-12 items-center justify-center">
                <List className="h-5 w-5 text-slate-500" />
              </span>
              <span>Lainnya</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Master sheet — selalu ter-mount agar transisi slide-up tetap jalan.
          Saat tertutup: `invisible` (keluar dari tab order & accessibility tree)
          + `pointer-events-none` pada pembungkusnya. */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sheetOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!sheetOpen}
      >
        <div
          onClick={() => setSheetOpen(false)}
          className={`absolute inset-0 bg-[#082b59]/40 transition-opacity duration-300 motion-reduce:transition-none ${sheetOpen ? "opacity-100" : "opacity-0"
            }`}
        />

        <div
          id="admin-nav-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Menu admin lengkap"
          className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-[#dce3ed] bg-white pb-[max(env(safe-area-inset-bottom),8px)] transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none ${sheetOpen ? "visible translate-y-0" : "invisible translate-y-full"
            }`}
        >
          {/* Handle */}
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-slate-200" />

          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 pb-3 pt-3">
            <Image
              src="/images/Logo-Sekolah.png"
              alt=""
              width={32}
              height={32}
              sizes="32px"
              className="h-8 w-8 rounded-lg object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#082b59]">SMP Muhammadiyah 4</p>
              <p className="truncate text-[11px] text-slate-500">Menu admin lengkap</p>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Tutup menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082b59]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Daftar menu — `min-h-0` supaya area ini yang menyusut & scroll,
              bukan meluber melewati footer (pelajaran dari sidebar desktop). */}
          <nav
            aria-label="Menu admin lengkap"
            className="min-h-0 flex-1 space-y-5 overflow-y-auto scrollbar-hide px-4 pb-4 pt-4"
          >
            {groups.map((group, i) => (
              <div key={group.title ?? i}>
                {group.title && (
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {group.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isNavActive(item.href, pathname);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setSheetOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082b59] focus-visible:ring-offset-1 ${isActive
                            ? "bg-[#082b59] text-white shadow-md shadow-[#082b59]/20"
                            : "text-slate-600 hover:bg-slate-50 hover:text-[#082b59]"
                            }`}
                        >
                          <item.icon
                            className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-[#082b59]"
                              }`}
                          />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-white/70">
                              Aktif
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-white p-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setSheetOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#082b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082b59]"
            >
              <ArrowSquareOut className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
              Lihat website
            </a>
          </div>
        </div>
      </div>
    </>
  );
}