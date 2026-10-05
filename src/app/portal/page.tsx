import Link from "next/link";
import {
  House,
  HandCoins,
  Building,
  Newspaper,
  Trophy,
  ImageSquare,
  FileText,
  CalendarBlank,
  MapPin,
  Star,
  SquaresFour,
  BookOpen,
  GraduationCap,
  ChartBar,
  Clock,
} from "@/components/Icons";
import { getActiveAgendaEvents, getPortalApps } from "@/lib/queries";
import type { PortalApp } from "@/lib/queries";
import { CSSFadeIn } from "@/components/CSSAnimations";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal",
  description:
    "Portal layanan SMP Muhammadiyah 4 Tanggul - akses cepat ke SPMB, aplikasi sekolah, dan agenda kegiatan.",
  alternates: { canonical: "/portal" },
};

export const revalidate = 3600;

type AppIcon = React.ComponentType<{ className?: string; weight?: "regular" | "fill" }>;

/** Kolom `icon` di tabel portal_apps berisi nama komponen ikon, mis. "HandCoins". */
const ICONS: Record<string, AppIcon> = {
  House,
  HandCoins,
  Building,
  Newspaper,
  Trophy,
  ImageSquare,
  FileText,
  CalendarBlank,
  MapPin,
  Star,
  SquaresFour,
  BookOpen,
  GraduationCap,
  ChartBar,
  Clock,
};

/** Kolom `color` di tabel portal_apps berisi kunci warna. Kelas ditulis utuh agar terbaca Tailwind. */
const COLORS: Record<string, { box: string; ink: string }> = {
  navy: { box: "bg-[#082b59]/10", ink: "text-[#082b59]" },
  sky: { box: "bg-sky-50", ink: "text-sky-600" },
  blue: { box: "bg-blue-50", ink: "text-blue-600" },
  amber: { box: "bg-amber-50", ink: "text-amber-600" },
  violet: { box: "bg-violet-50", ink: "text-violet-600" },
  teal: { box: "bg-teal-50", ink: "text-teal-600" },
  rose: { box: "bg-rose-50", ink: "text-rose-600" },
  emerald: { box: "bg-emerald-50", ink: "text-emerald-600" },
};

/** Tautan ke bagian website sendiri (sama dengan navbar, ditampilkan sebagai jalan pintas). */
const SITE_LINKS = [
  { href: "/profile", label: "Profil" },
  { href: "/news", label: "Berita" },
  { href: "/achievements", label: "Prestasi" },
  { href: "/gallery", label: "Galeri" },
  { href: "/articles", label: "Artikel" },
  { href: "/activities", label: "Kegiatan" },
  { href: "/contact", label: "Kontak" },
];

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Parse "YYYY-MM-DD" sebagai tanggal lokal (aman dari geser timezone). */
function parseDate(iso: string): { tgl: number; bln: number; thn: number; date: Date } {
  const [thn, bln, tgl] = iso.slice(0, 10).split("-").map(Number);
  return { tgl, bln, thn, date: new Date(thn, bln - 1, tgl) };
}

function AppTile({ app }: { app: PortalApp }) {
  const Icon = ICONS[app.icon] ?? SquaresFour;
  const { box, ink } = COLORS[app.color] ?? COLORS.navy;

  const base =
    "group flex h-full flex-col items-center gap-1.5 rounded-2xl border border-[#dce3ed] bg-white px-2 py-4 text-center sm:py-5";
  const active =
    "transition-all hover:-translate-y-0.5 hover:border-[#082b59]/25 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#082b59]";

  const content = (
    <>
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${box} ${ink}`}
      >
        <Icon className="h-6 w-6" weight="fill" />
      </span>
      <span className="text-sm font-semibold text-slate-800">{app.label}</span>
      <span className="line-clamp-2 text-[11px] leading-tight text-slate-500">
        {app.is_coming_soon ? "Segera hadir" : app.description}
      </span>
    </>
  );

  if (app.is_coming_soon) {
    return (
      <div className={`${base} opacity-60`} aria-disabled="true">
        {content}
      </div>
    );
  }

  if (app.is_external) {
    return (
      <a href={app.href} target="_blank" rel="noopener noreferrer" className={`${base} ${active}`}>
        {content}
      </a>
    );
  }

  return (
    <Link href={app.href} className={`${base} ${active}`}>
      {content}
    </Link>
  );
}

export default async function PortalPage() {
  const [apps, agenda] = await Promise.all([getPortalApps(), getActiveAgendaEvents()]);

  return (
    <div>
      {/* Hero — mengikuti template hero publik */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white sm:py-14">
        <div className="absolute inset-0 hidden opacity-[0.04] sm:block">
          <SquaresFour className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <Star className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <CSSFadeIn>
            <h1 className="text-3xl font-bold md:text-4xl text-balance">Portal</h1>
            <p className="mt-3 text-base text-white/70 text-balance">
              Semua layanan sekolah dalam satu tempat
            </p>
          </CSSFadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
        {/* SPMB — layanan publik, dipisah dari aplikasi */}
        <CSSFadeIn>
          <Link
            href="/admission"
            className="group flex items-center gap-4 rounded-2xl border border-[#f4d21f]/60 bg-[#f4d21f]/10 p-4 transition-all hover:border-[#f4d21f] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#082b59] sm:p-5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f4d21f] text-[#082b59] sm:h-14 sm:w-14">
              <HandCoins className="h-6 w-6 sm:h-7 sm:w-7" weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-[#082b59]">SPMB Online</span>
              <span className="block text-sm text-slate-600">
                Pendaftaran peserta didik baru SMP Muhammadiyah 4 Tanggul
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-[#f4d21f] px-4 py-2 text-sm font-bold text-[#082b59] transition-transform group-hover:scale-105">
              Daftar
            </span>
          </Link>
        </CSSFadeIn>

        {/* Aplikasi sekolah */}
        <CSSFadeIn>
          <div className="mt-10">
            <h2 className="text-base font-bold text-[#082b59]">Aplikasi Sekolah</h2>

            {apps.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-[#dce3ed] bg-white py-10 text-center">
                <p className="text-sm text-slate-500">Belum ada aplikasi.</p>
                <p className="mt-1 text-xs text-slate-400">Aplikasi sekolah akan muncul di sini.</p>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
                {apps.map((app) => (
                  <AppTile key={app.id} app={app} />
                ))}
              </div>
            )}
          </div>
        </CSSFadeIn>

        {/* Jalan pintas ke bagian website */}
        <CSSFadeIn>
          <div className="mt-10">
            <h2 className="text-base font-bold text-[#082b59]">Jelajahi Website</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {SITE_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-[#dce3ed] bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#082b59]/25 hover:text-[#082b59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#082b59]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </CSSFadeIn>

      </section>
    </div>
  );
}