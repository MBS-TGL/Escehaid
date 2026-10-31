"use client";

import { useEffect, useRef } from "react";
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
  BookOpen,
  CaretRight,
  CaretLeft,
  ArrowSquareOut,
  FolderOpen,
  Scroll,
  Gear,
  Flag,
  UsersThree,
  Download,
  ChatCircle,
  Database,
  Heartbeat,
  Trash,
  Code,
  Warning,
  ChartLine,
} from "@/components/Icons";
import { usePermissions } from "./PermissionsProvider";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Izin yang dibutuhkan agar item tampil (penyaringan UI saja). */
  perm?: string;
  /** true = tautan luar (dibuka tab baru), bukan route internal. */
  external?: boolean;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

// Dikelompokkan supaya mudah di-scan. Awalan "Kelola" dihapus karena
// konteksnya sudah jelas di panel admin.
//
// Diekspor karena bottom nav mobile (MobileNav.tsx) menampilkan daftar yang
// sama persis — satu sumber kebenaran untuk seluruh struktur menu admin.
export const navGroups: NavGroup[] = [
  {
    items: [{ label: "Dashboard", href: "/admin", icon: House }],
  },
  {
    title: "Pendaftaran & Pesan",
    items: [
      { label: "SPMB", href: "/admin/admission", icon: UserPlus, perm: "spmb:read" },
      { label: "Pesan", href: "/admin/contact", icon: Envelope, perm: "kontak:read" },
    ],
  },
  {
    title: "Konten",
    items: [
      { label: "Berita", href: "/admin/news", icon: Newspaper, perm: "berita:read" },
      { label: "Artikel", href: "/admin/articles", icon: Note, perm: "artikel:read" },
      { label: "Pengumuman", href: "/admin/announcements", icon: Bell, perm: "pengumuman:read" },
      { label: "Kegiatan", href: "/admin/activities", icon: CalendarBlank, perm: "kegiatan:read" },
      { label: "Agenda", href: "/admin/agenda", icon: CalendarCheck, perm: "agenda:read" },
      { label: "Galeri", href: "/admin/gallery", icon: ImageSquare, perm: "galeri:read" },
      { label: "Unduhan", href: "/admin/downloads", icon: Download, perm: "unduhan:read" },
      { label: "Media", href: "/admin/media", icon: FolderOpen, perm: "media:read" },
      { label: "Prestasi", href: "/admin/achievements", icon: Trophy, perm: "prestasi:read" },
      { label: "FAQ", href: "/admin/faq", icon: ChatCircle, perm: "faq:read" },
      { label: "Sampah", href: "/admin/trash", icon: Trash, perm: "sampah:read" },
    ],
  },
  {
    title: "Profil Sekolah",
    items: [
      { label: "Guru", href: "/admin/teachers", icon: GraduationCap, perm: "guru:read" },
      { label: "Fasilitas", href: "/admin/facilities", icon: Buildings, perm: "fasilitas:read" },
      { label: "Ekskul", href: "/admin/ekskul", icon: Trophy, perm: "ekskul:read" },
      { label: "Portal", href: "/admin/portal", icon: SquaresFour, perm: "portal:read" },
      { label: "Program", href: "/admin/program", icon: BookOpen, perm: "program:read" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "Konfigurasi Situs", href: "/admin/settings", icon: Gear, perm: "settings:manage" },
      { label: "Pengguna", href: "/admin/users", icon: UsersThree, perm: "users:manage" },
      { label: "Log Aktivitas", href: "/admin/logs", icon: Scroll, perm: "logs:read" },
      { label: "Feature Flags", href: "/admin/flags", icon: Flag, perm: "flags:manage" },
      // Catatan: "Pengaturan Akun" (urusan pribadi per-user) tidak ada di sini —
      // rumahnya di dropdown avatar Topbar (pola GitHub). Grup ini murni alat sistem.
    ],
  },
  {
    // Operasional sekolah: dipakai Admin Sekolah sehari-hari (izin
    // `backup:read` & `diagnostik:read` memang di-seed untuk peran itu),
    // jadi tidak digabung dengan "Developer" yang hanya Super Admin.
    title: "Operasional",
    items: [
      { label: "Cadangan", href: "/admin/backup", icon: Database, perm: "backup:read" },
      { label: "Diagnostik", href: "/admin/diagnostics", icon: Heartbeat, perm: "diagnostik:read" },
      { label: "Analitik", href: "/admin/analytics", icon: ChartLine, perm: "analitik:read" },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "Migrasi SQL", href: "/admin/sql", icon: Code, perm: "sql:manage" },
      { label: "Sentry (error)", href: "https://esceha.sentry.io/projects/escehaid/", icon: Warning, perm: "dev:read", external: true },
      { label: "Uptime Monitor", href: "https://uptimerobot.com/dashboard", icon: ChartLine, perm: "dev:read", external: true },
    ],
  },
];

