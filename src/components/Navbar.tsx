"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { MagnifyingGlass } from "@/components/Icons";
import SearchOverlay from "@/components/SearchOverlay";
import type { PublicBrand } from "@/lib/settings";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/profile", label: "Profil" },
  { href: "/achievements", label: "Prestasi" },
  { href: "/news", label: "Berita" },
  { href: "/articles", label: "Artikel" },
  { href: "/activities", label: "Kegiatan", hideOnMd: true },
  { href: "/gallery", label: "Galeri" },
  { href: "/contact", label: "Kontak" },
];

export default function Navbar({ brand }: { brand: PublicBrand }) {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Pintasan Ctrl/⌘+K membuka/tutup pencarian ( sama dengan admin Topbar ).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Di HP, header ikut bersembunyi bersama bottom nav: MobileBottomNav menyetel
  // <html data-nav-hidden="true"> saat scroll turun. Tidak ikut sembunyi saat
  // overlay pencarian terbuka. `max-md` karena bottom nav hanya tampil < md.
  const hideOnMobile = searchOpen
    ? ""
    : "max-md:[[data-nav-hidden=true]_&]:-translate-y-[calc(100%_+_8px)]";

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className={`sticky top-0 z-50 print:hidden transition-all duration-300 motion-reduce:transition-none ${hideOnMobile} ${scrolled
            ? "border-b border-[#dce3ed]/60 bg-white/90 shadow-sm md:bg-white/80 md:backdrop-blur-xl"
            : "border-b border-[#dce3ed] bg-white"
          }`}
      >
        <div className="mx-auto max-w-[1296px] px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between md:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLogo
                src={brand.logo}
                alt={`Logo ${brand.name}`}
                priority
                className="h-8 w-auto shrink-0 md:h-9"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-bold tracking-tight text-[var(--brand-primary)]">
                  {brand.shortName}
                </span>
                <span className="text-[11px] font-medium text-[var(--brand-accent)]">
                  {brand.city}
                </span>
              </div>
            </Link>

            {/* Kanan: nav desktop + pintu pencarian (ikon tetap tampil di mobile) */}
            <div className="flex items-center gap-1 md:gap-2">
              <div className={`hidden items-center gap-1 md:flex ${hoveredIndex !== null ? "nav-hovering" : ""}`}>
                {navLinks.map((link, i) => {
                  const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`nav-link rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:px-3.5 ${isActive
                          ? "nav-link-active text-[var(--brand-primary)]"
                          : "text-slate-500 hover:text-[var(--brand-primary)]"
                        } ${link.hideOnMd ? "hidden lg:block" : ""}`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <Link
                  href="/admission"
                  className="ml-3 rounded-xl bg-[#f4d21f] px-5 py-2 text-sm font-bold text-[var(--brand-primary)] transition-all hover:bg-[#e6c41c] hover:shadow-lg hover:shadow-[#f4d21f]/20"
                >
                  SPMB
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Cari di situs"
                aria-haspopup="dialog"
                aria-expanded={searchOpen}
                className={`rounded-lg p-2 transition-colors ${searchOpen
                    ? "text-[var(--brand-primary)]"
                    : "text-slate-500 hover:text-[var(--brand-primary)]"
                  }`}
              >
                <MagnifyingGlass className="h-5 w-5" />
              </button>
            </div>

          </div>
        </div>
      </nav>
      {/*
      Overlay sengaja dirender DI LUAR <nav>: sticky + z-50 pada nav membuat
      stacking context, sehingga z-[60] overlay "terkurung" di level 50 dan
      FAB WhatsApp (z-50, belakangan di DOM) akan menempel di atas backdrop.
      Sebagai sibling, z-[60] overlay menang atas nav (50) dan FAB (50).
    */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}