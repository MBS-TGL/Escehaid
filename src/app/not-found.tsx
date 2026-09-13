import Link from "next/link";
import { House, Newspaper, BookOpen, ImageSquare, GraduationCap, Phone } from "@/components/Icons";

const links = [
  { href: "/", label: "Beranda", icon: House },
  { href: "/news", label: "Berita", icon: Newspaper },
  { href: "/articles", label: "Artikel", icon: BookOpen },
  { href: "/gallery", label: "Galeri", icon: ImageSquare },
  { href: "/admission", label: "SPMB", icon: GraduationCap },
  { href: "/contact", label: "Kontak", icon: Phone },
];

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center">
        <p className="text-7xl font-bold text-[#082b59]/10">404</p>
        <h2 className="mt-4 text-xl font-bold text-slate-800">Halaman Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-slate-500">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-2 rounded-xl border border-[#dce3ed] bg-white p-3 transition-all hover:border-[#1767b1]/30 hover:shadow-md"
            >
              <Icon className="h-5 w-5 text-[#082b59]/40 transition-colors group-hover:text-[#1767b1]" />
              <span className="text-xs font-medium text-slate-600 group-hover:text-[#1767b1]">{label}</span>
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-[#082b59] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1767b1]"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
