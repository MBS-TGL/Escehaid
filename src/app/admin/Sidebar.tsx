"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  House,
  UserPlus,
  Envelope,
  Newspaper,
  Note,
  Bell,
  CalendarBlank,
  CalendarCheck,
  ImageSquare,
  Buildings,
  Trophy,
  GraduationCap,
  SquaresFour,
  CaretRight,
  ArrowSquareOut,
  X,
} from "@/components/Icons";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

// Dikelompokkan supaya mudah di-scan. Awalan "Kelola" dihapus karena
// konteksnya sudah jelas di panel admin.
const navGroups: NavGroup[] = [
  {
    items: [{ label: "Dashboard", href: "/admin", icon: House }],
  },
  {
    title: "Pendaftaran & Pesan",
    items: [
      { label: "SPMB", href: "/admin/admission", icon: UserPlus },
      { label: "Pesan", href: "/admin/contact", icon: Envelope },
    ],
  },
  {
    title: "Konten",
    items: [
      { label: "Berita", href: "/admin/news", icon: Newspaper },
      { label: "Artikel", href: "/admin/articles", icon: Note },
      { label: "Pengumuman", href: "/admin/announcements", icon: Bell },
      { label: "Kegiatan", href: "/admin/activities", icon: CalendarBlank },
      { label: "Agenda", href: "/admin/agenda", icon: CalendarCheck },
      { label: "Galeri", href: "/admin/gallery", icon: ImageSquare },
      { label: "Prestasi", href: "/admin/achievements", icon: Trophy },
    ],
  },
  {
    title: "Profil Sekolah",
    items: [
      { label: "Guru", href: "/admin/teachers", icon: GraduationCap },
      { label: "Fasilitas", href: "/admin/facilities", icon: Buildings },
      { label: "Portal", href: "/admin/portal", icon: SquaresFour },
    ],
  },
];

export default function AdminSidebar({
  isMobileOpen,
  onCloseMobile,
  badges = {},
}: {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  /** Jumlah notifikasi per menu, key = href. Contoh: { "/admin/contact": 3 } */
  badges?: Record<string, number>;
}) {
  const pathname = usePathname() ?? "";

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Brand */}
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200/80 px-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
            <Image
              src="/images/Logo-Sekolah.png"
              alt="Logo SMP Muhammadiyah 4 Tanggul"
              width={40}
              height={40}
              sizes="40px"
              className="h-10 w-10 rounded-lg object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#082b59]">SMP Muhammadiyah 4</p>
            <p className="truncate text-[11px] text-slate-500">Tanggul</p>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="Tutup menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082b59] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        {/* Scroll tetap jalan, bar scrollbar disembunyikan (pola .scrollbar-hide). */}
        <nav
          aria-label="Menu admin"
          className="flex-1 space-y-5 overflow-y-auto scrollbar-hide px-3 py-4"
        >
          {navGroups.map((group, i) => (
            <div key={group.title ?? i}>
              {group.title && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  const count = badges[item.href] ?? 0;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        aria-current={isActive ? "page" : undefined}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082b59] focus-visible:ring-offset-1 ${isActive
                            ? "bg-[#082b59] text-white shadow-md shadow-[#082b59]/20"
                            : "text-slate-600 hover:bg-slate-50 hover:text-[#082b59]"
                          }`}
                      >
                        <item.icon
                          className={`h-[18px] w-[18px] flex-shrink-0 ${isActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-[#082b59]"
                            }`}
                        />
                        <span className="truncate">{item.label}</span>

                        {count > 0 && (
                          <span
                            className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${isActive
                                ? "bg-white text-[#082b59]"
                                : "bg-red-500 text-white"
                              }`}
                            aria-label={`${count} baru`}
                          >
                            {count > 99 ? "99+" : count}
                          </span>
                        )}

                        {isActive && count === 0 && (
                          <CaretRight className="ml-auto h-3.5 w-3.5 text-white/60" />
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
        <div className="flex-shrink-0 border-t border-slate-200/80 p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#082b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082b59]"
          >
            <ArrowSquareOut className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
            Lihat website
          </a>
        </div>
      </aside>
    </>
  );
}