"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  House,
  Users,
  Megaphone,
  Note,
  ImageSquare,
  Trophy,
  Envelope,
  CalendarBlank,
  CaretRight,
  X,
} from "@/components/Icons";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: House },
  { label: "Kelola SPMB", href: "/admin/admission", icon: Users },
  { label: "Kelola Berita", href: "/admin/news", icon: Megaphone },
  { label: "Kelola Kegiatan", href: "/admin/activities", icon: CalendarBlank },
  { label: "Kelola Fasilitas", href: "/admin/facilities", icon: ImageSquare },
  { label: "Kelola Artikel", href: "/admin/articles", icon: Note },
  { label: "Kelola Guru", href: "/admin/teachers", icon: Users },
  { label: "Kelola Gallery", href: "/admin/gallery", icon: ImageSquare },
  { label: "Kelola Prestasi", href: "/admin/achievements", icon: Trophy },
  { label: "Kelola Pesan", href: "/admin/contact", icon: Envelope },
  { label: "Kelola Pengumuman", href: "/admin/announcements", icon: Megaphone },
  { label: "Kelola Agenda", href: "/admin/agenda", icon: CalendarBlank },
];

export default function AdminSidebar({
  isMobileOpen,
  onCloseMobile,
}: {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <Image src="/images/Logo-Sekolah.png" alt="Logo SMP Muhammadiyah 4 Tanggul" width={36} height={36} style={{ width: "auto", height: "auto" }} className="object-contain w-full h-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#082b59]">SMP Muhammadiyah 4</p>
            <p className="truncate text-[11px] text-slate-400">Tanggul</p>
          </div>
          <button
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Menu
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#082b59] text-white shadow-md shadow-[#082b59]/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#082b59]"
                    }`}
                  >
                    <item.icon
                      className={`h-[18px] w-[18px] flex-shrink-0 ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-[#082b59]"
                      }`}
                    />
                    {item.label}
                    {isActive && (
                      <CaretRight className="ml-auto h-3.5 w-3.5 text-white/60" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
