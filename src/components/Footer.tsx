"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Envelope } from "@phosphor-icons/react";

export default function Footer() {
  return (
    <footer className="bg-[#082b59] text-white">
      <div className="mx-auto max-w-[1296px] px-6 py-8 md:px-10 md:py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/Logo-Sekolah.png"
                alt="Logo SMP Muhammadiyah 4 Tanggul"
                width={32}
                height={42}
                className="shrink-0"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-white">SMP Muhammadiyah 4</span>
                <span className="text-xs text-white/50">Tanggul, Jember</span>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/40">
              School of Talents
            </p>
            <div className="mt-3 flex items-center gap-3">
              <a href="https://instagram.com/mbstanggul" target="_blank" rel="noopener noreferrer" className="text-white/40 transition-colors hover:text-[#f4d21f]" aria-label="Instagram">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://youtube.com/@MBSTANGGUL" target="_blank" rel="noopener noreferrer" className="text-white/40 transition-colors hover:text-[#f4d21f]" aria-label="YouTube">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="https://facebook.com/mbs.tanggul" target="_blank" rel="noopener noreferrer" className="text-white/40 transition-colors hover:text-[#f4d21f]" aria-label="Facebook">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
          </div>

          {/* Menu */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Menu</h3>
            <ul className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                ["/profile", "Profil Sekolah"],
                ["/admission", "SPMB Online"],
                ["/news", "Berita"],
                ["/articles", "Artikel"],
                ["/achievements", "Prestasi"],
                ["/gallery", "Galeri"],
                ["/contact", "Kontak"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-white/50 transition-colors hover:text-[#f4d21f]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Kontak</h3>
            <ul className="mt-2.5 space-y-2">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f4d21f]" />
                <span className="text-xs text-white/50">
                  Jl. Pemandian No. 88, Patemon, Tanggul, Jember 68154
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-[#f4d21f]" />
                <span className="text-xs text-white/50">0858-5200-4008</span>
              </li>
              <li className="flex items-center gap-2">
                <Envelope className="h-3.5 w-3.5 shrink-0 text-[#f4d21f]" />
                <span className="text-xs text-white/50">smpm4tangguljember@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} SMP Muhammadiyah 4 Tanggul. Hak cipta dilindungi.
        </div>
      </div>
    </footer>
  );
}
