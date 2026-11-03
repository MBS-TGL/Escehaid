"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { MagnifyingGlass, CaretDown } from "@/components/Icons";
import SearchOverlay from "@/components/SearchOverlay";
import type { PublicBrand } from "@/lib/settings";

type NavLeaf = { href: string; label: string };
/** Entri top-level: tautan langsung ATAU dropdown berisi anak-anak halaman. */
type NavEntry =
  | NavLeaf
  | { label: string; hideOnMd?: boolean; children: NavLeaf[] };

const isDropdown = (entry: NavEntry): entry is Exclude<NavEntry, NavLeaf> =>
  "children" in entry;

/**
 * Navbar desktop diringkas dengan dropdown: 6 slot + tombol SPMB (sebelumnya
 * 9 tautan datar dan terus bertambah setiap halaman publik baru). Halaman
 * Portal & Unduhan tetap terjangkau lewat dropdown "Layanan" (hanya lg+),
 * footer, dan sheet mobile.
 */
const NAV_ITEMS: NavEntry[] = [
  { href: "/", label: "Beranda" },
  {
    label: "Profil",
    children: [
      { href: "/profile", label: "Profil Sekolah" },
      { href: "/fasilitas", label: "Fasilitas" },
      { href: "/guru", label: "Guru & Staff" },
      { href: "/faq", label: "Tanya Jawab" },
    ],
  },
  {
    label: "Program",
    children: [
      { href: "/program", label: "Program Unggulan" },
      { href: "/activities", label: "Kegiatan" },
      { href: "/ekskul", label: "Ekstrakurikuler" },
    ],
  },
  {
    label: "Informasi",
    children: [
      { href: "/news", label: "Berita" },
      { href: "/articles", label: "Artikel" },
      { href: "/pengumuman", label: "Pengumuman" },
      { href: "/agenda", label: "Agenda" },
      { href: "/achievements", label: "Prestasi" },
    ],
  },
  { href: "/gallery", label: "Galeri" },
  { href: "/contact", label: "Kontak" },
  {
    label: "Layanan",
    hideOnMd: true,
    children: [
      { href: "/portal", label: "Portal Layanan" },
      { href: "/downloads", label: "Unduhan" },
    ],
  },
];

/** Tautan aktif bila pathname = href atau berawalan href (kecuali beranda). */
const matchesPath = (href: string, pathname: string) =>
  href !== "/" && (pathname === href || pathname.startsWith(href));

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
                {NAV_ITEMS.map((entry, i) => {
                  if (isDropdown(entry)) {
                    const childActive = entry.children.some((c) => matchesPath(c.href, pathname));
                    return (
                      <div
                        key={entry.label}
                        className={`group relative ${entry.hideOnMd ? "hidden lg:block" : ""}`}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Pemicu dropdown — hover (desktop) dan fokus keyboard
                            (focus-within) sama-sama membuka panel di bawahnya. */}
                        <button
                          type="button"
                          aria-haspopup="true"
                          aria-current={childActive ? "page" : undefined}
                          className={`nav-link flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:px-3.5 ${childActive
                              ? "nav-link-active text-[var(--brand-primary)]"
                              : "text-slate-500 hover:text-[var(--brand-primary)]"
                            }`}
                        >
                          {entry.label}
                          <CaretDown
                            className="h-3 w-3 text-slate-400 transition-transform duration-300 group-hover:rotate-180 motion-reduce:transition-none"
                            weight="fill"
                          />
                        </button>

                        {/* Panel: wrapper memakai pt agar celah trigger→panel
                            tetap "area hover" (panel tidak tutup saat kursor
                            melewati celah). */}
                        <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition-all duration-200 focus-within:visible focus-within:opacity-100 group-hover:visible group-hover:opacity-100 motion-reduce:transition-none">
                          <div className="min-w-[190px] rounded-xl border border-[#dce3ed] bg-white p-1.5 shadow-xl shadow-[var(--brand-primary)]/10">
                            {entry.children.map((child) => {
                              const active = matchesPath(child.href, pathname);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  aria-current={active ? "page" : undefined}
                                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${active
                                      ? "bg-[var(--brand-primary)]/5 font-semibold text-[var(--brand-primary)]"
                                      : "text-slate-600 hover:bg-slate-50 hover:text-[var(--brand-primary)]"
                                    }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isActive = pathname === entry.href || matchesPath(entry.href, pathname);
                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      aria-current={isActive ? "page" : undefined}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`nav-link rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:px-3.5 ${isActive
                          ? "nav-link-active text-[var(--brand-primary)]"
                          : "text-slate-500 hover:text-[var(--brand-primary)]"
                        }`}
                    >
                      {entry.label}
                    </Link>
                  );
                })}
                <Link
                  href="/admission"
                  className="ml-3 rounded-xl bg-[var(--brand-accent)] px-5 py-2 text-sm font-bold text-white transition-all hover:brightness-95 hover:shadow-lg hover:shadow-[var(--brand-accent)]/20"
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
