"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  House,
  Newspaper,
  FileText,
  ImageSquare,
  List,
  X,
  User,
  Trophy,
  Note,
  ChatCircle,
  CaretRight,
  SquaresFour,
  CalendarBlank,
} from "@/components/Icons";

/**
 * Bottom navigation khusus tampilan mobile (hanya halaman publik —
 * PublicShell tidak me-render ini untuk /admin).
 *
 * z-scale publik: bar 40 · navbar & FAB WhatsApp 50 · overlay sheet 60.
 * Menggantikan sticky "Daftar Sekarang" di /admission (opsi A):
 * item SPMB emas di tengah adalah CTA-nya.
 */

type NavIcon = React.ComponentType<{ className?: string; weight?: "regular" | "fill" }>;

const sheetLinks = [
  { href: "/portal", label: "Portal", icon: SquaresFour },
  { href: "/profile", label: "Profil", icon: User },
  { href: "/achievements", label: "Prestasi", icon: Trophy },
  { href: "/activities", label: "Kegiatan", icon: CalendarBlank },
  { href: "/articles", label: "Artikel", icon: Note },
  { href: "/contact", label: "Kontak", icon: ChatCircle },
];

function BottomLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: NavIcon;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex h-full flex-col items-center justify-center gap-1 rounded-[24px] px-1 py-2.5 text-[11px] leading-none transition-colors active:bg-[#082b59]/5 ${
          active ? "font-semibold text-[#082b59]" : "font-medium text-slate-500"
        }`}
      >
        <Icon className="h-6 w-6" weight={active ? "fill" : "regular"} />
        <span>{label}</span>
      </Link>
    </li>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Esc menutup + kunci scroll body saat sheet terbuka
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

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      {/* Bar utama — kartu melayang; layer latar punya cekungan notch di
          tepi atas tengah tempat bola SPMB duduk (mask memotong bar+shadow). */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)_+_10px)] z-40 md:hidden"
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-[24px] bg-white/95 shadow-[0_8px_30px_rgba(8,43,89,0.14)] backdrop-blur-xl [-webkit-mask-image:radial-gradient(circle_30px_at_50%_0,transparent_29px,black_31px)] [mask-image:radial-gradient(circle_30px_at_50%_0,transparent_29px,black_31px)]"
        />
        <ul className="relative grid grid-cols-5">
          <BottomLink href="/" label="Beranda" icon={House} active={isActive("/")} />
          <BottomLink href="/news" label="Berita" icon={Newspaper} active={isActive("/news")} />

          {/* SPMB — CTA emas: bola dipasang absolut di tepi atas bar
              (pusat pas di garis, seperti referensi) sehingga label tetap
              sejajar item lain; duduk di cekungan notch layer latar. */}
          <li>
            <Link
              href="/admission"
              aria-current={isActive("/admission") ? "page" : undefined}
              className="relative flex h-full flex-col items-center justify-center gap-1 px-1 py-2.5 text-[11px] font-bold leading-none text-[#082b59]"
            >
              <span aria-hidden className="h-6 w-6" />
              <span>SPMB</span>
              <span
                className={`absolute left-1/2 top-0 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#f4d21f] shadow-[0_6px_18px_rgba(244,210,31,0.5),0_2px_6px_rgba(8,43,89,0.12)] transition-transform active:scale-95 motion-reduce:transition-none ${
                  isActive("/admission") ? "ring-4 ring-[#082b59]/15" : ""
                }`}
              >
                <FileText className="h-5 w-5" weight="fill" />
              </span>
            </Link>
          </li>

          <BottomLink href="/gallery" label="Galeri" icon={ImageSquare} active={isActive("/gallery")} />

          {/* Lainnya → bottom sheet */}
          <li>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-expanded={sheetOpen}
              aria-controls="menu-lainnya"
              className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-[24px] px-1 py-2.5 text-[11px] font-medium leading-none text-slate-500 transition-colors active:bg-[#082b59]/5"
            >
              <List className="h-6 w-6" />
              <span>Lainnya</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Sheet "Lainnya" */}
      <div
        className={`fixed inset-0 z-[60] md:hidden ${sheetOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!sheetOpen}
      >
        {/* Backdrop */}
        <div
          onClick={() => setSheetOpen(false)}
          className={`absolute inset-0 bg-[#082b59]/40 transition-opacity duration-300 motion-reduce:transition-none ${
            sheetOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Panel */}
        <div
          id="menu-lainnya"
          role="dialog"
          aria-modal="true"
          aria-label="Menu lainnya"
          className={`absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-[#dce3ed] bg-white pb-[env(safe-area-inset-bottom)] transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none ${
            sheetOpen ? "visible translate-y-0" : "invisible translate-y-full"
          }`}
        >
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200" />
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <h2 className="text-sm font-bold text-[#082b59]">Menu Lainnya</h2>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Tutup menu"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#082b59]/5 hover:text-[#082b59]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1 px-4 pb-6 pt-2">
            {sheetLinks.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setSheetOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#082b59]/5 text-[#082b59]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-[#082b59]"
                    }`}
                  >
                    <Icon className="h-5 w-5" weight={active ? "fill" : "regular"} />
                    {label}
                    <CaretRight className="ml-auto h-4 w-4 text-slate-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
