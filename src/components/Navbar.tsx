"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { List, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/profile", label: "Profil" },
  { href: "/achievements", label: "Prestasi" },
  { href: "/news", label: "Berita" },
  { href: "/articles", label: "Artikel" },
  { href: "/gallery", label: "Gallery" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[#dce3ed]/60 bg-white/80 shadow-sm backdrop-blur-xl"
          : "border-b border-[#dce3ed] bg-white"
      }`}
    >
      <div className="mx-auto max-w-[1296px] px-5 sm:px-8">
        <div className="flex h-16 items-center justify-between md:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/Logo-Sekolah.png"
              alt="Logo SMP Muhammadiyah 4 Tanggul"
              width={36}
              height={46}
              className="shrink-0"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-bold tracking-tight text-[#082b59]">
                SMP Muhammadiyah 4
              </span>
              <span className="text-[11px] font-medium text-[#1767b1]">
                Tanggul
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className={`hidden items-center gap-1 md:flex ${hoveredIndex !== null ? "nav-hovering" : ""}`}>
            {navLinks.map((link, i) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`nav-link rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "nav-link-active text-[#082b59]"
                      : "text-slate-500 hover:text-[#082b59]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/admission"
              className="ml-3 rounded-xl bg-[#f4d21f] px-5 py-2 text-sm font-bold text-[#082b59] transition-all hover:bg-[#e6c41c] hover:shadow-lg hover:shadow-[#f4d21f]/20"
            >
              PPDB
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-2 text-[#082b59] transition-colors hover:bg-[#082b59]/5 md:hidden"
          >
            {isOpen ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          isOpen ? "max-h-[28rem]" : "max-h-0"
        }`}
      >
        <div className="border-t border-[#dce3ed] bg-white px-4 pb-4 pt-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#082b59]/5 text-[#082b59]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#082b59]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/admission"
            onClick={() => setIsOpen(false)}
            className="mt-2 block rounded-xl bg-[#f4d21f] px-3 py-2.5 text-center text-sm font-bold text-[#082b59] transition-all hover:bg-[#e6c41c]"
          >
            PPDB
          </Link>
        </div>
      </div>
    </nav>
  );
}