/**
 * Menu "Dashboard" ber-`href` "/admin" — tanpa kecocokan persis, seluruh
 * halaman anak (/admin/news, dst.) ikut dianggap aktif.
 */
export function isNavActive(href: string, pathname: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/**
 * Saring navGroups agar hanya menampilkan item yang izinnya dimiliki.
 *
 * PENYARINGAN UI SAJA — penegakan server ada di proxy.ts & server action.
 * Item tanpa `perm` selalu tampil. Grup yang kosong setelah disaring ikut
 * disembunyikan (termasuk judulnya).
 */
export function filterNavGroups(
  groups: NavGroup[],
  canFn: (perm: string) => boolean
): NavGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.perm || canFn(it.perm)),
    }))
    .filter((g) => g.items.length > 0);
}

/**
 * Sidebar khusus tampilan desktop.
 *
 * Di bawah breakpoint `lg` sidebar TIDAK dirender sama sekali: navigasi mobile
 * memakai bottom nav + master sheet (lihat MobileNav.tsx). Karena itu tidak ada
 * overlay geser maupun tombol X.
 *
 * Yang ADA: mode lipat (rail) untuk desktop — `collapsed` menyempitkan sidebar
 * 270px → 72px dan hanya menyisakan ikon; `onToggle` merender tombol lipat di
 * tengah tepi kanan. State-nya dipegang DashboardLayout dan disimpan di
 * localStorage (src/lib/admin-sidebar-state.ts), jadi bertahan antar-reload.
 */
export default function AdminSidebar({
  badges = {},
  collapsed = false,
  onToggle,
}: {
  /** Jumlah notifikasi per menu, key = href. Contoh: { "/admin/contact": 3 } */
  badges?: Record<string, number>;
  /** true = mode rail (hanya ikon, lebar 72px). Default false = lebar penuh. */
  collapsed?: boolean;
  /**
   * Bila diberikan, tombol lipat dirender di tengah tepi kanan sidebar.
   * Tanpa prop ini tombol tidak ada — komponen tetap bisa dipakai apa adanya.
   */
  onToggle?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const navRef = useRef<HTMLElement | null>(null);
  const { can: canFn } = usePermissions();
  const groups = filterNavGroups(navGroups, canFn);

  // Pada layar pendek (mis. 800×382) tinggi area menu hanya ±254px sementara
  // daftarnya ±1250px — dan bar scrollbar sengaja disembunyikan oleh
  // `.scrollbar-hide`. Akibatnya menu aktif bisa berhenti tepat di batas bawah,
  // setengah terpotong oleh footer. Gulirkan menu aktif ke tampilan terdekat
  // setiap pindah halaman supaya selalu terlihat utuh.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <>
      <aside
        id="admin-sidebar"
        // `transition-[width]` + `motion-reduce` supaya lipat/lebar halus, dan
        // diam total bagi pengguna yang meminta gerak dikurangi.
        className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-slate-200/80 bg-white transition-[width] duration-300 motion-reduce:transition-none lg:flex ${
          collapsed ? "lg:w-[72px]" : "lg:w-[270px]"
        }`}
      >
        {/* Tombol lipat — menempel di TENGAH tepi kanan sidebar (garis batas
            dengan area Topbar/konten). Anak dari `aside` sehingga posisinya ikut
            lebar induk tanpa perlu sinkronisasi angka apa pun. `-right-3` (12px)
            menaruhnya tepat di atas border 1px; `aside` tidak punya `overflow`
            jadi tonjolan ini tidak ter-clip. Otomatis tak terlihat di mobile
            karena induknya `hidden lg:flex`. */}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls="admin-sidebar"
            aria-label={collapsed ? "Perbesar menu samping" : "Perkecil menu samping"}
            title={collapsed ? "Perbesar menu samping" : "Perkecil menu samping"}
            className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1"
          >
            <CaretLeft
              className={`h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        )}

        {/* Brand */}
        <div
          className={`flex h-16 flex-shrink-0 items-center border-b border-slate-200/80 ${
            collapsed ? "justify-center" : "gap-3 px-5"
          }`}
        >
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
          {/* `sr-only` (bukan dihapus) saat rail: nama sekolah tetap terbaca
              pembaca layar. `sr-only` = position:absolute → keluar dari alur
              flex, jadi `justify-center` tetap memusatkan logo. */}
          <div className={`min-w-0 flex-1 ${collapsed ? "sr-only" : ""}`}>
            <p className="truncate text-sm font-bold text-[var(--brand-primary)]">SMP Muhammadiyah 4</p>
            <p className="truncate text-[11px] text-slate-500">Tanggul</p>
          </div>
        </div>

        {/* Navigation */}
        {/* `min-h-0` menjamin nav boleh menyusut sampai 0 tinggi sehingga
            selalu meng-clip & scroll, bukan meluber melewati footer.
            `pb-6` memberi jarak agar item terakhir tidak menempel di border footer. */}
        <nav
          ref={navRef}
          aria-label="Menu admin"
          className={`min-h-0 flex-1 space-y-5 overflow-y-auto scrollbar-hide pb-6 pt-4 ${
            collapsed ? "px-2" : "px-3"
          }`}
        >
          {groups.map((group, i) => (
            <div key={group.title ?? i}>
              {group.title &&
                (collapsed ? (
                  // Judul teks mustahil muat di 72px → garis pemisah sebagai
                  // penanda grup, sementara teksnya tetap ada untuk pembaca layar.
                  <>
                    <div aria-hidden="true" className="mx-auto mb-1.5 h-px w-6 bg-slate-200" />
                    <span className="sr-only">{group.title}</span>
                  </>
                ) : (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {group.title}
                  </p>
                ))}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = isNavActive(item.href, pathname);
                  const count = badges[item.href] ?? 0;
                  // Label lengkap untuk tooltip `title` di mode rail — sekaligus
                  // menyertakan jumlah notifikasi agar tak hilang saat menyempit.
                  const railTitle = count > 0 ? `${item.label} (${count} baru)` : item.label;

                  return (
                    <li key={item.href}>
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={collapsed ? railTitle : undefined}
                          className={`group flex items-center rounded-lg py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1 ${
                            collapsed ? "justify-center px-2" : "gap-3 px-3"
                          }`}
                        >
                          <span className="relative flex-shrink-0">
                            <item.icon className="h-[18px] w-[18px] flex-shrink-0 text-slate-400 group-hover:text-[var(--brand-primary)]" />
                            {collapsed && count > 0 && (
                              <span
                                aria-hidden="true"
                                className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white"
                              >
                                {count > 9 ? "9+" : count}
                              </span>
                            )}
                          </span>
                          <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
                          {collapsed && count > 0 && (
                            <span className="sr-only">, {count} baru</span>
                          )}
                          {!collapsed && (
                            <ArrowSquareOut className="ml-auto h-3.5 w-3.5 text-slate-300 group-hover:text-[var(--brand-primary)]" />
                          )}
                        </a>
                      ) : (
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        title={collapsed ? railTitle : undefined}
                        className={`group flex items-center rounded-lg py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1 ${
                          collapsed ? "justify-center px-2" : "gap-3 px-3"
                        } ${isActive
                            ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                            : "text-slate-600 hover:bg-slate-50 hover:text-[var(--brand-primary)]"
                          }`}
                      >
                        <span className="relative flex-shrink-0">
                          <item.icon
                            className={`h-[18px] w-[18px] flex-shrink-0 ${isActive
                                ? "text-white"
                                : "text-slate-400 group-hover:text-[var(--brand-primary)]"
                              }`}
                          />
                          {/* Badge menempel di pojok ikon saat rail — `ml-auto`
                              tidak punya ruang di 72px. */}
                          {collapsed && count > 0 && (
                            <span
                              aria-hidden="true"
                              className={`absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
                                isActive ? "bg-white text-[var(--brand-primary)]" : "bg-red-500 text-white"
                              }`}
                            >
                              {count > 9 ? "9+" : count}
                            </span>
                          )}
                        </span>
                        <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>

                        {collapsed && count > 0 && (
                          <span className="sr-only">, {count} baru</span>
                        )}

                        {!collapsed && count > 0 && (
                          <span
                            className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${isActive
                                ? "bg-white text-[var(--brand-primary)]"
                                : "bg-red-500 text-white"
                              }`}
                            aria-label={`${count} baru`}
                          >
                            {count > 99 ? "99+" : count}
                          </span>
                        )}

                        {!collapsed && isActive && count === 0 && (
                          <CaretRight className="ml-auto h-3.5 w-3.5 text-white/60" />
                        )}
                      </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        {/* `bg-white` + `relative z-10`: footer selalu punya permukaan sendiri,
            jadi teks menu tidak pernah bisa menembus/menutupi "Lihat website". */}
        <div className="relative z-10 shrink-0 border-t border-slate-200/80 bg-white p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "Lihat website" : undefined}
            className={`flex items-center rounded-lg py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
              collapsed ? "justify-center px-2" : "gap-3 px-3"
            }`}
          >
            <ArrowSquareOut className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
            <span className={collapsed ? "sr-only" : undefined}>Lihat website</span>
          </a>
        </div>
      </aside>
    </>
  );
}
